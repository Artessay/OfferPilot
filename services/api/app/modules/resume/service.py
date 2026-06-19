"""Resume service: upload, parse, versioning, default management, deletion."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.orchestration import AIOrchestrator
from app.modules.resume.models import (
    RESUME_PARSED,
    RESUME_PARSING,
    Resume,
    ResumeVersion,
)
from app.modules.resume.repository import ResumeRepository, ResumeVersionRepository
from app.shared.documents import extract_text, normalize_text, validate_upload
from app.shared.errors import AppError, ErrorCode, NotFoundError
from app.shared.storage import build_object_key, get_storage

# Maps stored file_type (extension without dot) to a download media type.
_RESUME_MEDIA_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
    "txt": "text/plain; charset=utf-8",
    "md": "text/markdown; charset=utf-8",
}


class ResumeService:
    def __init__(self, session: AsyncSession, orchestrator: AIOrchestrator | None = None) -> None:
        self.session = session
        self.resumes = ResumeRepository(session)
        self.versions = ResumeVersionRepository(session)
        self.orchestrator = orchestrator or AIOrchestrator()

    async def upload(
        self,
        *,
        user_id: uuid.UUID,
        filename: str,
        data: bytes,
        title: str | None,
        is_default: bool,
    ) -> Resume:
        ext = validate_upload(filename, len(data))
        storage = get_storage()
        key = build_object_key(prefix=f"resumes/{user_id}", filename=filename)
        await storage.save(key, data)

        if is_default:
            await self.resumes.clear_default(user_id)

        resume = Resume(
            user_id=user_id,
            title=title or filename,
            file_key=key,
            file_name=filename,
            file_type=ext.lstrip("."),
            file_size=len(data),
            status=RESUME_PARSING,
            is_default=is_default,
        )
        await self.resumes.add(resume)

        # Parse immediately (rule-based extraction is fast and offline). Heavier
        # LLM parsing can be offloaded to the Arq worker via run_parse().
        text = extract_text(filename, data)
        await self._create_parsed_version(resume, text)
        resume.status = RESUME_PARSED
        await self.resumes.add(resume)
        return resume

    async def _create_parsed_version(self, resume: Resume, text: str) -> ResumeVersion:
        parsed = await self.orchestrator.parse_resume(text)
        version_no = await self.versions.next_version_no(resume.id)
        version = ResumeVersion(
            resume_id=resume.id,
            version_no=version_no,
            raw_text=text,
            structured_data=parsed["structured_data"],
            skill_tags=parsed["skill_tags"],
            embedding=parsed["embedding"],
            summary=parsed["summary"],
        )
        await self.versions.add(version)
        return version

    async def run_parse(self, resume_id: uuid.UUID) -> ResumeVersion:
        """Re-parse a resume's stored file (callable from the Arq worker)."""
        resume = await self.resumes.get(resume_id)
        if resume is None or resume.file_key is None:
            raise AppError(ErrorCode.RESUME_PARSE_FAILED)
        data = await get_storage().get(resume.file_key)
        text = extract_text(resume.file_name or "resume.txt", data)
        version = await self._create_parsed_version(resume, text)
        resume.status = RESUME_PARSED
        await self.resumes.add(resume)
        return version

    async def create_manual_version(
        self,
        *,
        user_id: uuid.UUID,
        resume_id: uuid.UUID,
        raw_text: str,
        source_report_id: uuid.UUID | None,
        summary: str | None,
    ) -> ResumeVersion:
        resume = await self._require_owned(resume_id, user_id)
        text = normalize_text(raw_text)
        parsed = await self.orchestrator.parse_resume(text)
        version_no = await self.versions.next_version_no(resume.id)
        version = ResumeVersion(
            resume_id=resume.id,
            version_no=version_no,
            source_report_id=source_report_id,
            raw_text=text,
            structured_data=parsed["structured_data"],
            skill_tags=parsed["skill_tags"],
            embedding=parsed["embedding"],
            summary=summary or parsed["summary"],
        )
        await self.versions.add(version)
        return version

    async def list_resumes(
        self, user_id: uuid.UUID, *, offset: int, limit: int
    ) -> tuple[list[Resume], int]:
        items = await self.resumes.list_for_user(user_id, offset=offset, limit=limit)
        total = await self.resumes.count_for_user(user_id)
        return items, total

    async def get_resume(self, user_id: uuid.UUID, resume_id: uuid.UUID) -> Resume:
        return await self._require_owned(resume_id, user_id)

    async def latest_version(self, user_id: uuid.UUID, resume_id: uuid.UUID) -> ResumeVersion:
        await self._require_owned(resume_id, user_id)
        version = await self.versions.latest_for_resume(resume_id)
        if version is None:
            raise NotFoundError("简历尚未解析完成。")
        return version

    async def list_versions(self, user_id: uuid.UUID, resume_id: uuid.UUID) -> list[ResumeVersion]:
        await self._require_owned(resume_id, user_id)
        return await self.versions.list_for_resume(resume_id)

    async def set_default(self, user_id: uuid.UUID, resume_id: uuid.UUID) -> Resume:
        resume = await self._require_owned(resume_id, user_id)
        await self.resumes.clear_default(user_id)
        resume.is_default = True
        await self.resumes.add(resume)
        return resume

    async def delete_resume(self, user_id: uuid.UUID, resume_id: uuid.UUID) -> None:
        resume = await self._require_owned(resume_id, user_id)
        if resume.file_key:
            await get_storage().delete(resume.file_key)
        await self.resumes.soft_delete(resume)

    async def download_original(
        self, user_id: uuid.UUID, resume_id: uuid.UUID
    ) -> tuple[bytes, str, str]:
        """Return ``(content, media_type, filename)`` for the original upload."""
        resume = await self._require_owned(resume_id, user_id)
        if not resume.file_key:
            raise NotFoundError("原始简历文件不存在。")
        try:
            data = await get_storage().get(resume.file_key)
        except FileNotFoundError as exc:
            raise NotFoundError("原始简历文件不存在。") from exc
        media_type = _RESUME_MEDIA_TYPES.get(
            (resume.file_type or "").lower(), "application/octet-stream"
        )
        filename = resume.file_name or f"resume.{resume.file_type or 'bin'}"
        return data, media_type, filename

    async def update_analysis(
        self,
        *,
        user_id: uuid.UUID,
        resume_id: uuid.UUID,
        fields_set: set[str],
        structured_data: dict[str, Any] | None,
        skill_tags: list[str] | None,
        summary: str | None,
    ) -> ResumeVersion:
        """Apply manual edits to the latest parsed version and re-embed it."""
        await self._require_owned(resume_id, user_id)
        version = await self.versions.latest_for_resume(resume_id)
        if version is None:
            raise NotFoundError("简历尚未解析完成。")
        if "structured_data" in fields_set and structured_data is not None:
            version.structured_data = structured_data
        if "skill_tags" in fields_set and skill_tags is not None:
            version.skill_tags = skill_tags
        if "summary" in fields_set:
            version.summary = summary
        version.embedding = await self.orchestrator.embed_resume_fields(
            structured_data=version.structured_data,
            skill_tags=version.skill_tags,
            summary=version.summary,
        )
        await self.versions.add(version)
        return version

    async def _require_owned(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> Resume:
        resume = await self.resumes.get_owned(resume_id, user_id)
        if resume is None:
            raise NotFoundError("简历不存在。")
        return resume

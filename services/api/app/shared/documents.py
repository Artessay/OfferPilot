"""Plain-text extraction from uploaded resume/JD documents (PDF, DOCX, TXT)."""

from __future__ import annotations

import io

from app.shared.errors import AppError, ErrorCode

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


def _extension(filename: str) -> str:
    name = filename.lower().strip()
    dot = name.rfind(".")
    return name[dot:] if dot != -1 else ""


def validate_upload(filename: str, size: int) -> str:
    """Validate a file's extension and size, returning the normalised extension."""
    ext = _extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise AppError(ErrorCode.RESUME_FILE_INVALID)
    if size > MAX_FILE_BYTES:
        raise AppError(ErrorCode.RESUME_FILE_INVALID, "文件过大，请上传 10MB 以内的简历。")
    return ext


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(data: bytes) -> str:
    from docx import Document

    document = Document(io.BytesIO(data))
    return "\n".join(p.text for p in document.paragraphs)


def extract_text(filename: str, data: bytes) -> str:
    """Extract plain text from a supported document, raising on failure."""
    ext = _extension(filename)
    try:
        if ext == ".pdf":
            text = _extract_pdf(data)
        elif ext == ".docx":
            text = _extract_docx(data)
        elif ext in {".txt", ".md"}:
            text = data.decode("utf-8", errors="ignore")
        else:
            raise AppError(ErrorCode.RESUME_FILE_INVALID)
    except AppError:
        raise
    except Exception as exc:
        raise AppError(ErrorCode.RESUME_PARSE_FAILED) from exc

    return normalize_text(text)


def normalize_text(text: str) -> str:
    """Collapse excessive whitespace while preserving paragraph breaks."""
    lines = [line.strip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    cleaned: list[str] = []
    blank = False
    for line in lines:
        if line:
            cleaned.append(" ".join(line.split()))
            blank = False
        elif not blank:
            cleaned.append("")
            blank = True
    return "\n".join(cleaned).strip()

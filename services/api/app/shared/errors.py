"""Unified error model, error codes and FastAPI exception handlers.

Every error response follows the envelope defined in the design docs:

    {"error": {"code": "...", "message": "...", "requestId": "...", "details": {}}}
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.shared.context import get_request_id
from app.shared.logging import get_logger

logger = get_logger(__name__)

# Starlette 1.x renamed HTTP_422_UNPROCESSABLE_ENTITY -> _CONTENT. Use the numeric
# value to stay compatible across versions and avoid the deprecated alias.
HTTP_422_UNPROCESSABLE: int = 422


class ErrorCode(StrEnum):
    """Canonical machine-readable error codes (see detailed design §8.1)."""

    # Generic
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    RATE_LIMITED = "RATE_LIMITED"

    # Auth
    AUTH_REQUIRED = "AUTH_REQUIRED"
    PERMISSION_DENIED = "PERMISSION_DENIED"

    # Resume
    RESUME_FILE_INVALID = "RESUME_FILE_INVALID"
    RESUME_PARSE_FAILED = "RESUME_PARSE_FAILED"

    # Job / JD
    JD_TEXT_TOO_SHORT = "JD_TEXT_TOO_SHORT"
    JOB_PARSE_FAILED = "JOB_PARSE_FAILED"
    JOB_SOURCE_UNAUTHORIZED = "JOB_SOURCE_UNAUTHORIZED"

    # Match / recommend / rewrite
    MATCH_INPUT_INCOMPLETE = "MATCH_INPUT_INCOMPLETE"
    RECOMMENDATION_FAILED = "RECOMMENDATION_FAILED"
    RESUME_REWRITE_FAILED = "RESUME_REWRITE_FAILED"

    # AI / tasks
    LLM_PROVIDER_FAILED = "LLM_PROVIDER_FAILED"
    TASK_NOT_FOUND = "TASK_NOT_FOUND"


# code -> (http status, default user-facing message)
_ERROR_REGISTRY: dict[ErrorCode, tuple[int, str]] = {
    ErrorCode.VALIDATION_ERROR: (HTTP_422_UNPROCESSABLE, "请求参数校验失败。"),
    ErrorCode.NOT_FOUND: (status.HTTP_404_NOT_FOUND, "资源不存在。"),
    ErrorCode.CONFLICT: (status.HTTP_409_CONFLICT, "资源状态冲突。"),
    ErrorCode.INTERNAL_ERROR: (status.HTTP_500_INTERNAL_SERVER_ERROR, "系统内部错误，请稍后重试。"),
    ErrorCode.RATE_LIMITED: (status.HTTP_429_TOO_MANY_REQUESTS, "操作过于频繁，请稍后再试。"),
    ErrorCode.AUTH_REQUIRED: (status.HTTP_401_UNAUTHORIZED, "请重新登录后继续操作。"),
    ErrorCode.PERMISSION_DENIED: (status.HTTP_403_FORBIDDEN, "你没有权限访问该内容。"),
    ErrorCode.RESUME_FILE_INVALID: (
        status.HTTP_400_BAD_REQUEST,
        "请上传 PDF、DOCX 或 TXT 格式简历。",
    ),
    ErrorCode.RESUME_PARSE_FAILED: (
        HTTP_422_UNPROCESSABLE,
        "简历解析失败，请重新上传，或改用文本简历。",
    ),
    ErrorCode.JD_TEXT_TOO_SHORT: (
        status.HTTP_400_BAD_REQUEST,
        "请补充完整岗位职责和任职要求。",
    ),
    ErrorCode.JOB_PARSE_FAILED: (
        HTTP_422_UNPROCESSABLE,
        "JD 解析失败，请检查岗位描述后重试。",
    ),
    ErrorCode.JOB_SOURCE_UNAUTHORIZED: (
        status.HTTP_403_FORBIDDEN,
        "请先完成岗位数据源授权。",
    ),
    ErrorCode.MATCH_INPUT_INCOMPLETE: (
        status.HTTP_400_BAD_REQUEST,
        "请先完成简历和岗位解析。",
    ),
    ErrorCode.RECOMMENDATION_FAILED: (
        HTTP_422_UNPROCESSABLE,
        "推荐组合生成失败，请调整筛选条件后重试。",
    ),
    ErrorCode.RESUME_REWRITE_FAILED: (
        HTTP_422_UNPROCESSABLE,
        "改写草稿生成失败，请减少建议数量或稍后重试。",
    ),
    ErrorCode.LLM_PROVIDER_FAILED: (
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "AI 服务暂时不可用，请稍后重试。",
    ),
    ErrorCode.TASK_NOT_FOUND: (status.HTTP_404_NOT_FOUND, "未找到该任务。"),
}


class AppError(Exception):
    """Base application error carrying a stable :class:`ErrorCode`.

    Raise this (or a subclass) anywhere in the service layer; the registered
    handler converts it into the standard error envelope.
    """

    def __init__(
        self,
        code: ErrorCode,
        message: str | None = None,
        *,
        http_status: int | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        default_status, default_message = _ERROR_REGISTRY[code]
        self.code = code
        self.message = message or default_message
        self.http_status = http_status or default_status
        self.details = details or {}
        super().__init__(self.message)


# Convenience subclasses for the most common cases.
class NotFoundError(AppError):
    def __init__(self, message: str | None = None, **details: Any) -> None:
        super().__init__(ErrorCode.NOT_FOUND, message, details=details or None)


class PermissionDeniedError(AppError):
    def __init__(self, message: str | None = None, **details: Any) -> None:
        super().__init__(ErrorCode.PERMISSION_DENIED, message, details=details or None)


class AuthRequiredError(AppError):
    def __init__(self, message: str | None = None, **details: Any) -> None:
        super().__init__(ErrorCode.AUTH_REQUIRED, message, details=details or None)


def _error_payload(code: str, message: str, details: dict[str, Any]) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "requestId": get_request_id(),
            "details": details,
        }
    }


def register_exception_handlers(app: FastAPI) -> None:
    """Attach handlers that render every error as the standard envelope."""

    @app.exception_handler(AppError)
    async def _handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        if exc.http_status >= 500:
            logger.error("app_error", code=exc.code, message=exc.message)
        else:
            logger.info("app_error", code=exc.code, message=exc.message)
        return JSONResponse(
            status_code=exc.http_status,
            content=_error_payload(exc.code, exc.message, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        _status, message = _ERROR_REGISTRY[ErrorCode.VALIDATION_ERROR]
        return JSONResponse(
            status_code=HTTP_422_UNPROCESSABLE,
            content=_error_payload(
                ErrorCode.VALIDATION_ERROR,
                message,
                {"errors": jsonable_encoder(exc.errors())},
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = ErrorCode.NOT_FOUND if exc.status_code == 404 else ErrorCode.INTERNAL_ERROR
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            code = ErrorCode.AUTH_REQUIRED
        elif exc.status_code == status.HTTP_403_FORBIDDEN:
            code = ErrorCode.PERMISSION_DENIED
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(code, str(exc.detail), {}),
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_exception", error=str(exc))
        _status, message = _ERROR_REGISTRY[ErrorCode.INTERNAL_ERROR]
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_payload(ErrorCode.INTERNAL_ERROR, message, {}),
        )

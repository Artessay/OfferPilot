"""User ORM model."""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

# Role / account-type constants (validated at the schema layer).
ROLE_STUDENT = "student"
ROLE_ADMIN = "admin"

ACCOUNT_REGISTERED = "registered"
ACCOUNT_GUEST = "guest"


class User(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """A platform user — student, admin, or anonymous guest."""

    __tablename__ = "users"

    email: Mapped[str | None] = mapped_column(String(320), unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nickname: Mapped[str | None] = mapped_column(String(64), nullable=True)
    role: Mapped[str] = mapped_column(String(16), default=ROLE_STUDENT, nullable=False)
    account_type: Mapped[str] = mapped_column(
        String(16), default=ACCOUNT_REGISTERED, nullable=False
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<User id={self.id} role={self.role} type={self.account_type}>"

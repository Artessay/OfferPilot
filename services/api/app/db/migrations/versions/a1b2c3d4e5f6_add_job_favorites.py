"""add job_favorites

Revision ID: a1b2c3d4e5f6
Revises: 52409b52db03
Create Date: 2026-06-14 09:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "52409b52db03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "job_favorites",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["job_id"],
            ["jobs.id"],
            name=op.f("fk_job_favorites_job_id_jobs"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_job_favorites_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_job_favorites")),
        sa.UniqueConstraint("user_id", "job_id", name="uq_job_favorite_user_job"),
    )
    op.create_index(
        op.f("ix_job_favorites_job_id"), "job_favorites", ["job_id"], unique=False
    )
    op.create_index(
        op.f("ix_job_favorites_user_id"), "job_favorites", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_job_favorites_user_id"), table_name="job_favorites")
    op.drop_index(op.f("ix_job_favorites_job_id"), table_name="job_favorites")
    op.drop_table("job_favorites")

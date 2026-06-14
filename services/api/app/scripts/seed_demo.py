"""Seed a demo account and sample data for the lightweight debug mode.

Run with::

    python -m app.scripts.seed_demo

The script is **idempotent**: if the demo user already exists it does nothing.
It uses the configured ``DATABASE_URL`` (SQLite in debug mode) and drives the
public API in-process via an ASGI transport, so the seeded data is created
through exactly the same code path a real client would use.
"""

from __future__ import annotations

import asyncio

from httpx import ASGITransport, AsyncClient, Response
from sqlalchemy import select

from app.db.registry import Base
from app.db.session import dispose_engine, get_engine, get_sessionmaker
from app.main import create_app
from app.modules.auth.models import User
from app.shared.logging import configure_logging, get_logger

logger = get_logger(__name__)

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "Demo1234!"  # local demo credential, not a real secret
DEMO_NICKNAME = "演示用户"

RESUME_BYTES = (
    "个人简历\n"
    "教育背景\n某大学 计算机科学与技术 本科\n"
    "实习经历\n数据分析实习 使用 SQL 和 Python 完成用户留存分析，输出可视化报告。\n"
    "技能\nSQL Python 数据分析 数据可视化 沟通能力\n"
).encode()

JD_DATA = (
    "岗位职责\n负责用户行为数据分析，搭建指标体系并输出数据报告。\n"
    "任职要求\n熟练使用 SQL 和 Python 进行数据分析，具备良好的沟通能力。\n"
)
JD_MARKETING = "岗位职责\n负责品牌内容策划与公众号运营。\n任职要求\n具备文案撰写与活动策划经验。\n"

SAMPLE_JOBS = [
    ("数据分析实习生", JD_DATA, "上海"),
    ("数据分析师", JD_DATA, "上海"),
    ("品牌运营实习生", JD_MARKETING, "上海"),
]


def _expect(resp: Response, action: str) -> Response:
    """Raise a clear error if an API call during seeding did not succeed."""
    if not resp.is_success:
        raise RuntimeError(f"seed step failed [{action}]: {resp.status_code} {resp.text}")
    return resp


async def _ensure_schema() -> None:
    """Create all tables from ORM metadata (idempotent)."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _demo_user_exists() -> bool:
    factory = get_sessionmaker()
    async with factory() as session:
        result = await session.execute(select(User).where(User.email == DEMO_EMAIL))
        return result.scalar_one_or_none() is not None


async def _seed_via_api() -> None:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://seed") as client:
        registered = _expect(
            await client.post(
                "/api/v1/auth/register",
                json={
                    "email": DEMO_EMAIL,
                    "password": DEMO_PASSWORD,
                    "nickname": DEMO_NICKNAME,
                },
            ),
            "register",
        )
        token = registered.json()["data"]["tokens"]["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}

        _expect(
            await client.post(
                "/api/v1/resumes",
                headers=headers,
                files={"file": ("resume.txt", RESUME_BYTES, "text/plain")},
                data={"title": "我的简历", "isDefault": "true"},
            ),
            "upload resume",
        )

        # PUT upserts the profile (creates it on first call via get_or_create).
        _expect(
            await client.put(
                "/api/v1/profile",
                headers=headers,
                json={"targetRoles": ["数据分析"], "targetCities": ["上海"]},
            ),
            "update profile",
        )

        for title, jd, city in SAMPLE_JOBS:
            _expect(
                await client.post(
                    "/api/v1/jobs",
                    headers=headers,
                    json={"title": title, "city": city, "jdText": jd},
                ),
                f"create job '{title}'",
            )


async def main() -> None:
    configure_logging()
    await _ensure_schema()
    try:
        if await _demo_user_exists():
            logger.info("seed_demo_skipped", reason="demo user already exists", email=DEMO_EMAIL)
            return
        await _seed_via_api()
        logger.info(
            "seed_demo_done",
            email=DEMO_EMAIL,
            password=DEMO_PASSWORD,
            jobs=len(SAMPLE_JOBS),
        )
    finally:
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
One-off: create public.goals using DATABASE_URL from .env (same DB as uvicorn).
Run from repo root: backend/.venv/bin/python backend/scripts/apply_goals_migration.py
"""

import asyncio
import sys
from pathlib import Path

# Allow importing app.* when run from repo root or backend/
ROOT = Path(__file__).resolve().parents[2]
BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from sqlalchemy import text  # noqa: E402

from app.core.database import AsyncSessionLocal  # noqa: E402

MIGRATION = (ROOT / "supabase/migrations/20251028160000_goals.sql").read_text()


async def main() -> None:
    statements = [s.strip() for s in MIGRATION.split(";") if s.strip()]
    async with AsyncSessionLocal() as session:
        for stmt in statements:
            await session.execute(text(stmt))
        await session.commit()
        check = await session.execute(text("SELECT to_regclass('public.goals')"))
        reg = check.scalar()
        print("goals table:", reg)
        if not reg:
            sys.exit(1)
        print("OK — goals migration applied.")


if __name__ == "__main__":
    asyncio.run(main())

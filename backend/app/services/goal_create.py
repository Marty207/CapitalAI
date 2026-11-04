"""
Create savings goals from API routes or Capito (same DB logic).
"""

import uuid
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db_errors import raise_if_goals_table_missing
from app.models import Goal


async def create_manual_goal(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    title: str,
    target_amount: Decimal,
    current_amount: Decimal = Decimal("0"),
) -> Goal:
    """Capito and POST /goals both use this for a simple manual tracking goal."""
    clean_title = title.strip()
    if not clean_title:
        raise HTTPException(status_code=400, detail="Goal title is required")
    if target_amount <= 0:
        raise HTTPException(status_code=400, detail="Target amount must be positive")

    goal = Goal(
        user_id=user_id,
        title=clean_title,
        target_amount=target_amount,
        current_amount=current_amount,
        tracking_mode="manual",
        account_id=None,
    )
    try:
        db.add(goal)
        await db.flush()
        await db.refresh(goal)
    except ProgrammingError as exc:
        raise_if_goals_table_missing(exc)
        raise
    return goal

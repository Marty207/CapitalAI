import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db_errors import raise_if_goals_table_missing
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models import Account, Goal
from app.schemas import GoalAmountPatch, GoalCreateRequest, GoalResponse

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[GoalResponse])
async def list_goals(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    uid = uuid.UUID(user_id)
    try:
        goals = (
            await db.scalars(
                select(Goal).where(Goal.user_id == uid).order_by(Goal.created_at.desc())
            )
        ).all()
    except ProgrammingError as exc:
        raise_if_goals_table_missing(exc)
        raise
    return goals


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    body: GoalCreateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    uid = uuid.UUID(user_id)
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Goal title is required")
    if body.target_amount <= 0:
        raise HTTPException(status_code=400, detail="Target amount must be positive")
    if body.tracking_mode not in ("manual", "total_cash", "account"):
        raise HTTPException(status_code=400, detail="Invalid tracking mode")
    if body.tracking_mode == "account":
        if not body.account_id:
            raise HTTPException(status_code=400, detail="account_id required for account tracking")
        owned = await db.scalar(
            select(Account.id).where(
                Account.id == body.account_id,
                Account.user_id == uid,
                Account.is_active.is_(True),
            )
        )
        if not owned:
            raise HTTPException(status_code=400, detail="Account not found")

    goal = Goal(
        user_id=uid,
        title=title,
        target_amount=body.target_amount,
        current_amount=body.current_amount,
        tracking_mode=body.tracking_mode,
        account_id=body.account_id if body.tracking_mode == "account" else None,
    )
    db.add(goal)
    await db.flush()
    await db.refresh(goal)
    return goal


@router.patch("/{goal_id}", response_model=GoalResponse)
async def patch_goal_amount(
    goal_id: uuid.UUID,
    body: GoalAmountPatch,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Called after auto-tracking recalculates current_amount from linked accounts."""
    uid = uuid.UUID(user_id)
    goal = await db.scalar(select(Goal).where(Goal.id == goal_id, Goal.user_id == uid))
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.current_amount = body.current_amount
    await db.flush()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    uid = uuid.UUID(user_id)
    goal = await db.scalar(select(Goal).where(Goal.id == goal_id, Goal.user_id == uid))
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)

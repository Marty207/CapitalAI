import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models import Account
from app.schemas import AccountResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountResponse])
async def list_accounts(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    accounts = (
        await db.scalars(
            select(Account)
            .where(
                Account.user_id == uuid.UUID(user_id),
                Account.is_active.is_(True),
            )
            .order_by(Account.name)
        )
    ).all()
    return accounts

import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models import Account, Transaction
from app.schemas import TransactionResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    account_id: uuid.UUID | None = Query(None, description="Filter to one linked account"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    uid = uuid.UUID(user_id)
    query = (
        select(Transaction)
        .where(
            Transaction.user_id == uid,
            Transaction.is_removed.is_(False),
        )
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    # Only return rows for accounts this user owns (browser sends account_id from dashboard).
    if account_id is not None:
        query = query.join(Account, Transaction.account_id == Account.id).where(
            Transaction.account_id == account_id,
            Account.user_id == uid,
        )

    if start_date:
        query = query.where(Transaction.date >= start_date)
    if end_date:
        query = query.where(Transaction.date <= end_date)

    transactions = (await db.scalars(query)).all()
    return transactions

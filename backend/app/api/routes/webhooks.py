import uuid

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import PlaidItem
from app.services.plaid_service import PlaidService

router = APIRouter(prefix="/plaid", tags=["plaid-webhooks"])


@router.post("/webhook")
async def plaid_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle Plaid webhooks (e.g. SYNC_UPDATES_AVAILABLE, ITEM ERROR)."""
    body = await request.json()
    webhook_type = body.get("webhook_type")
    webhook_code = body.get("webhook_code")
    item_id = body.get("item_id")

    if webhook_type == "TRANSACTIONS" and webhook_code == "SYNC_UPDATES_AVAILABLE":
        plaid_item = await db.scalar(
            select(PlaidItem).where(PlaidItem.item_id == item_id)
        )
        if plaid_item:
            service = PlaidService(db)
            await service.sync_transactions(plaid_item)

    return {"received": True}

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.schemas import (
    ExchangeTokenRequest,
    ExchangeTokenResponse,
    LinkTokenResponse,
    PlaidConfigResponse,
    SyncResponse,
)
from app.services.plaid_service import PlaidService

router = APIRouter(prefix="/plaid", tags=["plaid"])


@router.get("/config", response_model=PlaidConfigResponse)
async def plaid_config(settings: Settings = Depends(get_settings)):
    """Browser uses this to show sandbox vs real-account mode."""
    return PlaidConfigResponse(
        environment=settings.plaid_environment(),
        oauth_redirect_configured=bool(settings.plaid_redirect_uri.strip()),
    )


@router.post("/link-token", response_model=LinkTokenResponse)
async def create_link_token(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = PlaidService(db)
    link_token, expiration = await service.create_link_token(user_id)
    return LinkTokenResponse(link_token=link_token, expiration=expiration)


@router.post("/exchange-token", response_model=ExchangeTokenResponse)
async def exchange_public_token(
    body: ExchangeTokenRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = PlaidService(db)
    plaid_item, accounts_linked = await service.exchange_public_token(
        user_id, body.public_token
    )
    return ExchangeTokenResponse(
        item_id=plaid_item.item_id,
        institution_name=plaid_item.institution_name,
        accounts_linked=accounts_linked,
    )


@router.post("/sync", response_model=SyncResponse)
async def sync_transactions(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = PlaidService(db)
    totals = await service.sync_all_for_user(user_id)
    return SyncResponse(**totals)

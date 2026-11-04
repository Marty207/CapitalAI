from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    official_name: str | None
    type: str
    subtype: str | None
    mask: str | None
    current_balance: Decimal | None
    available_balance: Decimal | None
    iso_currency_code: str | None
    is_active: bool


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    account_id: UUID
    amount: Decimal
    date: date
    name: str
    merchant_name: str | None
    category: list | None
    category_primary: str | None
    pending: bool
    payment_channel: str | None


class LinkTokenResponse(BaseModel):
    link_token: str
    expiration: datetime


class PlaidConfigResponse(BaseModel):
    """Safe Plaid mode for the UI — no secrets."""
    environment: Literal["sandbox", "production"]
    oauth_redirect_configured: bool


class ExchangeTokenRequest(BaseModel):
    public_token: str


class ExchangeTokenResponse(BaseModel):
    item_id: str
    institution_name: str | None
    accounts_linked: int


class SyncResponse(BaseModel):
    added: int
    modified: int
    removed: int
    accounts_updated: int


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    target_amount: Decimal
    current_amount: Decimal
    tracking_mode: str
    account_id: UUID | None
    created_at: datetime


class GoalCreateRequest(BaseModel):
    title: str
    target_amount: Decimal
    current_amount: Decimal = Decimal("0")
    tracking_mode: str = "manual"
    account_id: UUID | None = None


class GoalAmountPatch(BaseModel):
    current_amount: Decimal


class CapitoChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class CapitoGoalSuggestion(BaseModel):
    title: str
    target_amount: Decimal


class CapitoChatRequest(BaseModel):
    message: str
    history: list[CapitoChatMessage] = Field(default_factory=list)
    # When the user accepts a goal offer, Capito creates it server-side (not via POST /goals from the browser).
    confirm_goal: CapitoGoalSuggestion | None = None


class CapitoChatResponse(BaseModel):
    reply: str
    assistant_name: str = "Capito"
    goal_suggestion: CapitoGoalSuggestion | None = None


class CapitoSaveGoalResponse(BaseModel):
    """After the user clicks Save to Goals in Capito chat."""
    reply: str
    assistant_name: str = "Capito"

import json
import uuid
from decimal import Decimal

from fastapi import HTTPException
from plaid.exceptions import ApiException
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Account, PlaidItem, Transaction
from app.services.plaid_client import get_plaid_client


class PlaidService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = get_plaid_client()

    async def create_link_token(self, user_id: str) -> tuple[str, str]:
        from app.core.config import get_settings

        settings = get_settings()
        request_kwargs: dict = {
            "user": LinkTokenCreateRequestUser(client_user_id=user_id),
            "client_name": "CapitalAI",
            "products": [Products("transactions")],
            "country_codes": [CountryCode("US")],
            "language": "en",
        }
        if settings.plaid_webhook_url:
            request_kwargs["webhook"] = settings.plaid_webhook_url
        if settings.plaid_link_customization_name:
            request_kwargs["link_customization_name"] = (
                settings.plaid_link_customization_name
            )
        if settings.plaid_redirect_uri:
            request_kwargs["redirect_uri"] = settings.plaid_redirect_uri

        request = LinkTokenCreateRequest(**request_kwargs)
        try:
            response = self.client.link_token_create(request)
        except ApiException as exc:
            detail = exc.body
            if isinstance(detail, (bytes, bytearray)):
                detail = detail.decode()
            if isinstance(detail, str):
                try:
                    detail = json.loads(detail)
                except json.JSONDecodeError:
                    pass
            raise HTTPException(
                status_code=502,
                detail=detail or "Plaid link token request failed",
            ) from exc
        return response["link_token"], response["expiration"]

    async def exchange_public_token(
        self, user_id: str, public_token: str
    ) -> tuple[PlaidItem, int]:
        exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
        exchange_response = self.client.item_public_token_exchange(exchange_request)

        item_id = exchange_response["item_id"]
        access_token = exchange_response["access_token"]

        plaid_item = PlaidItem(
            user_id=uuid.UUID(user_id),
            item_id=item_id,
            access_token=access_token,
        )
        self.db.add(plaid_item)
        await self.db.flush()

        accounts_linked = await self._sync_accounts(plaid_item)
        await self.sync_transactions(plaid_item)

        return plaid_item, accounts_linked

    async def _sync_accounts(self, plaid_item: PlaidItem) -> int:
        request = AccountsBalanceGetRequest(access_token=plaid_item.access_token)
        response = self.client.accounts_balance_get(request)

        institution = response.get("item", {})
        plaid_item.institution_id = institution.get("institution_id")

        count = 0
        for acct in response["accounts"]:
            existing = await self.db.scalar(
                select(Account).where(Account.plaid_account_id == acct["account_id"])
            )
            balances = acct.get("balances", {})
            if existing:
                existing.name = acct["name"]
                existing.official_name = acct.get("official_name")
                existing.type = _plaid_str(acct["type"]) or "other"
                existing.subtype = _plaid_str(acct.get("subtype"))
                existing.mask = acct.get("mask")
                existing.current_balance = _to_decimal(balances.get("current"))
                existing.available_balance = _to_decimal(balances.get("available"))
                existing.iso_currency_code = balances.get("iso_currency_code", "USD")
                existing.is_active = True
            else:
                account = Account(
                    user_id=plaid_item.user_id,
                    plaid_item_id=plaid_item.id,
                    plaid_account_id=acct["account_id"],
                    name=acct["name"],
                    official_name=acct.get("official_name"),
                    type=_plaid_str(acct["type"]) or "other",
                    subtype=_plaid_str(acct.get("subtype")),
                    mask=acct.get("mask"),
                    current_balance=_to_decimal(balances.get("current")),
                    available_balance=_to_decimal(balances.get("available")),
                    iso_currency_code=balances.get("iso_currency_code", "USD"),
                )
                self.db.add(account)
            count += 1

        await self.db.flush()
        return count

    async def sync_transactions(self, plaid_item: PlaidItem) -> dict[str, int]:
        added = modified = removed = 0
        cursor = plaid_item.cursor
        has_more = True

        account_map = await self._get_account_map(plaid_item)

        while has_more:
            request_kwargs: dict = {"access_token": plaid_item.access_token}
            if cursor:
                request_kwargs["cursor"] = cursor

            response = self.client.transactions_sync(
                TransactionsSyncRequest(**request_kwargs)
            )

            for txn in response["added"]:
                await self._upsert_transaction(
                    plaid_item, account_map, txn, is_new=True
                )
                added += 1

            for txn in response["modified"]:
                await self._upsert_transaction(
                    plaid_item, account_map, txn, is_new=False
                )
                modified += 1

            for removed_txn in response["removed"]:
                existing = await self.db.scalar(
                    select(Transaction).where(
                        Transaction.plaid_transaction_id
                        == removed_txn["transaction_id"]
                    )
                )
                if existing:
                    existing.is_removed = True
                    removed += 1

            cursor = response["next_cursor"]
            has_more = response["has_more"]

        plaid_item.cursor = cursor
        await self.db.flush()

        return {"added": added, "modified": modified, "removed": removed}

    async def sync_all_for_user(self, user_id: str) -> dict[str, int]:
        items = (
            await self.db.scalars(
                select(PlaidItem).where(
                    PlaidItem.user_id == uuid.UUID(user_id),
                    PlaidItem.is_active.is_(True),
                )
            )
        ).all()

        totals = {"added": 0, "modified": 0, "removed": 0, "accounts_updated": 0}
        for item in items:
            totals["accounts_updated"] += await self._sync_accounts(item)
            txn_counts = await self.sync_transactions(item)
            totals["added"] += txn_counts["added"]
            totals["modified"] += txn_counts["modified"]
            totals["removed"] += txn_counts["removed"]

        return totals

    async def _get_account_map(self, plaid_item: PlaidItem) -> dict[str, Account]:
        accounts = (
            await self.db.scalars(
                select(Account).where(Account.plaid_item_id == plaid_item.id)
            )
        ).all()
        return {a.plaid_account_id: a for a in accounts}

    async def _upsert_transaction(
        self,
        plaid_item: PlaidItem,
        account_map: dict[str, Account],
        txn: dict,
        is_new: bool,
    ) -> None:
        account = account_map.get(txn["account_id"])
        if not account:
            return

        categories = txn.get("personal_finance_category")
        category_primary = None
        category_list = txn.get("category")
        if categories:
            category_primary = categories.get("primary")
        elif category_list:
            category_primary = category_list[0] if category_list else None

        if is_new:
            existing = await self.db.scalar(
                select(Transaction).where(
                    Transaction.plaid_transaction_id == txn["transaction_id"]
                )
            )
            if existing:
                is_new = False
                target = existing
            else:
                target = Transaction(
                    user_id=plaid_item.user_id,
                    account_id=account.id,
                    plaid_transaction_id=txn["transaction_id"],
                )
                self.db.add(target)
        else:
            target = await self.db.scalar(
                select(Transaction).where(
                    Transaction.plaid_transaction_id == txn["transaction_id"]
                )
            )
            if not target:
                target = Transaction(
                    user_id=plaid_item.user_id,
                    account_id=account.id,
                    plaid_transaction_id=txn["transaction_id"],
                )
                self.db.add(target)

        target.amount = Decimal(str(txn["amount"]))
        target.date = txn["date"]
        target.authorized_date = txn.get("authorized_date")
        target.name = txn["name"]
        target.merchant_name = txn.get("merchant_name")
        target.category = category_list
        target.category_primary = category_primary
        target.pending = txn.get("pending", False)
        target.payment_channel = _plaid_str(txn.get("payment_channel"))
        target.iso_currency_code = txn.get("iso_currency_code", "USD")
        target.is_removed = False


def _to_decimal(value) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


def _plaid_str(value) -> str | None:
    if value is None:
        return None
    if hasattr(value, "value"):
        return str(value.value)
    return str(value)

"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-08-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "plaid_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_id", sa.String(255), nullable=False, unique=True),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("institution_id", sa.String(255)),
        sa.Column("institution_name", sa.String(255)),
        sa.Column("cursor", sa.Text()),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_plaid_items_user_id", "plaid_items", ["user_id"])

    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plaid_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("plaid_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plaid_account_id", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("official_name", sa.String(255)),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("subtype", sa.String(50)),
        sa.Column("mask", sa.String(10)),
        sa.Column("current_balance", sa.Numeric(14, 2)),
        sa.Column("available_balance", sa.Numeric(14, 2)),
        sa.Column("iso_currency_code", sa.String(3), server_default="USD"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("plaid_account_id", name="uq_accounts_plaid_account_id"),
    )
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"])

    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plaid_transaction_id", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("authorized_date", sa.Date()),
        sa.Column("name", sa.String(512), nullable=False),
        sa.Column("merchant_name", sa.String(255)),
        sa.Column("category", postgresql.JSONB()),
        sa.Column("category_primary", sa.String(100)),
        sa.Column("pending", sa.Boolean(), server_default="false"),
        sa.Column("payment_channel", sa.String(50)),
        sa.Column("iso_currency_code", sa.String(3), server_default="USD"),
        sa.Column("is_removed", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("plaid_transaction_id", name="uq_transactions_plaid_transaction_id"),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])
    op.create_index("ix_transactions_user_date", "transactions", ["user_id", "date"])
    op.create_index("ix_transactions_account_date", "transactions", ["account_id", "date"])


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("accounts")
    op.drop_table("plaid_items")

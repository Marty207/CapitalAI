"""
Build a text snapshot of the user's CapitalAI data for Capito (LLM context).
Called from POST /api/v1/capito/chat on each message — not stored.
"""

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db_errors import GOALS_MIGRATION_HINT, is_undefined_table
from app.models import Account, Goal, Transaction


def _money(value: Decimal | None) -> str:
    if value is None:
        return "—"
    return f"${value:,.2f}"


async def build_user_finance_context(user_id: str, db: AsyncSession) -> str:
    uid = uuid.UUID(user_id)

    accounts = (
        await db.scalars(
            select(Account)
            .where(Account.user_id == uid, Account.is_active.is_(True))
            .order_by(Account.name)
        )
    ).all()

    goals: list[Goal] = []
    goals_unavailable = False
    try:
        goals = (
            await db.scalars(
                select(Goal).where(Goal.user_id == uid).order_by(Goal.created_at.desc())
            )
        ).all()
    except ProgrammingError as exc:
        await db.rollback()
        if is_undefined_table(exc, "goals"):
            goals_unavailable = True
        else:
            raise

    transactions = (
        await db.scalars(
            select(Transaction)
            .where(Transaction.user_id == uid, Transaction.is_removed.is_(False))
            .order_by(Transaction.date.desc(), Transaction.created_at.desc())
            .limit(25)
        )
    ).all()

    lines: list[str] = ["=== Linked accounts ==="]
    if not accounts:
        lines.append("(No linked accounts yet — user may need to connect a bank via Plaid.)")
    else:
        for a in accounts:
            bal = a.current_balance if a.current_balance is not None else a.available_balance
            lines.append(
                f"- {a.name} ({a.type}/{a.subtype or 'n/a'}, ••{a.mask or '????'}): balance {_money(bal)}"
            )

    lines.append("\n=== Savings goals ===")
    if goals_unavailable:
        lines.append(f"(Goals not available in database yet. {GOALS_MIGRATION_HINT})")
    elif not goals:
        lines.append("(No goals set.)")
    else:
        for g in goals:
            pct = (
                float(g.current_amount / g.target_amount * 100)
                if g.target_amount and g.target_amount > 0
                else 0.0
            )
            lines.append(
                f"- {g.title}: {_money(g.current_amount)} / {_money(g.target_amount)} "
                f"({pct:.0f}%, tracking={g.tracking_mode})"
            )

    lines.append("\n=== Recent transactions (newest first, up to 25) ===")
    if not transactions:
        lines.append("(No transactions synced yet.)")
    else:
        for t in transactions:
            cat = t.category_primary or (t.category[0] if t.category else "uncategorized")
            lines.append(
                f"- {t.date.isoformat()} | {t.name} | amount {_money(t.amount)} | {cat}"
                + (" | pending" if t.pending else "")
            )

    return "\n".join(lines)

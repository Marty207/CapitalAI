"""Map common Postgres errors to user-facing API messages."""

from fastapi import HTTPException, status
from sqlalchemy.exc import ProgrammingError

GOALS_MIGRATION_HINT = (
    "Goals table missing. Run supabase/migrations/20251028160000_goals.sql in Supabase SQL Editor, "
    "or from repo root: backend/.venv/bin/python backend/scripts/apply_goals_migration.py"
)


def is_undefined_table(exc: BaseException, table: str) -> bool:
    text = str(exc).lower()
    return "undefinedtable" in text.replace("_", "") or (
        "does not exist" in text and table.lower() in text
    )


def raise_if_goals_table_missing(exc: ProgrammingError) -> None:
    """Re-raise as HTTP 503 when goals migration was never applied."""
    if is_undefined_table(exc, "goals"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=GOALS_MIGRATION_HINT,
        ) from exc

from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Process is up (no database). Used by quick curl checks."""
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness_check():
    """
    Confirms Postgres is reachable — call this when /accounts returns 500.
    Browser and web app use /health; you can use /health/ready in a terminal.
    """
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception as exc:
        # Return a clear JSON body instead of a generic 500 (common when DATABASE_URL is wrong).
        raise HTTPException(
            status_code=503,
            detail=f"Database unreachable: {type(exc).__name__}",
        ) from exc
    return {"status": "ok", "database": "connected"}

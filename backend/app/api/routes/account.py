"""Account lifecycle — permanent delete via Supabase Auth admin (service role)."""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import get_settings
from app.core.security import get_current_user_id

router = APIRouter(prefix="/account", tags=["account"])
settings = get_settings()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(user_id: str = Depends(get_current_user_id)):
    """
    Permanently delete the signed-in user from Supabase Auth.
    Linked DB rows cascade via FK on auth.users (see supabase migrations).
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Account deletion is not configured on the server (missing service role key).",
        )

    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.delete(
            f"{base}/auth/v1/admin/users/{user_id}",
            headers={
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "apikey": settings.supabase_service_role_key,
            },
        )

    if response.status_code not in (200, 204):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not delete account. Check server Supabase configuration.",
        )

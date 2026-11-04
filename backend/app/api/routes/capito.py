"""
Capito — CapitalAI AI assistant (authenticated chat with user finance context).
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.schemas import (
    CapitoChatRequest,
    CapitoChatResponse,
    CapitoGoalSuggestion,
    CapitoSaveGoalResponse,
)
from app.services.capito_chat import capito_reply
from app.services.capito_context import build_user_finance_context
from app.services.goal_create import create_manual_goal

router = APIRouter(prefix="/capito", tags=["capito"])

MAX_HISTORY = 12
MAX_MESSAGE_LEN = 4000


async def _capito_create_goal_reply(
    db: AsyncSession,
    user_id: str,
    title: str,
    target_amount,
):
    """Shared by confirm_goal chat and POST /save-goal — writes to goals table for the Goals tab."""
    uid = uuid.UUID(user_id)
    goal = await create_manual_goal(db, uid, title=title, target_amount=target_amount)
    amount = f"${float(goal.target_amount):,.0f}"
    reply = (
        f"I saved \"{goal.title}\" with a target of {amount} to your Goals tab. "
        f"Open Goals anytime to track progress."
    )
    return reply


@router.post("/chat", response_model=CapitoChatResponse)
async def capito_chat(
    body: CapitoChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")
    if len(message) > MAX_MESSAGE_LEN:
        raise HTTPException(status_code=400, detail="Message is too long.")

    # User said yes to a goal offer — Capito creates the goal in Postgres (browser does not call POST /goals).
    if body.confirm_goal is not None:
        reply = await _capito_create_goal_reply(
            db,
            user_id,
            body.confirm_goal.title,
            body.confirm_goal.target_amount,
        )
        return CapitoChatResponse(reply=reply, assistant_name="Capito", goal_suggestion=None)

    history: list[dict[str, str]] = []
    for turn in body.history[-MAX_HISTORY:]:
        if turn.role not in ("user", "assistant"):
            continue
        text = turn.content.strip()
        if text:
            history.append({"role": turn.role, "content": text[:MAX_MESSAGE_LEN]})

    try:
        context = await build_user_finance_context(user_id, db)
        reply, suggestion = await capito_reply(
            settings,
            user_context=context,
            history=history,
            user_message=message,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    goal_payload = None
    if suggestion:
        goal_payload = CapitoGoalSuggestion(
            title=suggestion.title,
            target_amount=suggestion.target_amount,
        )

    return CapitoChatResponse(
        reply=reply,
        assistant_name="Capito",
        goal_suggestion=goal_payload,
    )


@router.post("/save-goal", response_model=CapitoSaveGoalResponse)
async def capito_save_suggested_goal(
    body: CapitoGoalSuggestion,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Browser Save to Goals button — same DB write as confirm_goal, no chat message required."""
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Goal title is required.")
    if body.target_amount <= 0:
        raise HTTPException(status_code=400, detail="Target amount must be positive.")
    reply = await _capito_create_goal_reply(db, user_id, title, body.target_amount)
    return CapitoSaveGoalResponse(reply=reply, assistant_name="Capito")

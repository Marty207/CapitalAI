"""
Parse optional goal-creation hints from Capito model output (stripped before showing the user).
"""

import json
import re
from dataclasses import dataclass
from decimal import Decimal

# Model appends this block when it wants to offer creating a savings goal in the app.
_GOAL_BLOCK = re.compile(
    r"<<<GOAL_SUGGESTION>>>\s*(\{.*?\})\s*<<<END>>>",
    re.DOTALL,
)


@dataclass
class ParsedGoalSuggestion:
    title: str
    target_amount: Decimal


def parse_capito_reply(raw: str) -> tuple[str, ParsedGoalSuggestion | None]:
    match = _GOAL_BLOCK.search(raw)
    visible = _GOAL_BLOCK.sub("", raw).strip() if match else raw.strip()
    if not match:
        return visible, None
    try:
        data = json.loads(match.group(1))
        title = str(data.get("title", "")).strip()
        target = Decimal(str(data.get("target_amount", "0")))
        if title and target > 0:
            return visible, ParsedGoalSuggestion(title=title, target_amount=target)
    except (json.JSONDecodeError, TypeError, ValueError, ArithmeticError):
        pass
    return visible, None


def fallback_goal_suggestion(user_message: str, visible_reply: str) -> ParsedGoalSuggestion | None:
    """
    When the model offered a goal in plain text but skipped the GOAL_SUGGESTION block,
    infer a suggestion so the chat UI can show Save to Goals.
    """
    reply_l = visible_reply.lower()
    if "goal" not in reply_l:
        return None
    if not any(
        phrase in reply_l
        for phrase in (
            "would you like",
            "want me to",
            "shall i",
            "create that",
            "add that",
            "create a goal",
            "set up a goal",
        )
    ):
        return None

    um = user_message.lower()
    if "car" in um or "down payment" in um:
        return ParsedGoalSuggestion("Car down payment", Decimal("8000"))
    if "emergency" in um:
        return ParsedGoalSuggestion("Emergency fund", Decimal("5000"))
    if "vacation" in um or "trip" in um:
        return ParsedGoalSuggestion("Vacation fund", Decimal("2500"))
    if "house" in um or "home" in um:
        return ParsedGoalSuggestion("Home down payment", Decimal("20000"))
    return ParsedGoalSuggestion("Savings goal", Decimal("5000"))

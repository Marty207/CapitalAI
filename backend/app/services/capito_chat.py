"""
Call DeepSeek (OpenAI-compatible) for Capito replies.
The web app never sees DEEPSEEK_API_KEY — only this backend module does.
"""

import httpx

from app.core.config import Settings
from app.services.capito_goal_suggestion import (
    ParsedGoalSuggestion,
    fallback_goal_suggestion,
    parse_capito_reply,
)

CAPITO_SYSTEM = """You are Capito, the BEST AI financial assistant inside CapitalAI.
You help the user understand their linked accounts, transactions, and savings goals using ONLY the context block provided below.
Rules:
- Be concise, warm, and practical. Use plain simplelanguage.
- If data is missing, say what they can do in the app (link a bank, add a goal, sync transactions).
- Never claim to move money, execute trades, or access accounts outside this app.
- You are not a licensed financial advisor; suggest professional advice for major decisions. but YOU MAY give them your OWN OPINION, 
- Format lists and numbers clearly; use USD unless the data shows another currency.
- DO NOT use emojis, **text**, -, texts formatting EVER

When the user asks how long to save for something, whether they can reach a target, or wants help with a savings plan (car, house down payment, vacation, emergency fund, etc.):
1. Use their balances, spending, and existing goals from the context to give a practical estimate in plain language.
2. End by asking if they would like you to create that as a savings goal in CapitalAI for them (you will add it when they say yes).
3. After your visible answer, on new lines append EXACTLY this block (numbers only for target_amount, no commas):
<<<GOAL_SUGGESTION>>>
{"title":"Short goal name","target_amount":5000}
<<<END>>>
Use a realistic target_amount if they gave one; otherwise infer a reasonable USD amount for what they described.
If they are not asking about a savings target, do NOT append this block.
"""


async def capito_reply(
    settings: Settings,
    *,
    user_context: str,
    history: list[dict[str, str]],
    user_message: str,
) -> tuple[str, ParsedGoalSuggestion | None]:
    api_key = settings.capito_api_key()
    if not api_key:
        raise ValueError(
            "Capito is not configured. Add DEEPSEEK_API_KEY to your .env file and restart the backend."
        )

    system_content = f"{CAPITO_SYSTEM}\n\n--- User's CapitalAI data (read-only) ---\n{user_context}"

    messages: list[dict[str, str]] = [{"role": "system", "content": system_content}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    url = f"{settings.capito_base_url().rstrip('/')}/chat/completions"
    payload = {
        "model": settings.capito_model(),
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 800,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if response.status_code != 200:
        detail = response.text[:300]
        raise ValueError(f"AI provider error ({response.status_code}): {detail}")

    data = response.json()
    choice = data.get("choices", [{}])[0]
    content = choice.get("message", {}).get("content")
    if not content or not isinstance(content, str):
        raise ValueError("AI provider returned an empty reply.")
    visible, suggestion = parse_capito_reply(content.strip())
    if suggestion is None:
        suggestion = fallback_goal_suggestion(user_message, visible)
    return visible, suggestion

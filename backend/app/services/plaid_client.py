from functools import lru_cache

from plaid import Configuration, Environment
from plaid.api import plaid_api
from plaid.api_client import ApiClient

from app.core.config import get_settings

PLAID_ENV_MAP = {
    "sandbox": Environment.Sandbox,
    # Plaid removed the old Development host; real banks use Production + production secret.
    "production": Environment.Production,
    "development": Environment.Production,
}


def resolve_plaid_host(env_name: str) -> Environment:
    key = (env_name or "sandbox").strip().lower()
    return PLAID_ENV_MAP.get(key, Environment.Sandbox)


@lru_cache
def get_plaid_client() -> plaid_api.PlaidApi:
    settings = get_settings()
    env = resolve_plaid_host(settings.plaid_env)
    configuration = Configuration(
        host=env,
        api_key={
            "clientId": settings.plaid_client_id,
            "secret": settings.plaid_secret,
        },
    )
    api_client = ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "CapitalAI API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Database (Supabase PostgreSQL)
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:54322/postgres"
    database_ssl_relaxed: bool = True

    # Supabase Auth
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""
    # Server-only — required for DELETE /account (Supabase Auth admin).
    supabase_service_role_key: str = ""

    # Plaid
    plaid_client_id: str = ""
    plaid_secret: str = ""
    plaid_env: str = "sandbox"  # sandbox | development | production
    plaid_webhook_url: str = ""
    plaid_link_customization_name: str = ""  # empty = Plaid "default"
    plaid_redirect_uri: str = ""  # required for OAuth banks (web + mobile)

    def plaid_environment(self) -> str:
        """Normalized Plaid mode exposed to the app: sandbox | production."""
        raw = self.plaid_env.strip().lower()
        if raw in ("production", "development"):
            return "production"
        return "sandbox"

    # Capito — DeepSeek chat API (OpenAI-compatible; key stays on server only).
    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-chat"
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    # Optional fallback if you prefer OpenAI instead of DeepSeek.
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = "https://api.openai.com/v1"

    def capito_api_key(self) -> str:
        return (self.deepseek_api_key or self.openai_api_key).strip()

    def capito_model(self) -> str:
        if self.deepseek_api_key.strip():
            return self.deepseek_model
        return self.openai_model

    def capito_base_url(self) -> str:
        if self.deepseek_api_key.strip():
            return self.deepseek_base_url
        return self.openai_base_url

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8081",
        "exp://localhost:8081",
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()

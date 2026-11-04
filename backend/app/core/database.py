import ssl
from collections.abc import AsyncGenerator

import certifi
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

connect_args: dict = {}
# Hosted Supabase (direct host or pooler) needs TLS.
if "supabase.co" in settings.database_url or "pooler.supabase.com" in settings.database_url:
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    # Some local Python installs fail Supabase cert verification; allow opt-out.
    if settings.database_ssl_relaxed:
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_context

# Supabase pooler: use session mode (port 5432) in DATABASE_URL when possible.
# Transaction pooler (6543) needs the caches disabled below.
if "pooler.supabase.com" in settings.database_url:
    connect_args["statement_cache_size"] = 0
    connect_args["prepared_statement_cache_size"] = 0

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

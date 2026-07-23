import uuid
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from .config import get_settings

settings = get_settings()

engine_kwargs: dict[str, object] = {"pool_pre_ping": True}
if settings.sqlalchemy_database_url.startswith("postgresql+asyncpg://"):
    # Supabase Transaction Pooler uses PgBouncer in transaction mode.
    # PgBouncer cannot safely reuse asyncpg prepared statement names across
    # pooled server connections, so disable both caches, generate unique names,
    # and avoid SQLAlchemy's client-side connection pool.
    engine_kwargs.update(
        {
            "poolclass": NullPool,
            "connect_args": {
                "ssl": "require",
                "statement_cache_size": 0,
                "prepared_statement_cache_size": 0,
                "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4()}__",
            },
        }
    )

engine = create_async_engine(settings.sqlalchemy_database_url, **engine_kwargs)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def create_database_tables() -> None:
    from . import moderation_models, models  # noqa: F401

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

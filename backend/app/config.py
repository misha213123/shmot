from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite+aiosqlite:///./driply.db"
    frontend_url: str = "http://localhost:5173"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def sqlalchemy_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        return url

    @property
    def cors_origins(self) -> list[str]:
        values = {
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://shmot-lime.vercel.app",
            self.frontend_url.rstrip("/"),
        }
        return sorted(value for value in values if value)


@lru_cache
def get_settings() -> Settings:
    return Settings()

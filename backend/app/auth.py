import uuid
from dataclasses import dataclass

import httpx
from fastapi import Header, HTTPException, status

from .config import get_settings


@dataclass(frozen=True)
class AuthUser:
    id: uuid.UUID
    email: str | None


async def get_current_user(authorization: str | None = Header(default=None)) -> AuthUser:
    """Validate a Supabase access token using the Auth user endpoint."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
        )

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth не настроен на сервере",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пустой токен")

    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_service_role_key,
    }
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Сервис авторизации временно недоступен",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Сессия недействительна или истекла",
        )

    data = response.json()
    try:
        user_id = uuid.UUID(data["id"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный пользователь Supabase",
        ) from exc

    return AuthUser(id=user_id, email=data.get("email"))

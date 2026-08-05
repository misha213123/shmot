from __future__ import annotations

from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from .admin import require_owner
from .auth import AuthUser
from .config import get_settings
from .database import get_session
from .models import Product, Profile

router = APIRouter(prefix="/api/v1/admin/maintenance", tags=["admin-maintenance"])
settings = get_settings()
STORAGE_BUCKET = "product-images"


class ResetPayload(BaseModel):
    scope: Literal["products", "profiles"]
    confirmation: str


class ResetResult(BaseModel):
    scope: str
    deleted_storage_objects: int
    message: str


def _required_confirmation(scope: str) -> str:
    return "DELETE ALL PRODUCTS" if scope == "products" else "RESET ALL PROFILES"


def _storage_headers() -> dict[str, str]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase service role is not configured on the backend",
        )
    return {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
        "Content-Type": "application/json",
    }


async def _list_storage_objects(client: httpx.AsyncClient, prefix: str = "") -> list[str]:
    result: list[str] = []
    offset = 0
    while True:
        response = await client.post(
            f"{settings.supabase_url}/storage/v1/object/list/{STORAGE_BUCKET}",
            headers=_storage_headers(),
            json={
                "prefix": prefix,
                "limit": 100,
                "offset": offset,
                "sortBy": {"column": "name", "order": "asc"},
            },
        )
        if response.status_code == 404:
            return result
        if response.is_error:
            raise HTTPException(status_code=502, detail="Could not list Supabase Storage objects")

        entries = response.json()
        if not isinstance(entries, list):
            raise HTTPException(status_code=502, detail="Unexpected Supabase Storage response")

        for entry in entries:
            name = entry.get("name") if isinstance(entry, dict) else None
            if not name:
                continue
            path = f"{prefix}/{name}" if prefix else name
            is_folder = entry.get("id") is None and entry.get("metadata") is None
            if is_folder:
                result.extend(await _list_storage_objects(client, path))
            else:
                result.append(path)

        if len(entries) < 100:
            break
        offset += len(entries)
    return result


async def _delete_storage_objects(paths: list[str]) -> int:
    if not paths:
        return 0
    async with httpx.AsyncClient(timeout=30) as client:
        deleted = 0
        for index in range(0, len(paths), 100):
            chunk = paths[index:index + 100]
            response = await client.request(
                "DELETE",
                f"{settings.supabase_url}/storage/v1/object/{STORAGE_BUCKET}",
                headers=_storage_headers(),
                json={"prefixes": chunk},
            )
            if response.is_error:
                raise HTTPException(status_code=502, detail="Could not remove Supabase Storage objects")
            deleted += len(chunk)
        return deleted


@router.post("/reset", response_model=ResetResult)
async def reset_data(
    payload: ResetPayload,
    _: AuthUser = Depends(require_owner),
    session: AsyncSession = Depends(get_session),
) -> ResetResult:
    expected = _required_confirmation(payload.scope)
    if payload.confirmation != expected:
        raise HTTPException(status_code=400, detail=f"Type exactly: {expected}")

    async with httpx.AsyncClient(timeout=30) as client:
        all_objects = await _list_storage_objects(client)

    if payload.scope == "products":
        storage_paths = [path for path in all_objects if "/avatars/" not in f"/{path}"]
        deleted_storage = await _delete_storage_objects(storage_paths)
        await session.execute(delete(Product))
        await session.commit()
        return ResetResult(
            scope=payload.scope,
            deleted_storage_objects=deleted_storage,
            message="All products and product photos were deleted",
        )

    deleted_storage = await _delete_storage_objects(all_objects)
    await session.execute(delete(Profile))
    await session.commit()
    return ResetResult(
        scope=payload.scope,
        deleted_storage_objects=deleted_storage,
        message="All profiles and uploaded photos were deleted; auth users were preserved",
    )

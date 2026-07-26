import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import AuthUser, get_current_user
from .database import get_session
from .models import AdminRole, Product, ProductStatus, Profile

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])
MASTER_ADMIN_USERNAME = "dooista"


class AdminStats(BaseModel):
    users: int
    products: int
    active_products: int
    sold_products: int


class AdminAccessRead(BaseModel):
    is_admin: bool
    is_owner: bool
    username: str


class AdminUserRead(BaseModel):
    id: uuid.UUID
    email: str | None
    username: str
    display_name: str
    country_code: str
    city: str
    is_verified: bool
    is_admin: bool = False
    is_owner: bool = False


class AdminGrantPayload(BaseModel):
    username: str = Field(min_length=3, max_length=40)


class AdminProductRead(BaseModel):
    id: uuid.UUID
    title: str
    brand: str
    status: ProductStatus
    price: str
    currency: str
    seller_id: uuid.UUID
    seller_username: str


class AdminProductStatusUpdate(BaseModel):
    status: ProductStatus


async def current_profile(user: AuthUser, session: AsyncSession) -> Profile:
    profile = await session.get(Profile, user.id)
    if profile is None:
        raise HTTPException(status_code=403, detail="Профиль пользователя не найден")
    return profile


async def require_admin(
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AuthUser:
    profile = await current_profile(user, session)
    if profile.username.lower() == MASTER_ADMIN_USERNAME:
        return user
    role = await session.get(AdminRole, profile.id)
    if role is None:
        raise HTTPException(status_code=403, detail="Нет доступа к админ-панели")
    return user


async def require_owner(
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AuthUser:
    profile = await current_profile(user, session)
    if profile.username.lower() != MASTER_ADMIN_USERNAME:
        raise HTTPException(status_code=403, detail="Только главный администратор может выдавать права")
    return user


@router.get("/me", response_model=AdminAccessRead)
async def admin_me(
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AdminAccessRead:
    profile = await current_profile(user, session)
    is_owner = profile.username.lower() == MASTER_ADMIN_USERNAME
    role = await session.get(AdminRole, profile.id)
    return AdminAccessRead(is_admin=is_owner or role is not None, is_owner=is_owner, username=profile.username)


@router.get("/stats", response_model=AdminStats)
async def stats(_: AuthUser = Depends(require_admin), session: AsyncSession = Depends(get_session)) -> AdminStats:
    users = await session.scalar(select(func.count(Profile.id))) or 0
    products = await session.scalar(select(func.count(Product.id))) or 0
    active = await session.scalar(select(func.count(Product.id)).where(Product.status == ProductStatus.active)) or 0
    sold = await session.scalar(select(func.count(Product.id)).where(Product.status == ProductStatus.sold)) or 0
    return AdminStats(users=users, products=products, active_products=active, sold_products=sold)


@router.get("/users", response_model=list[AdminUserRead])
async def users(
    _: AuthUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[AdminUserRead]:
    rows = (await session.scalars(select(Profile).order_by(Profile.created_at.desc()).limit(limit))).all()
    admin_ids = set((await session.scalars(select(AdminRole.user_id))).all())
    return [AdminUserRead(
        id=row.id,
        email=row.email,
        username=row.username,
        display_name=row.display_name,
        country_code=row.country_code,
        city=row.city,
        is_verified=row.is_verified,
        is_admin=row.id in admin_ids or row.username.lower() == MASTER_ADMIN_USERNAME,
        is_owner=row.username.lower() == MASTER_ADMIN_USERNAME,
    ) for row in rows]


@router.post("/admins", response_model=AdminUserRead)
async def grant_admin(
    payload: AdminGrantPayload,
    owner: AuthUser = Depends(require_owner),
    session: AsyncSession = Depends(get_session),
) -> AdminUserRead:
    username = payload.username.strip().removeprefix("@").lower()
    profile = await session.scalar(select(Profile).where(func.lower(Profile.username) == username))
    if profile is None:
        raise HTTPException(status_code=404, detail="Пользователь с таким @username не найден")
    if profile.username.lower() != MASTER_ADMIN_USERNAME and await session.get(AdminRole, profile.id) is None:
        session.add(AdminRole(user_id=profile.id, role="admin", granted_by=owner.id))
        await session.commit()
    return AdminUserRead(
        id=profile.id, email=profile.email, username=profile.username,
        display_name=profile.display_name, country_code=profile.country_code,
        city=profile.city, is_verified=profile.is_verified,
        is_admin=True, is_owner=profile.username.lower() == MASTER_ADMIN_USERNAME,
    )


@router.delete("/admins/{username}", status_code=204)
async def revoke_admin(
    username: str,
    _: AuthUser = Depends(require_owner),
    session: AsyncSession = Depends(get_session),
) -> None:
    clean = username.strip().removeprefix("@").lower()
    if clean == MASTER_ADMIN_USERNAME:
        raise HTTPException(status_code=400, detail="Нельзя снять права у главного администратора")
    profile = await session.scalar(select(Profile).where(func.lower(Profile.username) == clean))
    if profile is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    await session.execute(delete(AdminRole).where(AdminRole.user_id == profile.id))
    await session.commit()


@router.get("/products", response_model=list[AdminProductRead])
async def products(
    _: AuthUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[AdminProductRead]:
    rows = (await session.execute(
        select(Product, Profile.username)
        .join(Profile, Profile.id == Product.seller_id)
        .order_by(Product.created_at.desc())
        .limit(limit)
    )).all()
    return [AdminProductRead(
        id=product.id, title=product.title, brand=product.brand, status=product.status,
        price=str(product.price), currency=product.currency, seller_id=product.seller_id,
        seller_username=username,
    ) for product, username in rows]


@router.patch("/products/{product_id}/status", response_model=AdminProductRead)
async def set_product_status(
    product_id: uuid.UUID,
    payload: AdminProductStatusUpdate,
    _: AuthUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> AdminProductRead:
    product = await session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    product.status = payload.status
    await session.commit()
    await session.refresh(product)
    seller = await session.get(Profile, product.seller_id)
    return AdminProductRead(
        id=product.id, title=product.title, brand=product.brand, status=product.status,
        price=str(product.price), currency=product.currency, seller_id=product.seller_id,
        seller_username=seller.username if seller else "unknown",
    )


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: uuid.UUID,
    _: AuthUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> None:
    product = await session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    await session.delete(product)
    await session.commit()

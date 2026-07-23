import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import AuthUser, get_current_user
from .config import get_settings
from .database import get_session
from .models import Product, ProductStatus, Profile

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


class AdminStats(BaseModel):
    users: int
    products: int
    active_products: int
    sold_products: int


class AdminUserRead(BaseModel):
    id: uuid.UUID
    email: str | None
    username: str
    display_name: str
    country_code: str
    city: str
    is_verified: bool


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


def require_admin(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    settings = get_settings()
    if not user.email or user.email.lower() not in settings.admin_email_set:
        raise HTTPException(status_code=403, detail="Нет доступа к админ-панели")
    return user


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
    return [AdminUserRead(
        id=row.id, email=row.email, username=row.username, display_name=row.display_name,
        country_code=row.country_code, city=row.city, is_verified=row.is_verified,
    ) for row in rows]


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

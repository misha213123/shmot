from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .database import get_session
from .marketplace import product_to_schema
from .models import Product, ProductStatus, Profile
from .schemas import ProductListResponse

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("/products", response_model=ProductListResponse)
async def advanced_product_search(
    session: AsyncSession = Depends(get_session),
    q: str | None = Query(default=None, max_length=120),
    country: str | None = Query(default=None, min_length=2, max_length=2),
    city: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=80),
    brand: str | None = Query(default=None, max_length=100),
    seller: str | None = Query(default=None, max_length=40),
    size: str | None = Query(default=None, max_length=40),
    condition: str | None = Query(default=None, max_length=60),
    currency: str | None = Query(default=None, min_length=3, max_length=3),
    delivery: Literal["shipping", "meeting", "both"] | None = None,
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    sort: Literal["newest", "price_asc", "price_desc", "popular"] = "newest",
    limit: int = Query(default=40, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> ProductListResponse:
    filters = [Product.status == ProductStatus.active]

    if q:
        value = f"%{q.strip().lower()}%"
        filters.append(or_(
            func.lower(Product.title).like(value),
            func.lower(Product.brand).like(value),
            func.lower(Product.category).like(value),
            func.lower(Product.description).like(value),
            func.lower(Product.city).like(value),
            func.lower(Profile.username).like(value),
            func.lower(Profile.display_name).like(value),
        ))
    if country:
        filters.append(Product.country_code == country.upper())
    if city:
        filters.append(func.lower(Product.city).like(f"%{city.strip().lower()}%"))
    if category:
        filters.append(func.lower(Product.category) == category.strip().lower())
    if brand:
        filters.append(func.lower(Product.brand).like(f"%{brand.strip().lower()}%"))
    if seller:
        filters.append(func.lower(Profile.username).like(f"%{seller.strip().lstrip('@').lower()}%"))
    if size:
        filters.append(func.lower(Product.size) == size.strip().lower())
    if condition:
        filters.append(func.lower(Product.condition) == condition.strip().lower())
    if currency:
        filters.append(Product.currency == currency.upper())
    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)
    if delivery:
        delivery_text = func.lower(func.coalesce(Product.delivery, ""))
        if delivery == "shipping":
            filters.append(or_(delivery_text.like("%отправ%"), delivery_text.like("%достав%")))
        elif delivery == "meeting":
            filters.append(or_(delivery_text.like("%встреч%"), delivery_text.like("%личн%")))
        else:
            filters.append(or_(delivery_text.like("%оба%"), delivery_text.like("%встреч%"), delivery_text.like("%отправ%")))

    base = select(Product).join(Profile, Profile.id == Product.seller_id).where(*filters)
    total = await session.scalar(select(func.count(Product.id)).join(Profile, Profile.id == Product.seller_id).where(*filters)) or 0

    if sort == "price_asc":
        ordering = (asc(Product.price), desc(Product.created_at))
    elif sort == "price_desc":
        ordering = (desc(Product.price), desc(Product.created_at))
    elif sort == "popular":
        ordering = (desc(Product.favorites_count), desc(Product.views_count), desc(Product.created_at))
    else:
        ordering = (desc(Product.created_at),)

    statement = (
        base.options(selectinload(Product.images), selectinload(Product.seller))
        .order_by(*ordering)
        .offset(offset)
        .limit(limit)
    )
    products = (await session.scalars(statement)).unique().all()
    return ProductListResponse(items=[product_to_schema(item) for item in products], total=total)

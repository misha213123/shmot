import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .auth import AuthUser, get_current_user
from .authenticated import require_profile
from .database import get_session
from .marketplace import product_to_schema
from .models import Favorite, Follow, Product, ProductStatus, ProductView, SwipeAction, SwipeActionType
from .schemas import ActionResponse, ProductListResponse

router = APIRouter(prefix="/api/v1", tags=["recommendations"])


def _product_query():
    return select(Product).options(selectinload(Product.images), selectinload(Product.seller))


async def _load_preferences(user_id: uuid.UUID, session: AsyncSession) -> tuple[Counter[str], Counter[str], Counter[str], Decimal | None]:
    brand_scores: Counter[str] = Counter()
    category_scores: Counter[str] = Counter()
    size_scores: Counter[str] = Counter()
    prices: list[Decimal] = []

    favorite_products = (
        await session.scalars(
            select(Product)
            .join(Favorite, Favorite.product_id == Product.id)
            .where(Favorite.user_id == user_id)
        )
    ).all()
    liked_products = (
        await session.scalars(
            select(Product)
            .join(SwipeAction, SwipeAction.product_id == Product.id)
            .where(SwipeAction.user_id == user_id, SwipeAction.action == SwipeActionType.like)
        )
    ).all()
    viewed_products = (
        await session.scalars(
            select(Product)
            .join(ProductView, ProductView.product_id == Product.id)
            .where(ProductView.user_id == user_id)
            .order_by(ProductView.created_at.desc())
            .limit(80)
        )
    ).all()

    for products, weight in ((favorite_products, 6), (liked_products, 4), (viewed_products, 1)):
        for product in products:
            brand_scores[product.brand.lower()] += weight
            category_scores[product.category.lower()] += weight
            if product.size:
                size_scores[product.size.lower()] += weight
            prices.extend([Decimal(product.price)] * weight)

    average_price = sum(prices, Decimal("0")) / len(prices) if prices else None
    return brand_scores, category_scores, size_scores, average_price


@router.get("/me/recommendations", response_model=ProductListResponse)
async def recommendations(
    limit: int = Query(default=40, ge=1, le=100),
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProductListResponse:
    profile = await require_profile(user, session)
    brands, categories, sizes, average_price = await _load_preferences(user.id, session)
    followed_ids = set(
        (await session.scalars(select(Follow.seller_id).where(Follow.follower_id == user.id))).all()
    )
    skipped_ids = set(
        (await session.scalars(
            select(SwipeAction.product_id).where(
                SwipeAction.user_id == user.id,
                SwipeAction.action == SwipeActionType.skip,
            )
        )).all()
    )

    products = (
        await session.scalars(
            _product_query()
            .where(Product.status == ProductStatus.active, Product.seller_id != user.id)
            .order_by(Product.created_at.desc())
            .limit(300)
        )
    ).unique().all()

    now = datetime.now(timezone.utc)

    def score(product: Product) -> float:
        value = 0.0
        value += brands[product.brand.lower()] * 5
        value += categories[product.category.lower()] * 4
        if product.size:
            value += sizes[product.size.lower()] * 3
        if product.seller_id in followed_ids:
            value += 35
        if product.city.lower() == profile.city.lower():
            value += 8
        if product.country_code == profile.country_code:
            value += 4
        value += min(product.favorites_count, 40) * 0.7
        value += min(product.views_count, 200) * 0.04
        if average_price and average_price > 0:
            distance = abs(Decimal(product.price) - average_price) / average_price
            value += max(0, 14 - float(distance) * 14)
        age_days = max(0.0, (now - product.created_at).total_seconds() / 86400)
        value += max(0, 10 - age_days * 0.35)
        if product.id in skipped_ids:
            value -= 60
        return value

    ranked = sorted(products, key=score, reverse=True)[:limit]
    return ProductListResponse(items=[product_to_schema(item) for item in ranked], total=len(ranked))


@router.get("/me/recently-viewed", response_model=ProductListResponse)
async def recently_viewed(
    limit: int = Query(default=30, ge=1, le=100),
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProductListResponse:
    await require_profile(user, session)
    ids = (
        await session.scalars(
            select(ProductView.product_id)
            .where(ProductView.user_id == user.id)
            .order_by(ProductView.created_at.desc())
            .limit(limit * 4)
        )
    ).all()
    unique_ids = list(dict.fromkeys(ids))[:limit]
    if not unique_ids:
        return ProductListResponse(items=[], total=0)
    rows = (
        await session.scalars(_product_query().where(Product.id.in_(unique_ids)))
    ).unique().all()
    by_id = {item.id: item for item in rows}
    ordered = [by_id[item_id] for item_id in unique_ids if item_id in by_id]
    return ProductListResponse(items=[product_to_schema(item) for item in ordered], total=len(ordered))


@router.post("/me/products/{product_id}/view", response_model=ActionResponse)
async def record_authenticated_view(
    product_id: uuid.UUID,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ActionResponse:
    await require_profile(user, session)
    product = await session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    session.add(ProductView(user_id=user.id, product_id=product.id))
    product.views_count += 1
    await session.commit()
    return ActionResponse(message="Просмотр сохранён")


@router.get("/products/{product_id}/similar", response_model=ProductListResponse)
async def similar_products(
    product_id: uuid.UUID,
    limit: int = Query(default=12, ge=1, le=40),
    session: AsyncSession = Depends(get_session),
) -> ProductListResponse:
    source = await session.get(Product, product_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    rows = (
        await session.scalars(
            _product_query().where(
                Product.id != source.id,
                Product.status == ProductStatus.active,
            ).limit(120)
        )
    ).unique().all()

    def score(item: Product) -> float:
        value = 0.0
        if item.category.lower() == source.category.lower(): value += 30
        if item.brand.lower() == source.brand.lower(): value += 24
        if item.size and source.size and item.size.lower() == source.size.lower(): value += 12
        if item.color and source.color and item.color.lower() == source.color.lower(): value += 5
        base = max(float(source.price), 1.0)
        value += max(0, 16 - abs(float(item.price) - float(source.price)) / base * 16)
        value += min(item.favorites_count, 30) * 0.4
        return value

    ranked = sorted(rows, key=score, reverse=True)[:limit]
    return ProductListResponse(items=[product_to_schema(item) for item in ranked], total=len(ranked))


@router.get("/trending", response_model=ProductListResponse)
async def trending(
    limit: int = Query(default=20, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
) -> ProductListResponse:
    since = datetime.now(timezone.utc) - timedelta(days=2)
    view_counts = dict((await session.execute(
        select(ProductView.product_id, func.count(ProductView.id))
        .where(ProductView.created_at >= since)
        .group_by(ProductView.product_id)
    )).all())
    rows = (
        await session.scalars(
            _product_query().where(Product.status == ProductStatus.active).limit(200)
        )
    ).unique().all()
    ranked = sorted(
        rows,
        key=lambda item: view_counts.get(item.id, 0) * 2 + item.favorites_count * 5 + item.views_count * 0.05,
        reverse=True,
    )[:limit]
    return ProductListResponse(items=[product_to_schema(item) for item in ranked], total=len(ranked))

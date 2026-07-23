import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .database import get_session
from .models import Favorite, Product, ProductImage, ProductStatus, ProductView, Profile, SwipeAction
from .schemas import (
    ActionResponse,
    FavoriteRequest,
    ProductCreate,
    ProductImageRead,
    ProductListResponse,
    ProductRead,
    ProfileCreate,
    ProfileRead,
    SellerSummary,
    SwipeRequest,
    ViewRequest,
)

router = APIRouter(prefix="/api/v1", tags=["marketplace"])


def product_to_schema(product: Product) -> ProductRead:
    return ProductRead(
        id=product.id,
        seller_id=product.seller_id,
        title=product.title,
        brand=product.brand,
        category=product.category,
        description=product.description,
        size=product.size,
        color=product.color,
        condition=product.condition,
        price=Decimal(product.price),
        currency=product.currency,
        country_code=product.country_code,
        city=product.city,
        delivery=product.delivery,
        status=product.status,
        views_count=product.views_count,
        favorites_count=product.favorites_count,
        created_at=product.created_at,
        images=[ProductImageRead.model_validate(image) for image in product.images],
        seller=SellerSummary(
            id=product.seller.id,
            username=product.seller.username,
            display_name=product.seller.display_name,
            avatar_url=product.seller.avatar_url,
            city=product.seller.city,
            country_code=product.seller.country_code,
            is_verified=product.seller.is_verified,
            rating=Decimal(product.seller.rating),
        ),
    )


async def get_product_or_404(product_id: uuid.UUID, session: AsyncSession) -> Product:
    statement = (
        select(Product)
        .where(Product.id == product_id)
        .options(selectinload(Product.images), selectinload(Product.seller))
    )
    product = await session.scalar(statement)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Товар не найден")
    return product


@router.post("/profiles", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
async def create_profile(payload: ProfileCreate, session: AsyncSession = Depends(get_session)) -> Profile:
    duplicate = await session.scalar(
        select(Profile).where((Profile.username == payload.username) | (Profile.email == payload.email))
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username или email уже используется")

    profile = Profile(
        **payload.model_dump(mode="json", exclude_none=True),
        country_code=payload.country_code.upper(),
    )
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return profile


@router.get("/profiles/{profile_id}", response_model=ProfileRead)
async def get_profile(profile_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> Profile:
    profile = await session.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Профиль не найден")
    return profile


@router.post("/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate, session: AsyncSession = Depends(get_session)) -> ProductRead:
    seller = await session.get(Profile, payload.seller_id)
    if seller is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Профиль продавца не найден")

    images = payload.images
    cover_exists = any(image.is_cover for image in images)
    product_data = payload.model_dump(exclude={"images"})
    product_data["currency"] = payload.currency.upper()
    product_data["country_code"] = payload.country_code.upper()
    product = Product(**product_data, status=ProductStatus.active)
    product.images = [
        ProductImage(
            url=str(image.url),
            position=image.position,
            is_cover=image.is_cover or (not cover_exists and index == 0),
        )
        for index, image in enumerate(images)
    ]
    session.add(product)
    await session.commit()
    return product_to_schema(await get_product_or_404(product.id, session))


@router.get("/products", response_model=ProductListResponse)
async def list_products(
    session: AsyncSession = Depends(get_session),
    country: str | None = Query(default=None, min_length=2, max_length=2),
    city: str | None = None,
    category: str | None = None,
    brand: str | None = None,
    query: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> ProductListResponse:
    filters = [Product.status == ProductStatus.active]
    if country:
        filters.append(Product.country_code == country.upper())
    if city:
        filters.append(func.lower(Product.city) == city.lower())
    if category:
        filters.append(func.lower(Product.category) == category.lower())
    if brand:
        filters.append(func.lower(Product.brand) == brand.lower())
    if query:
        search = f"%{query.lower()}%"
        filters.append(
            func.lower(Product.title).like(search)
            | func.lower(Product.brand).like(search)
            | func.lower(Product.category).like(search)
            | func.lower(Product.city).like(search)
        )

    total = await session.scalar(select(func.count(Product.id)).where(*filters)) or 0
    statement = (
        select(Product)
        .where(*filters)
        .options(selectinload(Product.images), selectinload(Product.seller))
        .order_by(Product.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    products = (await session.scalars(statement)).unique().all()
    return ProductListResponse(items=[product_to_schema(item) for item in products], total=total)


@router.get("/products/{product_id}", response_model=ProductRead)
async def get_product(product_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> ProductRead:
    return product_to_schema(await get_product_or_404(product_id, session))


@router.post("/products/{product_id}/view", response_model=ActionResponse)
async def record_view(
    product_id: uuid.UUID,
    payload: ViewRequest,
    session: AsyncSession = Depends(get_session),
) -> ActionResponse:
    product = await get_product_or_404(product_id, session)
    session.add(ProductView(user_id=payload.user_id, product_id=product_id))
    product.views_count += 1
    await session.commit()
    return ActionResponse(message="Просмотр сохранён")


@router.post("/products/{product_id}/favorite", response_model=ActionResponse)
async def add_favorite(
    product_id: uuid.UUID,
    payload: FavoriteRequest,
    session: AsyncSession = Depends(get_session),
) -> ActionResponse:
    product = await get_product_or_404(product_id, session)
    existing = await session.scalar(
        select(Favorite).where(Favorite.user_id == payload.user_id, Favorite.product_id == product_id)
    )
    if existing is None:
        session.add(Favorite(user_id=payload.user_id, product_id=product_id))
        product.favorites_count += 1
        await session.commit()
    return ActionResponse(message="Добавлено в избранное")


@router.delete("/products/{product_id}/favorite", response_model=ActionResponse)
async def remove_favorite(
    product_id: uuid.UUID,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> ActionResponse:
    product = await get_product_or_404(product_id, session)
    result = await session.execute(
        delete(Favorite).where(Favorite.user_id == user_id, Favorite.product_id == product_id)
    )
    if result.rowcount:
        product.favorites_count = max(0, product.favorites_count - 1)
        await session.commit()
    return ActionResponse(message="Удалено из избранного")


@router.get("/profiles/{profile_id}/favorites", response_model=ProductListResponse)
async def list_favorites(profile_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> ProductListResponse:
    statement = (
        select(Product)
        .join(Favorite, Favorite.product_id == Product.id)
        .where(Favorite.user_id == profile_id)
        .options(selectinload(Product.images), selectinload(Product.seller))
        .order_by(Favorite.created_at.desc())
    )
    products = (await session.scalars(statement)).unique().all()
    return ProductListResponse(items=[product_to_schema(item) for item in products], total=len(products))


@router.post("/products/{product_id}/swipe", response_model=ActionResponse)
async def record_swipe(
    product_id: uuid.UUID,
    payload: SwipeRequest,
    session: AsyncSession = Depends(get_session),
) -> ActionResponse:
    await get_product_or_404(product_id, session)
    existing = await session.scalar(
        select(SwipeAction).where(
            SwipeAction.user_id == payload.user_id,
            SwipeAction.product_id == product_id,
        )
    )
    if existing:
        existing.action = payload.action
    else:
        session.add(SwipeAction(user_id=payload.user_id, product_id=product_id, action=payload.action))
    await session.commit()
    return ActionResponse(message=f"Свайп {payload.action.value} сохранён")

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .auth import AuthUser, get_current_user
from .database import get_session
from .marketplace import product_to_schema
from .models import Favorite, Follow, Notification, NotificationType, Product, ProductImage, ProductStatus, Profile, SwipeAction
from .schemas import (
    ActionResponse,
    ProductCreate,
    ProductListResponse,
    ProductRead,
    ProductStatusUpdate,
    ProfileRead,
    ProfileUpsert,
    SwipeRequest,
)

router = APIRouter(prefix="/api/v1/me", tags=["authenticated"])


async def require_profile(user: AuthUser, session: AsyncSession) -> Profile:
    profile = await session.get(Profile, user.id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Сначала заполните профиль")
    return profile


async def require_own_product(product_id: str, user: AuthUser, session: AsyncSession) -> Product:
    statement = (
        select(Product)
        .where(Product.id == product_id, Product.seller_id == user.id)
        .options(selectinload(Product.images), selectinload(Product.seller))
    )
    product = await session.scalar(statement)
    if product is None:
        raise HTTPException(status_code=404, detail="Объявление не найдено")
    return product


@router.get("/profile", response_model=ProfileRead)
async def get_my_profile(user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> Profile:
    return await require_profile(user, session)


@router.put("/profile", response_model=ProfileRead)
async def upsert_my_profile(payload: ProfileUpsert, user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> Profile:
    username_owner = await session.scalar(select(Profile).where(Profile.username == payload.username, Profile.id != user.id))
    if username_owner:
        raise HTTPException(status_code=409, detail="Этот username уже занят")
    profile = await session.get(Profile, user.id)
    values = payload.model_dump(mode="json", exclude_none=False)
    values["country_code"] = payload.country_code.upper()
    values["avatar_url"] = str(payload.avatar_url) if payload.avatar_url else None
    if profile is None:
        profile = Profile(id=user.id, email=user.email, **values)
        session.add(profile)
    else:
        for key, value in values.items():
            setattr(profile, key, value)
        profile.email = user.email
    await session.commit()
    await session.refresh(profile)
    return profile


@router.post("/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_my_product(payload: ProductCreate, user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> ProductRead:
    seller = await require_profile(user, session)
    product_data = payload.model_dump(exclude={"images", "seller_id"})
    product_data["seller_id"] = user.id
    product_data["currency"] = payload.currency.upper()
    product_data["country_code"] = payload.country_code.upper()
    cover_exists = any(image.is_cover for image in payload.images)
    product = Product(**product_data, status=ProductStatus.active)
    product.images = [
        ProductImage(url=str(image.url), position=image.position, is_cover=image.is_cover or (not cover_exists and index == 0))
        for index, image in enumerate(payload.images)
    ]
    session.add(product)
    await session.flush()

    follower_ids = (
        await session.scalars(select(Follow.follower_id).where(Follow.seller_id == user.id))
    ).all()
    for follower_id in follower_ids:
        session.add(Notification(
            user_id=follower_id,
            actor_id=user.id,
            product_id=product.id,
            type=NotificationType.new_product,
            title=f"Новая вещь от @{seller.username}",
            body=f"{product.brand} — {product.title}",
        ))

    await session.commit()
    statement = select(Product).where(Product.id == product.id).options(selectinload(Product.images), selectinload(Product.seller))
    saved = await session.scalar(statement)
    if saved is None:
        raise HTTPException(status_code=500, detail="Не удалось сохранить товар")
    return product_to_schema(saved)


@router.get("/products", response_model=ProductListResponse)
async def list_my_products(user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> ProductListResponse:
    await require_profile(user, session)
    statement = (
        select(Product)
        .where(Product.seller_id == user.id)
        .options(selectinload(Product.images), selectinload(Product.seller))
        .order_by(Product.created_at.desc())
    )
    products = (await session.scalars(statement)).unique().all()
    return ProductListResponse(items=[product_to_schema(item) for item in products], total=len(products))


@router.patch("/products/{product_id}/status", response_model=ProductRead)
async def update_my_product_status(product_id: str, payload: ProductStatusUpdate, user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> ProductRead:
    product = await require_own_product(product_id, user, session)
    product.status = payload.status
    await session.commit()
    await session.refresh(product)
    return product_to_schema(product)


@router.delete("/products/{product_id}", response_model=ActionResponse)
async def delete_my_product(product_id: str, user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> ActionResponse:
    product = await require_own_product(product_id, user, session)
    await session.delete(product)
    await session.commit()
    return ActionResponse(message="Объявление удалено")


@router.post("/products/{product_id}/favorite", response_model=ActionResponse)
async def favorite_product(product_id: str, user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> ActionResponse:
    profile = await require_profile(user, session)
    product = await session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    existing = await session.scalar(select(Favorite).where(Favorite.user_id == profile.id, Favorite.product_id == product.id))
    if existing is None:
        session.add(Favorite(user_id=profile.id, product_id=product.id))
        product.favorites_count += 1
        await session.commit()
    return ActionResponse(message="Добавлено в избранное")


@router.post("/products/{product_id}/swipe", response_model=ActionResponse)
async def swipe_product(product_id: str, payload: SwipeRequest, user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> ActionResponse:
    profile = await require_profile(user, session)
    product = await session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    existing = await session.scalar(select(SwipeAction).where(SwipeAction.user_id == profile.id, SwipeAction.product_id == product.id))
    if existing:
        existing.action = payload.action
    else:
        session.add(SwipeAction(user_id=profile.id, product_id=product.id, action=payload.action))
    await session.commit()
    return ActionResponse(message=f"Свайп {payload.action.value} сохранён")

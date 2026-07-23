import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .auth import AuthUser, get_current_user
from .authenticated import require_profile
from .database import get_session
from .marketplace import product_to_schema
from .models import Follow, Notification, Product, ProductStatus, Profile
from .schemas import ProductListResponse, ProductRead, ProfileRead

router = APIRouter(prefix="/api/v1/me", tags=["social"])


class FollowState(BaseModel):
    following: bool
    followers_count: int


class NotificationRead(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    body: str
    is_read: bool
    actor_id: uuid.UUID | None
    product_id: uuid.UUID | None
    created_at: datetime


class NotificationList(BaseModel):
    items: list[NotificationRead]
    unread_count: int


async def _follow_state(session: AsyncSession, follower_id: uuid.UUID, seller_id: uuid.UUID) -> FollowState:
    following = await session.scalar(
        select(Follow.id).where(Follow.follower_id == follower_id, Follow.seller_id == seller_id)
    )
    count = await session.scalar(select(func.count(Follow.id)).where(Follow.seller_id == seller_id)) or 0
    return FollowState(following=following is not None, followers_count=count)


@router.get("/following", response_model=list[ProfileRead])
async def following(
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Profile]:
    await require_profile(user, session)
    rows = (
        await session.scalars(
            select(Profile)
            .join(Follow, Follow.seller_id == Profile.id)
            .where(Follow.follower_id == user.id)
            .order_by(Follow.created_at.desc())
        )
    ).all()
    return list(rows)


@router.get("/following/products", response_model=ProductListResponse)
async def following_products(
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProductListResponse:
    await require_profile(user, session)
    products = (
        await session.scalars(
            select(Product)
            .join(Follow, Follow.seller_id == Product.seller_id)
            .where(Follow.follower_id == user.id, Product.status == ProductStatus.active)
            .options(selectinload(Product.images), selectinload(Product.seller))
            .order_by(Product.created_at.desc())
        )
    ).unique().all()
    return ProductListResponse(items=[product_to_schema(item) for item in products], total=len(products))


@router.get("/following/{seller_id}", response_model=FollowState)
async def get_follow_state(
    seller_id: uuid.UUID,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FollowState:
    await require_profile(user, session)
    seller = await session.get(Profile, seller_id)
    if seller is None:
        raise HTTPException(status_code=404, detail="Продавец не найден")
    return await _follow_state(session, user.id, seller_id)


@router.post("/following/{seller_id}", response_model=FollowState, status_code=status.HTTP_201_CREATED)
async def follow_seller(
    seller_id: uuid.UUID,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FollowState:
    await require_profile(user, session)
    if seller_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя подписаться на себя")
    seller = await session.get(Profile, seller_id)
    if seller is None:
        raise HTTPException(status_code=404, detail="Продавец не найден")
    existing = await session.scalar(
        select(Follow).where(Follow.follower_id == user.id, Follow.seller_id == seller_id)
    )
    if existing is None:
        session.add(Follow(follower_id=user.id, seller_id=seller_id))
        await session.commit()
    return await _follow_state(session, user.id, seller_id)


@router.delete("/following/{seller_id}", response_model=FollowState)
async def unfollow_seller(
    seller_id: uuid.UUID,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FollowState:
    await require_profile(user, session)
    existing = await session.scalar(
        select(Follow).where(Follow.follower_id == user.id, Follow.seller_id == seller_id)
    )
    if existing is not None:
        await session.delete(existing)
        await session.commit()
    return await _follow_state(session, user.id, seller_id)


@router.get("/notifications", response_model=NotificationList)
async def notifications(
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> NotificationList:
    await require_profile(user, session)
    rows = (
        await session.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(100)
        )
    ).all()
    unread = sum(1 for item in rows if not item.is_read)
    return NotificationList(
        items=[
            NotificationRead(
                id=item.id,
                type=item.type.value,
                title=item.title,
                body=item.body,
                is_read=item.is_read,
                actor_id=item.actor_id,
                product_id=item.product_id,
                created_at=item.created_at,
            )
            for item in rows
        ],
        unread_count=unread,
    )


@router.post("/notifications/read-all", status_code=204)
async def read_all_notifications(
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await require_profile(user, session)
    await session.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await session.commit()

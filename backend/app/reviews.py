import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint, func, select
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .admin import require_admin
from .auth import AuthUser, get_current_user
from .authenticated import require_profile
from .database import Base, get_session
from .deals import Deal, DealStatus
from .models import Profile


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("deal_id", name="uq_review_deal"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deals.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    seller_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class ReviewCreate(BaseModel):
    deal_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ReviewRead(BaseModel):
    id: uuid.UUID
    deal_id: uuid.UUID
    author_id: uuid.UUID
    author_username: str
    author_display_name: str
    seller_id: uuid.UUID
    rating: int
    comment: str | None
    created_at: datetime


class RatingSummary(BaseModel):
    rating: str
    reviews_count: int


router = APIRouter(tags=["reviews"])


async def review_schema(item: Review, session: AsyncSession) -> ReviewRead:
    author = await session.get(Profile, item.author_id)
    if author is None:
        raise HTTPException(status_code=404, detail="Автор отзыва не найден")
    return ReviewRead(
        id=item.id,
        deal_id=item.deal_id,
        author_id=item.author_id,
        author_username=author.username,
        author_display_name=author.display_name,
        seller_id=item.seller_id,
        rating=item.rating,
        comment=item.comment,
        created_at=item.created_at,
    )


async def recalculate_rating(seller_id: uuid.UUID, session: AsyncSession) -> None:
    average = await session.scalar(select(func.avg(Review.rating)).where(Review.seller_id == seller_id))
    seller = await session.get(Profile, seller_id)
    if seller is not None:
        seller.rating = Decimal(str(round(float(average or 0), 2)))


@router.post("/api/v1/me/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review(
    payload: ReviewCreate,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReviewRead:
    await require_profile(user, session)
    deal = await session.get(Deal, payload.deal_id)
    if deal is None or deal.buyer_id != user.id:
        raise HTTPException(status_code=404, detail="Завершённая покупка не найдена")
    if deal.status != DealStatus.completed:
        raise HTTPException(status_code=409, detail="Отзыв можно оставить только после завершения сделки")
    existing = await session.scalar(select(Review).where(Review.deal_id == deal.id))
    if existing is not None:
        raise HTTPException(status_code=409, detail="Отзыв по этой сделке уже оставлен")

    item = Review(
        deal_id=deal.id,
        author_id=user.id,
        seller_id=deal.seller_id,
        rating=payload.rating,
        comment=(payload.comment or "").strip() or None,
    )
    session.add(item)
    await session.flush()
    await recalculate_rating(deal.seller_id, session)
    await session.commit()
    await session.refresh(item)
    return await review_schema(item, session)


@router.get("/api/v1/profiles/{profile_id}/reviews", response_model=list[ReviewRead])
async def profile_reviews(
    profile_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[ReviewRead]:
    rows = (
        await session.scalars(
            select(Review)
            .where(Review.seller_id == profile_id)
            .order_by(Review.created_at.desc())
            .limit(limit)
        )
    ).all()
    return [await review_schema(item, session) for item in rows]


@router.get("/api/v1/profiles/{profile_id}/rating", response_model=RatingSummary)
async def profile_rating(profile_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> RatingSummary:
    average = await session.scalar(select(func.avg(Review.rating)).where(Review.seller_id == profile_id))
    count = await session.scalar(select(func.count(Review.id)).where(Review.seller_id == profile_id)) or 0
    return RatingSummary(rating=f"{float(average or 0):.2f}", reviews_count=count)


@router.get("/api/v1/admin/reviews", response_model=list[ReviewRead])
async def admin_reviews(
    _: AuthUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=200, ge=1, le=500),
) -> list[ReviewRead]:
    rows = (await session.scalars(select(Review).order_by(Review.created_at.desc()).limit(limit))).all()
    return [await review_schema(item, session) for item in rows]


@router.delete("/api/v1/admin/reviews/{review_id}", status_code=204)
async def delete_review(
    review_id: uuid.UUID,
    _: AuthUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> None:
    item = await session.get(Review, review_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Отзыв не найден")
    seller_id = item.seller_id
    await session.delete(item)
    await session.flush()
    await recalculate_rating(seller_id, session)
    await session.commit()

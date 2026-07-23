import enum
import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint, func, or_, select
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .auth import AuthUser, get_current_user
from .authenticated import require_profile
from .database import Base, get_session
from .models import Product, ProductImage, ProductStatus, Profile


class OfferStatus(str, enum.Enum):
    pending = "pending"
    countered = "countered"
    accepted = "accepted"
    rejected = "rejected"
    cancelled = "cancelled"


class DealStatus(str, enum.Enum):
    agreed = "agreed"
    paid = "paid"
    shipped = "shipped"
    received = "received"
    completed = "completed"
    cancelled = "cancelled"


class PriceOffer(Base):
    __tablename__ = "price_offers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    buyer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    seller_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[OfferStatus] = mapped_column(Enum(OfferStatus), default=OfferStatus.pending, index=True)
    counter_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Deal(Base):
    __tablename__ = "deals"
    __table_args__ = (UniqueConstraint("offer_id", name="uq_deal_offer"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("price_offers.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    buyer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    seller_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[DealStatus] = mapped_column(Enum(DealStatus), default=DealStatus.agreed, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OfferCreate(BaseModel):
    product_id: uuid.UUID
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)


class CounterOffer(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)


class DealStatusUpdate(BaseModel):
    status: DealStatus


class OfferRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_title: str
    product_image: str | None
    buyer_id: uuid.UUID
    buyer_username: str
    seller_id: uuid.UUID
    seller_username: str
    amount: str
    counter_amount: str | None
    currency: str
    status: OfferStatus
    created_at: datetime


class DealRead(BaseModel):
    id: uuid.UUID
    offer_id: uuid.UUID
    product_id: uuid.UUID
    product_title: str
    product_image: str | None
    buyer_id: uuid.UUID
    buyer_username: str
    seller_id: uuid.UUID
    seller_username: str
    amount: str
    currency: str
    status: DealStatus
    created_at: datetime


router = APIRouter(prefix="/api/v1/me", tags=["deals"])


async def offer_schema(item: PriceOffer, session: AsyncSession) -> OfferRead:
    product = await session.get(Product, item.product_id)
    buyer = await session.get(Profile, item.buyer_id)
    seller = await session.get(Profile, item.seller_id)
    image = await session.scalar(select(ProductImage.url).where(ProductImage.product_id == item.product_id).order_by(ProductImage.position).limit(1))
    if not product or not buyer or not seller:
        raise HTTPException(status_code=404, detail="Данные предложения недоступны")
    return OfferRead(id=item.id, product_id=item.product_id, product_title=product.title, product_image=image,
        buyer_id=item.buyer_id, buyer_username=buyer.username, seller_id=item.seller_id, seller_username=seller.username,
        amount=str(item.amount), counter_amount=str(item.counter_amount) if item.counter_amount is not None else None,
        currency=item.currency, status=item.status, created_at=item.created_at)


async def deal_schema(item: Deal, session: AsyncSession) -> DealRead:
    product = await session.get(Product, item.product_id)
    buyer = await session.get(Profile, item.buyer_id)
    seller = await session.get(Profile, item.seller_id)
    image = await session.scalar(select(ProductImage.url).where(ProductImage.product_id == item.product_id).order_by(ProductImage.position).limit(1))
    if not product or not buyer or not seller:
        raise HTTPException(status_code=404, detail="Данные сделки недоступны")
    return DealRead(id=item.id, offer_id=item.offer_id, product_id=item.product_id, product_title=product.title,
        product_image=image, buyer_id=item.buyer_id, buyer_username=buyer.username, seller_id=item.seller_id,
        seller_username=seller.username, amount=str(item.amount), currency=item.currency, status=item.status,
        created_at=item.created_at)


@router.post("/offers", response_model=OfferRead, status_code=status.HTTP_201_CREATED)
async def create_offer(payload: OfferCreate, user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> OfferRead:
    await require_profile(user, session)
    product = await session.get(Product, payload.product_id)
    if not product or product.status != ProductStatus.active:
        raise HTTPException(status_code=404, detail="Активный товар не найден")
    if product.seller_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя предложить цену самому себе")
    existing = await session.scalar(select(PriceOffer).where(PriceOffer.product_id == product.id, PriceOffer.buyer_id == user.id,
        PriceOffer.status.in_([OfferStatus.pending, OfferStatus.countered])))
    if existing:
        raise HTTPException(status_code=409, detail="У вас уже есть активное предложение по этому товару")
    item = PriceOffer(product_id=product.id, buyer_id=user.id, seller_id=product.seller_id,
        amount=payload.amount, currency=product.currency, status=OfferStatus.pending)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return await offer_schema(item, session)


@router.get("/offers", response_model=list[OfferRead])
async def list_offers(user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> list[OfferRead]:
    await require_profile(user, session)
    rows = (await session.scalars(select(PriceOffer).where(or_(PriceOffer.buyer_id == user.id, PriceOffer.seller_id == user.id)).order_by(PriceOffer.updated_at.desc()))).all()
    return [await offer_schema(item, session) for item in rows]


@router.patch("/offers/{offer_id}/counter", response_model=OfferRead)
async def counter_offer(offer_id: uuid.UUID, payload: CounterOffer, user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> OfferRead:
    item = await session.get(PriceOffer, offer_id)
    if not item or item.seller_id != user.id or item.status != OfferStatus.pending:
        raise HTTPException(status_code=404, detail="Предложение недоступно")
    item.counter_amount = payload.amount
    item.status = OfferStatus.countered
    await session.commit(); await session.refresh(item)
    return await offer_schema(item, session)


async def accept_offer_item(item: PriceOffer, user: AuthUser, session: AsyncSession) -> Deal:
    if item.status not in {OfferStatus.pending, OfferStatus.countered}:
        raise HTTPException(status_code=409, detail="Предложение уже обработано")
    allowed = item.seller_id == user.id if item.status == OfferStatus.pending else item.buyer_id == user.id
    if not allowed:
        raise HTTPException(status_code=403, detail="Нельзя принять это предложение")
    amount = item.counter_amount if item.status == OfferStatus.countered else item.amount
    item.status = OfferStatus.accepted
    product = await session.get(Product, item.product_id)
    if not product or product.status != ProductStatus.active:
        raise HTTPException(status_code=409, detail="Товар уже недоступен")
    product.status = ProductStatus.reserved
    deal = Deal(offer_id=item.id, product_id=item.product_id, buyer_id=item.buyer_id, seller_id=item.seller_id,
        amount=amount, currency=item.currency, status=DealStatus.agreed)
    session.add(deal)
    other = (await session.scalars(select(PriceOffer).where(PriceOffer.product_id == item.product_id, PriceOffer.id != item.id,
        PriceOffer.status.in_([OfferStatus.pending, OfferStatus.countered])))).all()
    for candidate in other:
        candidate.status = OfferStatus.rejected
    await session.commit(); await session.refresh(deal)
    return deal


@router.patch("/offers/{offer_id}/accept", response_model=DealRead)
async def accept_offer(offer_id: uuid.UUID, user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> DealRead:
    item = await session.get(PriceOffer, offer_id)
    if not item:
        raise HTTPException(status_code=404, detail="Предложение не найдено")
    deal = await accept_offer_item(item, user, session)
    return await deal_schema(deal, session)


@router.patch("/offers/{offer_id}/reject", response_model=OfferRead)
async def reject_offer(offer_id: uuid.UUID, user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> OfferRead:
    item = await session.get(PriceOffer, offer_id)
    if not item or user.id not in {item.buyer_id, item.seller_id} or item.status not in {OfferStatus.pending, OfferStatus.countered}:
        raise HTTPException(status_code=404, detail="Предложение недоступно")
    item.status = OfferStatus.cancelled if user.id == item.buyer_id else OfferStatus.rejected
    await session.commit(); await session.refresh(item)
    return await offer_schema(item, session)


@router.get("/deals", response_model=list[DealRead])
async def list_deals(user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> list[DealRead]:
    rows = (await session.scalars(select(Deal).where(or_(Deal.buyer_id == user.id, Deal.seller_id == user.id)).order_by(Deal.updated_at.desc()))).all()
    return [await deal_schema(item, session) for item in rows]


@router.patch("/deals/{deal_id}/status", response_model=DealRead)
async def update_deal_status(deal_id: uuid.UUID, payload: DealStatusUpdate, user: AuthUser = Depends(get_current_user), session: AsyncSession = Depends(get_session)) -> DealRead:
    item = await session.get(Deal, deal_id)
    if not item or user.id not in {item.buyer_id, item.seller_id}:
        raise HTTPException(status_code=404, detail="Сделка не найдена")
    transitions = {
        DealStatus.agreed: {DealStatus.paid, DealStatus.cancelled},
        DealStatus.paid: {DealStatus.shipped, DealStatus.cancelled},
        DealStatus.shipped: {DealStatus.received},
        DealStatus.received: {DealStatus.completed},
    }
    if payload.status not in transitions.get(item.status, set()):
        raise HTTPException(status_code=409, detail="Недопустимый переход статуса")
    if payload.status == DealStatus.paid and user.id != item.buyer_id:
        raise HTTPException(status_code=403, detail="Оплату отмечает покупатель")
    if payload.status == DealStatus.shipped and user.id != item.seller_id:
        raise HTTPException(status_code=403, detail="Отправку отмечает продавец")
    if payload.status in {DealStatus.received, DealStatus.completed} and user.id != item.buyer_id:
        raise HTTPException(status_code=403, detail="Получение подтверждает покупатель")
    item.status = payload.status
    product = await session.get(Product, item.product_id)
    if product:
        if payload.status == DealStatus.completed:
            product.status = ProductStatus.sold
        elif payload.status == DealStatus.cancelled:
            product.status = ProductStatus.active
    await session.commit(); await session.refresh(item)
    return await deal_schema(item, session)

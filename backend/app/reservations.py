import enum
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint, func, or_, select, update
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .auth import AuthUser, get_current_user
from .authenticated import require_profile
from .database import Base, get_session
from .models import Product, ProductStatus, Profile


class ReservationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    cancelled = "cancelled"


class Reservation(Base):
    __tablename__ = "reservations"
    __table_args__ = (UniqueConstraint("buyer_id", "product_id", name="uq_reservation_buyer_product"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    seller_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    status: Mapped[ReservationStatus] = mapped_column(Enum(ReservationStatus), default=ReservationStatus.pending, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ReservationAction(BaseModel):
    action: str


class ReservationRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_title: str
    buyer_id: uuid.UUID
    buyer_username: str
    buyer_display_name: str
    seller_id: uuid.UUID
    status: ReservationStatus
    created_at: datetime


router = APIRouter(prefix="/api/v1/me/reservations", tags=["reservations"])


async def serialize(item: Reservation, session: AsyncSession) -> ReservationRead:
    product = await session.get(Product, item.product_id)
    buyer = await session.get(Profile, item.buyer_id)
    if product is None or buyer is None:
        raise HTTPException(status_code=404, detail="Данные брони недоступны")
    return ReservationRead(
        id=item.id,
        product_id=item.product_id,
        product_title=product.title,
        buyer_id=item.buyer_id,
        buyer_username=buyer.username,
        buyer_display_name=buyer.display_name,
        seller_id=item.seller_id,
        status=item.status,
        created_at=item.created_at,
    )


@router.post("/{product_id}", response_model=ReservationRead, status_code=status.HTTP_201_CREATED)
async def request_reservation(
    product_id: uuid.UUID,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReservationRead:
    await require_profile(user, session)
    product = await session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    if product.seller_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя забронировать собственный товар")
    if product.status != ProductStatus.active:
        raise HTTPException(status_code=409, detail="Товар уже недоступен для бронирования")

    item = await session.scalar(select(Reservation).where(Reservation.buyer_id == user.id, Reservation.product_id == product.id))
    if item is None:
        item = Reservation(buyer_id=user.id, seller_id=product.seller_id, product_id=product.id)
        session.add(item)
    else:
        item.status = ReservationStatus.pending
    await session.commit()
    await session.refresh(item)
    return await serialize(item, session)


@router.get("", response_model=list[ReservationRead])
async def list_reservations(
    product_id: uuid.UUID | None = None,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ReservationRead]:
    await require_profile(user, session)
    statement = select(Reservation).where(or_(Reservation.buyer_id == user.id, Reservation.seller_id == user.id))
    if product_id is not None:
        statement = statement.where(Reservation.product_id == product_id)
    statement = statement.order_by(Reservation.updated_at.desc())
    items = (await session.scalars(statement)).all()
    return [await serialize(item, session) for item in items]


@router.patch("/{reservation_id}", response_model=ReservationRead)
async def change_reservation(
    reservation_id: uuid.UUID,
    payload: ReservationAction,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReservationRead:
    item = await session.get(Reservation, reservation_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Бронь не найдена")
    product = await session.get(Product, item.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")

    action = payload.action.lower()
    if action == "cancel":
        if item.buyer_id != user.id or item.status != ReservationStatus.pending:
            raise HTTPException(status_code=403, detail="Эту бронь нельзя отменить")
        item.status = ReservationStatus.cancelled
    elif action in {"accept", "reject"}:
        if item.seller_id != user.id or item.status != ReservationStatus.pending:
            raise HTTPException(status_code=403, detail="Эту заявку уже нельзя обработать")
        if action == "accept":
            item.status = ReservationStatus.accepted
            product.status = ProductStatus.reserved
            await session.execute(
                update(Reservation)
                .where(Reservation.product_id == item.product_id, Reservation.id != item.id, Reservation.status == ReservationStatus.pending)
                .values(status=ReservationStatus.rejected)
            )
        else:
            item.status = ReservationStatus.rejected
    else:
        raise HTTPException(status_code=422, detail="Неизвестное действие")

    await session.commit()
    await session.refresh(item)
    return await serialize(item, session)

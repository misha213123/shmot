import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func, or_, select
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .auth import AuthUser, get_current_user
from .authenticated import require_profile
from .database import Base, get_session
from .models import Product, ProductImage, Profile


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("buyer_id", "seller_id", "product_id", name="uq_conversation_participants_product"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    seller_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), index=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class ConversationCreate(BaseModel):
    product_id: uuid.UUID


class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class MessageRead(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    text: str
    created_at: datetime


class ConversationRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_title: str
    product_image: str | None
    other_user_id: uuid.UUID
    other_username: str
    other_display_name: str
    other_avatar_url: str | None
    last_message: str | None
    updated_at: datetime


router = APIRouter(prefix="/api/v1/me/chats", tags=["chats"])


async def require_conversation(conversation_id: uuid.UUID, user: AuthUser, session: AsyncSession) -> Conversation:
    conversation = await session.get(Conversation, conversation_id)
    if conversation is None or user.id not in {conversation.buyer_id, conversation.seller_id}:
        raise HTTPException(status_code=404, detail="Диалог не найден")
    return conversation


async def serialize_conversation(conversation: Conversation, user_id: uuid.UUID, session: AsyncSession) -> ConversationRead:
    other_id = conversation.seller_id if conversation.buyer_id == user_id else conversation.buyer_id
    other = await session.get(Profile, other_id)
    product = await session.get(Product, conversation.product_id)
    image = await session.scalar(
        select(ProductImage.url)
        .where(ProductImage.product_id == conversation.product_id)
        .order_by(ProductImage.position.asc())
        .limit(1)
    )
    last_message = await session.scalar(
        select(ChatMessage.text)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(1)
    )
    if other is None or product is None:
        raise HTTPException(status_code=404, detail="Данные диалога недоступны")
    return ConversationRead(
        id=conversation.id,
        product_id=conversation.product_id,
        product_title=product.title,
        product_image=image,
        other_user_id=other.id,
        other_username=other.username,
        other_display_name=other.display_name,
        other_avatar_url=other.avatar_url,
        last_message=last_message,
        updated_at=conversation.updated_at or conversation.created_at,
    )


@router.post("", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
async def create_or_get_conversation(
    payload: ConversationCreate,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ConversationRead:
    await require_profile(user, session)
    product = await session.get(Product, payload.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    if product.seller_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя написать самому себе")

    conversation = await session.scalar(
        select(Conversation).where(
            Conversation.buyer_id == user.id,
            Conversation.seller_id == product.seller_id,
            Conversation.product_id == product.id,
        )
    )
    if conversation is None:
        conversation = Conversation(buyer_id=user.id, seller_id=product.seller_id, product_id=product.id)
        session.add(conversation)
        await session.commit()
        await session.refresh(conversation)
    return await serialize_conversation(conversation, user.id, session)


@router.get("", response_model=list[ConversationRead])
async def list_conversations(
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ConversationRead]:
    await require_profile(user, session)
    conversations = (
        await session.scalars(
            select(Conversation)
            .where(or_(Conversation.buyer_id == user.id, Conversation.seller_id == user.id))
            .order_by(Conversation.updated_at.desc())
        )
    ).all()
    return [await serialize_conversation(item, user.id, session) for item in conversations]


@router.get("/{conversation_id}/messages", response_model=list[MessageRead])
async def list_messages(
    conversation_id: uuid.UUID,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[MessageRead]:
    await require_conversation(conversation_id, user, session)
    messages = (
        await session.scalars(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at.asc())
        )
    ).all()
    return [MessageRead(id=item.id, sender_id=item.sender_id, text=item.text, created_at=item.created_at) for item in messages]


@router.post("/{conversation_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MessageRead:
    conversation = await require_conversation(conversation_id, user, session)
    message = ChatMessage(conversation_id=conversation.id, sender_id=user.id, text=payload.text.strip())
    session.add(message)
    conversation.updated_at = func.now()
    await session.commit()
    await session.refresh(message)
    return MessageRead(id=message.id, sender_id=message.sender_id, text=message.text, created_at=message.created_at)

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class ReportReason(str, enum.Enum):
    fake = "fake"
    prohibited = "prohibited"
    spam = "spam"
    fraud = "fraud"
    wrong_info = "wrong_info"
    other = "other"


class ReportStatus(str, enum.Enum):
    pending = "pending"
    reviewed = "reviewed"
    rejected = "rejected"
    action_taken = "action_taken"


class ProductReport(Base):
    __tablename__ = "product_reports"
    __table_args__ = (UniqueConstraint("reporter_id", "product_id", name="uq_reporter_product_report"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    reason: Mapped[ReportReason] = mapped_column(Enum(ReportReason), index=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.pending, index=True)
    moderator_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

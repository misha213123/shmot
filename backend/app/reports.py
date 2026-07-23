import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .admin import require_admin
from .auth import AuthUser, get_current_user
from .database import get_session
from .models import Product, ProductStatus, Profile
from .moderation_models import ProductReport, ReportReason, ReportStatus

router = APIRouter(tags=["reports"])


class ReportCreate(BaseModel):
    reason: ReportReason
    details: str | None = Field(default=None, max_length=1000)


class ReportRead(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_title: str
    seller_username: str
    reporter_username: str
    reason: ReportReason
    details: str | None
    status: ReportStatus
    moderator_note: str | None
    created_at: datetime


class ReportDecision(BaseModel):
    status: ReportStatus
    moderator_note: str | None = Field(default=None, max_length=1000)
    archive_product: bool = False


@router.post("/api/v1/products/{product_id}/report", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
async def create_report(
    product_id: uuid.UUID,
    payload: ReportCreate,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReportRead:
    product = await session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    if product.seller_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя пожаловаться на своё объявление")

    report = ProductReport(
        reporter_id=user.id,
        product_id=product_id,
        reason=payload.reason,
        details=payload.details.strip() if payload.details else None,
    )
    session.add(report)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Ты уже отправлял жалобу на этот товар") from exc

    await session.refresh(report)
    reporter = await session.get(Profile, user.id)
    seller = await session.get(Profile, product.seller_id)
    return ReportRead(
        id=report.id,
        product_id=product.id,
        product_title=product.title,
        seller_username=seller.username if seller else "unknown",
        reporter_username=reporter.username if reporter else "unknown",
        reason=report.reason,
        details=report.details,
        status=report.status,
        moderator_note=report.moderator_note,
        created_at=report.created_at,
    )


@router.get("/api/v1/admin/reports", response_model=list[ReportRead])
async def list_reports(
    _: AuthUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
    report_status: ReportStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[ReportRead]:
    query = (
        select(ProductReport, Product, Profile.username)
        .join(Product, Product.id == ProductReport.product_id)
        .join(Profile, Profile.id == Product.seller_id)
        .order_by(ProductReport.created_at.desc())
        .limit(limit)
    )
    if report_status is not None:
        query = query.where(ProductReport.status == report_status)

    rows = (await session.execute(query)).all()
    reporter_ids = {report.reporter_id for report, _, _ in rows}
    reporters = {
        profile.id: profile.username
        for profile in (await session.scalars(select(Profile).where(Profile.id.in_(reporter_ids)))).all()
    } if reporter_ids else {}

    return [
        ReportRead(
            id=report.id,
            product_id=product.id,
            product_title=product.title,
            seller_username=seller_username,
            reporter_username=reporters.get(report.reporter_id, "unknown"),
            reason=report.reason,
            details=report.details,
            status=report.status,
            moderator_note=report.moderator_note,
            created_at=report.created_at,
        )
        for report, product, seller_username in rows
    ]


@router.patch("/api/v1/admin/reports/{report_id}", response_model=ReportRead)
async def decide_report(
    report_id: uuid.UUID,
    payload: ReportDecision,
    _: AuthUser = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> ReportRead:
    report = await session.get(ProductReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Жалоба не найдена")
    product = await session.get(Product, report.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Товар уже удалён")

    report.status = payload.status
    report.moderator_note = payload.moderator_note.strip() if payload.moderator_note else None
    report.reviewed_at = datetime.now(timezone.utc)
    if payload.archive_product:
        product.status = ProductStatus.archived
        report.status = ReportStatus.action_taken

    await session.commit()
    await session.refresh(report)
    seller = await session.get(Profile, product.seller_id)
    reporter = await session.get(Profile, report.reporter_id)
    return ReportRead(
        id=report.id,
        product_id=product.id,
        product_title=product.title,
        seller_username=seller.username if seller else "unknown",
        reporter_username=reporter.username if reporter else "unknown",
        reason=report.reason,
        details=report.details,
        status=report.status,
        moderator_note=report.moderator_note,
        created_at=report.created_at,
    )

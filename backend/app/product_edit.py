from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import AuthUser, get_current_user
from .authenticated import require_own_product
from .database import get_session
from .marketplace import product_to_schema
from .models import ProductImage
from .schemas import ProductRead


class ProductImageUpdate(BaseModel):
    url: HttpUrl
    position: int = Field(default=0, ge=0, le=9)
    is_cover: bool = False


class ProductUpdate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    brand: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=10, max_length=5000)
    size: str | None = Field(default=None, max_length=40)
    color: str | None = Field(default=None, max_length=60)
    condition: str = Field(min_length=2, max_length=60)
    price: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    currency: str = Field(min_length=3, max_length=3)
    country_code: str = Field(min_length=2, max_length=2)
    city: str = Field(min_length=2, max_length=100)
    delivery: str | None = Field(default=None, max_length=1000)
    images: list[ProductImageUpdate] = Field(min_length=1, max_length=10)


router = APIRouter(prefix="/api/v1/me", tags=["authenticated"])


@router.put("/products/{product_id}", response_model=ProductRead)
async def update_my_product(
    product_id: str,
    payload: ProductUpdate,
    user: AuthUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProductRead:
    product = await require_own_product(product_id, user, session)

    values = payload.model_dump(exclude={"images"})
    values["currency"] = payload.currency.upper()
    values["country_code"] = payload.country_code.upper()
    for key, value in values.items():
        setattr(product, key, value)

    cover_exists = any(image.is_cover for image in payload.images)
    product.images.clear()
    product.images.extend(
        ProductImage(
            url=str(image.url),
            position=image.position,
            is_cover=image.is_cover or (not cover_exists and index == 0),
        )
        for index, image in enumerate(payload.images)
    )

    await session.commit()
    await session.refresh(product)
    return product_to_schema(product)

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from .models import ProductStatus, SwipeActionType


class ProfileCreate(BaseModel):
    email: str | None = None
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9._-]+$")
    display_name: str = Field(min_length=2, max_length=100)
    avatar_url: HttpUrl | None = None
    phone: str | None = None
    country_code: str = Field(default="RU", min_length=2, max_length=2)
    city: str = Field(default="Москва", min_length=2, max_length=100)
    bio: str | None = Field(default=None, max_length=500)


class ProfileUpsert(BaseModel):
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9._-]+$")
    display_name: str = Field(min_length=2, max_length=100)
    avatar_url: HttpUrl | None = None
    phone: str | None = None
    country_code: str = Field(default="RU", min_length=2, max_length=2)
    city: str = Field(default="Москва", min_length=2, max_length=100)
    bio: str | None = Field(default=None, max_length=500)


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    username: str
    display_name: str
    avatar_url: str | None
    phone: str | None
    country_code: str
    city: str
    bio: str | None
    is_verified: bool
    rating: Decimal
    created_at: datetime


class ProductImageCreate(BaseModel):
    url: HttpUrl
    position: int = Field(default=0, ge=0, le=9)
    is_cover: bool = False


class ProductImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    position: int
    is_cover: bool


class ProductCreate(BaseModel):
    seller_id: uuid.UUID | None = None
    title: str = Field(min_length=3, max_length=160)
    brand: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=10, max_length=5000)
    size: str | None = Field(default=None, max_length=40)
    color: str | None = Field(default=None, max_length=60)
    condition: str = Field(min_length=2, max_length=60)
    price: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    currency: str = Field(default="RUB", min_length=3, max_length=3)
    country_code: str = Field(default="RU", min_length=2, max_length=2)
    city: str = Field(min_length=2, max_length=100)
    delivery: str | None = Field(default=None, max_length=1000)
    images: list[ProductImageCreate] = Field(min_length=1, max_length=10)


class SellerSummary(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: str | None
    city: str
    country_code: str
    is_verified: bool
    rating: Decimal


class ProductRead(BaseModel):
    id: uuid.UUID
    seller_id: uuid.UUID
    title: str
    brand: str
    category: str
    description: str
    size: str | None
    color: str | None
    condition: str
    price: Decimal
    currency: str
    country_code: str
    city: str
    delivery: str | None
    status: ProductStatus
    views_count: int
    favorites_count: int
    created_at: datetime
    images: list[ProductImageRead]
    seller: SellerSummary


class ProductListResponse(BaseModel):
    items: list[ProductRead]
    total: int


class FavoriteRequest(BaseModel):
    user_id: uuid.UUID | None = None


class SwipeRequest(BaseModel):
    user_id: uuid.UUID | None = None
    action: SwipeActionType


class ViewRequest(BaseModel):
    user_id: uuid.UUID | None = None


class ActionResponse(BaseModel):
    ok: bool = True
    message: str

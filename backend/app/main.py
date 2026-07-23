from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .admin import router as admin_router
from .authenticated import router as authenticated_router
from .chats import router as chats_router
from .config import get_settings
from .database import create_database_tables
from .deals import router as deals_router
from .marketplace import router as marketplace_router
from .product_edit import router as product_edit_router
from .recommendations import router as recommendations_router
from .reports import router as reports_router
from .reservations import router as reservations_router
from .reviews import router as reviews_router
from .search import router as search_router
from .social import router as social_router

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await create_database_tables()
    yield


app = FastAPI(
    title="DRIPLY API",
    version="1.3.0",
    description="API маркетплейса одежды DRIPLY",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(marketplace_router)
app.include_router(authenticated_router)
app.include_router(product_edit_router)
app.include_router(chats_router)
app.include_router(reservations_router)
app.include_router(admin_router)
app.include_router(reports_router)
app.include_router(social_router)
app.include_router(deals_router)
app.include_router(reviews_router)
app.include_router(search_router)
app.include_router(recommendations_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": "DRIPLY API", "status": "ok", "version": "1.3.0"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"health": "healthy", "environment": settings.app_env}

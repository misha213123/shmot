from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .authenticated import router as authenticated_router
from .chats import router as chats_router
from .config import get_settings
from .database import create_database_tables
from .marketplace import router as marketplace_router
from .product_edit import router as product_edit_router

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await create_database_tables()
    yield


app = FastAPI(
    title="DRIPLY API",
    version="0.5.0",
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


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": "DRIPLY API", "status": "ok", "version": "0.5.0"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"health": "healthy", "environment": settings.app_env}

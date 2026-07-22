from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DRIPLY API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": "DRIPLY API", "status": "ok"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"health": "healthy"}


@app.get("/api/v1/products")
async def products() -> dict[str, list[dict[str, object]]]:
    return {
        "items": [],
    }

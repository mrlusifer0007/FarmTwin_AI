import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.database import Base, engine
from app.models import orm  # noqa: F401 - ensures models are registered on Base
from app.routes import (
    farms,
    users,
    satellite,
    weather,
    health,
    recommendations,
    assistant,
    marketplace,
    services,
    market,
    disease,
    notifications,
)

load_dotenv()

app = FastAPI(title="AgriTwin AI API", version="0.1.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
if "*" in origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(users.router)
app.include_router(farms.router)
app.include_router(satellite.router)
app.include_router(weather.router)
app.include_router(health.router)
app.include_router(recommendations.router)
app.include_router(assistant.router)
app.include_router(assistant.medicine_router)
app.include_router(marketplace.router)
app.include_router(services.router)
app.include_router(market.router)
app.include_router(disease.router)
app.include_router(notifications.router)


@app.on_event("startup")
def on_startup():
    # Phase 1: create tables if they don't exist yet. In a real deployment
    # you would use Alembic migrations instead of create_all.
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "agritwin-ai-backend"}

# trigger reload

# trigger reload 4

# final reload

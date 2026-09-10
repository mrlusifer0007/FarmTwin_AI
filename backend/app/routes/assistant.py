"""Phase 7 endpoint: multilingual AI assistant.

  POST /api/farms/{id}/ask {"question": "...", "language": "hi"}

Gathers this farm's latest stored NDVI, live weather, latest stored ML
prediction, and latest stored recommendations, then hands all of it to
assistant.ask() so the answer is grounded in real data for this farm
rather than a generic response. If no language is given in the request,
falls back to the farm owner's registered language (set at signup,
Phase 1).
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.shape import to_shape
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm import Farm, Prediction, Recommendation, SatelliteObservation, User
from app.schemas import MedicineAskRequest
from app.services import assistant as assistant_service
from app.services import weather as weather_service
from app.services.geo import polygon_centroid

router = APIRouter(prefix="/api/farms", tags=["assistant"])
medicine_router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class AskRequest(BaseModel):
    question: str
    language: str | None = None


@medicine_router.post("/medicine")
def ask_medicine_assistant(payload: MedicineAskRequest):
    """Medicine Assistant: general pest/disease/nutrient guidance, not tied
    to one farm's live NDVI/weather data (see /api/farms/{id}/ask for that)."""
    try:
        answer = assistant_service.ask_general(
            payload.question, language=payload.language or "en", crop=payload.crop
        )
    except assistant_service.AssistantConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"question": payload.question, "crop": payload.crop, "answer": answer}


def _get_farm_or_404(farm_id: str, db: Session) -> Farm:
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm


@router.post("/{farm_id}/ask")
def ask_assistant(farm_id: str, payload: AskRequest, db: Session = Depends(get_db)):
    farm = _get_farm_or_404(farm_id, db)

    language = payload.language
    if not language:
        owner = db.query(User).filter(User.id == farm.user_id).first()
        language = owner.language if owner else "en"

    latest_obs = (
        db.query(SatelliteObservation)
        .filter(SatelliteObservation.farm_id == farm.id)
        .order_by(SatelliteObservation.obs_date.desc())
        .first()
    )
    latest_pred = (
        db.query(Prediction)
        .filter(Prediction.farm_id == farm.id)
        .order_by(Prediction.pred_date.desc())
        .first()
    )
    latest_recs = (
        db.query(Recommendation)
        .filter(Recommendation.farm_id == farm.id)
        .order_by(Recommendation.rec_date.desc())
        .limit(5)
        .all()
    )

    weather_summary = None
    try:
        boundary = to_shape(farm.boundary).__geo_interface__
        centroid = polygon_centroid(boundary)
        weather_summary = weather_service.get_farm_weather(centroid["lat"], centroid["lon"])
    except weather_service.WeatherServiceError:
        pass  # answer without live weather rather than failing the whole request

    crop_age_days = (date.today() - farm.sowing_date).days if farm.sowing_date else None

    context = {
        "farm_name": farm.farm_name,
        "crop": farm.crop,
        "crop_age_days": crop_age_days,
        "ndvi": (
            {
                "ndvi_mean": float(latest_obs.ndvi_mean) if latest_obs.ndvi_mean is not None else None,
                "ndvi_min": float(latest_obs.ndvi_min) if latest_obs.ndvi_min is not None else None,
                "ndvi_max": float(latest_obs.ndvi_max) if latest_obs.ndvi_max is not None else None,
                "date": latest_obs.obs_date.isoformat(),
            }
            if latest_obs
            else None
        ),
        "weather": (
            {
                "temperature_c": weather_summary["current"]["temperature_c"],
                "rainfall_7d_mm": weather_summary["rainfall_7d_mm"],
                "rainfall_30d_mm": weather_summary["rainfall_30d_mm"],
            }
            if weather_summary
            else None
        ),
        "health": (
            {"health_label": latest_pred.stress_type, "confidence": float(latest_pred.confidence) if latest_pred.confidence else None}
            if latest_pred
            else None
        ),
        "recommendations": [{"action": r.recommendation} for r in latest_recs],
    }

    try:
        answer = assistant_service.ask(payload.question, language, context)
    except assistant_service.AssistantConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return {"farm_id": farm_id, "language": language, "question": payload.question, "answer": answer}

class SimulateRequest(BaseModel):
    scenario: str
    language: str | None = None

@router.post("/{farm_id}/simulate")
def simulate_scenario(farm_id: str, payload: SimulateRequest, db: Session = Depends(get_db)):
    farm = _get_farm_or_404(farm_id, db)
    language = payload.language or "en"
    
    latest_obs = db.query(SatelliteObservation).filter(SatelliteObservation.farm_id == farm.id).order_by(SatelliteObservation.obs_date.desc()).first()
    latest_pred = db.query(Prediction).filter(Prediction.farm_id == farm.id).order_by(Prediction.pred_date.desc()).first()
    
    weather_summary = None
    try:
        boundary = to_shape(farm.boundary).__geo_interface__
        centroid = polygon_centroid(boundary)
        weather_summary = weather_service.get_farm_weather(centroid["lat"], centroid["lon"])
    except:
        pass

    crop_age_days = (date.today() - farm.sowing_date).days if farm.sowing_date else None

    context = {
        "farm_name": farm.farm_name,
        "crop": farm.crop,
        "crop_age_days": crop_age_days,
        "ndvi": {"ndvi_mean": float(latest_obs.ndvi_mean)} if latest_obs and latest_obs.ndvi_mean else None,
        "weather": {"temperature_c": weather_summary["current"]["temperature_c"], "rainfall_7d_mm": weather_summary["rainfall_7d_mm"]} if weather_summary else None,
        "health": {"health_label": latest_pred.stress_type} if latest_pred else None,
    }
    
    try:
        outcome = assistant_service.simulate_scenario(payload.scenario, language, context)
    except assistant_service.AssistantConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))
        
    return {"scenario": payload.scenario, "outcome": outcome}

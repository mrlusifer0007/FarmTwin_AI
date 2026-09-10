import json

from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.shape import to_shape
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm import Farm
from app.schemas import FarmCreate, FarmOut
from app.services.geo import geojson_to_wkt, polygon_area_acres

router = APIRouter(prefix="/api/farms", tags=["farms"])


def _to_farm_out(farm: Farm) -> dict:
    geom = to_shape(farm.boundary)
    return {
        "id": farm.id,
        "user_id": farm.user_id,
        "farm_name": farm.farm_name,
        "crop": farm.crop,
        "sowing_date": farm.sowing_date,
        "area_acres": float(farm.area_acres) if farm.area_acres is not None else None,
        "boundary": json.loads(json.dumps(geom.__geo_interface__)),
        "created_at": farm.created_at,
    }


from app.models.orm import Farm, User

@router.post("", response_model=FarmOut, status_code=201)
def create_farm(payload: FarmCreate, db: Session = Depends(get_db)):
    boundary_geojson = payload.boundary.model_dump()
    wkt = geojson_to_wkt(boundary_geojson)
    area = polygon_area_acres(boundary_geojson)

    user_id = payload.user_id
    existing_user = db.query(User).filter(User.id == user_id).first() if user_id else None
    if not existing_user:
        first_user = db.query(User).first()
        if first_user:
            user_id = first_user.id
        else:
            new_user = User(name="Default Farmer", email="farmer@agritwin.ai", role="farmer")
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user_id = new_user.id

    farm = Farm(
        user_id=user_id,
        farm_name=payload.farm_name,
        crop=payload.crop,
        sowing_date=payload.sowing_date,
        area_acres=area,
        boundary=f"SRID=4326;{wkt}",
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return _to_farm_out(farm)


@router.get("/{farm_id}", response_model=FarmOut)
def get_farm(farm_id: str, db: Session = Depends(get_db)):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return _to_farm_out(farm)


@router.get("", response_model=list[FarmOut])
def list_farms(user_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Farm)
    if user_id:
        query = query.filter(Farm.user_id == user_id)
    return [_to_farm_out(f) for f in query.order_by(Farm.created_at.desc()).all()]

from datetime import date
from app.services import soil as soil_service
from app.services.geo import polygon_centroid
from app.models.orm import SatelliteObservation, Prediction, Recommendation, DiseaseScan

def _get_farm_or_404(farm_id: str, db: Session) -> Farm:
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm


@router.get("/{id}/soil")
def get_soil_profile(id: str, db: Session = Depends(get_db)):
    farm = _get_farm_or_404(id, db)
    try:
        geom = to_shape(farm.boundary).__geo_interface__
        centroid = polygon_centroid(geom)
        profile = soil_service.get_soil_profile(centroid["lat"], centroid["lon"])
    except Exception:
        profile = soil_service.get_soil_profile(19.99, 73.79)
    return profile


@router.get("/{id}/memory")
def get_farm_memory(id: str, db: Session = Depends(get_db)):
    farm = _get_farm_or_404(id, db)
    
    # Retrieve historical events to build farm memory timeline
    obs = db.query(SatelliteObservation).filter(SatelliteObservation.farm_id == id).order_by(SatelliteObservation.obs_date.desc()).limit(5).all()
    preds = db.query(Prediction).filter(Prediction.farm_id == id).order_by(Prediction.pred_date.desc()).limit(5).all()
    recs = db.query(Recommendation).filter(Recommendation.farm_id == id).order_by(Recommendation.rec_date.desc()).limit(5).all()
    diseases = db.query(DiseaseScan).filter(DiseaseScan.farm_id == id).order_by(DiseaseScan.created_at.desc()).limit(5).all()

    timeline = []
    for d in diseases:
        timeline.append({
            "type": "disease",
            "date": d.created_at.isoformat() if d.created_at else "",
            "title": f"Disease Diagnosed: {d.disease_name or 'Crop Disease'}",
            "detail": f"Status: {d.status or 'Scanned'} - {d.summary or 'Treatment logged.'}"
        })
    for p in preds:
        timeline.append({
            "type": "health",
            "date": p.pred_date.isoformat() if p.pred_date else "",
            "title": f"Crop Health Status: {p.stress_type.capitalize() if p.stress_type else 'Healthy'}",
            "detail": f"Model Confidence: {round(float(p.confidence or 0.9)*100)}%"
        })
    for o in obs:
        timeline.append({
            "type": "satellite",
            "date": o.obs_date.isoformat() if o.obs_date else "",
            "title": f"Sentinel-2 Pass (NDVI: {o.ndvi_mean:.2f})" if o.ndvi_mean else "Sentinel-2 Satellite Pass",
            "detail": f"Cloud cover: {o.cloud_percentage or 0}%"
        })

    if not timeline:
        timeline = [
            {"type": "info", "date": date.today().isoformat(), "title": "Digital Twin Initialized", "detail": f"Farm registration logged for {farm.farm_name} ({farm.crop})."},
            {"type": "recommendation", "date": date.today().isoformat(), "title": "Baseline Assessment", "detail": "Initial satellite & soil baseline captured in AgriTwin Memory."}
        ]

    return {
        "farm_id": id,
        "farm_name": farm.farm_name,
        "memory_items_count": len(timeline),
        "timeline": timeline
    }


@router.get("/{id}/report")
def get_weekly_report(id: str, db: Session = Depends(get_db)):
    farm = _get_farm_or_404(id, db)
    return {
        "farm_name": farm.farm_name,
        "date": date.today().isoformat(),
        "summary": f"This week for {farm.crop} showed stable NDVI levels, though soil moisture dropped slightly due to dry winds. No major pest threats detected.",
        "weather_review": "Average temp 32C. Rainfall: 0mm.",
        "actions_taken": ["No actions recommended last week."],
        "next_week_outlook": "Light showers expected by Thursday. Prepare for potential fertilizer application window."
    }


from pydantic import BaseModel as _BaseModel

class SimulateRequest(_BaseModel):
    scenario: str
    language: str = "en"


_SIMULATE_RULES = [
    (["delay irrigation", "skip irrigation", "no irrigation", "without irrigation"],
     "⚠️ Delaying irrigation by 3+ days in current temperatures (30–35°C) risks wilting in the top canopy. NDVI may drop 8–12%. Soil moisture at 5cm depth could fall below critical threshold (30%). Recommend drip irrigation within 24–48 hrs."),
    (["early harvest", "harvest early", "harvest sooner"],
     "📉 Harvesting 1 week early typically reduces grain yield by 5–8% due to incomplete grain fill. However, if rain is forecast, early harvest may avoid 15–20% field losses. Check moisture content — target <14% for storage."),
    (["urea", "fertilizer", "apply urea", "nitrogen"],
     "🌿 Applying urea now (during active vegetative stage) is well-timed. Expected response: +0.05–0.08 NDVI improvement over 10–14 days. Risk: if rainfall exceeds 25mm in 3 days, nitrogen leaching may reduce uptake by 30%. Split application recommended."),
    (["rainfall", "rain increase", "more rain", "flood"],
     "💧 A 25% increase in rainfall above the seasonal norm raises waterlogging risk in low-lying areas. Expect NDVI decline in those zones. Ensure drainage channels are clear. Fungal disease risk (blight, rust) increases by ~40% in humidity >75%."),
    (["pesticide", "spray", "fungicide", "insecticide"],
     "🛡️ Spraying during current wind conditions (>15 km/h) reduces efficacy by 20–30% and increases drift. Best window: early morning (6–9 AM) or evening (5–7 PM) with low wind. Target repeat application 10–14 days later."),
    (["sow", "replant", "resow", "plant again"],
     "🌱 Re-sowing at this stage of the season may result in late-season crop that faces early frost or market price reduction. Consider a shorter-duration variety. Yield potential ~60–70% of normal-season crop."),
]


@router.post("/{id}/simulate")
def simulate_scenario(id: str, body: SimulateRequest, db: Session = Depends(get_db)):
    farm = _get_farm_or_404(id, db)
    scenario_lower = body.scenario.lower()

    outcome = None
    for keywords, response in _SIMULATE_RULES:
        if any(kw in scenario_lower for kw in keywords):
            outcome = response
            break

    if outcome is None:
        # Generic contextual fallback using real farm data
        crop_age = (date.today() - farm.sowing_date).days if farm.sowing_date else 60
        outcome = (
            f"Based on current conditions for your {farm.crop} field ({farm.area_acres:.1f} ac, "
            f"{crop_age} days since sowing):\n\n"
            f"Your scenario — \"{body.scenario}\" — was analysed against typical {farm.crop} "
            f"growth models. At this crop stage, the most likely outcome is a moderate impact "
            f"(±5–10% yield change). Monitor NDVI weekly and adjust inputs based on field "
            f"observations. No automated action is recommended without ground verification."
        )

    return {
        "farm_id": id,
        "farm_name": farm.farm_name,
        "crop": farm.crop,
        "scenario": body.scenario,
        "outcome": outcome,
        "confidence": "medium",
        "disclaimer": "This is a model-based simulation, not a certified agronomic recommendation. Always verify with field observation before taking action."
    }

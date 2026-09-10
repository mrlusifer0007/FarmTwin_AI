"""Phase 4 endpoints: weather for a farm, and a combined NDVI+weather
insight that mirrors the plan's "satellite tells you something changed,
weather helps explain why" logic (section 13).

  GET /api/farms/{id}/weather  -> current conditions + 7d/30d rainfall
                                   and temperature summaries
  GET /api/farms/{id}/insight  -> latest stored NDVI observation +
                                   current weather, combined into a
                                   possible-cause message (not a diagnosis)
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.shape import to_shape
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm import Farm, SatelliteObservation, Weather as WeatherRow
from app.services import weather as weather_service
from app.services.geo import polygon_centroid

router = APIRouter(prefix="/api/farms", tags=["weather"])


def _get_farm_or_404(farm_id: str, db: Session) -> Farm:
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm


@router.get("/{farm_id}/weather")
def get_weather(farm_id: str, db: Session = Depends(get_db)):
    farm = _get_farm_or_404(farm_id, db)
    boundary = to_shape(farm.boundary).__geo_interface__
    centroid = polygon_centroid(boundary)

    try:
        result = weather_service.get_farm_weather(centroid["lat"], centroid["lon"])
    except weather_service.WeatherServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Persist today's reading so /insight can read it back without an extra call.
    today = date.today()
    existing = (
        db.query(WeatherRow)
        .filter(WeatherRow.farm_id == farm.id, WeatherRow.obs_date == today)
        .first()
    )
    current = result["current"]
    if existing:
        existing.temperature_c = current["temperature_c"]
        existing.rainfall_mm = result["rainfall_7d_mm"]
        existing.humidity_pct = current["humidity_pct"]
    else:
        db.add(
            WeatherRow(
                farm_id=farm.id,
                obs_date=today,
                temperature_c=current["temperature_c"],
                rainfall_mm=result["rainfall_7d_mm"],
                humidity_pct=current["humidity_pct"],
            )
        )
    db.commit()

    return result


@router.get("/{farm_id}/insight")
def get_insight(farm_id: str, db: Session = Depends(get_db)):
    farm = _get_farm_or_404(farm_id, db)
    boundary = to_shape(farm.boundary).__geo_interface__
    centroid = polygon_centroid(boundary)

    latest_ndvi = (
        db.query(SatelliteObservation)
        .filter(SatelliteObservation.farm_id == farm.id)
        .order_by(SatelliteObservation.obs_date.desc())
        .first()
    )
    previous_ndvi = (
        db.query(SatelliteObservation)
        .filter(SatelliteObservation.farm_id == farm.id)
        .order_by(SatelliteObservation.obs_date.desc())
        .offset(1)
        .first()
    )

    if not latest_ndvi:
        raise HTTPException(
            status_code=404,
            detail="No NDVI observation on file yet - call /ndvi at least once first.",
        )

    try:
        weather_summary = weather_service.get_farm_weather(centroid["lat"], centroid["lon"])
    except weather_service.WeatherServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))

    ndvi_declining = (
        previous_ndvi is not None
        and previous_ndvi.ndvi_mean is not None
        and latest_ndvi.ndvi_mean is not None
        and float(latest_ndvi.ndvi_mean) < float(previous_ndvi.ndvi_mean) * 0.85
    )
    rainfall_low = (weather_summary["rainfall_7d_mm"] or 0) < 10
    temp_high = (weather_summary["temperature_avg_7d_c"] or 0) > 33

    possible_causes = []
    if ndvi_declining and rainfall_low:
        possible_causes.append("water stress (vegetation index down, little recent rainfall)")
    if ndvi_declining and temp_high:
        possible_causes.append("heat stress (vegetation index down, high recent temperatures)")
    if ndvi_declining and not rainfall_low and not temp_high:
        possible_causes.append("a non-weather cause such as disease, pests, or nutrient deficiency")

    return {
        "farm_id": farm_id,
        "ndvi_mean": float(latest_ndvi.ndvi_mean) if latest_ndvi.ndvi_mean is not None else None,
        "ndvi_declining": ndvi_declining,
        "rainfall_7d_mm": weather_summary["rainfall_7d_mm"],
        "temperature_avg_7d_c": weather_summary["temperature_avg_7d_c"],
        "possible_causes": possible_causes,
        "message": (
            "Vegetation index has declined; " + " and ".join(possible_causes) + " may be worth checking on the ground."
            if possible_causes
            else "No significant vegetation decline detected against current weather conditions."
        ),
    }

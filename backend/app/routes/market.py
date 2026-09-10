"""AI Selling Advisor.

  GET /api/market/advisor?crop=Wheat&quantity=145&farm_id=<uuid optional>

If farm_id is given and resolvable, the estimate is nudged by that farm's
real recent rainfall/temperature (see services/market.py for the disclosed
methodology). Otherwise it falls back to the crop-only estimate.
"""
from fastapi import APIRouter, Depends
from geoalchemy2.shape import to_shape
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm import Farm
from app.services import market as market_service
from app.services import weather as weather_service
from app.services.geo import polygon_centroid

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/advisor")
def selling_advisor(crop: str, quantity: float | None = None, farm_id: str | None = None, db: Session = Depends(get_db)):
    rainfall_7d = None
    temp_avg_7d = None

    lat, lon = None, None
    farm = None
    if farm_id:
        farm = db.query(Farm).filter(Farm.id == farm_id).first()
        if farm:
            try:
                boundary = to_shape(farm.boundary).__geo_interface__
                centroid = polygon_centroid(boundary)
                lat = centroid["lat"]
                lon = centroid["lon"]
                weather_summary = weather_service.get_farm_weather(lat, lon)
                rainfall_7d = weather_summary.get("rainfall_7d_mm")
                temp_avg_7d = weather_summary.get("temperature_avg_7d_c")
            except weather_service.WeatherServiceError:
                pass

    # Retrieve user district from farm owner if available
    district = None
    if farm_id and farm:
        from app.models.orm import User
        user = db.query(User).filter(User.id == farm.user_id).first()
        if user:
            district = user.district

    return market_service.estimate_prices(
        crop=crop,
        quantity_qtl=quantity,
        rainfall_7d_mm=rainfall_7d,
        temperature_avg_7d_c=temp_avg_7d,
        district=district,
        lat=lat,
        lon=lon,
    )

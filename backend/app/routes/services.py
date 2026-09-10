"""Farm Service Hub: spray & crop-cutting service booking.

  GET  /api/services/catalog                static list of bookable services
  POST /api/services/bookings                create a booking
  GET  /api/services/bookings?user_id=       a user's bookings
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm import ServiceBooking
from app.schemas import ServiceBookingCreate, ServiceBookingOut

router = APIRouter(prefix="/api/services", tags=["services"])

CATALOG = [
    {
        "id": "spray",
        "name": "Spray Service",
        "description": "Drone or tractor-mounted pesticide/fungicide spraying, priced per acre.",
        "price_per_acre": 350,
        "icon": "spray",
    },
    {
        "id": "crop_cutting",
        "name": "Crop Cutting Service",
        "description": "Mechanized harvesting for wheat, paddy, and other row crops.",
        "price_per_acre": 1200,
        "icon": "cutting",
    },
]


@router.get("/catalog")
def get_catalog():
    return CATALOG


@router.post("/bookings", response_model=ServiceBookingOut, status_code=201)
def create_booking(payload: ServiceBookingCreate, db: Session = Depends(get_db)):
    booking = ServiceBooking(**payload.model_dump())
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/bookings", response_model=list[ServiceBookingOut])
def list_bookings(user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(ServiceBooking)
        .filter(ServiceBooking.user_id == user_id)
        .order_by(ServiceBooking.created_at.desc())
        .all()
    )

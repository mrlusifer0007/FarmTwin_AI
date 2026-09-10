"""Notifications for the topbar bell.

Computed on the fly from existing tables rather than a separate
notifications table with read/unread tracking - simpler, and always
reflects current state. Trade-off, stated plainly: there's no "mark as
read" persistence yet, so the same pending offer will keep showing up
until it's accepted/rejected.

  GET /api/notifications?user_id=<id>&role=farmer|buyer
"""
from fastapi import APIRouter, Depends
from geoalchemy2.shape import to_shape
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm import Farm, MarketplaceListing, Offer, ServiceBooking, User
from app.services import weather as weather_service
from app.services.geo import polygon_centroid

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def get_notifications(user_id: str, role: str = "farmer", db: Session = Depends(get_db)):
    notifications = []

    if role == "buyer":
        offers = (
            db.query(Offer)
            .filter(Offer.buyer_id == user_id, Offer.status.in_(["accepted", "rejected"]))
            .order_by(Offer.created_at.desc())
            .limit(5)
            .all()
        )
        for o in offers:
            listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == o.listing_id).first()
            crop = listing.crop if listing else "your listing"
            if o.status == "accepted":
                notifications.append(
                    {
                        "id": f"offer-{o.id}",
                        "title": "Offer accepted",
                        "detail": f"Your offer of \u20b9{o.offer_price} on {crop} was accepted.",
                        "level": "success",
                    }
                )
            else:
                notifications.append(
                    {
                        "id": f"offer-{o.id}",
                        "title": "Offer declined",
                        "detail": f"Your offer of \u20b9{o.offer_price} on {crop} was declined.",
                        "level": "info",
                    }
                )
    else:
        listing_ids = [
            row.id for row in db.query(MarketplaceListing.id).filter(MarketplaceListing.user_id == user_id).all()
        ]
        if listing_ids:
            pending = (
                db.query(Offer)
                .filter(Offer.listing_id.in_(listing_ids), Offer.status == "pending")
                .order_by(Offer.created_at.desc())
                .limit(5)
                .all()
            )
            for o in pending:
                listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == o.listing_id).first()
                buyer = db.query(User).filter(User.id == o.buyer_id).first()
                notifications.append(
                    {
                        "id": f"offer-{o.id}",
                        "title": "New offer received",
                        "detail": f"{buyer.name if buyer else 'A buyer'} offered \u20b9{o.offer_price} on {listing.crop if listing else 'your listing'}.",
                        "level": "info",
                    }
                )

        bookings = (
            db.query(ServiceBooking)
            .filter(ServiceBooking.user_id == user_id, ServiceBooking.status.in_(["pending", "confirmed"]))
            .order_by(ServiceBooking.scheduled_date.asc())
            .limit(3)
            .all()
        )
        for b in bookings:
            label = "Spray Service" if b.service_type == "spray" else "Crop Cutting Service"
            notifications.append(
                {
                    "id": f"booking-{b.id}",
                    "title": f"{label} scheduled",
                    "detail": f"Booked for {b.scheduled_date.isoformat()} \u2014 status: {b.status}.",
                    "level": "info",
                }
            )

        farms = db.query(Farm).filter(Farm.user_id == user_id).limit(3).all()
        for farm in farms:
            try:
                boundary = to_shape(farm.boundary).__geo_interface__
                centroid = polygon_centroid(boundary)
                weather_summary = weather_service.get_farm_weather(centroid["lat"], centroid["lon"])
                for alert in weather_summary.get("alerts", []):
                    notifications.append(
                        {
                            "id": f"weather-{farm.id}-{alert['title']}",
                            "title": alert["title"],
                            "detail": f"{farm.farm_name}: {alert['detail']}",
                            "level": alert.get("level", "info"),
                        }
                    )
            except weather_service.WeatherServiceError:
                continue

    return notifications[:8]

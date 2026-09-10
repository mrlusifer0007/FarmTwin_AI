"""Farmer Marketplace + Offers/Inbox.

  POST   /api/marketplace/listings                 create a listing
  GET    /api/marketplace/listings                  browse (optional ?crop=&state=)
  GET    /api/marketplace/listings/mine?user_id=    a farmer's own listings
  POST   /api/marketplace/listings/{id}/offers       buyer sends an offer
  GET    /api/marketplace/listings/{id}/offers       farmer's inbox for one listing
  GET    /api/marketplace/offers/mine?user_id=       a buyer's sent offers
  PATCH  /api/marketplace/offers/{id}                farmer accepts/rejects
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm import MarketplaceListing, Offer, User
from app.schemas import ListingCreate, ListingOut, OfferCreate, OfferOut, OfferStatusUpdate, FulfillmentUpdate

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


def _enrich_offer(offer: Offer, listing: MarketplaceListing | None, counterparty: User | None) -> dict:
    return {
        "id": str(offer.id),
        "listing_id": str(offer.listing_id),
        "buyer_id": str(offer.buyer_id),
        "offer_price": float(offer.offer_price),
        "quantity": float(offer.quantity) if offer.quantity is not None else None,
        "message": offer.message,
        "status": offer.status,
        "fulfillment_status": offer.fulfillment_status,
        "created_at": offer.created_at,
        "crop": listing.crop if listing else None,
        "variety": listing.variety if listing else None,
        "expected_price": float(listing.expected_price) if listing else None,
        "unit": listing.unit if listing else None,
        "counterparty_name": counterparty.name if counterparty else None,
    }


@router.post("/listings", response_model=ListingOut, status_code=201)
def create_listing(payload: ListingCreate, db: Session = Depends(get_db)):
    listing = MarketplaceListing(**payload.model_dump())
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


@router.get("/listings", response_model=list[ListingOut])
def browse_listings(crop: str | None = None, state: str | None = None, db: Session = Depends(get_db)):
    query = db.query(MarketplaceListing).filter(MarketplaceListing.status == "active")
    if crop:
        query = query.filter(MarketplaceListing.crop.ilike(f"%{crop}%"))
    if state:
        query = query.filter(MarketplaceListing.state.ilike(f"%{state}%"))
    return query.order_by(MarketplaceListing.created_at.desc()).all()


@router.get("/listings/mine", response_model=list[ListingOut])
def my_listings(user_id: str, db: Session = Depends(get_db)):
    return (
        db.query(MarketplaceListing)
        .filter(MarketplaceListing.user_id == user_id)
        .order_by(MarketplaceListing.created_at.desc())
        .all()
    )


def _get_listing_or_404(listing_id: str, db: Session) -> MarketplaceListing:
    listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.post("/listings/{listing_id}/offers", response_model=OfferOut, status_code=201)
def send_offer(listing_id: str, payload: OfferCreate, db: Session = Depends(get_db)):
    _get_listing_or_404(listing_id, db)
    offer = Offer(listing_id=listing_id, **payload.model_dump())
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


@router.get("/listings/{listing_id}/offers", response_model=list[OfferOut])
def listing_offers(listing_id: str, db: Session = Depends(get_db)):
    _get_listing_or_404(listing_id, db)
    return (
        db.query(Offer)
        .filter(Offer.listing_id == listing_id)
        .order_by(Offer.created_at.desc())
        .all()
    )


@router.get("/offers/mine")
def my_offers(user_id: str, db: Session = Depends(get_db)):
    """A buyer's sent offers, enriched with the listing's crop/price and
    the farmer's name so the frontend doesn't need N follow-up calls."""
    offers = (
        db.query(Offer)
        .filter(Offer.buyer_id == user_id)
        .order_by(Offer.created_at.desc())
        .all()
    )
    result = []
    for offer in offers:
        listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == offer.listing_id).first()
        farmer = db.query(User).filter(User.id == listing.user_id).first() if listing else None
        result.append(_enrich_offer(offer, listing, farmer))
    return result


@router.get("/offers/received")
def received_offers(user_id: str, db: Session = Depends(get_db)):
    """A farmer's inbox: every offer made on any of their listings."""
    listing_ids = [
        row.id for row in db.query(MarketplaceListing.id).filter(MarketplaceListing.user_id == user_id).all()
    ]
    if not listing_ids:
        return []
    offers = (
        db.query(Offer)
        .filter(Offer.listing_id.in_(listing_ids))
        .order_by(Offer.created_at.desc())
        .all()
    )
    result = []
    for offer in offers:
        listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == offer.listing_id).first()
        buyer = db.query(User).filter(User.id == offer.buyer_id).first()
        result.append(_enrich_offer(offer, listing, buyer))
    return result


@router.patch("/offers/{offer_id}", response_model=OfferOut)
def update_offer_status(offer_id: str, payload: OfferStatusUpdate, db: Session = Depends(get_db)):
    if payload.status not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="status must be 'accepted' or 'rejected'")
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    offer.status = payload.status
    if payload.status == "accepted":
        listing = db.query(MarketplaceListing).filter(MarketplaceListing.id == offer.listing_id).first()
        if listing:
            listing.status = "sold"
        offer.fulfillment_status = "awaiting_payment"
    db.commit()
    db.refresh(offer)
    return offer


@router.patch("/offers/{offer_id}/fulfillment", response_model=OfferOut)
def update_fulfillment(offer_id: str, payload: FulfillmentUpdate, db: Session = Depends(get_db)):
    """Advance an accepted deal: awaiting_payment -> paid -> delivered.
    No real payment gateway here - this just tracks the state both sides
    agree it's in, same as a shared checklist."""
    valid = ("awaiting_payment", "paid", "delivered")
    if payload.fulfillment_status not in valid:
        raise HTTPException(status_code=400, detail=f"fulfillment_status must be one of {valid}")
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if offer.status != "accepted":
        raise HTTPException(status_code=400, detail="Only accepted offers can be fulfilled")
    offer.fulfillment_status = payload.fulfillment_status
    db.commit()
    db.refresh(offer)
    return offer


@router.patch("/listings/{listing_id}/close", response_model=ListingOut)
def close_listing(listing_id: str, db: Session = Depends(get_db)):
    """Farmer withdraws a listing from the marketplace (not sold, just delisted)."""
    listing = _get_listing_or_404(listing_id, db)
    listing.status = "closed"
    db.commit()
    db.refresh(listing)
    return listing

import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class GeoJSONPolygon(BaseModel):
    type: str = Field(default="Polygon")
    coordinates: List[List[List[float]]]


class FarmCreate(BaseModel):
    user_id: uuid.UUID
    farm_name: str
    crop: str
    sowing_date: Optional[date] = None
    boundary: GeoJSONPolygon


class FarmOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    farm_name: str
    crop: str
    sowing_date: Optional[date] = None
    area_acres: Optional[float] = None
    boundary: GeoJSONPolygon
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None   # plain-text; hashed before storing
    language: str = "en"
    role: str = "farmer"
    district: Optional[str] = None
    state: Optional[str] = None


class UserLogin(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    language: str
    role: str
    district: Optional[str] = None
    state: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Marketplace ----


class ListingCreate(BaseModel):
    user_id: uuid.UUID
    crop: str
    variety: Optional[str] = None
    quantity: float
    unit: str = "Quintal"
    expected_price: float
    state: Optional[str] = None
    district: Optional[str] = None
    description: Optional[str] = None


class ListingOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    crop: str
    variety: Optional[str] = None
    quantity: float
    unit: str
    expected_price: float
    state: Optional[str] = None
    district: Optional[str] = None
    description: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class OfferCreate(BaseModel):
    buyer_id: uuid.UUID
    offer_price: float
    quantity: Optional[float] = None
    message: Optional[str] = None


class OfferOut(BaseModel):
    id: uuid.UUID
    listing_id: uuid.UUID
    buyer_id: uuid.UUID
    offer_price: float
    quantity: Optional[float] = None
    message: Optional[str] = None
    status: str
    fulfillment_status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OfferStatusUpdate(BaseModel):
    status: str  # accepted | rejected


class FulfillmentUpdate(BaseModel):
    fulfillment_status: str  # awaiting_payment | paid | delivered


# ---- Service hub ----


class ServiceBookingCreate(BaseModel):
    user_id: uuid.UUID
    farm_id: Optional[uuid.UUID] = None
    service_type: str
    scheduled_date: date
    area_acres: Optional[float] = None
    notes: Optional[str] = None


class ServiceBookingOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    farm_id: Optional[uuid.UUID] = None
    service_type: str
    scheduled_date: date
    area_acres: Optional[float] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Assistant (medicine) ----


class MedicineAskRequest(BaseModel):
    question: str
    crop: Optional[str] = None
    language: Optional[str] = "en"

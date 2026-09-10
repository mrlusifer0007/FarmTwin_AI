import uuid
from datetime import datetime

from sqlalchemy import Column, String, Date, Numeric, ForeignKey, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)
    phone = Column(String, unique=True, nullable=True)
    password_hash = Column(String, nullable=True)   # hashed password (bcrypt)
    language = Column(String, nullable=False, default="en")
    role = Column(String, nullable=False, default="farmer")  # 'farmer' | 'buyer'
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Farm(Base):
    __tablename__ = "farms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    farm_name = Column(String, nullable=False)
    crop = Column(String, nullable=False)
    sowing_date = Column(Date, nullable=True)
    area_acres = Column(Numeric(10, 2), nullable=True)
    boundary = Column(Geometry(geometry_type="POLYGON", srid=4326), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class SatelliteObservation(Base):
    __tablename__ = "satellite_observations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    obs_date = Column(Date, nullable=False)
    image_id = Column(String, nullable=True)
    cloud_percentage = Column(Numeric(5, 2), nullable=True)
    ndvi_mean = Column(Numeric(5, 4), nullable=True)
    ndvi_min = Column(Numeric(5, 4), nullable=True)
    ndvi_max = Column(Numeric(5, 4), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Weather(Base):
    __tablename__ = "weather"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    obs_date = Column(Date, nullable=False)
    temperature_c = Column(Numeric(5, 2), nullable=True)
    rainfall_mm = Column(Numeric(6, 2), nullable=True)
    humidity_pct = Column(Numeric(5, 2), nullable=True)


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    pred_date = Column(Date, nullable=False)
    health_score = Column(Integer, nullable=True)
    stress_type = Column(String, nullable=True)
    confidence = Column(Numeric(4, 3), nullable=True)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    rec_date = Column(Date, nullable=False)
    recommendation = Column(String, nullable=False)
    language = Column(String, nullable=False, default="en")


class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    crop = Column(String, nullable=False)
    variety = Column(String, nullable=True)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit = Column(String, nullable=False, default="Quintal")
    expected_price = Column(Numeric(10, 2), nullable=False)
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="active")  # active | sold | closed
    created_at = Column(DateTime, default=datetime.utcnow)


class Offer(Base):
    __tablename__ = "offers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("marketplace_listings.id", ondelete="CASCADE"), nullable=False)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    offer_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending | accepted | rejected
    fulfillment_status = Column(String, nullable=True)  # null until accepted, then: awaiting_payment | paid | delivered
    created_at = Column(DateTime, default=datetime.utcnow)


class ServiceBooking(Base):
    __tablename__ = "service_bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="SET NULL"), nullable=True)
    service_type = Column(String, nullable=False)  # spray | crop_cutting
    scheduled_date = Column(Date, nullable=False)
    area_acres = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending | confirmed | completed | cancelled
    created_at = Column(DateTime, default=datetime.utcnow)


class DiseaseScan(Base):
    __tablename__ = "disease_scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farms.id", ondelete="SET NULL"), nullable=True)
    crop = Column(String, nullable=True)
    status = Column(String, nullable=True)  # Healthy | At Risk | Diseased
    disease_name = Column(String, nullable=True)
    confidence_label = Column(String, nullable=True)  # Low | Medium | High
    summary = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

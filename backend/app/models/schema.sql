-- AgriTwin AI database schema
-- Requires PostGIS: CREATE EXTENSION IF NOT EXISTS postgis;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    language TEXT NOT NULL DEFAULT 'en',  -- 'en' | 'hi' | 'mr'
    role TEXT NOT NULL DEFAULT 'farmer',  -- 'farmer' | 'buyer'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farm_name TEXT NOT NULL,
    crop TEXT NOT NULL,
    sowing_date DATE,
    area_acres NUMERIC(10, 2),
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farms_boundary ON farms USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_farms_user ON farms (user_id);

-- Phase 2+ tables (created now so the schema doesn't need to change later)

CREATE TABLE IF NOT EXISTS satellite_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    obs_date DATE NOT NULL,
    image_id TEXT,
    cloud_percentage NUMERIC(5, 2),
    ndvi_mean NUMERIC(5, 4),
    ndvi_min NUMERIC(5, 4),
    ndvi_max NUMERIC(5, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weather (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    obs_date DATE NOT NULL,
    temperature_c NUMERIC(5, 2),
    rainfall_mm NUMERIC(6, 2),
    humidity_pct NUMERIC(5, 2)
);

CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    pred_date DATE NOT NULL,
    health_score INTEGER,      -- 0 = stressed, 1 = moderate, 2 = healthy
    stress_type TEXT,
    confidence NUMERIC(4, 3)
);

CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    rec_date DATE NOT NULL,
    recommendation TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en'
);

-- Marketplace, service hub, and disease-detection tables

CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    crop TEXT NOT NULL,
    variety TEXT,
    quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'Quintal',
    expected_price NUMERIC(10, 2) NOT NULL,
    state TEXT,
    district TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',  -- active | sold | closed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offer_price NUMERIC(10, 2) NOT NULL,
    quantity NUMERIC(10, 2),
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected
    fulfillment_status TEXT,  -- null until accepted, then: awaiting_payment | paid | delivered
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    service_type TEXT NOT NULL,  -- spray | crop_cutting
    scheduled_date DATE NOT NULL,
    area_acres NUMERIC(10, 2),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disease_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    crop TEXT,
    status TEXT,
    disease_name TEXT,
    confidence_label TEXT,
    summary TEXT,
    recommended_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

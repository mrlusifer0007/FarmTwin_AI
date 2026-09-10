"""
Sentinel-2 satellite endpoints powered by Microsoft Planetary Computer.

  GET /api/farms/{id}/ndvi          → real NDVI from Sentinel-2 L2A (no auth needed)
  GET /api/farms/{id}/ndvi/history  → stored NDVI time series from DB
  GET /api/farms/{id}/ndvi/grid     → placeholder (grid requires EE; uses synthetic data)
  GET /api/farms/{id}/satellite     → latest scene metadata

All NDVI calls:
  1. Attempt to fetch real Sentinel-2 data via Planetary Computer.
  2. Fall back to the most recent stored SatelliteObservation in the DB.
  3. If no DB row either, generate a deterministic synthetic value so the
     dashboard never shows "—".
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from geoalchemy2.shape import to_shape
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm import Farm, SatelliteObservation
from app.services import ndvi_planetary as ndvi_svc
from app.services.ndvi import detect_stress       # stress logic unchanged

router = APIRouter(prefix="/api/farms", tags=["satellite"])


# ─── helpers ───────────────────────────────────────────────────────────────

def _get_farm_or_404(farm_id: str, db: Session) -> Farm:
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm


def _boundary_geojson(farm: Farm) -> dict:
    return to_shape(farm.boundary).__geo_interface__


def _db_latest(farm_id: str, db: Session) -> dict | None:
    """Return the most recent stored NDVI observation as a plain dict, or None."""
    row = (
        db.query(SatelliteObservation)
        .filter(SatelliteObservation.farm_id == farm_id)
        .order_by(SatelliteObservation.obs_date.desc())
        .first()
    )
    if row and row.ndvi_mean is not None:
        return {
            "ndvi_mean":  float(row.ndvi_mean),
            "ndvi_min":   float(row.ndvi_min) if row.ndvi_min is not None else None,
            "ndvi_max":   float(row.ndvi_max) if row.ndvi_max is not None else None,
            "date":       row.obs_date.isoformat(),
            "image_id":   row.image_id,
            "cloud_pct":  float(row.cloud_percentage) if row.cloud_percentage is not None else None,
            "source":     "Stored DB observation",
        }
    return None


def _persist(farm_id: str, data: dict, db: Session) -> None:
    """Save an NDVI observation to DB (skip if same date already stored)."""
    obs_date = date.fromisoformat(data["date"]) if data.get("date") else date.today()
    exists = (
        db.query(SatelliteObservation)
        .filter(
            SatelliteObservation.farm_id == farm_id,
            SatelliteObservation.obs_date == obs_date,
        )
        .first()
    )
    if not exists:
        db.add(
            SatelliteObservation(
                farm_id=farm_id,
                obs_date=obs_date,
                image_id=data.get("image_id"),
                cloud_percentage=data.get("cloud_pct"),
                ndvi_mean=data["ndvi_mean"],
                ndvi_min=data.get("ndvi_min"),
                ndvi_max=data.get("ndvi_max"),
            )
        )
        db.commit()


# ─── endpoints ─────────────────────────────────────────────────────────────

@router.get("/{farm_id}/ndvi")
def get_ndvi(farm_id: str, lookback_days: int = 90, db: Session = Depends(get_db)):
    """
    Return latest NDVI for the farm from Sentinel-2 (Planetary Computer).
    Falls back to DB cache, then to a deterministic synthetic value.
    """
    farm    = _get_farm_or_404(farm_id, db)
    boundary = _boundary_geojson(farm)

    current = None
    source  = "unknown"

    # 1️⃣  Try Planetary Computer (real satellite data)
    try:
        current = ndvi_svc.get_ndvi(boundary, lookback_days=lookback_days)
        source  = "planetary_computer"
    except ndvi_svc.PlanetaryComputerError as exc:
        # Log but don't crash — fall through to DB / synthetic
        print(f"[NDVI] Planetary Computer unavailable for farm {farm_id}: {exc}")
    except Exception as exc:
        print(f"[NDVI] Unexpected error from Planetary Computer: {exc}")

    # 2️⃣  Fall back to most recent stored observation
    if current is None:
        current = _db_latest(farm_id, db)
        if current:
            source = "db_cache"

    # 3️⃣  Last resort: deterministic synthetic value
    if current is None:
        current = ndvi_svc.synthetic_ndvi(farm_id)
        source  = "synthetic"

    # Persist to DB if we got real data
    if source == "planetary_computer":
        _persist(farm_id, current, db)

    # Build previous observation for stress comparison
    prev_row = (
        db.query(SatelliteObservation)
        .filter(SatelliteObservation.farm_id == farm_id)
        .order_by(SatelliteObservation.obs_date.desc())
        .offset(1)
        .first()
    )
    previous = None
    if prev_row and prev_row.ndvi_mean is not None:
        previous = {
            "date":      prev_row.obs_date.isoformat(),
            "ndvi_mean": float(prev_row.ndvi_mean),
        }

    stress = detect_stress(current, previous)

    return {
        "current":  current,
        "previous": previous,
        "stress":   stress,
        "data_source": source,   # lets the frontend show a badge
    }


@router.get("/{farm_id}/ndvi/history")
def get_ndvi_history(
    farm_id: str,
    days: int = Query(90, description="How many days of stored history to return"),
    db: Session = Depends(get_db),
):
    """Return stored NDVI history from DB (populated by prior /ndvi calls)."""
    _get_farm_or_404(farm_id, db)

    start = date.today() - timedelta(days=days)
    rows = (
        db.query(SatelliteObservation)
        .filter(
            SatelliteObservation.farm_id == farm_id,
            SatelliteObservation.obs_date >= start,
        )
        .order_by(SatelliteObservation.obs_date.asc())
        .all()
    )

    series = [
        {
            "date":      r.obs_date.isoformat(),
            "ndvi_mean": float(r.ndvi_mean) if r.ndvi_mean is not None else None,
            "ndvi_min":  float(r.ndvi_min)  if r.ndvi_min  is not None else None,
            "ndvi_max":  float(r.ndvi_max)  if r.ndvi_max  is not None else None,
        }
        for r in rows
    ]

    return {
        "farm_id":    farm_id,
        "start_date": start.isoformat(),
        "end_date":   date.today().isoformat(),
        "series":     series,
    }


@router.get("/{farm_id}/ndvi/grid")
def get_ndvi_grid(
    farm_id: str,
    grid_size: int = Query(3, ge=2, le=6),
    db: Session = Depends(get_db),
):
    """
    Return a grid of NDVI values over the farm.
    Uses the most recent stored observation split into a synthetic grid
    (true per-cell Sentinel-2 computation requires Earth Engine or a
    dedicated raster-clip pipeline; this is a placeholder).
    """
    farm = _get_farm_or_404(farm_id, db)

    stored = _db_latest(farm_id, db)
    if not stored:
        stored = ndvi_svc.synthetic_ndvi(farm_id)

    mean = stored["ndvi_mean"]
    import random
    rng = random.Random(hash(farm_id))

    cells = []
    for row in range(grid_size):
        for col in range(grid_size):
            cell_ndvi = round(min(max(mean + rng.uniform(-0.08, 0.08), -1), 1), 4)
            label = "good" if cell_ndvi >= 0.6 else "medium" if cell_ndvi >= 0.35 else "low"
            cells.append({"row": row, "col": col, "ndvi_mean": cell_ndvi, "health": label})

    return {"farm_id": farm_id, "grid_size": grid_size, "cells": cells}


@router.get("/{farm_id}/satellite")
def get_satellite(farm_id: str, lookback_days: int = 90, db: Session = Depends(get_db)):
    """Return latest scene metadata (date, cloud cover, source)."""
    farm    = _get_farm_or_404(farm_id, db)
    stored  = _db_latest(farm_id, db)

    if stored:
        return {
            "image_id":        stored.get("image_id"),
            "date":            stored.get("date"),
            "cloud_percentage": stored.get("cloud_pct"),
            "source":          stored.get("source"),
        }

    return {
        "image_id":        None,
        "date":            date.today().isoformat(),
        "cloud_percentage": None,
        "source":          "No scene cached yet — call /ndvi first",
    }

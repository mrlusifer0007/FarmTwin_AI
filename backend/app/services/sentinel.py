"""Sentinel-2 imagery acquisition for a farm boundary.

Workflow (per the project plan):
  farm boundary -> Earth Engine -> Sentinel-2 collection -> filter date
  -> filter to farm boundary -> cloud filtering -> hand off to ndvi.py
"""
from datetime import date, timedelta
from typing import Dict, Optional

import ee

from app.services.earth_engine import ensure_initialized

S2_COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"
MAX_CLOUD_PERCENT = 100  # Increase to avoid 404s in demos


def geojson_to_ee_geometry(geojson: Dict) -> ee.Geometry:
    return ee.Geometry(geojson)


def _mask_clouds(image: ee.Image) -> ee.Image:
    """Mask clouds/cirrus using the Sentinel-2 QA60 band."""
    qa = image.select("QA60")
    cloud_bit = 1 << 10
    cirrus_bit = 1 << 11
    mask = qa.bitwiseAnd(cloud_bit).eq(0).And(qa.bitwiseAnd(cirrus_bit).eq(0))
    return image.updateMask(mask).divide(10000).copyProperties(image, image.propertyNames())


def get_filtered_collection(
    boundary_geojson: Dict,
    start_date: date,
    end_date: date,
    max_cloud_percent: int = MAX_CLOUD_PERCENT,
) -> ee.ImageCollection:
    """Sentinel-2 images covering the farm, cloud-filtered, cloud-masked, clipped."""
    ensure_initialized()
    geom = geojson_to_ee_geometry(boundary_geojson)

    collection = (
        ee.ImageCollection(S2_COLLECTION)
        .filterBounds(geom)
        .filterDate(str(start_date), str(end_date))
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", max_cloud_percent))
        .map(_mask_clouds)
        .map(lambda img: img.clip(geom))
    )
    return collection


def get_latest_image(
    boundary_geojson: Dict,
    lookback_days: int = 180,
    max_cloud_percent: int = MAX_CLOUD_PERCENT,
) -> Optional[ee.Image]:
    """Most recent usable (cloud-filtered) Sentinel-2 image for a farm, or None."""
    end = date.today()
    start = end - timedelta(days=lookback_days)
    collection = get_filtered_collection(boundary_geojson, start, end, max_cloud_percent)

    count = collection.size().getInfo()
    if count == 0:
        return None

    latest = collection.sort("system:time_start", False).first()
    return latest

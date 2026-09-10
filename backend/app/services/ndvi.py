"""NDVI calculation over Sentinel-2 imagery.

NDVI = (NIR - RED) / (NIR + RED) = (B8 - B4) / (B8 + B4)

NDVI is a vegetation-vigor indicator, not a diagnosis: don't present a
single value as proof of a specific disease or condition. Crop type,
growth stage, soil background, and residual cloud contamination all
affect it.
"""
from datetime import date, timedelta
from typing import Dict, List, Optional, TypedDict

import ee

from app.services.sentinel import get_filtered_collection, get_latest_image


class NdviStats(TypedDict):
    date: Optional[str]
    image_id: Optional[str]
    cloud_percentage: Optional[float]
    ndvi_mean: Optional[float]
    ndvi_min: Optional[float]
    ndvi_max: Optional[float]


def _add_ndvi_band(image: ee.Image) -> ee.Image:
    ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
    return image.addBands(ndvi)


def compute_ndvi_stats(image: ee.Image, geom: ee.Geometry, scale: int = 10) -> Dict:
    """Mean/min/max NDVI for one image over a farm polygon."""
    image = _add_ndvi_band(image)
    ndvi = image.select("NDVI")

    reducer = ee.Reducer.mean().combine(ee.Reducer.min(), sharedInputs=True).combine(
        ee.Reducer.max(), sharedInputs=True
    )
    stats = ndvi.reduceRegion(reducer=reducer, geometry=geom, scale=scale, maxPixels=1e9).getInfo()

    return {
        "ndvi_mean": stats.get("NDVI_mean"),
        "ndvi_min": stats.get("NDVI_min"),
        "ndvi_max": stats.get("NDVI_max"),
    }


def get_latest_ndvi(boundary_geojson: Dict, lookback_days: int = 30) -> Optional[NdviStats]:
    """Latest usable NDVI observation for a farm, or None if no clear scene is available."""
    image = get_latest_image(boundary_geojson, lookback_days=lookback_days)
    if image is None:
        return None

    geom = ee.Geometry(boundary_geojson)
    info = image.getInfo()
    props = info.get("properties", {})

    stats = compute_ndvi_stats(image, geom)

    timestamp_ms = props.get("system:time_start")
    obs_date = None
    if timestamp_ms:
        from datetime import datetime, timezone

        obs_date = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).date().isoformat()

    return {
        "date": obs_date,
        "image_id": info.get("id"),
        "cloud_percentage": props.get("CLOUDY_PIXEL_PERCENTAGE"),
        "ndvi_mean": stats["ndvi_mean"],
        "ndvi_min": stats["ndvi_min"],
        "ndvi_max": stats["ndvi_max"],
    }


def get_ndvi_time_series(
    boundary_geojson: Dict,
    start_date: date,
    end_date: date,
) -> List[NdviStats]:
    """NDVI stats for every usable Sentinel-2 scene in a date range.

    Used for the NDVI trend graph (Module: NDVI history) and for
    stress detection (comparing the latest value against the previous one).
    """
    geom = ee.Geometry(boundary_geojson)
    collection = get_filtered_collection(boundary_geojson, start_date, end_date)

    image_list = collection.sort("system:time_start").toList(collection.size())
    count = collection.size().getInfo()

    results: List[NdviStats] = []
    for i in range(count):
        image = ee.Image(image_list.get(i))
        info = image.getInfo()
        props = info.get("properties", {})
        stats = compute_ndvi_stats(image, geom)

        timestamp_ms = props.get("system:time_start")
        obs_date = None
        if timestamp_ms:
            from datetime import datetime, timezone

            obs_date = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).date().isoformat()

        results.append(
            {
                "date": obs_date,
                "image_id": info.get("id"),
                "cloud_percentage": props.get("CLOUDY_PIXEL_PERCENTAGE"),
                "ndvi_mean": stats["ndvi_mean"],
                "ndvi_min": stats["ndvi_min"],
                "ndvi_max": stats["ndvi_max"],
            }
        )
    return results


def compute_ndvi_grid(boundary_geojson: Dict, image: ee.Image, grid_size: int = 3) -> List[Dict]:
    """Split a farm polygon into a grid_size x grid_size grid (clipped to the
    farm boundary) and compute mean NDVI per cell.

    This is what powers the field-health map (Module 12 in the plan):
    instead of one NDVI number for the whole farm, show where the
    problem is. grid_size=3 gives a 3x3 grid, matching the plan's example.
    """
    geom = ee.Geometry(boundary_geojson)
    bounds = geom.bounds().coordinates().get(0).getInfo()
    lons = [c[0] for c in bounds]
    lats = [c[1] for c in bounds]
    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)

    lon_step = (max_lon - min_lon) / grid_size
    lat_step = (max_lat - min_lat) / grid_size

    image = _add_ndvi_band(image)
    ndvi = image.select("NDVI")

    cells = []
    for row in range(grid_size):
        for col in range(grid_size):
            cell_min_lon = min_lon + col * lon_step
            cell_max_lon = min_lon + (col + 1) * lon_step
            cell_min_lat = min_lat + row * lat_step
            cell_max_lat = min_lat + (row + 1) * lat_step

            cell_rect = ee.Geometry.Rectangle(
                [cell_min_lon, cell_min_lat, cell_max_lon, cell_max_lat]
            )
            cell_geom = cell_rect.intersection(geom, ee.ErrorMargin(1))

            cell_geojson = cell_geom.getInfo()
            # Skip cells that don't actually overlap the farm boundary.
            if not cell_geojson.get("coordinates"):
                continue

            stats = ndvi.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=cell_geom, scale=10, maxPixels=1e9
            ).getInfo()
            mean_val = stats.get("NDVI")

            cells.append(
                {
                    "row": row,
                    "col": col,
                    "geometry": cell_geojson,
                    "ndvi_mean": mean_val,
                    "health": _health_label(mean_val),
                }
            )
    return cells


def _health_label(ndvi_mean: Optional[float]) -> str:
    if ndvi_mean is None:
        return "unknown"
    if ndvi_mean >= 0.6:
        return "good"
    if ndvi_mean >= 0.35:
        return "medium"
    return "low"


def detect_stress(current: NdviStats, previous: Optional[NdviStats]) -> Dict:
    """Compare two NDVI readings and flag a possible (not certain) decline.

    Mirrors the plan: a >=15% relative drop in mean NDVI is flagged as
    worth inspecting, phrased as a possible cause rather than a diagnosis.
    """
    if previous is None or previous["ndvi_mean"] is None or current["ndvi_mean"] is None:
        return {"flag": False, "change_pct": None, "message": "Not enough history yet."}

    prev_val = previous["ndvi_mean"]
    curr_val = current["ndvi_mean"]
    change_pct = ((curr_val - prev_val) / prev_val) * 100 if prev_val else None

    if change_pct is not None and change_pct <= -15:
        return {
            "flag": True,
            "change_pct": round(change_pct, 1),
            "message": (
                f"NDVI decreased by {abs(round(change_pct, 1))}% compared with the previous "
                "observation. Possible causes include water stress, disease, nutrient "
                "deficiency, or weather stress. Inspect the affected area before taking action."
            ),
        }

    return {
        "flag": False,
        "change_pct": round(change_pct, 1) if change_pct is not None else None,
        "message": "No significant decline detected.",
    }

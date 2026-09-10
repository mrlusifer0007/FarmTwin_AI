"""Geometry helpers for farm boundaries.

Farm boundaries arrive from the frontend as GeoJSON (lon/lat, EPSG:4326).
We store them as PostGIS geometry and need to compute an approximate
area in acres for display. A simple equirectangular projection centred
on the polygon is accurate enough for single-field parcels.
"""
import math
from typing import Dict, List

from shapely.geometry import shape, mapping
from shapely.ops import transform


def _normalize_lon(lon: float) -> float:
    """Wrap longitude into [-180, 180] range.

    Some Leaflet draw interactions can produce coordinates slightly outside
    the normal range (e.g., 405° when panning past the date line). This
    normalises them so Open-Meteo and Planetary Computer don't reject them.
    """
    lon = lon % 360.0          # 0 … 360
    if lon > 180.0:
        lon -= 360.0           # -180 … 180
    return lon


def geojson_to_wkt(geojson: Dict) -> str:
    geom = shape(geojson)
    return geom.wkt


def wkt_to_geojson(wkt: str) -> Dict:
    from shapely import wkt as shapely_wkt

    geom = shapely_wkt.loads(wkt)
    return mapping(geom)


def polygon_centroid(geojson: Dict) -> Dict[str, float]:
    """Centroid of a farm polygon, used as the point location for weather APIs."""
    geom = shape(geojson)
    centroid = geom.centroid
    return {"lat": centroid.y, "lon": _normalize_lon(centroid.x)}


def polygon_area_acres(geojson: Dict) -> float:
    """Approximate area in acres using a local equirectangular projection."""
    geom = shape(geojson)
    coords = list(geom.exterior.coords)
    # Normalize all longitudes before projecting
    norm_coords = [(_normalize_lon(c[0]), c[1]) for c in coords]
    lat0 = sum(c[1] for c in norm_coords) / len(norm_coords)
    lat0_rad = math.radians(lat0)

    # meters per degree at this latitude
    m_per_deg_lat = 111_132.92 - 559.82 * math.cos(2 * lat0_rad)
    m_per_deg_lon = 111_412.84 * math.cos(lat0_rad)

    def project(lon, lat, z=None):
        return (_normalize_lon(lon) * m_per_deg_lon, lat * m_per_deg_lat)

    projected = transform(project, geom)
    area_m2 = abs(projected.area)
    return round(area_m2 / 4046.8564224, 2)  # 1 acre = 4046.86 m^2

"""GIS & Raster processing helper service.

Integrates Rasterio / GDAL for local geotiff processing, bounding box calculation,
and GIS raster operations to complement Google Earth Engine.
"""
from typing import Dict, List, Tuple
from shapely.geometry import shape, Polygon

def polygon_bounds(boundary_geojson: Dict) -> Tuple[float, float, float, float]:
    """Extract bounding box (min_x, min_y, max_x, max_y) from GeoJSON polygon."""
    geom = shape(boundary_geojson)
    return geom.bounds

def calculate_raster_grid_cells(boundary_geojson: Dict, grid_size: int = 3) -> List[Dict]:
    """Decompose farm boundary polygon into grid cells for zone-by-zone analysis."""
    minx, miny, maxx, maxy = polygon_bounds(boundary_geojson)
    
    x_step = (maxx - minx) / grid_size
    y_step = (maxy - miny) / grid_size
    
    grid_cells = []
    cell_id = 1
    for i in range(grid_size):
        for j in range(grid_size):
            cell_poly = Polygon([
                (minx + i * x_step, miny + j * y_step),
                (minx + (i + 1) * x_step, miny + j * y_step),
                (minx + (i + 1) * x_step, miny + (j + 1) * y_step),
                (minx + i * x_step, miny + (j + 1) * y_step),
            ])
            grid_cells.append({
                "cell_id": f"Zone_{cell_id}",
                "grid_col": i,
                "grid_row": j,
                "bounds": cell_poly.bounds,
            })
            cell_id += 1
            
    return grid_cells

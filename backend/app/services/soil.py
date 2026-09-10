"""SoilGrids API integration service.

Queries the ISRIC SoilGrids 2.0 REST API for global soil properties:
- pH (phh2o)
- Clay content (clay)
- Sand content (sand)
- Soil Organic Carbon (soc)
- Nitrogen (nitrogen)
"""
import requests
from typing import Dict, Optional

SOILGRIDS_API_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
REQUEST_TIMEOUT = 5  # seconds

def get_soil_profile(lat: float, lon: float) -> Dict:
    """Fetch soil properties from SoilGrids API for a given location."""
    params = {
        "lon": lon,
        "lat": lat,
        "property": ["phh2o", "clay", "sand", "soc", "nitrogen"],
        "depth": "0-5cm",
        "value": "mean",
    }
    
    try:
        resp = requests.get(SOILGRIDS_API_URL, params=params, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            layers = {l["name"]: l for l in data.get("properties", {}).get("layers", [])}
            
            def extract_val(prop_name: str, factor: float = 1.0) -> Optional[float]:
                if prop_name in layers:
                    depths = layers[prop_name].get("depths", [])
                    if depths and "values" in depths[0]:
                        val = depths[0]["values"].get("mean")
                        if val is not None:
                            return round(val * factor, 2)
                return None

            ph = extract_val("phh2o", 0.1) # SoilGrids phh2o is pH * 10
            clay = extract_val("clay", 0.1) # g/kg -> %
            sand = extract_val("sand", 0.1) # g/kg -> %
            soc = extract_val("soc", 0.1)   # dg/kg -> g/kg

            if ph is not None:
                soil_type = "Loam"
                if clay and clay > 35:
                    soil_type = "Clay Loam / Black Soil"
                elif sand and sand > 45:
                    soil_type = "Sandy Loam"
                
                return {
                    "source": "SoilGrids ISRIC v2.0",
                    "ph": ph,
                    "clay_pct": clay,
                    "sand_pct": sand,
                    "organic_carbon_g_kg": soc,
                    "soil_type": soil_type,
                    "texture": "Medium Fine" if clay and clay > 30 else "Balanced Medium",
                }
    except Exception as e:
        print(f"SoilGrids API query fallback: {e}")

    # Regional fallback for Indian Agricultural Soils (typically pH 6.5-7.5, Clay-Loam)
    return {
        "source": "Indian Agricultural Soil Profile (Estimated)",
        "ph": 6.8,
        "clay_pct": 32.5,
        "sand_pct": 38.0,
        "organic_carbon_g_kg": 5.4,
        "soil_type": "Black Cotton / Clay Loam",
        "texture": "Medium Clay Loam",
    }

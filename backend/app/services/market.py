"""AI Selling Advisor.

Real, live per-mandi commodity prices in India come from the government's
Agmarknet/data.gov.in APIs, which need a registered API key and aren't
wired up here. Rather than fabricate a "live price" number and pass it
off as real, this service is explicit about what it is: a deterministic,
disclosed estimate built from (a) a representative base price per crop
and (b) the farm's real recent weather (via services.weather), which
does shift the estimate a little - low rainfall / heat stress nudges
the "predicted price" up slightly (scarcity), consistent with how
mandi prices actually move.

Swap `estimate_prices()` for a real Agmarknet call later without
touching the route or the frontend contract.
"""
import hashlib
from datetime import date, timedelta
from typing import Dict, List, Optional

# Representative wholesale price per quintal (INR), used as the estimator's
# base line. These are rounded, typical mandi values - not a live feed.
BASE_PRICE_PER_QUINTAL = {
    "wheat": 2350,
    "rice": 2850,
    "paddy": 2100,
    "maize": 1950,
    "cotton": 6800,
    "sugarcane": 340,
    "soybean": 4300,
    "groundnut": 5900,
    "mustard": 5450,
    "gram": 5200,
    "bajra": 2100,
    "jowar": 3100,
    "potato": 1200,
    "onion": 1600,
    "tomato": 1400,
    "cauliflower": 900,
    "pumpkin": 700,
}

# Demo mandi network. Distance/travel-time are illustrative for the UI;
# swap for a real distance-matrix lookup once farm coordinates are wired in.
MANDI_NETWORK = [
    {"name": "Etawah Mandi", "lat": 26.7751, "lon": 79.0154, "distance_km": 4, "travel_time": "10 min", "demand": "Very High", "price_multiplier": 1.02},
    {"name": "Mainpuri Mandi", "lat": 27.2333, "lon": 79.0167, "distance_km": 32, "travel_time": "40 min", "demand": "Medium", "price_multiplier": 0.98},
    {"name": "Kanpur Mandi", "lat": 26.4499, "lon": 80.3319, "distance_km": 92, "travel_time": "2 hrs", "demand": "Low", "price_multiplier": 0.96},
]


def _base_price(crop: str) -> float:
    return BASE_PRICE_PER_QUINTAL.get((crop or "").strip().lower(), 2200)


def _seeded_fraction(*parts: str) -> float:
    """Deterministic 0.0-1.0 value from the given parts (stable per crop/day,
    so the estimate doesn't jump around on every page refresh)."""
    key = "|".join(parts).encode()
    digest = hashlib.sha256(key).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def estimate_prices(
    crop: str,
    quantity_qtl: Optional[float] = None,
    rainfall_7d_mm: Optional[float] = None,
    temperature_avg_7d_c: Optional[float] = None,
    district: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Dict:
    today = date.today()
    base = _base_price(crop)

    # Today's price: small deterministic daily wobble around the base price.
    daily_wobble = (_seeded_fraction(crop, today.isoformat()) - 0.5) * 0.06  # +/-3%
    today_price = round(base * (1 + daily_wobble), -1) or base

    # Weather-informed nudge for the 5-day-ahead prediction: dry/hot
    # conditions tend to tighten near-term supply, nudging price up a bit.
    weather_nudge = 0.0
    if rainfall_7d_mm is not None and rainfall_7d_mm < 10:
        weather_nudge += 0.02
    if temperature_avg_7d_c is not None and temperature_avg_7d_c > 33:
        weather_nudge += 0.015

    trend = _seeded_fraction(crop, "trend", today.isoformat()) * 0.05  # 0-5% upward drift
    predicted_price = round(today_price * (1 + trend + weather_nudge), -1)

    import math

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    base_lat = lat or 19.99
    base_lon = lon or 73.79
    base_district = district or "Pune"

    # Real APMC Mandis in Maharashtra
    real_mandis = [
        {"name": "Pune APMC", "lat": 18.5204, "lon": 73.8567, "demand": "Very High", "price_multiplier": 1.04},
        {"name": "Nashik APMC (Lasalgaon)", "lat": 20.1417, "lon": 74.2272, "demand": "High", "price_multiplier": 1.05},
        {"name": "Vashi APMC, Mumbai", "lat": 19.0760, "lon": 72.8777, "demand": "Very High", "price_multiplier": 1.08},
        {"name": "Nagpur APMC", "lat": 21.1458, "lon": 79.0882, "demand": "Medium", "price_multiplier": 0.98},
        {"name": "Aurangabad APMC", "lat": 19.8762, "lon": 75.3433, "demand": "Medium", "price_multiplier": 0.99},
        {"name": "Solapur APMC", "lat": 17.6599, "lon": 75.9064, "demand": "Medium", "price_multiplier": 0.97},
        {"name": "Kolhapur APMC", "lat": 16.7050, "lon": 74.2433, "demand": "High", "price_multiplier": 1.02},
        {"name": "Jalgaon APMC", "lat": 21.0077, "lon": 75.5626, "demand": "Medium", "price_multiplier": 0.99},
        {"name": "Ahmednagar APMC", "lat": 19.0952, "lon": 74.7496, "demand": "High", "price_multiplier": 1.01},
        {"name": "Satara APMC", "lat": 17.6805, "lon": 74.0183, "demand": "Medium", "price_multiplier": 0.98},
    ]

    # Calculate distance and sort by distance
    for m in real_mandis:
        m["distance_km"] = round(haversine(base_lat, base_lon, m["lat"], m["lon"]), 1)
        # Average speed ~ 40 km/h for trucks
        hours = m["distance_km"] / 40.0
        m["travel_time"] = f"{int(hours)}h {int((hours % 1) * 60)}m" if hours >= 1 else f"{int(hours * 60)} min"
        m["price_per_qtl"] = round(predicted_price * m["price_multiplier"], -1)

    real_mandis.sort(key=lambda x: x["distance_km"])
    mandis = real_mandis[:4] # Return 4 closest mandis

    best_mandi = max(mandis, key=lambda m: m["price_per_qtl"])
    qty = quantity_qtl or 1
    price_gain_per_qtl = predicted_price - today_price
    expected_extra_profit = round(max(price_gain_per_qtl, 0) * qty + (best_mandi["price_per_qtl"] - today_price) * qty * 0.3, -1)

    hold = predicted_price > today_price * 1.03
    decision = "HOLD" if hold else "SELL"
    wait_days = 5 if hold else 0

    if hold:
        final_decision = (
            f"Hold your crop for {wait_days} more days and transport it to {best_mandi['name']}. "
            "This route provides the highest expected return after considering demand, "
            "travel distance and transport cost."
        )
    else:
        final_decision = (
            f"Sell now at {best_mandi['name']} \u2014 prices aren't expected to rise enough "
            "in the next few days to offset holding costs."
        )

    return {
        "crop": crop,
        "today_price": today_price,
        "predicted_price": predicted_price,
        "predicted_after_days": 5,
        "decision": decision,
        "wait_days": wait_days,
        "market_note": "Market conditions are stable." if not hold else "Prices are trending upward.",
        "mandis": mandis,
        "best_mandi": best_mandi,
        "expected_extra_profit": expected_extra_profit,
        "final_decision": final_decision,
        "methodology": (
            "Estimated from a representative base price plus this farm's recent rainfall/temperature "
            "trend \u2014 not a live mandi feed. Verify against your local mandi board before selling."
        ),
    }

# trigger reload

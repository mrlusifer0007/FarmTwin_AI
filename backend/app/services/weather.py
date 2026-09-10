"""Weather data for a farm, via Open-Meteo (https://open-meteo.com).

No API key required, which keeps a college/prototype deployment simple.
Open-Meteo forecast endpoint doubles as a short-history endpoint via
`past_days`, so one call gets us both "what's happening now" and
"what happened the last N days" for the rainfall/temperature trends
the recommendation logic needs, plus a forward-looking 7-day forecast
for the Weather Intelligence screen.

Air quality comes from Open-Meteo's separate (also free, no key)
air-quality endpoint.

Everything below is either a direct pass-through of a real API field or
a small, disclosed rule applied to real fields (weather-code -> text,
AQI bucket, simple threshold-based alerts/advice). None of it is
fabricated data.
"""
from datetime import date, timedelta
from typing import Dict, List, Optional

import requests

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
REQUEST_TIMEOUT_SECONDS = 10

# WMO weather codes -> short human-readable condition text.
# https://open-meteo.com/en/docs (see "WMO Weather interpretation codes")
WEATHER_CODE_TEXT = {
    0: "Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Fog",
    51: "Light Drizzle",
    53: "Drizzle",
    55: "Dense Drizzle",
    56: "Freezing Drizzle",
    57: "Freezing Drizzle",
    61: "Light Rain",
    63: "Rain",
    65: "Heavy Rain",
    66: "Freezing Rain",
    67: "Freezing Rain",
    71: "Light Snow",
    73: "Snow",
    75: "Heavy Snow",
    77: "Snow Grains",
    80: "Light Showers",
    81: "Showers",
    82: "Violent Showers",
    85: "Snow Showers",
    86: "Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm w/ Hail",
    99: "Thunderstorm w/ Hail",
}


class WeatherServiceError(RuntimeError):
    """Raised when the weather API call fails or returns unusable data."""


def condition_text(weather_code: Optional[int]) -> str:
    if weather_code is None:
        return "Unknown"
    return WEATHER_CODE_TEXT.get(int(weather_code), "Unknown")


def aqi_bucket(aqi: Optional[float]) -> Optional[str]:
    """US AQI breakpoints -> category label."""
    if aqi is None:
        return None
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy (Sensitive)"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"


def fetch_weather(lat: float, lon: float, past_days: int = 30, forecast_days: int = 7) -> Dict:
    """Current conditions plus a daily history/forecast window for a point."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": (
            "temperature_2m,relative_humidity_2m,precipitation,"
            "apparent_temperature,wind_speed_10m,weather_code,surface_pressure"
        ),
        "daily": (
            "temperature_2m_max,temperature_2m_min,precipitation_sum,"
            "precipitation_probability_max,relative_humidity_2m_mean,"
            "weather_code,sunrise,sunset,uv_index_max"
        ),
        "past_days": past_days,
        "forecast_days": forecast_days,
        "timezone": "auto",
    }
    try:
        resp = requests.get(FORECAST_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise WeatherServiceError(f"Weather API request failed: {e}") from e

    return resp.json()


def fetch_air_quality(lat: float, lon: float) -> Optional[Dict]:
    """Current US AQI + PM2.5. Best-effort: returns None rather than
    failing the whole weather response if the air-quality API hiccups.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "us_aqi,pm2_5",
        "timezone": "auto",
    }
    try:
        resp = requests.get(AIR_QUALITY_URL, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        resp.raise_for_status()
        current = resp.json().get("current", {})
        aqi = current.get("us_aqi")
        return {
            "aqi": aqi,
            "aqi_label": aqi_bucket(aqi),
            "pm2_5": current.get("pm2_5"),
        }
    except requests.RequestException:
        return None


def _daily_rows(raw: Dict) -> List[Dict]:
    daily = raw.get("daily", {})
    dates = daily.get("time", [])
    tmax = daily.get("temperature_2m_max", [])
    tmin = daily.get("temperature_2m_min", [])
    precip = daily.get("precipitation_sum", [])
    rain_chance = daily.get("precipitation_probability_max", [])
    humidity = daily.get("relative_humidity_2m_mean", [])
    codes = daily.get("weather_code", [])
    sunrise = daily.get("sunrise", [])
    sunset = daily.get("sunset", [])
    uv = daily.get("uv_index_max", [])

    rows = []
    for i, d in enumerate(dates):
        code = codes[i] if i < len(codes) else None
        rows.append(
            {
                "date": d,
                "temp_max_c": tmax[i] if i < len(tmax) else None,
                "temp_min_c": tmin[i] if i < len(tmin) else None,
                "rainfall_mm": precip[i] if i < len(precip) else None,
                "rain_chance_pct": rain_chance[i] if i < len(rain_chance) else None,
                "humidity_pct": humidity[i] if i < len(humidity) else None,
                "weather_code": code,
                "condition": condition_text(code),
                "sunrise": sunrise[i] if i < len(sunrise) else None,
                "sunset": sunset[i] if i < len(sunset) else None,
                "uv_index_max": uv[i] if i < len(uv) else None,
            }
        )
    return rows


def _build_alerts(today_row: Optional[Dict], tomorrow_row: Optional[Dict], humidity_avg_7d: Optional[float]) -> List[Dict]:
    """Simple, disclosed threshold rules over real forecast fields -
    not a certainty, just a heads-up worth checking."""
    alerts = []
    if tomorrow_row and (tomorrow_row.get("rain_chance_pct") or 0) >= 50:
        alerts.append(
            {
                "title": "Moderate Rain Expected",
                "detail": "Rain is expected tomorrow \u2014 plan spraying and harvest accordingly.",
                "level": "warning",
            }
        )
    if humidity_avg_7d is not None and humidity_avg_7d >= 70:
        alerts.append(
            {
                "title": "High Humidity",
                "detail": "Disease risk may increase in humidity-sensitive crops.",
                "level": "info",
            }
        )
    if today_row and (today_row.get("temp_max_c") or 0) >= 38:
        alerts.append(
            {
                "title": "Heat Advisory",
                "detail": "High daytime temperature \u2014 irrigate during cooler hours.",
                "level": "warning",
            }
        )
    return alerts


def _build_advice(today_row: Optional[Dict], tomorrow_row: Optional[Dict]) -> List[Dict]:
    """Short, generic, ground-truth-first tips derived from the forecast -
    phrased as things to plan around, not instructions to act on blindly."""
    advice = []
    temp_max = (today_row or {}).get("temp_max_c")
    rain_chance_tomorrow = (tomorrow_row or {}).get("rain_chance_pct")

    if temp_max is not None and temp_max >= 30:
        advice.append(
            {"icon": "irrigation", "text": "Irrigate during the evening to reduce evaporation."}
        )
        advice.append(
            {"icon": "heat", "text": "Avoid fertilizer application during peak afternoon heat."}
        )
    if rain_chance_tomorrow is not None and rain_chance_tomorrow >= 40:
        advice.append(
            {"icon": "spray", "text": "Delay pesticide spraying due to expected rainfall."}
        )
    if not advice:
        advice.append(
            {"icon": "general", "text": "Conditions look stable \u2014 proceed with your regular schedule."}
        )
    return advice


def summarize(raw: Dict, air_quality: Optional[Dict] = None) -> Dict:
    """Current conditions + rolling rainfall/temperature summaries,
    plus the richer fields the Weather Intelligence screen needs.

    rainfall_7d / rainfall_30d and temperature_avg_7d mirror the feature
    names used in the ML section of the plan, so this output can feed
    the health model directly.
    """
    current = raw.get("current", {})
    rows = _daily_rows(raw)

    today = date.today()
    today_str = today.isoformat()
    tomorrow_str = (today + timedelta(days=1)).isoformat()

    today_row = next((r for r in rows if r["date"] == today_str), None)
    tomorrow_row = next((r for r in rows if r["date"] == tomorrow_str), None)
    forecast_7d = [r for r in rows if r["date"] and r["date"] >= today_str][:7]

    def _window(days: int) -> List[Dict]:
        cutoff = today - timedelta(days=days)
        return [r for r in rows if r["date"] and date.fromisoformat(r["date"]) > cutoff and date.fromisoformat(r["date"]) <= today]

    def _avg(values: List[Optional[float]]) -> Optional[float]:
        clean = [v for v in values if v is not None]
        return round(sum(clean) / len(clean), 2) if clean else None

    def _sum(values: List[Optional[float]]) -> Optional[float]:
        clean = [v for v in values if v is not None]
        return round(sum(clean), 1) if clean else None

    window_7 = _window(7)
    window_30 = _window(30)
    humidity_avg_7d = _avg([r["humidity_pct"] for r in window_7])

    weather_code = current.get("weather_code")

    return {
        "current": {
            "temperature_c": current.get("temperature_2m"),
            "feels_like_c": current.get("apparent_temperature"),
            "humidity_pct": current.get("relative_humidity_2m"),
            "precipitation_mm": current.get("precipitation"),
            "wind_kmh": current.get("wind_speed_10m"),
            "pressure_hpa": current.get("surface_pressure"),
            "weather_code": weather_code,
            "condition": condition_text(weather_code),
            "observed_at": current.get("time"),
        },
        "today": {
            "sunrise": (today_row or {}).get("sunrise"),
            "sunset": (today_row or {}).get("sunset"),
            "rain_chance_pct": (today_row or {}).get("rain_chance_pct"),
            "uv_index_max": (today_row or {}).get("uv_index_max"),
        },
        "rainfall_7d_mm": _sum([r["rainfall_mm"] for r in window_7]),
        "rainfall_30d_mm": _sum([r["rainfall_mm"] for r in window_30]),
        "temperature_avg_7d_c": _avg(
            [((r["temp_max_c"] + r["temp_min_c"]) / 2) if r["temp_max_c"] is not None and r["temp_min_c"] is not None else None for r in window_7]
        ),
        "humidity_avg_7d_pct": humidity_avg_7d,
        "forecast_7d": forecast_7d,
        "air_quality": air_quality,
        "alerts": _build_alerts(today_row, tomorrow_row, humidity_avg_7d),
        "advice": _build_advice(today_row, tomorrow_row),
        "daily": rows,
    }


def get_farm_weather(lat: float, lon: float) -> Dict:
    raw = fetch_weather(lat, lon)
    aq = fetch_air_quality(lat, lon)
    return summarize(raw, air_quality=aq)

"""Phase 7: multilingual AI farm assistant — powered by Groq.

Rather than a plain translation layer, this sends the farmer's question
to a Groq-hosted LLM along with a compact snapshot of this specific farm's
current data (NDVI, weather, ML health score, recommendations) so the answer
is grounded in what the system actually knows about the field.

Requires GROQ_API_KEY in backend/.env.
Get a free key at https://console.groq.com.
"""
import os
from typing import Dict, Optional

from groq import Groq
from dotenv import load_dotenv

load_dotenv()

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
}

# Default Groq model for text — fast and high quality
GROQ_TEXT_MODEL = "openai/gpt-oss-20b"

# Groq model that supports vision (for disease detection)
GROQ_VISION_MODEL = "openai/gpt-oss-20b"

_client: Optional[Groq] = None


class AssistantConfigError(RuntimeError):
    """Raised when GROQ_API_KEY is missing."""


def _get_client() -> Groq:
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your-groq-api-key":
        raise AssistantConfigError(
            "GROQ_API_KEY is not set. Get a free key from https://console.groq.com "
            "and add it to backend/.env as GROQ_API_KEY=gsk_..."
        )
    _client = Groq(api_key=api_key)
    return _client


def get_client() -> Groq:
    """Public accessor so other services (disease detection, medicine
    assistant) can reuse the same configured client/error handling."""
    return _get_client()


def ask_general(question: str, language: str = "en", crop: Optional[str] = None) -> str:
    """AgriMitra AI: Comprehensive smart farming, crop health, pest, and market advisor."""
    client = _get_client()
    model_name = os.getenv("GROQ_MODEL", GROQ_TEXT_MODEL)
    language_name = LANGUAGE_NAMES.get(language, language)

    crop_line = f" The farmer is asking about {crop}." if crop and crop.lower() != "general" else ""
    system_prompt = (
        f"You are AgriMitra AI, an expert 24/7 smart farming advisor for Indian agriculture.{crop_line} "
        "You help farmers with ALL aspects of farming, including:\n"
        "1. Crop pests, diseases, yellowing leaves, and treatment options (organic like neem oil/bio-pesticides or chemical treatments).\n"
        "2. Soil nutrition, fertilizers (NPK ratios, micronutrients, compost).\n"
        "3. Weather precautions, irrigation management, and sowing/harvest timing.\n"
        "4. APMC Mandi market selling advice, pricing trends, storage, crop grading, and getting the highest profit.\n"
        "Always be helpful, encouraging, and provide clear, practical, bullet-pointed or concise steps. "
        "For chemical pesticides, remind the farmer to verify exact dosages with a local agriculture officer. "
        f"Never refuse agricultural or market questions. Respond fluently ONLY in {language_name}."
    )

    response = client.chat.completions.create(
        model=model_name,
        max_tokens=600,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content.strip()


def _format_context(context: Dict) -> str:
    """Turn the farm snapshot into compact, labeled lines for the prompt."""
    lines = [
        f"Farm: {context.get('farm_name')}",
        f"Crop: {context.get('crop')}",
    ]
    if context.get("crop_age_days") is not None:
        lines.append(f"Days since sowing: {context['crop_age_days']}")

    ndvi = context.get("ndvi")
    if ndvi:
        lines.append(
            f"Latest NDVI: mean {ndvi.get('ndvi_mean')} (range {ndvi.get('ndvi_min')}-{ndvi.get('ndvi_max')}) "
            f"observed {ndvi.get('date')}"
        )
    else:
        lines.append("Latest NDVI: no observation on file yet")

    weather = context.get("weather")
    if weather:
        lines.append(
            f"Weather: {weather.get('temperature_c')}C now, {weather.get('rainfall_7d_mm')}mm rain in last 7 days, "
            f"{weather.get('rainfall_30d_mm')}mm in last 30 days"
        )

    health = context.get("health")
    if health:
        lines.append(f"AI health assessment: {health.get('health_label')} ({health.get('confidence')} confidence)")

    recs = context.get("recommendations") or []
    if recs:
        lines.append("Current recommendations: " + "; ".join(r["action"] for r in recs[:3]))

    return "\n".join(lines)


def ask(question: str, language: str, context: Dict, model: Optional[str] = None) -> str:
    client = _get_client()
    model_name = model or os.getenv("GROQ_MODEL", GROQ_TEXT_MODEL)
    language_name = LANGUAGE_NAMES.get(language, language)

    system_prompt = (
        "You are AgriTwin AI, a farm assistant helping a farmer understand their field's "
        "current condition. You are given a snapshot of real sensor/satellite/weather data "
        "for one specific farm - use only that data, do not invent numbers. NDVI is a "
        "vegetation-vigor indicator, not a diagnosis: never state a disease or cause as "
        "certain, only as a possibility worth checking on the ground. Keep answers short "
        f"(3-5 sentences), practical, and written for a farmer, not a data scientist. "
        f"Respond ONLY in {language_name}, regardless of what language the question is in."
    )

    farm_context = _format_context(context)
    user_message = f"Farm data:\n{farm_context}\n\nFarmer's question: {question}"

    response = client.chat.completions.create(
        model=model_name,
        max_tokens=500,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content.strip()

# trigger reload 3

def simulate_scenario(scenario: str, language: str, context: Dict) -> str:
    "What-If Simulation engine"
    client = _get_client()
    model_name = os.getenv("GROQ_MODEL", GROQ_TEXT_MODEL)
    language_name = LANGUAGE_NAMES.get(language, language)

    system_prompt = (
        "You are FarmTwin AI, a predictive agricultural simulator. "
        "You are given a snapshot of a farm's current data. The farmer is proposing a WHAT-IF scenario. "
        "Predict the likely outcomes of this scenario (e.g., changes in yield, disease risk, crop stress, water usage). "
        "Be scientific, practical, and realistic. Keep your response to 3-4 clear, bulleted points. "
        f"Respond ONLY in {language_name}."
    )

    farm_context = _format_context(context)
    user_message = f"Farm data:\n{farm_context}\n\nScenario to simulate: {scenario}"

    response = client.chat.completions.create(
        model=model_name,
        max_tokens=600,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content.strip()

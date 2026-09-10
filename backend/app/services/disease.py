"""AI Crop Disease Detection — powered by Groq vision model.

Sends the farmer's uploaded leaf/crop photo to a Groq vision-capable LLM
and asks for a structured (JSON) screening result. This is a screening aid,
not a lab diagnosis, and the prompt/response both say so explicitly.
"""
import base64
import json
import os
import re
from typing import Dict, Optional

from app.services.assistant import get_client, LANGUAGE_NAMES, GROQ_VISION_MODEL

MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8MB, generous for a phone photo

SYSTEM_PROMPT = (
    "You are the AgriTwin AI crop disease screening assistant. You are shown one photo of a "
    "crop leaf or plant. This is a screening aid, not a lab diagnosis - never claim certainty. "
    "Respond with ONLY a single JSON object (no markdown fences, no prose before or after) with "
    "exactly these keys:\n"
    '{"status": "Healthy" | "At Risk" | "Diseased",\n'
    ' "disease_name": string (or "None detected" if healthy),\n'
    ' "confidence_label": "Low" | "Medium" | "High",\n'
    ' "summary": string (1-2 sentences on what you observe in the image),\n'
    ' "recommended_action": string (1-2 sentences, general category of treatment or next step, '
    'and a reminder to confirm with a local agricultural expert before applying any product)}\n'
    "If the image does not clearly show a plant/leaf, set status to \"Diseased\" is wrong - "
    'instead use disease_name "Unclear image" and explain in summary that a clearer photo is needed.'
)


def _extract_json(text: str) -> Dict:
    text = text.strip()
    # Strip accidental markdown fences if the model adds them anyway.
    text = re.sub(r"^```(json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    text = re.sub(r"```$", "", text.strip()).strip()
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError("Model did not return JSON")
    return json.loads(match.group(0))


def analyze_image(image_bytes: bytes, media_type: str, crop: Optional[str] = None, language: str = "en") -> Dict:
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("Image too large (max 8MB)")

    client = get_client()
    b64 = base64.b64encode(image_bytes).decode("ascii")
    language_name = LANGUAGE_NAMES.get(language, language)

    crop_line = f" The farmer says the crop is {crop}." if crop else ""
    user_text = f"Screen this crop photo for disease/pest stress.{crop_line} Write the summary and recommended_action in {language_name}."

    vision_model = os.getenv("GROQ_VISION_MODEL", GROQ_VISION_MODEL)

    response = client.chat.completions.create(
        model=vision_model,
        max_tokens=400,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": user_text,
            },
        ],
    )

    raw_text = response.choices[0].message.content.strip()

    try:
        result = _extract_json(raw_text)
    except (ValueError, json.JSONDecodeError):
        result = {
            "status": "At Risk",
            "disease_name": "Could not parse result",
            "confidence_label": "Low",
            "summary": raw_text[:280] if raw_text else "The model did not return a usable result.",
            "recommended_action": "Try again with a clearer, well-lit close-up of the affected leaf.",
        }

    result.setdefault("status", "At Risk")
    result.setdefault("disease_name", "Unknown")
    result.setdefault("confidence_label", "Low")
    result.setdefault("summary", "")
    result.setdefault("recommended_action", "Consult a local agricultural extension officer.")
    return result

"""Phase 6: recommendation engine.

Combines what earlier phases already computed:
  - health_score / health_label   (Phase 5 - Random Forest)
  - possible_causes                (Phase 4 - NDVI+weather rule check)
  - crop, growth stage             (Phase 1 farm data)

into a short list of concrete, actionable recommendations. This is
deliberately a rule engine, not another model — the plan's own
distinction (section 16): NDVI/ML tell you *something changed*, this
layer turns that into *what to actually go do about it*, phrased as
suggestions to verify on the ground, not instructions to act on blindly.
"""
from typing import Dict, List

GROWTH_STAGE_ADVICE = {
    "early": "Field is still early in growth — stress now can affect establishment; consider daily visual checks for the next week.",
    "mid": "Mid-season stress often shows up as yield loss later — prioritize inspecting this week rather than waiting.",
    "late": "Crop is near maturity — weigh whether intervention still helps versus focusing on harvest planning.",
}


def _growth_stage(crop_age_days: int) -> str:
    if crop_age_days < 40:
        return "early"
    if crop_age_days < 100:
        return "mid"
    return "late"


def build_recommendations(
    health_label: str,
    confidence: float,
    possible_causes: List[str],
    crop: str,
    crop_age_days: int,
) -> List[Dict]:
    """Returns an ordered list of {priority, action} recommendations."""
    stage = _growth_stage(crop_age_days)
    recs: List[Dict] = []

    if health_label == "stressed":
        recs.append(
            {
                "priority": "high",
                "action": f"Field is showing signs of stress (model confidence {round(confidence * 100)}%). "
                "Walk the affected zones shown on the field-health map before deciding on any treatment.",
            }
        )
    elif health_label == "moderate":
        recs.append(
            {
                "priority": "medium",
                "action": "Vegetation is moderate, not clearly healthy or stressed. Re-check after the next "
                "Sentinel-2 pass (roughly 5 days) to see if the trend continues.",
            }
        )
    else:
        recs.append(
            {
                "priority": "low",
                "action": "Vegetation index and conditions look healthy. No action needed beyond routine monitoring.",
            }
        )

    for cause in possible_causes:
        if "water stress" in cause:
            recs.append(
                {
                    "priority": "high",
                    "action": f"Possible water stress on {crop.lower()} — check soil moisture and irrigation "
                    "scheduling in the low-NDVI zones before assuming it's disease.",
                }
            )
        elif "heat stress" in cause:
            recs.append(
                {
                    "priority": "medium",
                    "action": "Possible heat stress — if irrigation is available, consider timing it for early "
                    "morning or evening during the current hot spell.",
                }
            )
        elif "disease" in cause or "pests" in cause or "nutrient" in cause:
            recs.append(
                {
                    "priority": "medium",
                    "action": "Decline doesn't line up with rainfall or temperature — inspect for pests, disease "
                    "symptoms, or a nutrient deficiency on the ground rather than assuming water stress.",
                }
            )

    recs.append({"priority": "info", "action": GROWTH_STAGE_ADVICE[stage]})

    return recs

"""AI Crop Disease Detection.

  POST /api/disease/detect (multipart form: file, crop?, user_id?, farm_id?, language?)
  GET  /api/disease/history?user_id=
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm import DiseaseScan
from app.services import disease as disease_service
from app.services.assistant import AssistantConfigError

router = APIRouter(prefix="/api/disease", tags=["disease"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/detect")
async def detect_disease(
    file: UploadFile = File(...),
    crop: str | None = Form(None),
    user_id: str | None = Form(None),
    farm_id: str | None = Form(None),
    language: str = Form("en"),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Upload a JPEG, PNG, or WEBP image.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file.")

    try:
        result = disease_service.analyze_image(image_bytes, file.content_type, crop=crop, language=language)
    except AssistantConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    scan = DiseaseScan(
        user_id=user_id,
        farm_id=farm_id,
        crop=crop,
        status=result.get("status"),
        disease_name=result.get("disease_name"),
        confidence_label=result.get("confidence_label"),
        summary=result.get("summary"),
        recommended_action=result.get("recommended_action"),
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    return {**result, "scan_id": str(scan.id), "created_at": scan.created_at}


@router.get("/history")
def scan_history(user_id: str, db: Session = Depends(get_db)):
    scans = (
        db.query(DiseaseScan)
        .filter(DiseaseScan.user_id == user_id)
        .order_by(DiseaseScan.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "scan_id": str(s.id),
            "crop": s.crop,
            "status": s.status,
            "disease_name": s.disease_name,
            "confidence_label": s.confidence_label,
            "summary": s.summary,
            "recommended_action": s.recommended_action,
            "created_at": s.created_at,
        }
        for s in scans
    ]

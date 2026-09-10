import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm import User
from app.schemas import UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


def _hash_password(plain: str) -> str:
    """Simple SHA-256 hash (no external deps needed). For production use bcrypt."""
    return hashlib.sha256(plain.encode()).hexdigest()


@router.post("/login", response_model=UserOut)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    query = db.query(User)
    user = None
    if payload.email:
        user = query.filter(User.email.ilike(payload.email.strip())).first()
    elif payload.phone:
        user = query.filter(User.phone == payload.phone.strip()).first()
    else:
        raise HTTPException(status_code=400, detail="Email or phone is required to sign in")

    if not user:
        # Seed default admin demo user if requested
        if payload.email and payload.email.strip().lower() == "admin@farmtwin.ai":
            user = User(
                name="Admin Demo",
                email="admin@farmtwin.ai",
                phone="+91 9876543210",
                password_hash=_hash_password(payload.password or "farmtwin123"),
                language="en",
                role="farmer",
                district="Pune",
                state="Maharashtra",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
        raise HTTPException(status_code=404, detail="Account not found. Please create an account first.")

    if payload.password and user.password_hash:
        if user.password_hash != _hash_password(payload.password):
            raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")

    return user


@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = None
    if payload.email:
        existing = db.query(User).filter(User.email.ilike(payload.email.strip())).first()
    elif payload.phone:
        existing = db.query(User).filter(User.phone == payload.phone.strip()).first()

    if existing:
        if payload.name:
            existing.name = payload.name
        if payload.phone and not existing.phone:
            existing.phone = payload.phone
        if payload.password:
            existing.password_hash = _hash_password(payload.password)
        if payload.language:
            existing.language = payload.language
        if payload.role:
            existing.role = payload.role
        if payload.district:
            existing.district = payload.district
        if payload.state:
            existing.state = payload.state
        db.commit()
        db.refresh(existing)
        return existing

    user = User(
        name=payload.name,
        email=payload.email.strip() if payload.email else None,
        phone=payload.phone.strip() if payload.phone else None,
        password_hash=_hash_password(payload.password) if payload.password else None,
        language=payload.language,
        role=payload.role,
        district=payload.district,
        state=payload.state,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from utils.database import get_db
from utils.auth import hash_password, verify_password, create_access_token, get_current_user
from models.db_models import User
from models.schemas import UserRegister, UserLogin, Token, UserOut, PasswordReset
import uuid

router = APIRouter()


@router.post("/register", response_model=Token)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    # Check existing
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return Token(access_token=token, token_type="bearer", user=UserOut.from_orm(user))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": user.id})
    return Token(access_token=token, token_type="bearer", user=UserOut.from_orm(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/password-reset")
def request_password_reset(payload: PasswordReset, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Don't reveal if email exists
    return {"message": "If this email is registered, a reset link will be sent."}


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # JWT is stateless; client just deletes token
    return {"message": "Logged out successfully"}

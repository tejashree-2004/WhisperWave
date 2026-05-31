from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ─── Auth Schemas ────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


# ─── Transcription Schemas ────────────────────────────────────
class TranscriptionOut(BaseModel):
    id: str
    filename: str
    original_filename: str
    transcribed_text: Optional[str]
    confidence_score: Optional[float]
    processing_time: Optional[float]
    audio_duration: Optional[float]
    language: str
    domain: str
    status: str
    error_message: Optional[str]
    file_size: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class TranscriptionList(BaseModel):
    transcriptions: List[TranscriptionOut]
    total: int
    page: int
    page_size: int


# ─── Dashboard Schemas ────────────────────────────────────────
class DashboardStats(BaseModel):
    total_transcriptions: int
    completed_transcriptions: int
    failed_transcriptions: int
    avg_processing_time: float
    avg_confidence_score: float
    total_audio_duration: float
    recent_activity: List[TranscriptionOut]

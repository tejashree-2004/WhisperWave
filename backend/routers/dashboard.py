from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from utils.database import get_db
from utils.auth import get_current_user
from models.db_models import User, Transcription
from models.schemas import DashboardStats

router = APIRouter()


@router.get("", response_model=DashboardStats)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = db.query(Transcription).filter(Transcription.user_id == current_user.id)

    total = base.count()
    completed = base.filter(Transcription.status == "done").count()
    failed = base.filter(Transcription.status == "failed").count()

    agg = db.query(
        func.avg(Transcription.processing_time),
        func.avg(Transcription.confidence_score),
        func.sum(Transcription.audio_duration),
    ).filter(
        Transcription.user_id == current_user.id,
        Transcription.status == "done"
    ).first()

    recent = base.order_by(Transcription.created_at.desc()).limit(5).all()

    return DashboardStats(
        total_transcriptions=total,
        completed_transcriptions=completed,
        failed_transcriptions=failed,
        avg_processing_time=round(float(agg[0] or 0), 2),
        avg_confidence_score=round(float(agg[1] or 0), 4),
        total_audio_duration=round(float(agg[2] or 0), 2),
        recent_activity=recent,
    )

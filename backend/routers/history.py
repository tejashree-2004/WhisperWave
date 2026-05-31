from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from utils.database import get_db
from utils.auth import get_current_user
from models.db_models import User, Transcription
from models.schemas import TranscriptionList, TranscriptionOut
from typing import Optional

router = APIRouter()


@router.get("", response_model=TranscriptionList)
def get_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transcription).filter(Transcription.user_id == current_user.id)

    if search:
        query = query.filter(Transcription.original_filename.ilike(f"%{search}%"))
    if status:
        query = query.filter(Transcription.status == status)

    total = query.count()
    items = query.order_by(Transcription.created_at.desc()) \
                 .offset((page - 1) * page_size) \
                 .limit(page_size) \
                 .all()

    return TranscriptionList(
        transcriptions=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/{transcription_id}")
def delete_transcription(
    transcription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Transcription).filter(
        Transcription.id == transcription_id,
        Transcription.user_id == current_user.id
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    
    import os
    file_path = os.path.join("uploads", t.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    db.delete(t)
    db.commit()
    return {"message": "Deleted successfully"}

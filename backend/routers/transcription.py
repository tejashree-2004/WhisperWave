from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from utils.database import get_db
from utils.auth import get_current_user
from models.db_models import User, Transcription
from models.schemas import TranscriptionOut
from services.transcription_service import transcribe_audio, SUPPORTED_FORMATS
from services.export_service import export_txt, export_pdf, export_docx
import uuid, os, shutil
from pathlib import Path

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def process_transcription(transcription_id: str, file_path: str, language: str, domain: str, db_url: str):
    """Background task to process transcription."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine(db_url, connect_args={"check_same_thread": False} if "sqlite" in db_url else {})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    transcription = db.query(Transcription).filter(Transcription.id == transcription_id).first()
    if not transcription:
        return
    
    transcription.status = "processing"
    db.commit()
    
    try:
        result = transcribe_audio(file_path, language=language, domain=domain)
        transcription.transcribed_text = result["text"]
        transcription.confidence_score = result["confidence"]
        transcription.processing_time = result["processing_time"]
        transcription.audio_duration = result["duration"]
        transcription.language = result["language"]
        transcription.status = "done"
    except Exception as e:
        transcription.status = "failed"
        transcription.error_message = str(e)
    finally:
        db.commit()
        db.close()


@router.post("/upload", response_model=TranscriptionOut)
async def upload_and_transcribe(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = Form(default="en"),
    domain: str = Form(default="general"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail=f"Unsupported format. Allowed: {', '.join(SUPPORTED_FORMATS)}")

    file_id = str(uuid.uuid4())
    saved_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(file_path)

    transcription = Transcription(
        id=file_id,
        user_id=current_user.id,
        filename=saved_filename,
        original_filename=file.filename,
        language=language,
        domain=domain,
        status="pending",
        file_size=file_size,
    )
    db.add(transcription)
    db.commit()
    db.refresh(transcription)

    from utils.database import DATABASE_URL
    background_tasks.add_task(
        process_transcription,
        file_id, file_path, language, domain, DATABASE_URL
    )

    return transcription


@router.get("/status/{transcription_id}", response_model=TranscriptionOut)
def get_status(
    transcription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Transcription).filter(
        Transcription.id == transcription_id,
        Transcription.user_id == current_user.id
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return t


@router.get("/export/{transcription_id}")
def export_transcription(
    transcription_id: str,
    fmt: str = "txt",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(Transcription).filter(
        Transcription.id == transcription_id,
        Transcription.user_id == current_user.id
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transcription not found")
    if t.status != "done":
        raise HTTPException(status_code=400, detail="Transcription not complete yet")

    metadata = {
        "original_filename": t.original_filename,
        "confidence_score": t.confidence_score,
        "processing_time": t.processing_time,
    }

    if fmt == "txt":
        path = export_txt(t.transcribed_text, t.id)
        return FileResponse(path, media_type="text/plain", filename=f"transcription_{t.id}.txt")
    elif fmt == "pdf":
        path = export_pdf(t.transcribed_text, t.id, metadata)
        return FileResponse(path, media_type="application/pdf", filename=f"transcription_{t.id}.pdf")
    elif fmt == "docx":
        path = export_docx(t.transcribed_text, t.id, metadata)
        return FileResponse(path, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", filename=f"transcription_{t.id}.docx")
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use txt, pdf, or docx")

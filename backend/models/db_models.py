from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    transcriptions = relationship("Transcription", back_populates="user")


class Transcription(Base):
    __tablename__ = "transcriptions"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    transcribed_text = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    processing_time = Column(Float, nullable=True)  # seconds
    audio_duration = Column(Float, nullable=True)  # seconds
    language = Column(String, default="en")
    domain = Column(String, default="general")
    status = Column(String, default="pending")  # pending, processing, done, failed
    error_message = Column(Text, nullable=True)
    file_size = Column(Integer, nullable=True)  # bytes
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="transcriptions")

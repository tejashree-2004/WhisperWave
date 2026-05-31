from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

from routers import auth, transcription, history, dashboard

app = FastAPI(
    title="WhisperTask API",
    description="Task-Specific Speech-to-Text Web Application",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(transcription.router, prefix="/api/transcribe", tags=["Transcription"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

os.makedirs("uploads", exist_ok=True)
os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

@app.get("/")
async def root():
    return {"message": "WhisperTask API is running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# WhisperTask 🎙️
### Task-Specific Speech-to-Text Web Application — Fine-Tuned Whisper

---

## Project Structure

```
whisper-app/
├── backend/              ← FastAPI Python backend
│   ├── main.py
│   ├── routers/          ← API routes
│   ├── models/           ← DB models & schemas
│   ├── services/         ← Whisper & export logic
│   ├── utils/            ← DB, auth helpers
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             ← React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/        ← Landing, Login, Dashboard, Transcribe, History
│   │   ├── components/   ← Layout, Sidebar
│   │   ├── context/      ← AuthContext
│   │   └── utils/        ← API client
│   └── Dockerfile
├── training/             ← Fine-tuning scripts
│   ├── fine_tune_whisper.py   ← Run in Colab/Kaggle
│   └── prepare_dataset.py     ← Prep your custom data
└── docker-compose.yml
```

---

## PHASE 1 — Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- ffmpeg (`brew install ffmpeg` / `apt install ffmpeg`)
- Git

---

### Step 1: Backend Setup

```bash
cd whisper-app/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy .env
cp .env.example .env
# Edit .env: set SECRET_KEY to something random

# Initialize database + run server
python -c "from utils.database import create_tables; create_tables()"
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

---

### Step 2: Frontend Setup

```bash
cd whisper-app/frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend runs at: http://localhost:3000

---

## PHASE 2 — Fine-Tuning Your Whisper Model

This is the core of the project — adapting Whisper to your specific domain.

### Option A: Use an Existing Dataset (Easiest)

Common Voice datasets on HuggingFace work great:
- `mozilla-foundation/common_voice_11_0` (multilingual)
- `facebook/voxpopuli` (multilingual parliamentary speech)
- `google/fleurs` (multilingual)

In `training/fine_tune_whisper.py`:
```python
USE_CUSTOM_DATASET = False
DATASET_NAME = "mozilla-foundation/common_voice_11_0"
DATASET_CONFIG = "en"   # language code
```

### Option B: Use Your Own Custom Dataset (Recommended for Domain Accuracy)

1. **Collect audio clips** — ideally 1–30 seconds each
   - Medical: record doctors/nurses reading notes
   - Technical: engineering/code review meetings
   - Legal: court proceedings, legal dictation
   
2. **Create transcripts** — accurate text for each clip

3. **Prepare the dataset:**
   ```bash
   cd training/
   pip install librosa soundfile pandas scikit-learn
   
   # Edit prepare_dataset.py: set INPUT_AUDIO_DIR and INPUT_TRANSCRIPTS_DIR
   python prepare_dataset.py
   ```
   This creates `prepared_dataset/` with train/val/test CSVs and normalized audio.

4. **Upload to Google Drive or Kaggle Dataset**

---

### Step 3: Run Fine-Tuning on Google Colab

1. Go to https://colab.research.google.com
2. Create a new notebook
3. **Runtime → Change Runtime Type → GPU (T4 recommended)**
4. Mount Google Drive:
   ```python
   from google.colab import drive
   drive.mount('/content/drive')
   ```
5. Upload `fine_tune_whisper.py` or paste its contents
6. Set your configuration at the top:
   ```python
   MODEL_NAME = "openai/whisper-small"   # small balances speed/accuracy
   LANGUAGE = "english"
   MAX_STEPS = 2000         # More steps = better accuracy, more time
   BATCH_SIZE = 8           # Reduce to 4 if you get OOM errors
   ```
7. Run the script
8. After training, download the `whisper-finetuned/` folder from Colab

**Colab Free Tier Tips:**
- Use `whisper-tiny` or `whisper-base` if you get OOM
- Keep MAX_STEPS ≤ 1000 on free tier
- Colab Pro gives you longer runtimes and better GPUs

**Kaggle Alternative:**
- Upload notebook to Kaggle
- Enable GPU accelerator in Settings
- Kaggle gives 30 GPU hours/week free

---

### Step 4: Deploy Fine-Tuned Model to Backend

```bash
# Copy the downloaded model to backend
cp -r whisper-finetuned/ whisper-app/backend/models/fine_tuned_whisper/

# Update .env
echo "FINE_TUNED_MODEL_PATH=models/fine_tuned_whisper" >> backend/.env

# Restart backend
uvicorn main:app --reload --port 8000
```

The backend will automatically use the fine-tuned model over base Whisper.

---

## PHASE 3 — Docker Deployment

### Run everything with Docker Compose:

```bash
cd whisper-app/

# Build and start all services
docker-compose up --build

# Or in background
docker-compose up -d --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

---

## PHASE 4 — Cloud Deployment

### Frontend → Vercel

```bash
cd frontend/
npm install -g vercel
vercel

# Set environment variable in Vercel dashboard:
# VITE_API_URL = https://your-backend.railway.app/api
```

### Backend → Railway

1. Push backend/ to a GitHub repo
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add environment variables (DATABASE_URL, SECRET_KEY, etc.)
4. Railway auto-provides PostgreSQL — use its DATABASE_URL

### Backend → Render

1. New Web Service → Connect GitHub repo
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add env vars in dashboard

---

## Understanding the Fine-Tuning Process

```
Base Whisper (general speech)
        ↓
Your domain audio (500-5000 clips)
        ↓
Fine-tuning (Seq2Seq training)
        ↓
Domain-specific Whisper
  - Knows your vocabulary
  - Handles your accent
  - Better with your noise conditions
```

**Key metric: WER (Word Error Rate)**
- Base Whisper: ~8–15% WER on general speech
- Fine-tuned: ~2–6% on your specific domain

---

## Troubleshooting

**CUDA out of memory:**
- Reduce BATCH_SIZE to 4 or 2
- Use `whisper-tiny` or `whisper-base`
- Add `gradient_accumulation_steps=2`

**Training too slow:**
- Reduce MAX_STEPS for a quick test first
- Use `whisper-tiny` for prototyping

**Poor transcription accuracy:**
- Increase MAX_STEPS to 4000+
- Add more diverse training data
- Ensure your transcripts are accurate

**Audio format errors:**
- Make sure ffmpeg is installed
- Convert to WAV 16kHz mono before uploading

---

## API Endpoints Reference

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Get JWT token |
| GET | /api/auth/me | Current user |
| POST | /api/transcribe/upload | Upload + transcribe |
| GET | /api/transcribe/status/{id} | Poll status |
| GET | /api/transcribe/export/{id}?fmt=txt | Download transcript |
| GET | /api/history | List transcriptions |
| DELETE | /api/history/{id} | Delete transcription |
| GET | /api/dashboard | Stats & recent activity |

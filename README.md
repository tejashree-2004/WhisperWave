# 🎙️ WhisperWave

> Domain-Specific Speech-to-Text Web Application powered by a Fine-Tuned OpenAI Whisper Model

WhisperWave is a full-stack AI-powered speech-to-text web application that improves transcription accuracy by fine-tuning OpenAI's Whisper model on domain-specific and language-specific datasets. The platform is designed to handle Indian accents, technical terminology, medical vocabulary, legal language, and noisy real-world audio more effectively than generic speech recognition systems.

---

## 🚀 Problem Statement

Traditional speech-to-text systems are trained on broad datasets and often struggle with:

- Indian accents and regional speech patterns
- Domain-specific terminology (medical, legal, technical)
- Background noise in recordings
- Industry-specific jargon and abbreviations
- Low transcription accuracy in specialized environments

WhisperWave addresses these challenges using transfer learning by fine-tuning OpenAI's Whisper model on targeted datasets, resulting in significantly improved transcription quality.

---

## ✨ Features

### 🎤 Audio Input
- Upload audio files (MP3, WAV, M4A, FLAC, OGG, WebM)
- Browser-based live recording
- Drag-and-drop upload support
- Audio preview before processing

### 🤖 AI Processing
- Fine-tuned Whisper model
- Automatic fallback to base Whisper model
- Noise reduction and audio preprocessing
- Multi-language support
- Background transcription processing

### 📄 Output & Export
- Real-time transcription status updates
- Confidence score display
- Processing time metrics
- Export as TXT, PDF, and DOCX
- Copy transcription to clipboard

### 👤 User Management
- User registration and login
- JWT-based authentication
- Secure password hashing using bcrypt
- Protected routes

### 📊 Dashboard & History
- Complete transcription history
- Search and filtering
- Usage statistics dashboard
- Confidence score visualization
- Record management

---

## 🏗️ System Architecture

```text
┌───────────────────────────────┐
│           Frontend            │
│ React + Vite + Tailwind CSS   │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│         FastAPI Backend       │
│ Authentication & APIs         │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│  Audio Processing Pipeline    │
│ ffmpeg + Noise Reduction      │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│ Fine-Tuned Whisper Model      │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│ SQLite / PostgreSQL Database  │
└───────────────────────────────┘
```

---

## 🔄 Transcription Workflow

1. User uploads or records audio.
2. Audio file is sent to the backend.
3. A transcription request is created.
4. Audio is converted to a suitable format using ffmpeg.
5. Noise reduction is applied.
6. Fine-tuned Whisper model performs inference.
7. Results are stored in the database.
8. Frontend displays the transcription and confidence score.

---

## 📈 Model Performance

| Model | Dataset | WER ↓ |
|---------|---------|---------|
| Whisper Small (Base) | General English | ~14.2% |
| WhisperWave Fine-Tuned | Google FLEURS (English) | **8.1%** |
| WhisperWave Fine-Tuned | Google FLEURS (Hindi) | **11.3%** |

**WER (Word Error Rate)** measures transcription accuracy. Lower values indicate better performance.

---

## 🧠 Fine-Tuning Pipeline

```text
Pre-trained Whisper
        │
        ▼
Google FLEURS Dataset
        │
        ▼
Feature Extraction
(Log-Mel Spectrograms)
        │
        ▼
Fine-Tuning
(PyTorch + Transformers)
        │
        ▼
Evaluation (WER)
        │
        ▼
Deployment
```

### Training Configuration

| Parameter | Value |
|------------|--------|
| Model | whisper-small |
| Batch Size | 8 |
| Learning Rate | 1e-5 |
| Training Steps | 1000 |
| Precision | FP16 |
| GPU | NVIDIA T4 |

---

## 🛠️ Tech Stack

### Frontend

- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Recharts
- MediaRecorder API

### Backend

- FastAPI
- SQLAlchemy
- SQLite / PostgreSQL
- JWT Authentication
- bcrypt
- ffmpeg
- librosa

### Machine Learning

- OpenAI Whisper
- Hugging Face Transformers
- PyTorch
- Google FLEURS Dataset
- Evaluate (WER)

---

## 📁 Project Structure

```text
whisperwave/
│
├── backend/
│   ├── routers/
│   ├── services/
│   ├── models/
│   ├── utils/
│   └── main.py
│
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── context/
│       └── utils/
│
├── training/
│   ├── fine_tune_whisper.py
│   └── prepare_dataset.py
│
└── docker-compose.yml
```

---

## ⚙️ Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- ffmpeg

### Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/whisperwave.git

cd whisperwave
```

### Backend Setup

```bash
cd backend

python -m venv venv

# Linux/Mac
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env

uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

### Docker Setup

```bash
docker-compose up --build
```

---

## 🌐 Application URLs

| Service | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## 🔮 Future Improvements

- Support for all major Indian languages
- Speaker diarization
- Real-time streaming transcription
- Custom vocabulary injection
- Mobile application
- Whisper Large-v3 fine-tuning
- Advanced domain adaptation

---

## 👩‍💻 Author

**Tejashree**  
B.Tech Computer Science Engineering  
SRM University, 2026

---

## 📜 License

This project is licensed under the MIT License.

---

<div align="center">

### ⭐ If you found this project useful, consider giving it a star!

</div>

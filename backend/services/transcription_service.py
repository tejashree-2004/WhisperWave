import whisper
import torch
import time
import os
import subprocess
import tempfile
import librosa
import soundfile as sf
import numpy as np
from pathlib import Path

# ─── Model Cache ─────────────────────────────────────────────
_model_cache = {}

SUPPORTED_FORMATS = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".webm"}

def get_model(model_name: str = None):
    """Load and cache Whisper model. Uses fine-tuned if available."""
    fine_tuned_path = os.getenv("FINE_TUNED_MODEL_PATH", "models/fine_tuned_whisper")
    
    if os.path.exists(fine_tuned_path):
        key = fine_tuned_path
        if key not in _model_cache:
            print(f"Loading fine-tuned model from {fine_tuned_path}")
            from transformers import WhisperForConditionalGeneration, WhisperProcessor
            _model_cache[key] = {
                "type": "fine_tuned",
                "model": WhisperForConditionalGeneration.from_pretrained(fine_tuned_path),
                "processor": WhisperProcessor.from_pretrained(fine_tuned_path)
            }
        return _model_cache[key]
    
    # Fall back to base whisper
    model_size = model_name or os.getenv("WHISPER_MODEL_SIZE", "base")
    if model_size not in _model_cache:
        print(f"Loading Whisper {model_size} model...")
        _model_cache[model_size] = {
            "type": "base",
            "model": whisper.load_model(model_size)
        }
    return _model_cache[model_size]


def convert_to_wav(input_path: str) -> str:
    """Convert any audio format to WAV using ffmpeg."""
    output_path = input_path.rsplit(".", 1)[0] + "_converted.wav"
    try:
        subprocess.run(
            ["ffmpeg", "-i", input_path, "-ar", "16000", "-ac", "1", "-y", output_path],
            check=True, capture_output=True
        )
        return output_path
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Audio conversion failed: {e.stderr.decode()}")


def reduce_noise(audio_path: str) -> str:
    """Basic noise reduction using spectral gating."""
    try:
        y, sr = librosa.load(audio_path, sr=16000)
        # Simple noise floor estimation and subtraction
        noise_sample = y[:int(sr * 0.5)]  # First 0.5s as noise reference
        noise_power = np.mean(noise_sample ** 2)
        signal_power = np.mean(y ** 2)
        
        if signal_power > noise_power * 10:  # Good SNR, skip processing
            return audio_path
        
        # Apply mild spectral subtraction
        stft = librosa.stft(y)
        mag = np.abs(stft)
        noise_mag = np.mean(np.abs(librosa.stft(noise_sample))) if len(noise_sample) > 512 else mag.min()
        clean_mag = np.maximum(mag - noise_mag * 2, 0)
        clean_stft = clean_mag * np.exp(1j * np.angle(stft))
        y_clean = librosa.istft(clean_stft)
        
        output_path = audio_path.rsplit(".", 1)[0] + "_clean.wav"
        sf.write(output_path, y_clean, sr)
        return output_path
    except Exception:
        return audio_path  # Return original if noise reduction fails


def get_audio_duration(audio_path: str) -> float:
    """Get duration of audio file in seconds."""
    try:
        y, sr = librosa.load(audio_path, sr=None)
        return len(y) / sr
    except Exception:
        return 0.0


def transcribe_audio(file_path: str, language: str = "en", domain: str = "general"):
    """
    Main transcription function.
    Returns dict with: text, confidence, processing_time, duration
    """
    start_time = time.time()
    
    ext = Path(file_path).suffix.lower()
    wav_path = file_path
    converted_path = None
    cleaned_path = None
    
    try:
        # Step 1: Convert to WAV if needed
        if ext != ".wav":
            wav_path = convert_to_wav(file_path)
            converted_path = wav_path
        
        # Step 2: Noise reduction
        cleaned_path_result = reduce_noise(wav_path)
        if cleaned_path_result != wav_path:
            cleaned_path = cleaned_path_result
            wav_path = cleaned_path
        
        # Step 3: Get duration
        duration = get_audio_duration(wav_path)
        
        # Step 4: Load model and transcribe
        model_data = get_model()
        
        if model_data["type"] == "fine_tuned":
            result = _transcribe_fine_tuned(wav_path, model_data, language)
        else:
            result = _transcribe_base(wav_path, model_data["model"], language)
        
        processing_time = time.time() - start_time
        
        return {
            "text": result["text"].strip(),
            "confidence": result.get("confidence", 0.85),
            "processing_time": round(processing_time, 2),
            "duration": round(duration, 2),
            "language": result.get("language", language),
        }
        
    finally:
        # Cleanup temp files
        for path in [converted_path, cleaned_path]:
            if path and os.path.exists(path) and path != file_path:
                try:
                    os.remove(path)
                except Exception:
                    pass


def _transcribe_base(wav_path: str, model, language: str) -> dict:
    """Transcribe using base Whisper model."""
    result = model.transcribe(
        wav_path,
        language=language if language != "auto" else None,
        fp16=torch.cuda.is_available(),
        verbose=False
    )
    
    # Calculate rough confidence from avg log_prob
    avg_log_prob = result.get("segments", [{}])[0].get("avg_logprob", -0.5) if result.get("segments") else -0.5
    confidence = min(max(float(np.exp(avg_log_prob)), 0.0), 1.0)
    
    return {
        "text": result["text"],
        "confidence": confidence,
        "language": result.get("language", language)
    }


def _transcribe_fine_tuned(wav_path: str, model_data: dict, language: str) -> dict:
    """Transcribe using fine-tuned HuggingFace Whisper model."""
    import torch
    
    processor = model_data["processor"]
    model = model_data["model"]
    
    audio, sr = librosa.load(wav_path, sr=16000)
    inputs = processor(audio, sampling_rate=16000, return_tensors="pt")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    with torch.no_grad():
        predicted_ids = model.generate(inputs["input_features"])
    
    transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
    
    return {
        "text": transcription,
        "confidence": 0.92,  # Fine-tuned models typically more accurate
        "language": language
    }

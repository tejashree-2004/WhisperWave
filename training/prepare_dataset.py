"""
Custom Dataset Preparation for WhisperTask Fine-Tuning

Use this script to prepare your own audio dataset.
Your dataset should be organized as:

my_dataset/
  audio/
    clip_001.wav
    clip_002.wav
    ...
  transcripts/
    clip_001.txt
    clip_002.txt
    ...

OR a single metadata CSV:
  audio_path,sentence
  audio/clip_001.wav,"Hello world this is a test"
  audio/clip_002.wav,"Medical terminology example"

This script will:
1. Validate audio files
2. Normalize to 16kHz mono WAV
3. Create a metadata.csv
4. Split into train/validation/test sets
"""

import os
import csv
import json
import librosa
import soundfile as sf
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split

# ─── Config ──────────────────────────────────────────────────
INPUT_AUDIO_DIR = "./raw_audio"
INPUT_TRANSCRIPTS_DIR = "./raw_transcripts"  # Optional
EXISTING_CSV = None  # Set to path if you have one: "my_data.csv"
OUTPUT_DIR = "./prepared_dataset"
SAMPLE_RATE = 16000
MAX_DURATION = 30  # seconds — skip clips longer than this
MIN_DURATION = 0.5  # seconds — skip very short clips

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "audio"), exist_ok=True)


def normalize_audio(input_path: str, output_path: str) -> float:
    """Normalize audio to 16kHz mono WAV. Returns duration in seconds."""
    try:
        y, sr = librosa.load(input_path, sr=SAMPLE_RATE, mono=True)
        duration = len(y) / SAMPLE_RATE
        if duration < MIN_DURATION or duration > MAX_DURATION:
            return -1
        sf.write(output_path, y, SAMPLE_RATE)
        return duration
    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        return -1


def prepare_from_folders():
    """Prepare dataset from audio + transcript folders."""
    audio_files = sorted(Path(INPUT_AUDIO_DIR).glob("*.wav")) + \
                  sorted(Path(INPUT_AUDIO_DIR).glob("*.mp3")) + \
                  sorted(Path(INPUT_AUDIO_DIR).glob("*.m4a"))

    rows = []
    for audio_path in audio_files:
        stem = audio_path.stem
        transcript_path = Path(INPUT_TRANSCRIPTS_DIR) / f"{stem}.txt"

        if not transcript_path.exists():
            print(f"No transcript for {audio_path.name}, skipping")
            continue

        with open(transcript_path, encoding="utf-8") as f:
            text = f.read().strip()

        if not text:
            continue

        out_audio = os.path.join(OUTPUT_DIR, "audio", f"{stem}.wav")
        duration = normalize_audio(str(audio_path), out_audio)

        if duration < 0:
            print(f"Skipping {audio_path.name} (duration issue)")
            continue

        rows.append({
            "audio_path": out_audio,
            "sentence": text,
            "duration": round(duration, 2)
        })
        print(f"Processed: {stem} ({duration:.1f}s)")

    return rows


def prepare_from_csv():
    """Prepare from existing CSV with audio_path and sentence columns."""
    df = pd.read_csv(EXISTING_CSV)
    rows = []
    for _, row in df.iterrows():
        stem = Path(row["audio_path"]).stem
        out_audio = os.path.join(OUTPUT_DIR, "audio", f"{stem}.wav")
        duration = normalize_audio(row["audio_path"], out_audio)

        if duration < 0:
            continue

        rows.append({
            "audio_path": out_audio,
            "sentence": str(row["sentence"]).strip(),
            "duration": round(duration, 2)
        })
    return rows


if __name__ == "__main__":
    print("Preparing dataset...")

    if EXISTING_CSV:
        rows = prepare_from_csv()
    else:
        rows = prepare_from_folders()

    if not rows:
        print("No data found! Check your paths.")
        exit(1)

    # Split
    train, temp = train_test_split(rows, test_size=0.2, random_state=42)
    val, test = train_test_split(temp, test_size=0.5, random_state=42)

    for split_name, split_data in [("train", train), ("validation", val), ("test", test)]:
        out_path = os.path.join(OUTPUT_DIR, f"{split_name}.csv")
        pd.DataFrame(split_data).to_csv(out_path, index=False)
        print(f"{split_name}: {len(split_data)} samples → {out_path}")

    # Stats
    total_duration = sum(r["duration"] for r in rows)
    print(f"\nDataset Summary:")
    print(f"  Total samples: {len(rows)}")
    print(f"  Total duration: {total_duration/3600:.2f} hours")
    print(f"  Avg duration: {total_duration/len(rows):.1f}s")
    print(f"\nDataset ready at: {OUTPUT_DIR}")
    print("Upload this folder to Colab/Kaggle and set CUSTOM_DATASET_PATH in fine_tune_whisper.py")

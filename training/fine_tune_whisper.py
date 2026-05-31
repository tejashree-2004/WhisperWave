"""
============================================================
  WhisperTask — Fine-Tuning Script for Google Colab / Kaggle
  Run this in a GPU notebook (T4 or better recommended)
============================================================

STEP 1: Run this entire script in Google Colab or Kaggle
STEP 2: Download the saved model from /content/whisper-finetuned/
STEP 3: Place it in your backend/models/fine_tuned_whisper/ folder
STEP 4: Set FINE_TUNED_MODEL_PATH=models/fine_tuned_whisper in .env
"""

# ─── Cell 1: Install dependencies ────────────────────────────
# !pip install transformers datasets accelerate evaluate jiwer librosa soundfile torch torchaudio

# ─── Cell 2: Imports ─────────────────────────────────────────
import torch
import numpy as np
from pathlib import Path
from dataclasses import dataclass
from typing import Any, Dict, List, Union

from datasets import load_dataset, DatasetDict, Audio
from transformers import (
    WhisperFeatureExtractor,
    WhisperTokenizer,
    WhisperProcessor,
    WhisperForConditionalGeneration,
    Seq2SeqTrainingArguments,
    Seq2SeqTrainer,
)
import evaluate

# ─── Cell 3: Configuration ────────────────────────────────────
# Change these to your needs:
MODEL_NAME = "openai/whisper-small"   # tiny/base/small/medium
LANGUAGE = "english"                   # or "hindi", "spanish", etc.
TASK = "transcribe"
OUTPUT_DIR = "./whisper-finetuned"
DATASET_NAME = "mozilla-foundation/common_voice_11_0"  # Change to your dataset
DATASET_CONFIG = "en"

# For custom dataset, use a CSV/JSON with columns: audio_path, text
USE_CUSTOM_DATASET = False
CUSTOM_DATASET_PATH = "./my_dataset"   # folder with audio files + metadata.csv

# Training hyperparameters
MAX_STEPS = 1000          # Increase to 4000+ for better results
WARMUP_STEPS = 100
LEARNING_RATE = 1e-5
BATCH_SIZE = 8             # Reduce if OOM: 4 or 2
EVAL_STEPS = 200
SAVE_STEPS = 200
FP16 = torch.cuda.is_available()

print(f"Device: {'CUDA' if torch.cuda.is_available() else 'CPU'}")
print(f"Model: {MODEL_NAME}")


# ─── Cell 4: Load processor ───────────────────────────────────
feature_extractor = WhisperFeatureExtractor.from_pretrained(MODEL_NAME)
tokenizer = WhisperTokenizer.from_pretrained(MODEL_NAME, language=LANGUAGE, task=TASK)
processor = WhisperProcessor.from_pretrained(MODEL_NAME, language=LANGUAGE, task=TASK)


# ─── Cell 5: Load dataset ─────────────────────────────────────
if USE_CUSTOM_DATASET:
    from datasets import Dataset
    import pandas as pd
    import librosa

    # Your CSV must have: audio_path (path to .wav/.mp3), sentence (transcription)
    df = pd.read_csv(f"{CUSTOM_DATASET_PATH}/metadata.csv")

    def load_audio(row):
        audio, sr = librosa.load(row["audio_path"], sr=16000)
        return {"array": audio, "sampling_rate": sr}

    # Build HuggingFace Dataset
    dataset = Dataset.from_pandas(df)
    dataset = dataset.map(lambda x: {"audio": load_audio(x)}, remove_columns=["audio_path"])
    dataset = dataset.rename_column("sentence", "text")

    split = dataset.train_test_split(test_size=0.1, seed=42)
    dataset = DatasetDict({"train": split["train"], "test": split["test"]})

else:
    # Use Common Voice or any HuggingFace dataset
    dataset = DatasetDict()
    dataset["train"] = load_dataset(DATASET_NAME, DATASET_CONFIG, split="train+validation", trust_remote_code=True)
    dataset["test"] = load_dataset(DATASET_NAME, DATASET_CONFIG, split="test", trust_remote_code=True)

    # Keep only needed columns
    dataset = dataset.remove_columns(
        [c for c in dataset["train"].column_names if c not in ["audio", "sentence"]]
    )
    dataset = dataset.rename_column("sentence", "text")

# Cast audio to 16kHz
dataset = dataset.cast_column("audio", Audio(sampling_rate=16000))
print(f"Train: {len(dataset['train'])}, Test: {len(dataset['test'])}")


# ─── Cell 6: Preprocessing ────────────────────────────────────
def prepare_dataset(batch):
    audio = batch["audio"]
    batch["input_features"] = feature_extractor(
        audio["array"], sampling_rate=audio["sampling_rate"]
    ).input_features[0]
    batch["labels"] = tokenizer(batch["text"]).input_ids
    return batch

dataset = dataset.map(prepare_dataset, remove_columns=dataset.column_names["train"], num_proc=1)


# ─── Cell 7: Data collator ────────────────────────────────────
@dataclass
class DataCollatorSpeechSeq2SeqWithPadding:
    processor: Any

    def __call__(self, features: List[Dict[str, Union[List[int], torch.Tensor]]]) -> Dict[str, torch.Tensor]:
        input_features = [{"input_features": f["input_features"]} for f in features]
        batch = self.processor.feature_extractor.pad(input_features, return_tensors="pt")

        label_features = [{"input_ids": f["labels"]} for f in features]
        labels_batch = self.processor.tokenizer.pad(label_features, return_tensors="pt")
        labels = labels_batch["input_ids"].masked_fill(labels_batch.attention_mask.ne(1), -100)

        if (labels[:, 0] == self.processor.tokenizer.bos_token_id).all().cpu().item():
            labels = labels[:, 1:]

        batch["labels"] = labels
        return batch

data_collator = DataCollatorSpeechSeq2SeqWithPadding(processor=processor)


# ─── Cell 8: Metrics ─────────────────────────────────────────
metric = evaluate.load("wer")

def compute_metrics(pred):
    pred_ids = pred.predictions
    label_ids = pred.label_ids
    label_ids[label_ids == -100] = tokenizer.pad_token_id
    pred_str = tokenizer.batch_decode(pred_ids, skip_special_tokens=True)
    label_str = tokenizer.batch_decode(label_ids, skip_special_tokens=True)
    wer = 100 * metric.compute(predictions=pred_str, references=label_str)
    return {"wer": wer}


# ─── Cell 9: Load model ───────────────────────────────────────
model = WhisperForConditionalGeneration.from_pretrained(MODEL_NAME)
model.generation_config.language = LANGUAGE
model.generation_config.task = TASK
model.generation_config.forced_decoder_ids = None


# ─── Cell 10: Training arguments ─────────────────────────────
training_args = Seq2SeqTrainingArguments(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=1,
    learning_rate=LEARNING_RATE,
    warmup_steps=WARMUP_STEPS,
    max_steps=MAX_STEPS,
    gradient_checkpointing=True,
    fp16=FP16,
    evaluation_strategy="steps",
    per_device_eval_batch_size=8,
    predict_with_generate=True,
    generation_max_length=225,
    save_steps=SAVE_STEPS,
    eval_steps=EVAL_STEPS,
    logging_steps=25,
    report_to=["tensorboard"],
    load_best_model_at_end=True,
    metric_for_best_model="wer",
    greater_is_better=False,
    push_to_hub=False,
)


# ─── Cell 11: Train! ─────────────────────────────────────────
trainer = Seq2SeqTrainer(
    args=training_args,
    model=model,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],
    data_collator=data_collator,
    compute_metrics=compute_metrics,
    tokenizer=processor.feature_extractor,
)

print("Starting training...")
trainer.train()

# ─── Cell 12: Save ───────────────────────────────────────────
trainer.save_model(OUTPUT_DIR)
processor.save_pretrained(OUTPUT_DIR)
print(f"\n✅ Model saved to {OUTPUT_DIR}")
print("Download this folder and place it in backend/models/fine_tuned_whisper/")

# ─── Cell 13 (optional): Evaluate WER ────────────────────────
results = trainer.evaluate()
print(f"\nFinal WER: {results['eval_wer']:.2f}%")

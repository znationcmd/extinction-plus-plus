"""Pulse: pretrained MusicGen neural music worker (instrumental; singing NOT supported)."""
import io
import os
import hmac
import wave
import torch
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from transformers import AutoProcessor, MusicgenForConditionalGeneration
app = FastAPI()
processor = None
model = None
class Job(BaseModel):
    prompt: str = Field(min_length=1, max_length=1200)
    format: str = "wav"
@app.get("/health")
def health():
    return {"model": "facebook/musicgen-small", "loaded": model is not None, "singingSupported": False}
@app.post("/generate")
def generate(job: Job, authorization: str = Header(default="")):
    global processor, model
    token = os.environ.get("NEURIA_GENERATION_WORKER_TOKEN", "")
    if not token or not hmac.compare_digest(authorization, "Bearer " + token):
        raise HTTPException(401, "Unauthorized")
    if job.format != "wav":
        raise HTTPException(400, "WAV required")
    if processor is None:
        processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
        model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
        model.to("cuda" if torch.cuda.is_available() else "cpu")
    inputs = processor(text=[job.prompt], padding=True, return_tensors="pt").to(model.device)
    with torch.inference_mode():
        audio = model.generate(**inputs, max_new_tokens=256)[0, 0].float().cpu().numpy()
    audio = (audio.clip(-1, 1) * 32767).astype("<i2")
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(model.config.audio_encoder.sampling_rate)
        wav.writeframes(audio.tobytes())
    return Response(buffer.getvalue(), media_type="audio/wav")

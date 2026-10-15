"""Oracle: real pretrained Shap-E text-to-3D inference. Requires model weights and sufficient compute."""
import io
import os
import hmac
import torch
import trimesh
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from diffusers import ShapEPipeline
app = FastAPI()
pipeline = None
class Job(BaseModel):
    prompt: str = Field(min_length=1, max_length=1200)
    format: str = "glb"
@app.get("/health")
def health():
    return {"model": "openai/shap-e", "loaded": pipeline is not None}
@app.post("/generate")
def generate(job: Job, authorization: str = Header(default="")):
    global pipeline
    expected = "Bearer " + os.environ.get("NEURIA_GENERATION_WORKER_TOKEN", "")
    if not os.environ.get("NEURIA_GENERATION_WORKER_TOKEN") or not hmac.compare_digest(authorization, expected):
        raise HTTPException(401, "Unauthorized")
    if job.format != "glb":
        raise HTTPException(400, "GLB required")
    if pipeline is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        pipeline = ShapEPipeline.from_pretrained("openai/shap-e", torch_dtype=torch.float16 if device == "cuda" else torch.float32).to(device)
    result = pipeline(job.prompt, guidance_scale=15.0, num_inference_steps=32, frame_size=128, output_type="mesh")
    mesh = result.images[0]
    vertices = mesh.verts.detach().cpu().numpy()
    faces = mesh.faces.detach().cpu().numpy()
    scene = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    binary = scene.export(file_type="glb")
    return Response(binary, media_type="model/gltf-binary")

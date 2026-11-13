import os
import tempfile
from pathlib import Path

import gradio as gr
import spaces
import torch
import trimesh
from diffusers import ShapEPipeline
from diffusers.utils import export_to_ply

MODEL_ID = "openai/shap-e"
pipeline = ShapEPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.float16)

@spaces.GPU(duration=60)
def generate(prompt):
    global pipeline
    prompt = (prompt or "").strip()
    if not prompt or len(prompt) > 1200:
        raise gr.Error("Décris un objet en 1 à 1200 caractères.")
    if not torch.cuda.is_available():
        raise gr.Error("ZeroGPU indisponible : aucun GPU alloué.")
    pipeline.to("cuda")
    result = pipeline(
        prompt, guidance_scale=15.0, num_inference_steps=32,
        frame_size=128, output_type="mesh"
    )
    mesh = result.images[0]
    output_dir = Path(tempfile.mkdtemp(prefix="neuria-oracle-"))
    ply_path = output_dir / "model.ply"
    glb_path = output_dir / "oracle.glb"
    export_to_ply(mesh, str(ply_path))
    loaded = trimesh.load(str(ply_path), force="mesh")
    loaded.export(str(glb_path), file_type="glb")
    if glb_path.stat().st_size < 100:
        raise gr.Error("La génération 3D a échoué.")
    return str(glb_path), str(glb_path)

import asyncio
from shazamio import Shazam

async def recognize_music(audio):
    if not audio:
        raise gr.Error("Choisis un extrait audio.")
    if Path(audio).stat().st_size > 12_000_000:
        raise gr.Error("Limite : 12 Mo.")
    try:
        async with Shazam() as engine:
            result = await asyncio.wait_for(engine.recognize(audio), timeout=45)
    except Exception as exc:
        raise gr.Error("Reconnaissance indisponible : " + type(exc).__name__)
    track = result.get("track") or {}
    return (str(track.get("title", "Aucune correspondance")) + (" — " + str(track.get("subtitle", "")) if track else ""), str(track.get("url", "")))

def select_tool(request: gr.Request):
    return gr.Tabs(selected=request.query_params.get("tool") if request.query_params.get("tool") in ("aura", "images") else "oracle")

from diffusers import DiffusionPipeline
image_pipeline = DiffusionPipeline.from_pretrained("segmind/tiny-sd", torch_dtype=torch.float16)

@spaces.GPU(duration=60)
def generate_image(prompt):
    prompt = (prompt or "").strip()
    if not prompt or len(prompt) > 1000:
        raise gr.Error("Description de 1 à 1000 caractères requise.")
    image_pipeline.to("cuda")
    image = image_pipeline(prompt, num_inference_steps=20, guidance_scale=7.0, width=512, height=512).images[0]
    output = Path(tempfile.mkdtemp(prefix="neuria-image-")) / "NEURIA_Image.png"
    image.save(str(output))
    return str(output), str(output)

with gr.Blocks(title="CMD NEURIA — Oracle et Aura") as demo:
    with gr.Tabs() as tabs:
        with gr.Tab("Oracle 3D", id="oracle"):
            gr.Markdown("# CMD NEURIA — Oracle 3D\nGénération de maillages 3D avec Shap-E (modèle réel).")
            prompt = gr.Textbox(label="Décris ton objet 3D", lines=3, max_length=1200)
            generate_button = gr.Button("Générer un objet 3D")
            model = gr.Model3D(label="Aperçu 3D")
            download = gr.File(label="Télécharger le GLB")
            generate_button.click(generate, inputs=[prompt], outputs=[model, download], concurrency_limit=1)
        with gr.Tab("Aura — Reconnaissance musicale", id="aura"):
            gr.Markdown("# Aura\nChoisis un extrait clair de 10 à 12 secondes. En cliquant sur Identifier, l’empreinte audio est envoyée à Shazam via ShazamIO, une interface non officielle dont la disponibilité n’est pas garantie.")
            audio = gr.Audio(sources=["upload", "microphone"], type="filepath", label="Extrait musical")
            identify = gr.Button("Identifier le titre et l’artiste", variant="primary")
            track = gr.Textbox(label="Titre et artiste")
            track_link = gr.Textbox(label="Lien du morceau")
            identify.click(recognize_music, inputs=audio, outputs=[track, track_link], api_name="recognize", concurrency_limit=1)
        with gr.Tab("Images", id="images"):
            gr.Markdown("# Images — Tiny-SD sur ZeroGPU gratuit\nGénération réelle en 512 × 512 pixels, sans fournisseur payant.")
            image_prompt = gr.Textbox(label="Décris ton image", lines=3, max_length=1000)
            image_button = gr.Button("Générer une image", variant="primary")
            image_preview = gr.Image(label="Image générée")
            image_file = gr.File(label="Télécharger le PNG")
            image_button.click(generate_image, inputs=image_prompt, outputs=[image_preview, image_file], api_name="generate_image", concurrency_limit=1)
    demo.load(select_tool, outputs=tabs)
demo.queue(max_size=4)
demo.launch()

const token=process.env.HF_TOKEN,base="https://huggingface.co";
const log=s=>console.log("NEURIA_FIX "+s);
const get=async(path)=>{const r=await fetch(base+path,{headers:{Authorization:"Bearer "+token},redirect:"follow",signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error("READ "+r.status);return r;};
const publish=async(repo,files)=>{const info=await(await get("/api/spaces/"+repo)).json();if(!String(info.runtime?.hardware?.requested).startsWith("zero-"))throw Error("Nonfree hardware refused");const rows=[{key:"header",value:{summary:"Fix free inference compatibility",description:"No hardware changes.",parentCommit:info.sha}},...Object.entries(files).map(([path,c])=>({key:"file",value:{path,encoding:"base64",content:Buffer.from(c).toString("base64")}}))];const r=await fetch(base+"/api/spaces/"+repo+"/commit/main",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/x-ndjson"},body:rows.map(x=>JSON.stringify(x)).join("\n")+"\n",redirect:"error",signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error("WRITE "+r.status+" "+(await r.text()).replaceAll(token,"[REDACTED]").slice(0,300));log(repo+" "+(await r.json()).commitOid);};
try{
let app=await(await get("/spaces/cmdofficiel/NEURIA-PULSE/raw/main/app.py")).text();
if(!app.includes("use_flash_attention = dit_handler.is_flash_attention_available()"))throw Error("Pulse attention marker missing");
app=app.replace("use_flash_attention = dit_handler.is_flash_attention_available()","use_flash_attention = False  # portable PyTorch attention on ZeroGPU");
app=app.replace('        print(f"Initializing 5Hz LM: {lm_model_path}...")','        from huggingface_hub import snapshot_download\n        lm_directory = os.path.join(checkpoint_dir, lm_model_path)\n        if not os.path.isfile(os.path.join(lm_directory, "config.json")):\n            snapshot_download(repo_id="ACE-Step/" + lm_model_path, local_dir=lm_directory)\n        print(f"Initializing 5Hz LM: {lm_model_path}...")');
let events=await(await get("/spaces/cmdofficiel/NEURIA-PULSE/raw/main/acestep/gradio_ui/events/__init__.py")).text();
events=events.replaceAll("_get_spaces_gpu_decorator(duration=120)","_get_spaces_gpu_decorator(duration=60)");
await publish("cmdofficiel/NEURIA-PULSE",{"app.py":app,"acestep/gradio_ui/events/__init__.py":events});
}catch(e){log("PULSE_FAILED "+e.message);}
try{
let app=await(await get("/spaces/cmdofficiel/NEURIA/raw/main/app.py")).text();
if(!app.includes('def generate_image(')){
const extra='from diffusers import DiffusionPipeline\nimage_pipeline = DiffusionPipeline.from_pretrained("segmind/tiny-sd", torch_dtype=torch.float16)\n\n@spaces.GPU(duration=60)\ndef generate_image(prompt):\n    prompt = (prompt or "").strip()\n    if not prompt or len(prompt) > 1000:\n        raise gr.Error("Description de 1 à 1000 caractères requise.")\n    image_pipeline.to("cuda")\n    image = image_pipeline(prompt, num_inference_steps=20, guidance_scale=7.0, width=512, height=512).images[0]\n    output = Path(tempfile.mkdtemp(prefix="neuria-image-")) / "NEURIA_Image.png"\n    image.save(str(output))\n    return str(output), str(output)\n\n';
app=app.replace('with gr.Blocks(title=',extra+'with gr.Blocks(title=');
app=app.replace('    demo.load(select_tool, outputs=tabs)','        with gr.Tab("Images", id="images"):\n            gr.Markdown("# Images — Tiny-SD sur ZeroGPU gratuit\\nGénération réelle en 512 × 512 pixels, sans fournisseur payant.")\n            image_prompt = gr.Textbox(label="Décris ton image", lines=3, max_length=1000)\n            image_button = gr.Button("Générer une image", variant="primary")\n            image_preview = gr.Image(label="Image générée")\n            image_file = gr.File(label="Télécharger le PNG")\n            image_button.click(generate_image, inputs=image_prompt, outputs=[image_preview, image_file], api_name="generate_image", concurrency_limit=1)\n    demo.load(select_tool, outputs=tabs)');
app=app.replace('return gr.Tabs(selected="aura" if request.query_params.get("tool") == "aura" else "oracle")','return gr.Tabs(selected=request.query_params.get("tool") if request.query_params.get("tool") in ("aura", "images") else "oracle")');
await publish("cmdofficiel/NEURIA",{"app.py":app});
}else{log("IMAGES_ALREADY_INSTALLED");}
}catch(e){log("IMAGES_FAILED "+e.message);}

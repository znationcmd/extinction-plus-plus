const files={"app.py":"import os\nimport tempfile\nfrom pathlib import Path\n\nimport gradio as gr\nimport spaces\nimport torch\nimport trimesh\nfrom diffusers import ShapEPipeline\nfrom diffusers.utils import export_to_ply\n\nMODEL_ID = \"openai/shap-e\"\npipeline = None\n\n@spaces.GPU(duration=180)\ndef generate(prompt):\n    global pipeline\n    prompt = (prompt or \"\").strip()\n    if not prompt or len(prompt) > 1200:\n        raise gr.Error(\"Décris un objet en 1 à 1200 caractères.\")\n    if not torch.cuda.is_available():\n        raise gr.Error(\"ZeroGPU indisponible : aucun GPU alloué.\")\n    if pipeline is None:\n        pipeline = ShapEPipeline.from_pretrained(\n            MODEL_ID, torch_dtype=torch.float16\n        ).to(\"cuda\")\n    result = pipeline(\n        prompt, guidance_scale=15.0, num_inference_steps=32,\n        frame_size=128, output_type=\"mesh\"\n    )\n    mesh = result.images[0]\n    output_dir = Path(tempfile.mkdtemp(prefix=\"neuria-oracle-\"))\n    ply_path = output_dir / \"model.ply\"\n    glb_path = output_dir / \"oracle.glb\"\n    export_to_ply(mesh, str(ply_path))\n    loaded = trimesh.load(str(ply_path), force=\"mesh\")\n    loaded.export(str(glb_path), file_type=\"glb\")\n    if glb_path.stat().st_size < 100:\n        raise gr.Error(\"La génération 3D a échoué.\")\n    return str(glb_path), str(glb_path)\n\nwith gr.Blocks(title=\"CMD NEURIA — Oracle 3D\") as demo:\n    gr.Markdown(\"# CMD NEURIA — Oracle 3D\\nGénération de maillages 3D avec Shap-E (modèle réel).\")\n    prompt = gr.Textbox(label=\"Décris ton objet 3D\", lines=3, max_length=1200)\n    generate_button = gr.Button(\"Générer un objet 3D\")\n    model = gr.Model3D(label=\"Aperçu 3D\")\n    download = gr.File(label=\"Télécharger le GLB\")\n    generate_button.click(generate, inputs=[prompt], outputs=[model, download], concurrency_limit=1)\ndemo.queue(max_size=4)\ndemo.launch()\n","requirements.txt":"gradio>=5.0,<6\nspaces>=0.32\ndiffusers>=0.31,<1\ntransformers>=4.44,<5\naccelerate>=1,<2\ntorch>=2.3,<3\ntrimesh>=4,<5\nnumpy>=1.26,<3\nplyfile>=1.0\n","README.md":"---\ntitle: CMD NEURIA Oracle 3D\nemoji: 🧊\ncolorFrom: orange\ncolorTo: yellow\nsdk: gradio\nsdk_version: 5.49.1\napp_file: app.py\npinned: false\nlicense: mit\nshort_description: Shap-E text-to-3D GLB generation\n---\n\n# CMD NEURIA Oracle 3D\nA genuine Shap-E model inference Space. ZeroGPU access and compatibility must be tested. Model weights download on first launch; this may exceed free resource/time limits. Public demo is not yet connected to Railway authentication or quota enforcement.\n"};
const token=process.env.HF_TOKEN;
const log=(m)=>console.log("NEURIA_PUBLISH "+m);
try {
 if(!token)throw Error("HF_TOKEN_MISSING");
 const origin="https://huggingface.co";
 const headers={Authorization:"Bearer "+token};
 const get=async(path)=>{const r=await fetch(origin+path,{headers,redirect:"error",signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error("HF_HTTP_"+r.status);return r.json();};
 const me=await get("/api/whoami-v2");
 if(me.name!=="cmdofficiel")throw Error("HF_TOKEN_WRONG_ACCOUNT");
 log("TOKEN_AUTHENTICATED");
 log("TOKEN_ROLE "+String(me.auth?.accessToken?.role||me.auth?.type||"unknown"));
 if(me.auth?.accessToken?.role==="read")throw Error("TOKEN_READ_ONLY_REQUIRES_WRITE");
 const info=await get("/api/spaces/cmdofficiel/NEURIA");
 const hw=info.runtime?.hardware;
 if(hw?.requested!=="zero-a10g" && !String(hw?.requested||"").startsWith("zero-"))throw Error("ZEROGPU_NOT_CONFIGURED");
 if(hw.current && !String(hw.current).startsWith("zero-"))throw Error("REFUSING_PAID_HARDWARE");
 const items=[{key:"header",value:{summary:"Publish Oracle 3D from Railway",description:"Three source files; hardware unchanged.",parentCommit:info.sha}},...Object.entries(files).map(([path,content])=>({key:"file",value:{path,encoding:"base64",content:Buffer.from(content).toString("base64")}}))];
 const r=await fetch(origin+"/api/spaces/cmdofficiel/NEURIA/commit/main",{method:"POST",headers:{...headers,"Content-Type":"application/x-ndjson"},body:items.map(x=>JSON.stringify(x)).join("\n")+"\n",redirect:"error",signal:AbortSignal.timeout(60000)});
 if(!r.ok){let reason="";try{const body=await r.json();reason=String(body.error||"").replaceAll(token,"[REDACTED]").slice(0,250);}catch{} log("COMMIT_REJECTION "+reason);throw Error("HF_COMMIT_HTTP_"+r.status);}
 const commit=await r.json();
 log("COMMIT_SUCCESS "+commit.commitOid);
 const check=await get("/api/spaces/cmdofficiel/NEURIA");
 if(check.sha!==commit.commitOid)throw Error("COMMIT_READBACK_MISMATCH");
 log("VERIFIED "+check.runtime?.stage);
} catch(e){log("FAILED "+String(e.message).replaceAll(token||"__NO_TOKEN__","[REDACTED]"));process.exit(1);}

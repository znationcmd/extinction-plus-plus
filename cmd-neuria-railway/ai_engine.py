#!/usr/bin/env python3
"""CMD NEURIA AI ENGINE — single local command dispatcher.

No paid API. AI backends are explicitly external local executables and must be
installed by the operator. No fabricated AI output or silent paid requests.
"""
import argparse
import json
import os
import pathlib
import shutil
import subprocess
import sys

HERE=pathlib.Path(__file__).resolve().parent
MEDIA=HERE/"media_engine.py"
MODES=("text-to-video","image-to-video","text-to-3d","image-to-3d","image-animation","mp4-convert")

def available():
    return {
        "image-animation": bool(shutil.which("ffmpeg")),
        "mp4-convert": bool(shutil.which("ffmpeg")),
        "text-to-video": bool(os.environ.get("CMD_NEURIA_TEXT_VIDEO_WORKER")),
        "image-to-video": bool(os.environ.get("CMD_NEURIA_IMAGE_VIDEO_WORKER")),
        "text-to-3d": bool(os.environ.get("CMD_NEURIA_TEXT_3D_WORKER")),
        "image-to-3d": bool(os.environ.get("CMD_NEURIA_IMAGE_3D_WORKER")),
    }

def main():
    p=argparse.ArgumentParser(description="CMD NEURIA unified local media engine")
    p.add_argument("--status",action="store_true",help="Show actual installed capabilities")
    p.add_argument("--mode",choices=MODES)
    p.add_argument("--prompt",default="")
    p.add_argument("--input")
    p.add_argument("--output")
    p.add_argument("--seconds",type=int,default=5)
    p.add_argument("--motion",choices=("zoom","pan","still"),default="zoom")
    a=p.parse_args()
    ready=available()
    if a.status:
        print(json.dumps({"engine":"CMD NEURIA AI ENGINE","local":True,"paidApi":False,"capabilities":ready},indent=2))
        return
    if not a.mode or not a.output:p.error("--mode et --output requis")
    if not ready[a.mode]:
        raise RuntimeError("Moteur non installé pour "+a.mode+" ; aucune génération simulée")
    out=pathlib.Path(a.output).expanduser().resolve()
    out.parent.mkdir(parents=True,exist_ok=True)
    if a.mode in ("image-animation","mp4-convert"):
        if not a.input:p.error("--input requis")
        args=[sys.executable,str(MEDIA),"image" if a.mode=="image-animation" else "convert","--input",a.input,"--output",str(out)]
        if a.mode=="image-animation":args+=["--seconds",str(a.seconds),"--motion",a.motion]
    else:
        key={"text-to-video":"CMD_NEURIA_TEXT_VIDEO_WORKER","image-to-video":"CMD_NEURIA_IMAGE_VIDEO_WORKER","text-to-3d":"CMD_NEURIA_TEXT_3D_WORKER","image-to-3d":"CMD_NEURIA_IMAGE_3D_WORKER"}[a.mode]
        executable=os.environ[key]
        if not pathlib.Path(executable).is_file():
            raise RuntimeError("Exécutable local absent : "+key)
        args=[executable,"--output",str(out)]
        if a.prompt:args+=["--prompt",a.prompt]
        if a.input:args+=["--input",a.input]
    subprocess.run(args,check=True,timeout=3600)
    if not out.is_file() or out.stat().st_size==0:raise RuntimeError("Le moteur n'a pas produit de fichier valide")
    print(json.dumps({"ok":True,"mode":a.mode,"file":str(out),"bytes":out.stat().st_size}))

if __name__=="__main__":
    try:main()
    except (RuntimeError,subprocess.CalledProcessError,subprocess.TimeoutExpired) as e:
        print(json.dumps({"ok":False,"error":str(e)}),file=sys.stderr)
        sys.exit(1)

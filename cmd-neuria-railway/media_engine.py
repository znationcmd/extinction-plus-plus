#!/usr/bin/env python3
"""CMD NEURIA local, free MP4 renderer. Requires FFmpeg installed in PATH.
Examples:
 python media_engine.py image --input photo.jpg --output animation.mp4 --seconds 5 --motion zoom
 python media_engine.py convert --input animation.webm --output animation.mp4
"""
import argparse
import os
import shutil
import subprocess
import sys

def run(args):
    ffmpeg=shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("FFmpeg absent. Installer FFmpeg puis réessayer.")
    subprocess.run([ffmpeg,"-hide_banner","-loglevel","error","-y",*args],check=True)

def main():
    parser=argparse.ArgumentParser(description="CMD NEURIA - export MP4 gratuit et local")
    sub=parser.add_subparsers(dest="mode",required=True)
    for name in ("image","convert"):
        p=sub.add_parser(name)
        p.add_argument("--output",required=True)
        p.add_argument("--input",required=True)
        if name=="image":p.add_argument("--seconds",type=int,default=5)
        if name=="image":p.add_argument("--motion",choices=("zoom","pan","still"),default="zoom")
    a=parser.parse_args()
    if not a.output.lower().endswith(".mp4"):parser.error("La sortie doit être un fichier .mp4")
    if a.mode!="convert" and not 1<=a.seconds<=30:parser.error("Durée entre 1 et 30 secondes")
    if a.mode!="text" and not os.path.isfile(a.input):parser.error("Fichier source introuvable")
    if a.mode=="convert":
        run(["-i",a.input,"-map","0:v:0","-map","0:a?","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac","-movflags","+faststart",a.output])
    elif a.mode=="image":
        # FFmpeg zoompan generates an actual 1280x720 H.264 MP4 at 25 fps.
        frames=a.seconds*25
        z={"zoom":"min(zoom+0.0009,1.20)","pan":"1.12","still":"1"}[a.motion]
        x="(iw-iw/zoom)*on/"+str(max(frames,1)) if a.motion=="pan" else "iw/2-(iw/zoom/2)"
        vf=f"scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440,zoompan=z='{z}':x='{x}':y='ih/2-(ih/zoom/2)':d={frames}:s=1280x720:fps=25,format=yuv420p"
        run(["-loop","1","-i",a.input,"-vf",vf,"-frames:v",str(frames),"-c:v","libx264","-preset","veryfast","-crf","24","-movflags","+faststart",a.output])
    print("Fichier MP4 créé :",os.path.abspath(a.output))

if __name__=="__main__":
    try:main()
    except (RuntimeError,subprocess.CalledProcessError) as e:
        print("Erreur :",e,file=sys.stderr)
        sys.exit(1)

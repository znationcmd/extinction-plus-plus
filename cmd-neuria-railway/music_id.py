#!/usr/bin/env python3
"""CMD Music ID: offline matching of audio against an owner's own WAV catalog.
No Shazam catalog access. Requires ffmpeg and ffprobe in PATH.
Usage: python music_id.py index --folder ./songs --database ./music-index.json
       python music_id.py recognize --input clip.wav --database ./music-index.json --output result.json
"""
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

def pcm(path):
    ff=shutil.which("ffmpeg")
    if not ff:raise RuntimeError("FFmpeg est requis")
    return subprocess.check_output([ff,"-v","error","-i",str(path),"-ac","1","-ar","8000","-f","s16le","-"],timeout=120)

def fingerprints(raw):
    # Exact-content hashes of overlapping ~1-second windows: simple, conservative
    # recognition of matching audio, not robust perceptual Shazam fingerprinting.
    chunk=16000
    step=8000
    return {hashlib.sha256(raw[i:i+chunk]).hexdigest()[:20] for i in range(0,max(0,len(raw)-chunk+1),step)}

def main():
    p=argparse.ArgumentParser()
    sub=p.add_subparsers(dest="mode",required=True)
    idx=sub.add_parser("index")
    idx.add_argument("--folder",required=True)
    idx.add_argument("--database",required=True)
    rec=sub.add_parser("recognize")
    rec.add_argument("--input",required=True)
    rec.add_argument("--database",required=True)
    rec.add_argument("--output",required=True)
    a=p.parse_args()
    if a.mode=="index":
        folder=pathlib.Path(a.folder)
        if not folder.is_dir():raise RuntimeError("Dossier introuvable")
        entries=[]
        for f in sorted(folder.iterdir()):
            if not f.is_file() or f.suffix.lower() not in (".wav",".mp3",".flac",".m4a",".ogg"):continue
            try:hashes=sorted(fingerprints(pcm(f)))
            except (subprocess.CalledProcessError,subprocess.TimeoutExpired):continue
            if hashes:entries.append({"filename":f.name,"fingerprints":hashes})
        pathlib.Path(a.database).write_text(json.dumps({"version":1,"entries":entries},ensure_ascii=False),encoding="utf-8")
        print(json.dumps({"indexed":len(entries),"database":a.database}))
    else:
        db=json.loads(pathlib.Path(a.database).read_text(encoding="utf-8"))
        sample=fingerprints(pcm(a.input))
        matches=[]
        for e in db.get("entries",[]):
            known=set(e["fingerprints"])
            overlap=len(sample&known)
            score=overlap/max(1,len(sample))
            if overlap>=2 and score>=.15:matches.append({"filename":e["filename"],"overlap":overlap,"score":round(score,3)})
        matches.sort(key=lambda x:x["score"],reverse=True)
        result={"recognized":bool(matches),"matches":matches[:5],"scope":"local catalog only","method":"exact PCM window hashes (not Shazam)"}
        pathlib.Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
        print(json.dumps(result,ensure_ascii=False))
if __name__=="__main__":
    try:main()
    except (RuntimeError,OSError,ValueError,subprocess.CalledProcessError,subprocess.TimeoutExpired) as e:
        print(str(e),file=sys.stderr);sys.exit(1)

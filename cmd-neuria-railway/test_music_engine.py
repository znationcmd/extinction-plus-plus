#!/usr/bin/env python3
"""Offline regression tests for CMD NEURIA music generation, no external API."""
import json
import pathlib
import subprocess
import sys
import tempfile
import wave

HERE=pathlib.Path(__file__).resolve().parent

def run(*args):
    return subprocess.run([sys.executable,*map(str,args)],check=True,capture_output=True,text=True,timeout=30)

def main():
    with tempfile.TemporaryDirectory() as d:
        folder=pathlib.Path(d)
        for mood in ("calme","joyeux","sombre","epique"):
            out=folder/(mood+".wav")
            run(HERE/"ai_engine.py","--mode","music-generation","--prompt","musique "+mood,"--output",out,"--seconds","3")
            with wave.open(str(out),"rb") as w:
                assert w.getnchannels()==1
                assert w.getframerate()==22050
                assert w.getnframes()==66150
            assert out.stat().st_size>100000
        status=json.loads(run(HERE/"ai_engine.py","--status").stdout)
        assert status["capabilities"]["music-generation"] is True
        print(json.dumps({"passed":5,"wavFiles":4,"status":"OK"}))
if __name__=="__main__":main()

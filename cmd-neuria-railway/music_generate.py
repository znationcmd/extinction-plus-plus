#!/usr/bin/env python3
"""CMD NEURIA Music: free, local, deterministic instrumental WAV composer.
Creates ORIGINAL procedural music; NOT generative neural AI or sung vocals.
Usage: python music_generate.py --prompt "musique calme piano" --output song.wav
"""
import argparse
import math
import pathlib
import struct
import wave

NOTES={"C":261.626,"D":293.665,"E":329.628,"F":349.228,"G":391.995,"A":440.0,"B":493.883}
SCALES={"calme":["C","E","G","A"],"joyeux":["C","D","E","G","A"],"sombre":["A","C","D","E"],"epique":["C","D","F","G","A"]}
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--prompt",required=True)
    p.add_argument("--output",required=True)
    p.add_argument("--seconds",type=int,default=12)
    args=p.parse_args()
    if not 2<=args.seconds<=60:p.error("Durée de 2 à 60 secondes")
    if pathlib.Path(args.output).suffix.lower()!=".wav":p.error("Sortie .wav obligatoire")
    prompt=args.prompt.lower()
    mood=next((k for k in SCALES if k in prompt),"calme")
    scale=SCALES[mood]
    rate=22050
    total=rate*args.seconds
    tempo=100 if mood=="joyeux" else 78 if mood=="calme" else 115
    beat=60/tempo
    import hashlib
    seed=int.from_bytes(hashlib.sha256(prompt.encode()).digest()[:4],"little")
    sequence=[scale[(seed//(i+1)+i*3)%len(scale)] for i in range(math.ceil(args.seconds/beat)+1)]
    output=pathlib.Path(args.output)
    output.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(output),"wb") as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        block=bytearray()
        for n in range(total):
            t=n/rate
            beat_idx=min(int(t/beat),len(sequence)-1)
            note=NOTES[sequence[beat_idx]]
            phase=(t%beat)/beat
            envelope=min(1,phase*18)*max(0,1-phase)**1.4
            melody=(math.sin(2*math.pi*note*t)+.28*math.sin(2*math.pi*2*note*t))*envelope
            bass=.30*math.sin(2*math.pi*(NOTES[scale[0]]/4)*t)
            kick=.23*math.sin(2*math.pi*(65-40*min(1,(t%beat)*10))*t)*math.exp(-15*(t%beat))
            sample=max(-1,min(1,(melody*.43+bass+kick)*.75))
            block.extend(struct.pack("<h",int(sample*32767)))
            if len(block)>=rate*2:f.writeframesraw(block);block.clear()
        if block:f.writeframesraw(block)
    print("Musique instrumentale originale :",output.resolve())
if __name__=="__main__":main()

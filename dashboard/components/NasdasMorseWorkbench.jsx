'use client';

import {useEffect,useRef,useState} from 'react';
import {BUNKERS,MORSE_DIGITS,decodeTransmission} from '../lib/nasdara-data.cjs';
import styles from './NasdasTowerRadio.module.css';

const ALPHABET={
  A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....', I:'..',
  J:'.---', K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.', Q:'--.-',
  R:'.-.', S:'...', T:'-', U:'..-', V:'...-', W:'.--', X:'-..-', Y:'-.--', Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-',
  '5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
  '.':'.-.-.-',',':'--..--','?':'..--..'
};
const REVERSE=Object.fromEntries(Object.entries(ALPHABET).map(([k,v])=>[v,k]));
const REF_SIGNAL='1001210481';
function formatCode(digits){
  const cleaned=String(digits||'').replace(/\s/g,'');
  if(!/^\d{10}$/.test(cleaned))return null;
  try{return decodeTransmission(cleaned);}catch{return null;}
}

export default function NasdasMorseWorkbench(){
  const [letters,setLetters]=useState('');
  const [current,setCurrent]=useState('');
  const [raw,setRaw]=useState('');
  const [code,setCode]=useState('');
  const [dashThreshold,setDashThreshold]=useState(320);
  const [letterDelay,setLetterDelay]=useState(1100);
  const [autoLetter,setAutoLetter]=useState(true);
  const [keyBeep,setKeyBeep]=useState(false);
  const [keyHeld,setKeyHeld]=useState(false);
  const [practice,setPractice]=useState(REF_SIGNAL);
  const [speed,setSpeed]=useState(1);
  const [playing,setPlaying]=useState(false);
  const [message,setMessage]=useState('');

  const currentRef=useRef(''),lettersRef=useRef(''),timerRef=useRef(null),pressTime=useRef(0),heldRef=useRef(false),
        audioRef=useRef(null),toneRef=useRef(null),playerTimer=useRef(null),playerStopped=useRef(false),spacePressed=useRef(false),
        letterDelayRef=useRef(letterDelay),autoRef=useRef(autoLetter),dashRef=useRef(dashThreshold),beepRef=useRef(keyBeep);

  useEffect(()=>{letterDelayRef.current=letterDelay;},[letterDelay]);
  useEffect(()=>{autoRef.current=autoLetter;},[autoLetter]);
  useEffect(()=>{dashRef.current=dashThreshold;},[dashThreshold]);
  useEffect(()=>{beepRef.current=keyBeep;},[keyBeep]);

  function putCurrent(next){currentRef.current=next;setCurrent(next);}
  function putLetters(next){lettersRef.current=next;setLetters(next);}
  function cancelLetterTimer(){if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null;}}
  function finishLetter(){
    cancelLetterTimer();
    const group=currentRef.current;
    if(!group)return;
    putLetters(lettersRef.current+(REVERSE[group]||'�'));
    putCurrent('');
  }
  function mark(symbol){
    cancelLetterTimer();
    putCurrent(currentRef.current+symbol);
    if(autoRef.current)timerRef.current=setTimeout(()=>finishLetter(),letterDelayRef.current);
  }

  function clearAll(){cancelLetterTimer();putCurrent('');putLetters('');setRaw('');setCode('');setMessage('');}
  function backspace(){
    cancelLetterTimer();
    if(currentRef.current)putCurrent(currentRef.current.slice(0,-1));
    else putLetters(lettersRef.current.slice(0,-1));
  }

  async function audio(){
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return null;
    if(!audioRef.current)audioRef.current=new AudioContext();
    if(audioRef.current.state==='suspended')await audioRef.current.resume();
    return audioRef.current;
  }
  async function press(){
    if(heldRef.current)return;
    heldRef.current=true;setKeyHeld(true);pressTime.current=performance.now();
    if(beepRef.current){
      try{
        const ctx=await audio();
        if(!heldRef.current||!ctx)return;
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.frequency.value=660;g.gain.setValueAtTime(.035,ctx.currentTime);
        o.connect(g);g.connect(ctx.destination);o.start();
        toneRef.current={o,g};
      }catch{}
    }
  }
  function release(){
    if(!heldRef.current)return;
    heldRef.current=false;setKeyHeld(false);
    if(toneRef.current){try{toneRef.current.o.stop();toneRef.current.o.disconnect();toneRef.current.g.disconnect();}catch{}toneRef.current=null;}
    const duration=performance.now()-pressTime.current;
    mark(duration>=dashRef.current?'-':'.');
  }
  useEffect(()=>{
    function down(e){
      const tag=e.target?.tagName?.toLowerCase();
      if(['input','textarea','select'].includes(tag)||e.ctrlKey||e.metaKey||e.altKey)return;
      if(e.code==='Space'&&!e.repeat){e.preventDefault();spacePressed.current=true;press();}
      else if(e.key==='.'||e.key==='-'){e.preventDefault();mark(e.key);}
      else if(e.key==='Enter'){e.preventDefault();finishLetter();}
      else if(e.key==='/'){e.preventDefault();finishLetter();putLetters(lettersRef.current+' ');}
      else if(e.key==='Backspace'){e.preventDefault();backspace();}
    }
    function up(e){if(e.code==='Space'&&spacePressed.current){e.preventDefault();spacePressed.current=false;release();}}
    function blur(){spacePressed.current=false;if(heldRef.current)release();}
    document.addEventListener('keydown',down);document.addEventListener('keyup',up);window.addEventListener('blur',blur);
    return()=>{document.removeEventListener('keydown',down);document.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
  },[]);

  useEffect(()=>()=>{if(timerRef.current)clearTimeout(timerRef.current);stopPlayback();if(audioRef.current)audioRef.current.close().catch(()=>{});},[]);

  function parseManual(){
    try{
      const tokens=raw.trim().split(/[\s/]+/).filter(Boolean);
      if(!tokens.length)throw new Error('Entre des points et des traits.');
      const phrase=tokens.map(t=>{
        if(!/^[.\-]+$/.test(t)||!REVERSE[t])throw new Error('Séquence Morse inconnue : '+t);
        return REVERSE[t];
      }).join('');
      putLetters(phrase);
      putCurrent('');
      setMessage('Signal décodé : '+phrase);
      const found=formatCode(phrase.replace(/[^0-9]/g,''));
      if(found)setCode(found.position+' '+found.code);
    }catch(err){setMessage(err.message);}
  }
  function result(){
    const final=String(code||'').replace(/\s/g,'');
    return formatCode(final) || formatCode(letters.replace(/[^0-9]/g,''));
  }
  const discovered=result();

  function stopPlayback(){
    playerStopped.current=true;
    if(playerTimer.current)clearTimeout(playerTimer.current);
    playerTimer.current=null;setPlaying(false);
  }
  async function playback(){
    stopPlayback();
    playerStopped.current=false;
    const input=practice.trim().toUpperCase();
    if(!input||!/^[A-Z0-9 ?.,]+$/.test(input)){setMessage('Entraînement : lettres A–Z, chiffres 0–9 et ponctuation simple.');return;}
    const sequence=input.split('').map(ch=>ch===' '?'/':ALPHABET[ch]).filter(Boolean).join(' ');
    const ctx=await audio();
    if(!ctx){setMessage('Lecture audio impossible sur ce navigateur.');return;}
    setPlaying(true);setMessage('Émission Morse originale synthétisée, sans audio externe.');
    // Chaque lecture programme son oscillateur et laisse un délai d'arrêt annulable.
    let seconds=0;
    const dot=.5/Math.max(.5,Math.min(3,speed));
    for(const symbol of sequence){
      if(symbol===' '){seconds+=dot*2;continue;}
      if(symbol==='/'){seconds+=dot*6;continue;}
      const d=(symbol==='-'?3:1)*dot;
      const oscillator=ctx.createOscillator(),gain=ctx.createGain();
      oscillator.type='sine';oscillator.frequency.value=620;
      gain.gain.setValueAtTime(0,ctx.currentTime+seconds);
      gain.gain.setValueAtTime(.035,ctx.currentTime+seconds+.005);
      gain.gain.setValueAtTime(.035,ctx.currentTime+seconds+d-.008);
      gain.gain.setValueAtTime(0,ctx.currentTime+seconds+d);
      oscillator.connect(gain);gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime+seconds);oscillator.stop(ctx.currentTime+seconds+d+.01);
      seconds+=d+dot;
    }
    playerTimer.current=setTimeout(()=>{setPlaying(false);playerTimer.current=null;},(seconds+.1)*1000);
  }

  return <div className="space-y-5">
    <section className="rounded-3xl border border-fuchsia-400/20 bg-gradient-to-br from-[#211630] via-[#16152a] to-[#0c1722] p-5 shadow-xl">
      <p className="text-xs font-bold tracking-[.24em] text-fuchsia-300">CODE DES ANTENNES · MANIPULATEUR</p>
      <h3 className="mt-2 text-2xl font-black">Décodeur Morse interactif</h3>
      <p className="mt-2 text-sm text-white/65">Reproduis les impulsions entendues : appui bref = point •, appui long = trait —. Clavier : barre espace maintenue, « . », « - », Entrée, Retour arrière.</p>
      <div className="mt-4 rounded-2xl border border-fuchsia-400/15 bg-black/45 p-5">
        <p className="text-xs uppercase tracking-[.22em] text-white/45">Transmission déchiffrée · {letters.length} caractère(s)</p>
        <p className="mt-3 min-h-12 break-all font-mono text-3xl font-bold tracking-widest text-amber-200">{letters||'—'}<span className="text-fuchsia-400">{current&&'['+current+']'}</span></p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <div className={styles.morseBase}>
          <span className={styles.morseLabel}>MANIPULATEUR MORSE · TC6</span>
          <button aria-label="Appui court : point, appui long : trait" type="button" onPointerDown={e=>{e.preventDefault();press();}} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}
            className={keyHeld?styles.morsePressed:styles.morseKey}>
            <span aria-hidden="true" className={styles.morseGrip}><span className={styles.morseGripCore}/></span>
            <span aria-hidden="true" className={styles.morseArm}/>
            <strong>{keyHeld?'SIGNAL':'APPUYER'}</strong>
            <small>court = • / long = —</small>
          </button>
          <span className={styles.morseLegends}>SOURIS · DOIGT · BARRE ESPACE</span>
        </div>
        <button className="btn border border-white/20 bg-white/10" type="button" onClick={()=>mark('.')}>• Point</button>
        <button className="btn border border-white/20 bg-white/10" type="button" onClick={()=>mark('-')}>— Trait</button>
        <button className="btn border border-white/20 bg-white/10" type="button" onClick={finishLetter}>Fin de lettre</button>
        <button className="btn border border-white/20 bg-white/10" type="button" onClick={()=>{finishLetter();putLetters(lettersRef.current+' ');}}>Espace</button>
        <button className="btn border border-white/20 bg-white/10" type="button" onClick={backspace}>⌫ Effacer</button>
        <button className="btn border border-white/20 bg-white/10" type="button" onClick={clearAll}>Tout vider</button>
      </div>
      <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
        <label>Trait à partir de {dashThreshold} ms
          <input aria-label="Durée minimum du trait" type="range" min="180" max="1200" step="20" value={dashThreshold} onChange={e=>setDashThreshold(+e.target.value)} className="mt-3 w-full accent-fuchsia-400"/>
        </label>
        <label>Fin automatique après {letterDelay} ms
          <input aria-label="Silence entre lettres" type="range" min="600" max="2600" step="100" value={letterDelay} onChange={e=>setLetterDelay(+e.target.value)} className="mt-3 w-full accent-fuchsia-400"/>
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={autoLetter} onChange={e=>setAutoLetter(e.target.checked)}/> Détecter la fin des lettres</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={keyBeep} onChange={e=>setKeyBeep(e.target.checked)}/> Bip pendant l’appui</label>
      </div>
      <label className="mt-5 block text-sm">Morse à coller
        <textarea className="input mt-2 font-mono" rows="2" value={raw} onChange={e=>setRaw(e.target.value)} placeholder=".---- ----- ----- .---- ..--- .---- / ----- ....- ---.. .----"/>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={parseManual}>Déchiffrer</button>
        <button type="button" className="btn border border-white/20 bg-white/10" onClick={()=>navigator.clipboard?.writeText(letters+current)}>Copier le message</button>
      </div>
      {message&&<p className="mt-3 text-sm text-amber-200" role="status">{message}</p>}
    </section>

    <section className="card">
      <h3 className="text-xl font-black">🔐 Le bunker et son code</h3>
      <p className="mt-1 text-sm text-white/65">Six chiffres de coordonnées, puis quatre chiffres de cadenas. Le code tapé ici n’est pas certifié comme actif.</p>
      <input className="input mt-3 font-mono tracking-widest" placeholder="100121 0481" aria-label="Code à dix chiffres"
        value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric"/>
      {discovered
        ?<div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-600/10 p-4">
          <b className="text-emerald-300">Grille {discovered.position.slice(0,3)} {discovered.position.slice(3)} · cadenas {discovered.code}</b>
          <p className="mt-1 text-sm">{discovered.bunker?discovered.bunker.type+' · X '+discovered.bunker.x+' / Z '+discovered.bunker.z:'Coordonnées non répertoriées'}</p>
        </div>
        :<p className="mt-3 text-sm text-white/55">Aucun code complet interprété.</p>}
    </section>

    <section className="card">
      <h3 className="text-xl font-black">🎧 Entraîner son oreille</h3>
      <p className="mt-1 text-sm text-white/65">Générateur Morse local. Point de 0,5 s et trait de 1,5 s à vitesse normale. Il ne transmet rien dans DayZ.</p>
      <input value={practice} onChange={e=>setPractice(e.target.value)} className="input mt-3 font-mono" maxLength={50} aria-label="Texte à jouer en Morse"/>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" type="button" onClick={playback} disabled={playing}>▶ Jouer en Morse</button>
        <button className="btn border border-white/20 bg-white/10" type="button" onClick={stopPlayback}>■ Stop</button>
        <label className="ml-2 text-sm">Vitesse ×{speed}<input type="range" min=".5" max="3" step=".5" value={speed} onChange={e=>setSpeed(+e.target.value)} className="ml-2 align-middle accent-fuchsia-400"/></label>
      </div>
      <p className="mt-4 break-all font-mono text-xs leading-6 text-fuchsia-200">{practice.toUpperCase().split('').map(ch=>ALPHABET[ch]||'/').join(' ')}</p>
      <details className="mt-4"><summary className="cursor-pointer text-sm font-bold text-amber-200">Table internationale du Morse</summary>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {Object.entries(ALPHABET).map(([name,morse])=><div key={name} className="rounded-lg bg-white/5 p-2 text-sm"><b>{name}</b> <code className="text-fuchsia-300">{morse}</code></div>)}
        </div>
      </details>
    </section>
  </div>;
}

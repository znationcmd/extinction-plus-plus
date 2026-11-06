'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {BUNKERS, ANTENNAS, SOURCE_URL, MAP_URL, decodeTransmission} from '../../shared/nasdara-data';
import {createMorseStream} from '../../shared/nasdara-stream';

function bunkerLine(b){
  return b.grid.slice(0,3)+' '+b.grid.slice(3)+' · '+b.type+' · X '+b.x+' / Z '+b.z;
}
function formatTime(value){
  try {return new Date(value).toLocaleTimeString('fr-FR');}catch{return '—';}
}

export default function BunkerNasdasReceiver(){
  const [source,setSource]=useState('microphone');
  const [servers,setServers]=useState([]);
  const [serverId,setServerId]=useState('');
  const [listening,setListening]=useState(false);
  const [status,setStatus]=useState('Récepteur arrêté. Aucune transmission en cours.');
  const [threshold,setThreshold]=useState(-62);
  const [strength,setStrength]=useState(-120);
  const [symbols,setSymbols]=useState('');
  const [digits,setDigits]=useState('');
  const [heard,setHeard]=useState([]);
  const [shared,setShared]=useState([]);
  const [manual,setManual]=useState('');
  const [manualResult,setManualResult]=useState(null);
  const [manualError,setManualError]=useState('');

  const context=useRef(null),sourceNode=useRef(null),analyser=useRef(null),
        media=useRef(null),frame=useRef(0),streamDecoder=useRef(createMorseStream()),
        streamSource=useRef('microphone'),settings=useRef({threshold:-62}),
        active=useRef(false),lastRender=useRef(0),lastPublished=useRef(new Map());

  useEffect(()=>{settings.current.threshold=threshold;},[threshold]);

  useEffect(()=>{
    let cancelled=false;
    fetch('/api/servers',{cache:'no-store'}).then(async response=>{
      if(!response.ok)throw new Error('Serveurs inaccessibles.');
      return response.json();
    }).then(body=>{
      if(cancelled)return;
      const rows=(body.servers||[]).filter(s=>String(s.game||'').startsWith('dayz'));
      setServers(rows);
      const nasdara=rows.find(s=>/nasdara|nasdas/i.test(String(s.map||'')));
      setServerId(previous=>rows.some(s=>s.id===previous)?previous:(nasdara?.id||rows[0]?.id||''));
    }).catch(()=>{});
    return()=>{cancelled=true;};
  },[]);

  const loadCodes=useCallback(async()=>{
    try {
      const response=await fetch('/api/bunker-nasdas'+(serverId?'?serverId='+encodeURIComponent(serverId):''),{cache:'no-store'});
      if(!response.ok) return;
      const body=await response.json();
      if(Array.isArray(body.signals))setShared(body.signals);
    }catch{}
  },[serverId]);

  useEffect(()=>{
    loadCodes();
    const timer=setInterval(()=>{if(!document.hidden)loadCodes();},15000);
    return()=>clearInterval(timer);
  },[loadCodes]);

  function cleanup(){
    active.current=false;
    if(frame.current)cancelAnimationFrame(frame.current);
    frame.current=0;
    if(media.current){media.current.getTracks().forEach(t=>t.stop());media.current=null;}
    if(sourceNode.current){try{sourceNode.current.disconnect();}catch{}sourceNode.current=null;}
    if(analyser.current){try{analyser.current.disconnect();}catch{}analyser.current=null;}
    if(context.current){context.current.close().catch(()=>{});context.current=null;}
  }
  useEffect(()=>()=>{cleanup();},[]);

  async function saveDetected(message){
    const key=message.position+'-'+message.code;
    const now=Date.now();
    const last=lastPublished.current.get(key)||0;
    // Le son d'un seul passage ne doit pas produire 30 publications.
    if(now-last<10000)return;
    lastPublished.current.set(key,now);
    if(!serverId){setStatus('Audio décodé localement : choisis un serveur DayZ pour partager son code avec ton Discord.');return;}
    try {
      const response=await fetch('/api/bunker-nasdas',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({digits:message.digits,source:streamSource.current,serverId})
      });
      if(!response.ok)throw new Error((await response.json()).error||'Transmission non enregistrée.');
      loadCodes();
    }catch(error){
      setStatus('Audio décodé localement, mais partage Discord impossible : '+error.message);
    }
  }

  function onDecoded(message){
    setHeard(previous=>[{
      position:message.position,code:message.code,grid:message.bunker?.grid,
      type:message.bunker?.type,heardAt:new Date().toISOString()
    },...previous].slice(0,12));
    setStatus('Transmission complète captée : '+message.position+' / cadenas '+message.code+'.');
    saveDetected(message);
  }

  async function start(){
    cleanup();
    streamDecoder.current.reset();
    setHeard([]);setSymbols('');setDigits('');
    if(!window.isSecureContext){setStatus('HTTPS requis pour ouvrir le microphone ou capturer le son du jeu.');return;}
    if(!navigator.mediaDevices){setStatus('Capture audio non prise en charge par ce navigateur.');return;}
    try {
      const type=source;
      streamSource.current=type;
      let input;
      if(type==='screen_audio'){
        if(typeof navigator.mediaDevices.getDisplayMedia!=='function')throw new Error('Partage audio indisponible. Essaie Chrome ou Edge sur PC.');
        input=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
        if(!input.getAudioTracks().length){input.getTracks().forEach(t=>t.stop());throw new Error('Aucune piste audio partagée. Active « Partager aussi le son » dans Chrome/Edge.');}
      }else{
        if(typeof navigator.mediaDevices.getUserMedia!=='function')throw new Error('Microphone indisponible sur cet appareil.');
        input=await navigator.mediaDevices.getUserMedia({audio:{
          echoCancellation:false,noiseSuppression:false,autoGainControl:false
        }});
      }
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextClass){input.getTracks().forEach(t=>t.stop());throw new Error('Audio Web non compatible.');}
      const audioContext=new AudioContextClass();
      const node=audioContext.createMediaStreamSource(input);
      const spectrum=audioContext.createAnalyser();
      spectrum.fftSize=4096;spectrum.smoothingTimeConstant=0.3;
      node.connect(spectrum); // On analyse l'audio localement, on ne le réémet pas.
      context.current=audioContext;sourceNode.current=node;analyser.current=spectrum;media.current=input;
      await audioContext.resume();
      input.getTracks().forEach(track=>{track.addEventListener('ended',()=>stop(),{once:true});});
      active.current=true;
      setListening(true);
      setStatus('Écoute réelle du '+(type==='microphone'?'microphone':'son partagé')+' en cours. Place la radio DayZ sur 80,0 MHz.');
      const frequencies=new Float32Array(spectrum.frequencyBinCount);
      const freqStep=audioContext.sampleRate/spectrum.fftSize;
      const first=Math.max(1,Math.floor(300/freqStep));
      const last=Math.min(frequencies.length-1,Math.ceil(1800/freqStep));
      const decoded=streamDecoder.current;

      const process=()=>{
        if(!active.current)return;
        spectrum.getFloatFrequencyData(frequencies);
        let maximum=-150,total=0,count=0;
        for(let i=first;i<=last;i++){
          const db=Number.isFinite(frequencies[i])?frequencies[i]:-150;
          if(db>maximum)maximum=db;
          total+=db;count++;
        }
        const mean=count?total/count:-150;
        // Tonalité dominante, sinon le bruit de fond et la voix déclenchent trop de faux bips.
        const isBeep=maximum>=settings.current.threshold && maximum-mean>12;
        const events=decoded.sample(isBeep,performance.now());
        for(const message of events)onDecoded(message);
        if(performance.now()-lastRender.current>130){
          const state=decoded.snapshot();
          setStrength(Math.round(maximum));
          setSymbols(state.symbols);
          setDigits(state.digits);
          lastRender.current=performance.now();
        }
        frame.current=requestAnimationFrame(process);
      };
      frame.current=requestAnimationFrame(process);
    }catch(error){
      cleanup();setListening(false);
      setStatus('Réception impossible : '+(error?.message||'accès audio refusé.'));
    }
  }

  function stop(){
    cleanup();
    setListening(false);setStrength(-120);setSymbols('');setDigits('');
    setStatus('Récepteur arrêté : aucun signal reçu quand cette page est fermée.');
  }

  function decodeManual(){
    try{
      setManualResult(decodeTransmission(manual));
      setManualError('');
    }catch(error){setManualResult(null);setManualError(error.message);}
  }

  return <div className="space-y-6">
    <section className="card">
      <p className="text-sm font-black uppercase tracking-[.2em] text-amber-300">DayZ Badlands · Nasdara · Fréquence 80,0 MHz</p>
      <h2 className="mt-2 text-3xl font-black sm:text-4xl">🔐 Bunker Nasdas</h2>
      <p className="mt-2 text-white/70">Récepteur Morse réel pour la radio DayZ : la capture son passe par ce navigateur. Les 6 premiers chiffres identifient le bunker ; les 4 suivants ouvrent le cadenas.</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <a className="btn btn-primary" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">Décodeur original DayZAide</a>
        <a className="btn border border-white/20 bg-white/10" href={MAP_URL} target="_blank" rel="noopener noreferrer">Carte Nasdara</a>
      </div>
    </section>

    <section className="card space-y-4">
      <h3 className="text-2xl font-black">📻 Récepteur audio en direct</h3>
      <p className="text-sm text-white/70">Sur PS5 / Xbox : fais entendre la radio dans le micro de ton téléphone. Sur PC : partage la fenêtre de DayZ et active le partage du son, ou utilise un micro. La radio en jeu doit être allumée sur <b>80,0 MHz</b> pendant la nuit.</p>
      <label className="block text-sm font-semibold">Serveur DayZ à écouter
        <select className="input mt-2" value={serverId} disabled={listening} onChange={event=>setServerId(event.target.value)}>
          <option value="">Choisir un serveur du Discord</option>
          {servers.map(s=><option key={s.id} value={s.id}>{s.name+' · '+(s.map||'Carte non renseignée')}</option>)}
        </select>
      </label>
      {!servers.length&&<p className="text-sm text-amber-200">Aucun serveur DayZ enregistré : tu peux écouter et décoder, mais les codes ne seront pas publiés sur le bot avant d’avoir ajouté ton serveur dans « Serveurs ».</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Entrée audio
          <select className="input mt-2" value={source} disabled={listening} onChange={event=>setSource(event.target.value)}>
            <option value="microphone">Microphone (PC, téléphone, console)</option>
            <option value="screen_audio">Son partagé d’une fenêtre (PC Chrome/Edge)</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Sensibilité du détecteur : {threshold} dB
          <input type="range" min="-95" max="-30" step="1" value={threshold}
            onChange={event=>setThreshold(Number(event.target.value))}
            className="mt-6 w-full accent-amber-400"/>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!listening
          ?<button type="button" className="btn btn-primary" onClick={start}>▶ Activer la réception réelle</button>
          :<button type="button" className="btn border border-red-400/50 bg-red-500/20" onClick={stop}>■ Arrêter l’écoute</button>}
        <span className={'rounded-xl border px-3 py-2 text-sm '+(listening?'border-green-400/50 text-green-300':'border-white/20 text-white/60')}>
          {listening?'● Capture audio active':'○ Non connecté à un audio'}
        </span>
      </div>
      <p className="text-sm text-white/80" role="status">{status}</p>
      <div className="rounded-xl bg-black/35 p-4 font-mono text-sm">
        <p>Niveau tonalité : <b>{strength} dB</b></p>
        <p className="mt-2 break-all">Morse en cours : <b>{symbols||'—'}</b></p>
        <p className="mt-2">Chiffres décodés : <b>{digits||'—'}</b></p>
      </div>
      <p className="text-xs text-amber-200/85">Important : ce n’est pas une connexion directe à l’API Nitrado ou à l’émetteur interne du serveur. Le son doit réellement arriver au navigateur ; vérifie les chiffres entendus avant de tenter le cadenas. L’audio n’est pas envoyé ni sauvegardé sur nos serveurs.</p>
    </section>

    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-2xl font-black">📟 Codes captés et transmis au Discord sélectionné</h3>
          <p className="mt-1 text-sm text-white/60">Chaque résultat provient d’une capture audio d’un utilisateur connecté au Dashboard. « Répété » signifie entendu plusieurs fois, pas vérifié par DayZ.</p></div>
        <button type="button" onClick={loadCodes} className="btn border border-white/20 bg-white/10">Actualiser</button>
      </div>
      <div className="mt-4 space-y-3">
        {heard.map((m,index)=><div key={m.heardAt+'-'+index} className="rounded-xl border border-green-400/20 bg-green-600/10 p-3">
          <b className="text-green-300">Capté dans cette session · {formatTime(m.heardAt)}</b>
          <p>{m.position.slice(0,3)+' '+m.position.slice(3)} · Code <b>{m.code}</b> · {m.type||'Bunker'}</p>
        </div>)}
        {!heard.length&&<p className="text-white/60">Aucun message complet encore reconnu pendant cette écoute.</p>}
        <h4 className="pt-3 font-bold text-amber-200">Signaux enregistrés pour ce Discord (moins de 2 h)</h4>
        {shared.map(item=><article key={item.id} className="flex flex-wrap justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div><b>{item.position.slice(0,3)+' '+item.position.slice(3)}</b> · Cadenas <b>{item.code}</b>
            <p className="text-xs text-white/55">{(servers.find(s=>s.id===item.serverId)?.name)||'Serveur inconnu'} · {(BUNKERS.find(b=>b.grid===item.position)?.type)||'Bunker'} · {item.count>=2?'Répété '+item.count+' fois':'Capté une fois'} · {formatTime(item.observedAt)}</p></div>
          <span className="text-xs text-white/50">Capture {item.source==='screen_audio'?'PC':'micro'}</span>
        </article>)}
        {!shared.length&&<p className="text-white/60">Aucune transmission enregistrée : les codes ne peuvent pas être obtenus sans écouter le jeu.</p>}
      </div>
    </section>

    <details className="card">
      <summary className="cursor-pointer text-xl font-black">🧪 Décodeur manuel de secours (sans publication comme « direct »)</summary>
      <div className="mt-4 flex flex-wrap gap-3">
        <input className="input min-w-0 flex-1" value={manual} onChange={e=>setManual(e.target.value)}
          placeholder="1001210481 ou 10 chiffres en Morse"/>
        <button type="button" className="btn btn-primary" onClick={decodeManual}>Décoder</button>
      </div>
      {manualError&&<p role="alert" className="mt-3 text-red-300">{manualError}</p>}
      {manualResult&&<p className="mt-3">
        Grille : <b>{manualResult.position}</b> · Code : <b>{manualResult.code||'incomplet'}</b>
        <span className="block text-white/65">{manualResult.bunker?bunkerLine(manualResult.bunker):'Grille non trouvée'}</span>
      </p>}
    </details>

    <details className="card">
      <summary className="cursor-pointer text-xl font-black">🗺️ Les 23 bunkers et les tours radio</summary>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div><h4 className="mb-3 text-lg font-bold">23 bunkers connus</h4>
          <ul className="space-y-2 text-sm text-white/75">{BUNKERS.map(b=><li key={b.grid}>{bunkerLine(b)}</li>)}</ul></div>
        <div><h4 className="mb-3 text-lg font-bold">Antennes et tours</h4>
          <ul className="space-y-2 text-sm text-white/75">{ANTENNAS.map((a,index)=><li key={index}>{a.type+' · X '+a.x+' / Z '+a.z}</li>)}</ul></div>
      </div>
    </details>
  </div>;
}

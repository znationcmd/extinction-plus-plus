'use client';

import {useEffect,useRef,useState} from 'react';
import styles from './NasdasTowerRadio.module.css';

const FREQUENCY=101.7;
const SCENES=[
  {roman:'I',name:'Sable froid',desc:'Vent dans les dunes et souffle lointain',bass:58,noise:.024,signal:.003,filter:520},
  {roman:'II',name:"L'antenne",desc:'Électricité, métal et vieux relais',bass:88,noise:.034,signal:.008,filter:840},
  {roman:'III',name:'Le signal',desc:'Pulsations et fréquences perdues',bass:102,noise:.019,signal:.013,filter:1250},
  {roman:'IV',name:'Parasites',desc:'Grésillement et interférences',bass:64,noise:.075,signal:.004,filter:1850},
  {roman:'V',name:'Le bunker',desc:'Vibrations sourdes derrière le sas',bass:43,noise:.017,signal:.006,filter:360}
];

function displayClock(time){
  const m=Math.floor(time/60).toString().padStart(2,'0');
  const s=(time%60).toString().padStart(2,'0');
  return m+':'+s;
}
function adjust(node,value,ctx){
  if(!node||!ctx)return;
  node.gain.setTargetAtTime(Math.max(0,value),ctx.currentTime,.07);
}

export default function NasdasTowerRadio({captureActive=false}){
  const [power,setPower]=useState(false);
  const [frequency,setFrequency]=useState(FREQUENCY);
  const [scene,setScene]=useState(0);
  const [volume,setVolume]=useState(44);
  const [night,setNight]=useState(1);
  const [elapsed,setElapsed]=useState(0);
  const [error,setError]=useState('');
  const graph=useRef(null);

  function shutdown(){
    const g=graph.current;
    graph.current=null;
    if(!g)return;
    for(const node of [g.noise,g.low,g.deep,g.pulse]){
      try{node.stop()}catch{}
    }
    try{g.ctx.close().catch(()=>{})}catch{}
  }

  useEffect(()=>()=>shutdown(),[]);
  useEffect(()=>{
    if(!captureActive)return;
    if(graph.current){shutdown();setPower(false);setError("Ambiance coupée : le décodeur écoute maintenant le vrai son du jeu.");}
  },[captureActive]);
  useEffect(()=>{
    if(!power)return;
    const timer=setInterval(()=>setElapsed(n=>n+1),1000);
    return()=>clearInterval(timer);
  },[power]);
  useEffect(()=>{
    const g=graph.current;
    if(!g)return;
    const preset=SCENES[scene];
    const distance=Math.abs(frequency-FREQUENCY);
    const clarity=Math.max(0,1-distance/6);
    g.filter.frequency.setTargetAtTime(preset.filter+distance*125,g.ctx.currentTime,.3);
    g.low.frequency.setTargetAtTime(preset.bass+night%4*2,g.ctx.currentTime,.25);
    g.deep.frequency.setTargetAtTime(preset.bass/2,g.ctx.currentTime,.25);
    g.pulse.frequency.setTargetAtTime(190+(night%3)*45,g.ctx.currentTime,.25);
    adjust(g.noiseGain,preset.noise+distance*.013,g.ctx);
    adjust(g.lowGain,.035*clarity,g.ctx);
    adjust(g.deepGain,.019*clarity,g.ctx);
    adjust(g.pulseGain,preset.signal*clarity,g.ctx);
    adjust(g.outputGain,(volume/100)*.47,g.ctx);
  },[scene,frequency,volume,night,power]);

  async function togglePower(){
    if(graph.current){shutdown();setPower(false);setError('');return;}
    if(captureActive){setError("Arrête d'abord la capture du vrai signal pour écouter l'ambiance.");return;}
    let ctx;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw new Error('Audio Web indisponible sur ce navigateur.');
      ctx=new Audio();
      const frames=Math.round(ctx.sampleRate*2);
      const buffer=ctx.createBuffer(1,frames,ctx.sampleRate);
      const channel=buffer.getChannelData(0);
      for(let i=0;i<frames;i++)channel[i]=Math.random()*2-1;
      const noise=ctx.createBufferSource();
      noise.buffer=buffer;noise.loop=true;
      const filter=ctx.createBiquadFilter();
      filter.type='lowpass';
      const noiseGain=ctx.createGain();
      const low=ctx.createOscillator();
      low.type='triangle';
      const lowGain=ctx.createGain();
      const deep=ctx.createOscillator();
      deep.type='sine';
      const deepGain=ctx.createGain();
      const pulse=ctx.createOscillator();
      pulse.type='sine';
      const pulseGain=ctx.createGain();
      const outputGain=ctx.createGain();
      outputGain.gain.value=0;
      noise.connect(filter);filter.connect(noiseGain);noiseGain.connect(outputGain);
      low.connect(lowGain);lowGain.connect(outputGain);
      deep.connect(deepGain);deepGain.connect(outputGain);
      pulse.connect(pulseGain);pulseGain.connect(outputGain);
      outputGain.connect(ctx.destination);
      noise.start();low.start();deep.start();pulse.start();
      graph.current={ctx,noise,filter,noiseGain,low,lowGain,deep,deepGain,pulse,pulseGain,outputGain};
      await ctx.resume();
      setElapsed(0);setError('');setPower(true);
    }catch(e){
      shutdown();
      if(ctx)ctx.close().catch(()=>{});
      setPower(false);
      setError('Son indisponible : '+(e.message||'vérifie les autorisations du navigateur.'));
    }
  }

  const preset=SCENES[scene];
  const reception=Math.max(0,Math.min(100,Math.round(100-Math.abs(frequency-FREQUENCY)*16)));
  function retune(delta){setFrequency(f=>Math.min(108,Math.max(87.5,Math.round((f+delta)*10)/10)));}

  return <section className={styles.section} aria-label="Radio de la tour de Nasdara">
    <div className={styles.heading}>
      <div>
        <p className={styles.eyebrow}><span className={styles.pulseMark}/> RADIO DE LA TOUR <span className={styles.muted}>AMBIANCE</span></p>
        <h3>Sur les ondes de Nasdara</h3>
        <p className={styles.lead}>Une radio analogique oubliée dans le désert. Allume-la pour écouter ses cinq ambiances et régler l'accord.</p>
      </div>
      <div className={styles.broadcastStatus}><span className={power?styles.on:styles.off}/>{power?'AMBIANCE EN COURS':'RADIO ÉTEINTE'}</div>
    </div>

    <div className={styles.radio}>
      <div className={styles.radioTop}>
        <span className={styles.inscription}>EXTINCTION ++ RSS <b>•</b> NASDARA</span>
        <span className={styles.serial}>RADIO / TOUR TC6 — UNITÉ 07</span>
      </div>
      <div className={styles.radioBody}>
        <div className={styles.radioLeft}>
          <div className={styles.display}>
            <div className={styles.displayTop}><span>FM · AMBIANCE</span><span className={styles.redIndicator}>{power?'● ON AIR':'○ HORS LIGNE'}</span></div>
            <div className={styles.freqLine}><strong>{frequency.toFixed(1)}</strong><small>MHz</small></div>
            <div className={styles.dialScale}>
              <div className={styles.ticks}>{Array.from({length:25},(_,i)=><span key={i}/>)}</div>
              <div className={styles.needle} style={{left:(((frequency-87.5)/(108-87.5))*100)+'%'}}/>
            </div>
            <div className={styles.range}><span>87.5</span><span>101.7</span><span>108.0</span></div>
          </div>
          <div className={styles.meters}>
            <div><span>PASSAGE</span><strong>{power?'N° '+night.toString().padStart(2,'0'):'—'}</strong></div>
            <div><span>ACCORD</span><strong>{reception}%</strong></div>
            <div><span>ÉCOUTE</span><strong>{displayClock(elapsed)}</strong></div>
          </div>
          <div className={styles.tuner}>
            <button aria-label="Diminuer la fréquence de 0,1 MHz" type="button" onClick={()=>retune(-.1)}>−</button>
            <div className={styles.tuneText}>
              <strong>ACCORD FIN</strong>
              <input aria-label="Régler la fréquence de la radio d'ambiance" min="87.5" max="108" step=".1" type="range" value={frequency} onChange={e=>setFrequency(+e.target.value)} />
            </div>
            <button aria-label="Augmenter la fréquence de 0,1 MHz" type="button" onClick={()=>retune(.1)}>+</button>
          </div>
        </div>
        <div className={styles.speakerSide}>
          <div className={styles.speaker} aria-hidden="true">
            <div className={styles.speakerCircle}>
              <span className={styles.speakerCore}/>
            </div>
          </div>
          <div className={styles.soundbars} aria-hidden="true">{Array.from({length:21},(_,i)=><span key={i} className={power?styles.playing:''} style={{animationDelay:((i*79)%700)+'ms',height:(10+(i*19%30))+'px'}}/>)}</div>
          <span className={styles.speakerBrand}>N·S / FIELD RECEIVER</span>
        </div>
      </div>

      <div className={styles.controls}>
        <button type="button" disabled={captureActive} onClick={togglePower} className={power?styles.powerOn:styles.powerOff} aria-pressed={power}>
          <span className={styles.powerDot}/>{power?'COUPER LA RADIO':'ALLUMER LA RADIO'}
        </button>
        <label className={styles.volume}>VOLUME <input aria-label="Volume de la radio d'ambiance" type="range" min="0" max="100" value={volume} onChange={e=>setVolume(Number(e.target.value))}/><b>{volume}%</b></label>
        <button type="button" className={styles.nextNight} onClick={()=>{setNight(n=>n+1);setElapsed(0);}} title="Change l'ambiance locale, pas les bunkers actifs du serveur">↻ Autre nuit</button>
      </div>
    </div>
    <div className={styles.scenes}>
      {SCENES.map((item,index)=><button key={item.roman} type="button" className={scene===index?styles.sceneActive:styles.scene} onClick={()=>setScene(index)} aria-pressed={scene===index}>
        <span className={styles.roman}>{item.roman}</span><span className={styles.sceneName}>{item.name}</span><small>{item.desc}</small>
      </button>)}
    </div>
    <p className={styles.status} role="status">{error||'Ambiance '+preset.roman+' — '+preset.name+' · '+(power?'son original synthétisé en local':'prête à l’écoute')}.</p>
    <p className={styles.disclaimer}><strong>À ne pas confondre :</strong> cette radio diffuse uniquement une ambiance sonore créée par Extinction++ RSS, pas les codes du serveur. Pour les vrais messages Morse, règle la radio <strong>dans DayZ sur 80,0 MHz</strong> puis active la capture audio plus bas. L’ambiance se coupe automatiquement pendant cette capture.</p>
  </section>;
}

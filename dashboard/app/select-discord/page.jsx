'use client';
import {useEffect,useState} from 'react';
import {useLanguage} from '../../components/LanguageProvider';

export default function Select(){
  const {t}=useLanguage();
  const [guilds,setGuilds]=useState([]),[error,setError]=useState('');
  useEffect(()=>{fetch('/api/workspace',{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error);setGuilds(b.guilds||[])}).catch(e=>setError(e.message))},[]);
  async function select(guildId){
    try{
      const r=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId})});
      const b=await r.json();if(r.ok)location.href='/';else setError(b.error)
    }catch(e){setError(e.message)}
  }
  async function install(guild){
    if(!guild?.inviteUrl)return;
    const popup=window.open('about:blank','extinction-bot-install');
    if(!popup){location.href=guild.inviteUrl;return}
    try{popup.opener=null;popup.location.href=guild.inviteUrl}catch{}
    const started=Date.now();
    const timer=setInterval(async()=>{
      if(Date.now()-started>120000){clearInterval(timer);return}
      try{
        const r=await fetch('/api/workspace',{cache:'no-store'}),b=await r.json();
        const ready=(b.guilds||[]).find(g=>String(g.id)===String(guild.id)&&g.installed!==false);
        if(!ready)return;
        clearInterval(timer);
        await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId:guild.id})});
        try{popup.location.href=location.origin+'/?installedGuild='+encodeURIComponent(guild.id)}catch{}
        location.href='/';
      }catch{}
    },1500);
  }
  const installed=guilds.filter(g=>g.installed),available=guilds.filter(g=>!g.installed);
  return <main className="p-6 max-w-2xl mx-auto space-y-5">
    <h1 className="text-3xl font-black">{t('Changer de Discord')}</h1>
    <p className="text-white/70">{t('Tes Discord où tu es propriétaire ou administrateur apparaissent ici. Tu peux gérer ceux où le bot est installé et inviter le bot sur les autres.')}</p>
    {error&&<p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-red-200">{error}</p>}
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{t('Discord avec EXTINCTION ++ RSS')}</h2>
      {installed.map(g=><button key={g.id} className="btn btn-primary flex w-full items-center gap-3" onClick={()=>select(g.id)}>
        {g.icon?<img src={g.icon} alt="" className="h-10 w-10 rounded-full"/>:<span className="h-10 w-10 rounded-full bg-white/10 grid place-items-center">{g.name?.[0]||'?'}</span>}
        <span className="flex-1 text-left">{g.name}</span><span>{t('Gérer')} →</span>
      </button>)}
      {!installed.length&&!error&&<p className="text-white/60">{t('Aucun Discord installé pour le moment.')}</p>}
    </section>
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{t('Inviter le bot sur un de tes Discord')}</h2>
      {available.map(g=><button key={g.id} type="button" className="btn flex w-full items-center gap-3 opacity-50 grayscale-[0.65] hover:opacity-85 hover:grayscale-0 transition" onClick={()=>install(g)}>
        {g.icon?<img src={g.icon} alt="" className="h-10 w-10 rounded-full opacity-80"/>:<span className="h-10 w-10 rounded-full bg-white/10 grid place-items-center">{g.name?.[0]||'?'}</span>}
        <span className="flex-1 text-left"><strong>{g.name}</strong><span className="block text-sm opacity-70">Bot non installé</span></span>
        <span>＋ {t('Inviter EXTINCTION ++ RSS')}</span>
      </button>)}
      {!available.length&&!error&&<p className="text-white/60">{t('Tous les Discord que tu peux gérer ont déjà le bot, ou aucun autre Discord n’est disponible.')}</p>}
    </section>
    <a className="underline text-white/70" href="/api/mod-auth/login">↻ {t('Reconnexion Discord')}</a>
  </main>
}
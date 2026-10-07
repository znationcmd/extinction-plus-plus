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
      {available.map(g=><a key={g.id} className="btn block w-full" href={g.inviteUrl||'#'} target="_blank" rel="noopener noreferrer">
        ＋ {g.name} <span className="opacity-70">— {t('Inviter EXTINCTION ++ RSS')}</span>
      </a>)}
      {!available.length&&!error&&<p className="text-white/60">{t('Tous les Discord que tu peux gérer ont déjà le bot, ou aucun autre Discord n’est disponible.')}</p>}
    </section>
    <a className="underline text-white/70" href="/api/mod-auth/login">↻ {t('Reconnexion Discord')}</a>
  </main>
}
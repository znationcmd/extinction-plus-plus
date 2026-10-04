'use client';
import {useEffect,useState} from 'react';
import Shell from '../../components/Shell';
const MAX=5*1024*1024;
export default function Page() {
  const [guilds,setGuilds]=useState([]),[guildId,setGuildId]=useState(''),[file,setFile]=useState(null),[result,setResult]=useState(null),[error,setError]=useState(''),[pending,setPending]=useState(false),[login,setLogin]=useState(false);
  useEffect(()=>{fetch('/api/dayz-mods',{cache:'no-store'}).then(async res=>{const data=await res.json();if(!res.ok){setLogin(res.status===401);throw new Error(data.error);}setGuilds(data.guilds);}).catch(e=>setError(e.message));},[]);
  async function validate() {
    setResult(null);setError('');setPending(true);
    try {
      if(!file || !guildId)throw new Error('Choisis ton Discord et un fichier.');
      if(file.size>MAX)throw new Error('Taille maximale : 5 Mo.');
      if(!/\.(json|xml)$/i.test(file.name))throw new Error('Choisis un fichier .json ou .xml.');
      let content;
      try {content=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());} catch {throw new Error('Enregistre le fichier en UTF-8 puis réessaie.');}
      const res=await fetch('/api/file-validator',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId,filename:file.name,content})});
      const data=await res.json();if(!res.ok){if(res.status===401)setLogin(true);throw new Error(data.error);}setResult(data);
    }catch(e){setError(e.message);}finally{setPending(false);}
  }
  return <Shell>
    <h2 className="mb-4 text-4xl font-black">Validateur JSON / XML</h2>
    <p className="mb-6 text-white/70">Vérifie un fichier avant de l’installer sur ton serveur. Les erreurs indiquent leur ligne et leur colonne. Réservé au propriétaire et aux rôles Fondateur autorisés dans « Mods DayZ PC ».</p>
    {login ? <a className="btn inline-block bg-purple-600" href="/api/mod-auth/login">Connexion Discord</a> : <div className="card space-y-5">
      <label className="block">Ton Discord<select className="input mt-2" value={guildId} onChange={e=>{setGuildId(e.target.value);setResult(null);}}><option value="">Choisir un Discord</option>{guilds.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <label className="block">Fichier .json ou .xml — 5 Mo maximum<input className="mt-2 block w-full rounded-xl bg-white/10 p-4" type="file" accept=".json,.xml,application/json,application/xml,text/xml" onChange={e=>{setFile(e.target.files?.[0] || null);setResult(null);setError('');}}/></label>
      <button className="btn bg-purple-600 disabled:opacity-40" onClick={validate} disabled={pending || !guildId || !file}>{pending ? 'Vérification…' : 'Valider le fichier'}</button>
      <p className="text-sm text-white/60">Le fichier est analysé sans être enregistré ni envoyé sur Nitrado. La syntaxe est vérifiée pour tous les JSON/XML ; les XML avec une racine types ou events reçoivent aussi des contrôles DayZ. Cela ne garantit pas la compatibilité avec chaque mod.</p>
    </div>}
    {error && <div role="alert" className="card mt-6 text-amber-200">{error}</div>}
    {result && <section className="card mt-6 space-y-4" aria-live="polite"><h3 className="text-2xl font-black">{result.valid ? '✅ Syntaxe valide' : '❌ Erreur de syntaxe'}</h3><p>{file?.name} · {result.format}</p>{result.valid ? <p>{result.message}</p> : <><p>Ligne {result.line}, colonne {result.column}</p><pre className="whitespace-pre-wrap break-words rounded-xl bg-red-600/10 p-4">{result.error}</pre></>}{!!result.warnings.length && <><h4 className="font-bold text-amber-200">Points à vérifier ({result.warnings.length}{result.warnings.length===100 ? ', liste limitée à 100' : ''})</h4><ul className="list-disc space-y-2 pl-5">{result.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></>}</section>}
  </Shell>;
}

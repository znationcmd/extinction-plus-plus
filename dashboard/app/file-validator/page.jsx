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
      if(!/\.(json|xml|ini)$/i.test(file.name))throw new Error('Choisis un fichier .json, .xml ou .ini.');
      let content;
      try {content=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());} catch {throw new Error('Enregistre le fichier en UTF-8 puis réessaie.');}
      const res=await fetch('/api/file-validator',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId,filename:file.name,content})});
      const data=await res.json();if(!res.ok){if(res.status===401)setLogin(true);throw new Error(data.error);}setResult(data);
    }catch(e){setError(e.message);}finally{setPending(false);}
  }
  function downloadCorrection(){
    if(!result?.correctedContent||!file)return;
    const blob=new Blob([result.correctedContent],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    const dot=file.name.lastIndexOf('.'),base=dot>0?file.name.slice(0,dot):file.name,ext=dot>0?file.name.slice(dot):'';
    a.href=url;a.download=base+'.corrige'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <Shell>
    <h2 className="mb-4 text-4xl font-black">Validateur & correcteur de fichiers</h2>
    <p className="mb-6 text-white/70">JSON, XML et INI. Le bot analyse le fichier et propose une correction uniquement lorsqu’elle peut être appliquée sans inventer de configuration.</p>
    {login ? <a className="btn inline-block bg-purple-600" href="/api/mod-auth/login">Connexion Discord</a> : <div className="card space-y-5">
      <label className="block">Ton Discord<select className="input mt-2" value={guildId} onChange={e=>{setGuildId(e.target.value);setResult(null);}}><option value="">Choisir un Discord</option>{guilds.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <label className="block">Fichier .json, .xml ou .ini — 5 Mo maximum<input className="mt-2 block w-full rounded-xl bg-white/10 p-4" type="file" accept=".json,.xml,.ini,application/json,application/xml,text/xml,text/plain" onChange={e=>{setFile(e.target.files?.[0] || null);setResult(null);setError('');}}/></label>
      <button className="btn bg-purple-600 disabled:opacity-40" onClick={validate} disabled={pending || !guildId || !file}>{pending ? 'Analyse…' : 'Analyser et chercher une correction'}</button>
      <p className="text-sm text-white/60">Corrections sûres : BOM/encodage texte, fins de ligne, commentaires et virgules finales JSON, esperluettes XML non échappées, normalisation INI. Les valeurs métier ne sont jamais inventées.</p>
    </div>}
    {error && <div role="alert" className="card mt-6 text-amber-200">{error}</div>}
    {result && <section className="card mt-6 space-y-4" aria-live="polite">
      <h3 className="text-2xl font-black">{result.valid ? '✅ Fichier valide' : result.correctable ? '🛠 Correction disponible' : '❌ Erreur à corriger manuellement'}</h3>
      <p>{file?.name} · {result.format}</p>
      {result.message&&<p>{result.message}</p>}
      {!result.valid&&result.error&&<><p>Ligne {result.line||'?'}{result.column ? ', colonne '+result.column : ''}</p><pre className="whitespace-pre-wrap break-words rounded-xl bg-red-600/10 p-4">{result.error}</pre></>}
      {!!result.fixes?.length&&<><h4 className="font-bold text-emerald-200">Corrections proposées</h4><ul className="list-disc space-y-2 pl-5">{result.fixes.map((w,i)=><li key={i}>{w}</li>)}</ul></>}
      {result.correctable&&<button className="btn bg-emerald-600" onClick={downloadCorrection}>Télécharger le fichier corrigé</button>}
      {!!result.warnings?.length&&<><h4 className="font-bold text-amber-200">Points à vérifier ({result.warnings.length}{result.warnings.length===100 ? ', liste limitée à 100' : ''})</h4><ul className="list-disc space-y-2 pl-5">{result.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></>}
    </section>}
  </Shell>;
}

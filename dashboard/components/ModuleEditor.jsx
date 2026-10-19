'use client';
import {useEffect,useState} from 'react';
const gameNames={dayz_pc:'DayZ PC',dayz_ps:'DayZ PlayStation',dayz_xbox:'DayZ Xbox',ark:'ARK',arma:'Arma Reforger',palworld:'Palworld',conan:'Conan Exiles','7dtd':'7 Days to Die',aniimo:'Aniimo',rust:'Rust'};
export default function ModuleEditor({endpoint,title='Gestion',fields,readKey,listKey,allowDelete=true,basicFields=null}) {
  const [items,setItems]=useState([]),[form,setForm]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  const [discordChoices,setDiscordChoices]=useState(null),[discordError,setDiscordError]=useState(''),[discordBusy,setDiscordBusy]=useState(false);
  const choiceKind=f=>{
    if(f.type==='discord-channel'||/^(?:channelId|[a-zA-Z]*ChannelId|[a-z_]*channel_id)$/.test(f.name))return 'channel';
    if(f.type==='discord-roles'||f.name==='roleIds'||/roleIds$/i.test(f.name))return 'roles';
    if(f.type==='discord-role'||/^(?:roleId|[a-zA-Z]*RoleId|[a-z_]*role_id)$/.test(f.name))return 'role';
    return '';
  };
  const needsDiscord=fields.some(f=>Boolean(choiceKind(f)));
  async function loadDiscord(){
    setDiscordBusy(true);setDiscordError('');
    try{
      const r=await fetch('/api/discord-resources',{cache:'no-store',credentials:'same-origin'});
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||'Catalogue Discord indisponible.');
      if(!Array.isArray(data.channels)||!Array.isArray(data.roles))throw new Error('Catalogue Discord invalide.');
      setDiscordChoices(data);
    }catch(e){setDiscordChoices(null);setDiscordError(e.message||'Connexion Discord indisponible.')}
    finally{setDiscordBusy(false)}
  }
  async function load(){const r=await fetch(endpoint,{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error||'Chargement impossible.');const values=readKey?d[readKey]:d;setItems(Array.isArray(values)?values:[]);setLoaded(true);}
  useEffect(()=>{setLoaded(false);setError('');setForm({});load().catch(e=>setError(e.message));if(needsDiscord){setDiscordChoices(null);loadDiscord()}},[endpoint]);
  async function save(event,remove=false){event.preventDefault();setBusy(true);setError('');try{const body={...form};for(const f of fields){if(['number','integer','numberSigned'].includes(f.type)&&body[f.name]!==undefined&&body[f.name]!=='')body[f.name]=Number(body[f.name]);if(f.type==='boolean'&&body[f.name]===undefined)body[f.name]=f.defaultValue??(f.name==='enabled');if(f.type==='strings'&&typeof body[f.name]==='string')body[f.name]=body[f.name].split(',').map(x=>x.trim()).filter(Boolean);}if(listKey)body.collection=listKey;const r=await fetch(endpoint,{method:remove?'DELETE':form.id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.error||'Enregistrement impossible.');setForm({});await load();if(endpoint==='/api/servers')window.dispatchEvent(new Event('servers-updated'));setError(remove?'Élément supprimé.':'Enregistré.');}catch(e){setError(e.message)}finally{setBusy(false)}}
  const renderField=f=>{
    const kind=choiceKind(f),value=form[f.name];
    const change=next=>setForm(prev=>({...prev,[f.name]:next}));
    if(kind){
      const choices=kind==='channel'?(discordChoices?.channels||[]):(discordChoices?.roles||[]);
      const selection=kind==='roles'?(Array.isArray(value)?value:typeof value==='string'?value.split(',').map(v=>v.trim()).filter(Boolean):[]):[];
      const allowed=kind==='channel'?
        choices.filter(c=>(f.allowVoice||f.name==='voiceChannelId'?[2,13]:[0,5]).includes(c.type)):
        choices;
      if(kind==='roles'){
        return <fieldset key={f.name} className="sm:col-span-2 space-y-2 rounded-xl border border-white/20 bg-white/[.035] p-4">
          <legend className="px-2 font-semibold">{f.label}</legend>
          <p className="text-sm text-white/60">Choisis directement les rôles de ce Discord. Tu peux en sélectionner plusieurs.</p>
          <div className="grid gap-2 sm:grid-cols-2 max-h-64 overflow-auto">
            {allowed.map(role=><label key={role.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-2">
              <input aria-label={role.name} type="checkbox" disabled={!discordChoices||busy}
                checked={selection.includes(role.id)}
                onChange={event=>change(event.target.checked?[...new Set([...selection,role.id])]:selection.filter(id=>id!==role.id))}/>
              <span className="min-w-0 break-words">{role.name}</span>
              {role.managed&&<small className="text-amber-200/80">Rôle géré</small>}
            </label>)}
            {selection.filter(id=>!allowed.some(r=>r.id===id)).map(id=><label key={id} className="rounded-lg border border-amber-300/40 p-2 text-amber-200">
              Ancien rôle conservé (indisponible sur ce Discord)
              <button type="button" className="ml-2 underline" onClick={()=>change(selection.filter(x=>x!==id))} disabled={busy}>Retirer</button>
            </label>)}
          </div>
          {!discordChoices&&<p className="text-sm text-amber-200">Liste des rôles indisponible. Les valeurs déjà enregistrées sont conservées.</p>}
          {discordChoices&&allowed.length===0&&<p className="text-sm text-white/60">Aucun rôle disponible sur ce Discord.</p>}
        </fieldset>;
      }
      const current=String(value??'');
      return <label key={f.name} className="block">{f.label}
        <select className="input mt-2" value={current} disabled={!discordChoices||busy}
          required={f.required} onChange={event=>change(event.target.value)}>
          <option value="">— Aucun {kind==='channel'?'salon':'rôle'} —</option>
          {current&&!allowed.some(item=>item.id===current)&&<option value={current}>Choix enregistré (introuvable sur ce Discord)</option>}
          {allowed.map(item=><option key={item.id} value={item.id}>
            {kind==='channel'?(item.type===4?'📁 ':item.type===2?'🔊 ':'# '):'@ '}{item.name}
          </option>)}
        </select>
        {!discordChoices&&<small className="mt-1 block text-amber-200">Catalogue indisponible : la valeur actuelle sera conservée.</small>}
      </label>;
    }
    return <label key={f.name} className="block">{f.label}{f.type==='boolean'?<input type="checkbox" className="ml-3" checked={value??f.defaultValue??(f.name==='enabled')} onChange={e=>change(e.target.checked)}/>:f.name==='game'||f.options?<select className="input mt-2" value={value||''} required={f.required} onChange={e=>change(e.target.value)}><option value="">Choisir</option>{Object.entries(f.name==='game'?gameNames:f.options).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>:<input className="input mt-2" required={f.required} type={f.type==='password'?'password':['number','integer','numberSigned'].includes(f.type)?'number':'text'} min={f.type==='numberSigned'?undefined:['number','integer'].includes(f.type)?0:undefined} step={['number','numberSigned'].includes(f.type)?'any':undefined} maxLength={4000} value={Array.isArray(value)?value.join(', '):value??''} onChange={e=>change(e.target.value)}/>}</label>;
  };
  return <section id={basicFields?'server-editor':undefined} className="card my-6 space-y-4"><h3 className="text-2xl font-black">{title}</h3>{needsDiscord&&<div className="rounded-xl border border-violet-300/30 bg-violet-400/10 p-3 space-y-2">
  <div className="flex items-center justify-between gap-3 flex-wrap">
    <p className="text-sm">{discordChoices?'Salons et rôles du Discord sélectionné':discordBusy?'Chargement des salons et des rôles…':'Liste Discord non chargée'}</p>
    <button className="btn bg-white/10" type="button" disabled={discordBusy} onClick={loadDiscord}>Actualiser Discord</button>
  </div>
  {discordError&&<p role="alert" className="text-sm text-amber-200">{discordError} · Tes choix précédents ne seront pas effacés.</p>}
</div>}{error&&<p role="status">{error}</p>}{!loaded&&<button type="button" disabled={busy} className="btn bg-white/10" onClick={()=>load().catch(e=>setError(e.message))}>Réessayer le chargement</button>}<form onSubmit={save} className="grid gap-4 sm:grid-cols-2">{fields.filter(f=>!basicFields||basicFields.includes(f.name)).map(renderField)}{basicFields&&<details className="sm:col-span-2 rounded-2xl border border-white/20 p-4"><summary className="cursor-pointer font-bold">Connexion et réglages avancés</summary><p className="my-3 text-white/70">Renseigne uniquement les accès nécessaires aux modules choisis. Un champ secret vide conserve le secret enregistré.</p><div className="grid gap-4 sm:grid-cols-2">{fields.filter(f=>!basicFields.includes(f.name)).map(renderField)}</div></details>}<div className="sm:col-span-2 flex gap-3"><button className="btn btn-primary" disabled={busy||!loaded}>{busy?'En cours…':form.id?'Enregistrer les modifications':'Ajouter'}</button>{form.id&&<button type="button" className="btn bg-white/10" onClick={()=>setForm({})}>Annuler</button>}{form.id&&allowDelete&&<button type="button" className="btn bg-red-700" disabled={busy} onClick={e=>save(e,true)}>Supprimer</button>}</div></form><div className="space-y-3">{items.map(item=><div key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-black/30 p-3"><div><b>{item.name||item.title||item.subject||item.player||item.itemName||item.code||item.id}</b><p className="text-sm text-white/60">{gameNames[item.game]||''} {item.server||item.serverId||''} {item.status||''} {item.amount!==undefined?`• ${item.amount}`:''} {item.treasury!==undefined?`• Trésorerie ${item.treasury}`:''}</p>{item.error&&<p className="text-amber-300 text-sm">{item.error}</p>}</div><button className="btn bg-white/10" onClick={()=>{setForm({...item});setError('')}}>Modifier</button></div>)}</div></section>;
}

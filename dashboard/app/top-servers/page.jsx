'use client';
import {useEffect,useState} from 'react';
import Shell from '../../components/Shell';

export default function TopServersPage(){
 const [data,setData]=useState({servers:[],canAdd:false}),[msg,setMsg]=useState(''),[form,setForm]=useState({name:'',game:'DayZ',address:'',discord_url:'',website:'',image_url:'',description:''});
 async function load(){const r=await fetch('/api/top-servers',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error||'Chargement impossible.');setData(d);}
 useEffect(()=>{load().catch(e=>setMsg(e.message))},[]);
 async function post(body){const r=await fetch('/api/top-servers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.error||'Opération impossible.');return d;}
 async function vote(id){try{const d=await post({action:'vote',id});setMsg(d.accepted?'Vote enregistré.':'Tu as déjà voté aujourd’hui.');await load();}catch(e){setMsg(e.message)}}
 async function add(e){e.preventDefault();try{await post(form);setMsg('Serveur ajouté au Top Serveurs.');setForm({name:'',game:'DayZ',address:'',discord_url:'',website:'',image_url:'',description:''});await load();}catch(err){setMsg(err.message)}}
 return <Shell>
  <div className="mb-6"><p className="text-sm font-bold uppercase tracking-[.25em] text-purple-300">Réseau commun</p><h2 className="text-4xl font-black">Top Serveurs</h2><p className="mt-2 text-white/60">Classement partagé entre EXTINCTION ++ RSS, DAYZ GATE et BOT ARK.</p></div>
  {msg&&<div className="card mb-5">{msg}</div>}
  {data.canAdd&&<form onSubmit={add} className="card mb-6 grid gap-3 md:grid-cols-2"><h3 className="text-2xl font-black md:col-span-2">Ajouter un serveur</h3>{['name','game','address','discord_url','website','image_url'].map(k=><input key={k} className="input" required={k==='name'||k==='game'} placeholder={({name:'Nom du serveur',game:'Jeu',address:'Adresse / IP',discord_url:'Lien Discord',website:'Site web',image_url:'Image'})[k]} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>)}<textarea className="input md:col-span-2" placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><button className="btn btn-primary md:col-span-2">Ajouter au classement</button></form>}
  <div className="grid gap-5 lg:grid-cols-2">{data.servers.map((s,i)=><article key={s.id} className="card space-y-3"><p className="text-purple-300 font-bold">#{i+1} · {s.game}</p><h3 className="text-2xl font-black">{s.name}</h3><p className="text-white/60">{s.description||s.address||'Serveur communautaire'}</p><p><b>{s.votes_24h||0}</b> votes / 24h · <b>{s.votes||0}</b> total</p><div className="flex flex-wrap gap-2"><button className="btn bg-red-600" onClick={()=>vote(s.id)}>Voter</button>{s.discord_url&&<a className="btn bg-white/10" href={s.discord_url} target="_blank" rel="noopener noreferrer">Discord ↗</a>}{s.website&&<a className="btn bg-white/10" href={s.website} target="_blank" rel="noopener noreferrer">Site ↗</a>}</div></article>)}</div>
 </Shell>;
}

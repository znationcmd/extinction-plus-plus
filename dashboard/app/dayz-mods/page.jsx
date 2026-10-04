'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';

const date = value => value ? new Date(value).toLocaleString('fr-FR') : 'Jamais';
async function api(url, body) {
  const res = await fetch(url, body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {cache:'no-store'});
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'Erreur de connexion.'), {status:res.status});
  return data;
}
function Server({server, jobs, guildId, reload, owner}) {
  const cfg=server.config;
  const [root,setRoot]=useState(cfg.root || '');
  const [text,setText]=useState((cfg.mods || []).map(m=>`${m.id} ${m.folder}`).join('\n'));
  const [channelId,setChannelId]=useState(cfg.channelId || '');
  const [delayMinutes,setDelay]=useState(cfg.delayMinutes ?? 10);
  const [autoUpdate,setAuto]=useState(cfg.autoUpdate || false);
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState('');
  const running=jobs.find(j=>j.server_id===server.id && ['queued','running'].includes(j.status));
  const online=server.heartbeat && Date.now()-new Date(server.heartbeat).getTime()<90000;
  const ready=online && server.state.workerReady;
  async function action(action) {
    if(action==='update' && !window.confirm(`Mettre à jour les mods de ${server.name} ? Si le serveur est démarré, il sera arrêté après un avertissement de ${cfg.delayMinutes ?? 10} minutes, puis redémarré.`)) return;
    if(action==='recover' && !window.confirm('As-tu vérifié dans Nitrado les dossiers de mods, les clés et les sauvegardes .extinction-mods après l’interruption ? Cette confirmation autorise de nouvelles mises à jour.')) return;
    setPending(true);setMessage('');
    try {
      const config={root,channelId,delayMinutes:Number(delayMinutes),autoUpdate,mods:text.split('\n').filter(x=>x.trim()).map(line=>{const [id,folder,...extra]=line.trim().split(/\s+/);if(extra.length) throw new Error('Une ligne = ID Workshop et dossier @NomDuMod.');return {id,folder};})};
      await api('/api/dayz-mods',{guildId,serverId:server.id,action,config});
      setMessage(action==='save' ? 'Configuration enregistrée.' : action==='check' ? 'Vérification demandée au bot.' : action==='recover' ? 'Vérification manuelle confirmée.' : 'Mise à jour en attente. Suis sa progression ci-dessous.');
      await reload();
    } catch(e) {setMessage(e.message);} finally {setPending(false);}
  }
  return <article className="card space-y-5">
    <div><h3 className="text-2xl font-black">{server.name}</h3><p className="text-sm text-white/60">Service Nitrado {server.service_id} · {online ? 'Bot connecté' : 'Bot hors ligne'}</p></div>
    {!ready && <p className="rounded-xl bg-amber-500/20 p-3">{server.state.workerIssue || 'SteamCMD et le compte Steam doivent être configurés sur le bot pour installer les mods.'}</p>}
    {server.state.recoveryRequired && <div className="rounded-xl bg-red-500/20 p-3"><p>Une opération a été interrompue ou le démarrage a échoué. Le propriétaire doit vérifier le serveur et les sauvegardes FTP avant de reprendre.</p>{owner && <button className="btn mt-3 bg-white/10" disabled={pending || !!running} onClick={()=>action('recover')}>J’ai vérifié le serveur sur Nitrado</button>}</div>}
    <div className="grid gap-4 md:grid-cols-2">
      <label>Racine DayZ dans le FTP<input className="input mt-2" placeholder="/chemin/exact/du/serveur" value={root} onChange={e=>setRoot(e.target.value)} disabled={!!running}/></label>
      <label>Salon Discord pour les avertissements<input className="input mt-2" placeholder="ID du salon du même Discord" value={channelId} onChange={e=>setChannelId(e.target.value)} disabled={!!running}/></label>
      <label>Délai avant arrêt (minutes)<input className="input mt-2" type="number" min="0" max="60" value={delayMinutes} onChange={e=>setDelay(e.target.value)} disabled={!!running}/></label>
      <label className="flex items-center gap-3"><input type="checkbox" checked={autoUpdate} onChange={e=>setAuto(e.target.checked)} disabled={!!running}/>Mises à jour automatiques</label>
    </div>
    <label className="block">Mods : une ligne par ID Workshop et dossier déjà activé dans Nitrado<textarea className="input mt-2 min-h-32 font-mono" placeholder={'1559212036 @CF\n1828439124 @VPPAdminTools'} value={text} onChange={e=>setText(e.target.value)} disabled={!!running}/></label>
    <p className="text-sm text-white/60">Enregistre avant de lancer une mise à jour. Le nom du dossier doit correspondre à « Additional Mods » dans Nitrado. Les clés .bikey sont copiées automatiquement. Un serveur déjà arrêté reste arrêté.</p>
    <div className="flex flex-wrap gap-3">
      <button className="btn bg-white/10 disabled:opacity-40" disabled={pending || !!running} onClick={()=>action('save')}>Enregistrer</button>
      <button className="btn bg-white/10 disabled:opacity-40" disabled={pending || !online || !cfg.mods?.length} onClick={()=>action('check')}>Vérifier les mises à jour</button>
      <button className="btn bg-purple-600 disabled:opacity-40" disabled={pending || !!running || !ready || server.state.recoveryRequired || !cfg.mods?.length} onClick={()=>action('update')}>Mettre à jour tous les mods</button>
    </div>
    {message && <p role="status" className="rounded-xl bg-white/10 p-3">{message}</p>}
    {running && <p role="status" className="rounded-xl bg-amber-500/20 p-3">⏳ {running.phase}</p>}
    {server.state.error && <p className="text-red-300">{server.state.error}</p>}
    <p className="text-sm text-white/60">Dernière vérification : {date(server.state.checkedAt)} · Dernière installation : {date(server.state.lastInstalledAt)}</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Mod</th><th className="p-2">État</th><th className="p-2">Version Workshop</th></tr></thead><tbody>{(server.state.mods || []).filter(m=>cfg.mods?.some(c=>c.id===m.id)).map(m=>{
      const installed=server.state.installed?.[m.id];
      return <tr key={m.id} className="border-t border-white/10"><td className="p-2"><a href={`https://steamcommunity.com/sharedfiles/filedetails/?id=${m.id}`} target="_blank" rel="noreferrer">{m.name}</a><span className="block text-white/40">{m.folder}</span></td><td className="p-2">{!installed ? '⚪ Installation à vérifier' : installed<m.updated ? '🟠 Mise à jour disponible' : '🟢 À jour'}</td><td className="p-2">{date(m.updated*1000)}</td></tr>;
    })}</tbody></table></div>
  </article>;
}
export default function Page() {
  const [account,setAccount]=useState(null);
  const [guildId,setGuildId]=useState('');
  const [data,setData]=useState(null);
  const [roles,setRoles]=useState('');
  const [error,setError]=useState('');
  const [authRequired,setAuth]=useState(false);
  const [rolesMessage,setRolesMessage]=useState('');
  useEffect(()=>{api('/api/dayz-mods').then(setAccount).catch(e=>{setError(e.message);setAuth(e.status===401);});},[]);
  async function reload() {
    const fresh=await api(`/api/dayz-mods?guildId=${encodeURIComponent(guildId)}`);
    setData(fresh);return fresh;
  }
  useEffect(()=>{
    setData(null);setError('');setRolesMessage('');
    if(!guildId) return;
    let active=true;
    const load=async(initial=false)=>{
      try {const fresh=await api(`/api/dayz-mods?guildId=${encodeURIComponent(guildId)}`);if(active){setData(fresh);setError('');if(initial)setRoles(fresh.roleIds.join(', '));}}
      catch(e){if(active){setError(e.message);if(e.status===401)setAuth(true);if([401,403].includes(e.status))setData(null);}}
    };
    load(true);const timer=setInterval(load,15000);return()=>{active=false;clearInterval(timer);};
  },[guildId]);
  async function saveRoles() {
    try {await api('/api/dayz-mods',{action:'roles',guildId,roleIds:roles.split(/[\s,]+/).filter(Boolean)});setRolesMessage('Rôles Fondateur enregistrés.');}
    catch(e){setRolesMessage(e.message);}
  }
  return <Shell>
    <h2 className="mb-4 text-4xl font-black">🧩 Mods DayZ PC</h2>
    <p className="mb-6 text-white/70">Les fondateurs peuvent vérifier les mods, lancer une mise à jour et suivre son déroulement. La surveillance vérifie Steam toutes les 5 minutes.</p>
    <a href="/file-validator" className="btn mb-6 inline-block bg-white/10">Valider un fichier JSON / XML</a>
    {(!account || authRequired) && <div className="card"><p className="mb-4">Connecte-toi avec Discord pour accéder à tes serveurs.</p><a href="/api/mod-auth/login" className="btn inline-block bg-purple-600">Connexion Discord</a></div>}
    {account && !authRequired && <div className="card mb-6 space-y-4"><p>Connecté : {account.name}</p><label className="block">Ton Discord<select className="input mt-2" value={guildId} onChange={e=>setGuildId(e.target.value)}><option value="">Choisir un Discord</option>{account.guilds.map(g=><option key={g.id} value={g.id}>{g.name}{g.owner ? ' — propriétaire' : ''}</option>)}</select></label><button className="btn bg-white/10" onClick={async()=>{await api('/api/mod-auth/logout',{});window.location.reload();}}>Déconnexion</button></div>}
    {error && <p role="alert" className="card mb-6 text-amber-200">{error}</p>}
    {data?.owner && <div className="card mb-6 space-y-3"><h3 className="text-xl font-black">Accès des fondateurs</h3><p className="text-white/60">Ajoute les IDs des rôles Discord autorisés, séparés par une virgule. Le propriétaire conserve toujours l’accès.</p><input aria-label="IDs des rôles Fondateur" className="input" value={roles} onChange={e=>setRoles(e.target.value)} placeholder="123456789012345678, 987654321098765432"/><button className="btn bg-white/10" onClick={saveRoles}>Autoriser ces rôles</button>{rolesMessage && <p role="status">{rolesMessage}</p>}</div>}
    {data && <div className="space-y-6">{data.servers.map(s=><Server key={`${guildId}:${s.id}`} server={s} guildId={guildId} jobs={data.jobs} reload={reload} owner={data.owner}/>)}{!data.servers.length && <div className="card">Aucun serveur DayZ PC lié. Connecte Nitrado avec /nitrado connect, puis /nitrado link-server jeu:DayZ PC sur ce Discord. Le bot doit être connecté à la même base PostgreSQL.</div>}</div>}
    {!!data?.jobs.length && <div className="card mt-6"><h3 className="mb-4 text-2xl font-black">Historique des mises à jour</h3><ul className="space-y-3">{data.jobs.map(j=><li key={j.id} className="border-t border-white/10 pt-3"><b>{data.servers.find(s=>s.id===j.server_id)?.name || j.server_id}</b> · {j.status==='succeeded' ? '✅ Terminé' : j.status==='failed' ? '🔴 Échec' : '⏳ En cours'}<p>{j.phase}</p><p className="text-sm text-white/50">{date(j.created_at)} · demandé par {j.actor_id==='automatic' ? 'mise à jour automatique' : j.actor_id}</p></li>)}</ul></div>}
  </Shell>;
}

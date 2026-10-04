'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import hosting from '../../lib/hosting.cjs';

const platforms = ['PC', 'Xbox', 'PlayStation'];
const games = ['dayz_pc','dayz_ps','dayz_xbox','ark','palworld','arma','conan','7dtd','aniimo'];
const maps = ['Chernarus', 'Livonia', 'Sakhal', 'Namalsk', 'Lux', 'Deer Isle', 'Banov', 'Esseker', 'Melkart', 'Alteria', 'Autre'];

function blankServer() {
  return {
    id: '',
    name: '',
    game: 'dayz_pc',
    platform: 'PC',
    map: 'Chernarus',
    nitradoId: '',
    provider:'nitrado',providerName:'',panelUrl:'',
    ip: '',
    port: '',
    image: '',
    shopEnabled: true,
    whitelistEnabled: true,
    battlepassEnabled: true
  };
}

export default function OwnerConfigPage() {
  const [guildId, setGuildId] = useState('');
  const [nitradoToken, setNitradoToken] = useState('');
  const [servers, setServers] = useState([blankServer()]);
  const [saved, setSaved] = useState('');
  const [busy,setBusy]=useState(false);

  async function loadConfig(id = guildId) {
    try {
    const res = await fetch('/api/owner-config');
    const data = await res.json();
    if(!res.ok){setSaved(data.error||'Chargement impossible.');return;}
    setGuildId(data.guildId);
    setNitradoToken('');
    setServers(data.servers?.length ? data.servers : [blankServer()]);
    } catch(e){setSaved(e.message);}
  }

  useEffect(() => { loadConfig(); }, []);

  function updateServer(index, field, value) {
    setServers(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  function addServer() {
    setServers(prev => [...prev, blankServer()]);
  }

  function removeServer(index) {
    setServers(prev => prev.filter((_, i) => i !== index));
  }

  async function save() {
    setBusy(true);
    try {
    setSaved('Sauvegarde...');
    const normalized = servers.map((s, i) => ({
      ...s,
      id: s.id || `${guildId}_${s.map}_${i}_${Date.now()}`
    }));

    const res = await fetch('/api/owner-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, nitradoToken, servers: normalized })
    });

    if (res.ok) {
      setSaved('✅ Configuration enregistrée.');
      const data=await res.json();setServers(data.servers);setNitradoToken('');
    } else {
      const data=await res.json();setSaved(data.error||'Erreur sauvegarde.');
    }
    }catch(e){setSaved(e.message);}finally{setBusy(false);}
  }

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Configuration propriétaire Discord</h2>

      <div className="card mb-6">
        <h3 className="text-2xl font-black">Comme DayZ++</h3>
        <p className="mt-2 text-white/70">
          Chaque propriétaire Discord peut configurer lui-même son token Nitrado,
          ses serveurs, ses maps, ses ID Nitrado, son shop, sa whitelist et son battle pass.
          Tu n’as pas besoin de gérer leurs informations à leur place.
        </p>
      </div>

      <div className="card mb-6 space-y-4">
        <label className="block">
          <span className="mb-2 block font-bold">ID Discord / Guild ID</span>
          <input className="input" value={guildId} readOnly placeholder="ID du Discord du propriétaire" />
        </label>

        <label className="block">
          <span className="mb-2 block font-bold">Token Nitrado du propriétaire</span>
          <input className="input" type="password" value={nitradoToken} onChange={e => setNitradoToken(e.target.value)} placeholder="Token Nitrado personnel du propriétaire" />
          <p className="mt-2 text-sm text-white/50">Le token reste lié à ce Discord et permet ensuite de synchroniser ses propres serveurs.</p>
        </label>
      </div>

      <h3 className="mb-4 text-3xl font-black">Serveurs / Maps</h3>

      <div className="space-y-5">
        {servers.map((s, index) => (
          <div key={index} className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xl font-black">Serveur #{index + 1}</h4>
              <button onClick={() => removeServer(index)} className="btn bg-red-600">Supprimer</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block font-bold">Nom public</span>
                <input className="input" value={s.name} onChange={e => updateServer(index, 'name', e.target.value)} placeholder="Extinction Sakhal Xbox" />
              </label>

              <label>
                <span className="mb-2 block font-bold">ID Nitrado / Service ID</span>
                <select aria-label="Hébergeur" className="input mb-3" value={s.provider||(s.nitradoId?'nitrado':'other')} onChange={e=>updateServer(index,'provider',e.target.value)}>{Object.entries(hosting.providers).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><input aria-label="Nom de l’autre hébergeur" className="input mb-3" value={s.providerName||''} onChange={e=>updateServer(index,'providerName',e.target.value)} placeholder="Nom de l’autre hébergeur"/><input aria-label="Lien du panel hébergeur" type="url" className="input mb-3" value={s.panelUrl||''} onChange={e=>updateServer(index,'panelUrl',e.target.value)} placeholder="https://panel.ton-hebergeur.fr"/><input className="input" value={s.nitradoId} onChange={e => updateServer(index, 'nitradoId', e.target.value)} placeholder="12345678" />
              </label>

              <label>
                <span className="mb-2 block font-bold">Jeu</span>
                <select className="input" value={s.game} onChange={e => updateServer(index, 'game', e.target.value)}>
                  {games.map(g => <option key={g}>{g}</option>)}
                </select>
              </label>

              <label>
                <span className="mb-2 block font-bold">Plateforme</span>
                <select className="input" value={s.platform} onChange={e => updateServer(index, 'platform', e.target.value)}>
                  {platforms.map(p => <option key={p}>{p}</option>)}
                </select>
              </label>

              <label>
                <span className="mb-2 block font-bold">Map</span>
                <select className="input" value={s.map} onChange={e => updateServer(index, 'map', e.target.value)}>
                  {maps.map(m => <option key={m}>{m}</option>)}
                </select>
              </label>

              <label>
                <span className="mb-2 block font-bold">Image / logo serveur</span>
                <input className="input" value={s.image} onChange={e => updateServer(index, 'image', e.target.value)} placeholder="https://..." />
              </label>

              <label>
                <span className="mb-2 block font-bold">IP</span>
                <input className="input" value={s.ip} onChange={e => updateServer(index, 'ip', e.target.value)} placeholder="123.45.67.89" />
              </label>

              <label>
                <span className="mb-2 block font-bold">Port</span>
                <input className="input" value={s.port} onChange={e => updateServer(index, 'port', e.target.value)} placeholder="2302" />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2"><input type="checkbox" checked={s.shopEnabled} onChange={e => updateServer(index, 'shopEnabled', e.target.checked)} /> Shop actif</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={s.whitelistEnabled} onChange={e => updateServer(index, 'whitelistEnabled', e.target.checked)} /> Whitelist active</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={s.battlepassEnabled} onChange={e => updateServer(index, 'battlepassEnabled', e.target.checked)} /> Battle Pass actif</label>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <p className="text-white/70">Tous les hébergeurs peuvent être enregistrés. Le contrôle automatique utilise Nitrado ou les accès RCON du jeu ; le lien du panel ouvre les autres hébergeurs.</p>
        <button onClick={addServer} className="btn bg-white/10">+ Ajouter un serveur</button>
        <button disabled={busy} onClick={save} className="btn bg-red-600">Enregistrer</button>
      </div>

      {saved && <div className="card mt-6">{saved}</div>}
    </Shell>
  );
}

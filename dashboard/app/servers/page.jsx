import Shell from '../../components/Shell';
import { readDb, GAME_LABELS } from '../../lib/db';

export default function Servers() {
  const db = readDb();
  const guilds = Object.entries(db.guilds || {}).map(([id, g]) => ({ id, ...g }));
  const ownerConfigs = Object.values(db.ownerConfigs || {});
  const ownerServers = ownerConfigs.flatMap((cfg) => (cfg.servers || []).map((s) => ({ ...s, guildId: cfg.guildId, ownerManaged: true })));

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Serveurs</h2>

      <div className="card mb-6">
        <h3 className="text-2xl font-black">Ajouter un serveur</h3>
        <p className="mt-2 text-white/70">Depuis Discord : /serveur ajouter jeu: DayZ PlayStation nom: Mon serveur map: Sakhal plateforme: PlayStation nitrado_id: 123456</p>
        <p className="mt-2 text-white/70">Depuis le dashboard : utilise Config propriétaires.</p>
      </div>

      <h3 className="mb-4 text-3xl font-black">Serveurs propriétaires</h3>
      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ownerServers.map((s) => (
          <div key={s.id || `${s.guildId}-${s.name}`} className="card">
            {s.image && <img src={s.image} alt={s.name} className="mb-4 h-36 w-full rounded-2xl object-cover" />}
            <h4 className="text-xl font-black">{s.name || 'Serveur sans nom'}</h4>
            <p className="text-white/70">{s.game || 'Jeu'} — {s.platform || 'Plateforme'}</p>
            <p>Map : {s.map || '—'}</p>
            <p>ID Nitrado : {s.nitradoId || '—'}</p>
            <p>IP/Port : {s.ip || '—'} {s.port ? `:${s.port}` : ''}</p>
            <p>Shop : {s.shopEnabled ? '🟢' : '🔴'} / Whitelist : {s.whitelistEnabled ? '🟢' : '🔴'} / Battle Pass : {s.battlepassEnabled ? '🟢' : '🔴'}</p>
          </div>
        ))}
        {!ownerServers.length && <div className="card md:col-span-2 xl:col-span-3">Aucun serveur propriétaire configuré.</div>}
      </div>

      <h3 className="mb-4 text-3xl font-black">Discords configurés</h3>
      <div className="grid gap-5">
        {guilds.map(g => (
          <div className="card" key={g.id}>
            <h3 className="text-2xl font-black">{g.name || `Discord ${g.id}`}</h3>
            <p className="text-white/60">{(g.servers || []).length} serveur(s)</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(g.servers || []).map(s => (
                <div className="rounded-2xl bg-black/30 p-4" key={s.id}>
                  <p className="font-bold">{s.name}</p>
                  <p>{GAME_LABELS[s.game] || s.game} — {s.map}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!guilds.length && <div className="card">Aucun Discord configuré. Lance /setup ou /ownerconfig.</div>}
      </div>
    </Shell>
  );
}

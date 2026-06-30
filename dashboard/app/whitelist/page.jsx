import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default function WhitelistPage() {
  const db = readDb();
  const requests = db.pendingWhitelist || [];
  const guilds = db.guilds || {};
  const ownerServers = Object.values(db.ownerConfigs || {}).flatMap(cfg => (cfg.servers || []).map(s => ({...s, guildId: cfg.guildId})));

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Whitelist</h2>

      <div className="grid gap-5">
        <div className="card">
          <h3 className="mb-3 text-2xl font-black">Panneaux Whitelist par serveur</h3>
          <p className="text-white/70">Crée un bouton whitelist depuis Discord avec :</p>
          <div className="mt-4 rounded-2xl bg-black/40 p-4 font-mono text-sm">/whitelist-panel serveur: namalsk map: namalsk salon: #whitelist-namalsk</div>
        </div>

        <div className="card">
          <h3 className="mb-4 text-2xl font-black">Demandes en attente</h3>
          {!requests.length && <p className="text-white/60">Aucune demande whitelist pour le moment.</p>}
          <div className="grid gap-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="font-bold">{guilds[r.guildId]?.name || r.guildId}</p>
                <p>Joueur Discord : {r.userId}</p>
                <p>Serveur : {r.server}</p>
                <p>Map : {r.map}</p>
                <p>Plateforme : {r.plateforme}</p>
                <p>Pseudo / ID : {r.pseudo}</p>
                <p className="text-white/50">Date : {r.createdAt}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 text-2xl font-black">Serveurs avec whitelist</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ownerServers.filter(s => s.whitelistEnabled).map((s) => (
              <div key={s.id || s.name} className="rounded-2xl bg-black/30 p-4">
                <p className="font-bold">{s.name}</p>
                <p>{s.game} — {s.platform}</p>
                <p>Map : {s.map}</p>
                <p>Guild : {s.guildId}</p>
              </div>
            ))}
            {!ownerServers.filter(s => s.whitelistEnabled).length && <p className="text-white/60">Aucun serveur whitelist configuré.</p>}
          </div>
        </div>
      </div>
    </Shell>
  );
}

import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default function Page() {
  const db = readDb();
  const items = Array.isArray(db.interpol) ? db.interpol : [];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Interpol communautaire</h2>

      <div className="card mb-6">
        <p className="text-white/70">Signalements joueurs entre serveurs avec validation admin.</p>
        <div className="mt-4 rounded-2xl bg-black/40 p-4 font-mono text-sm">/interpol signaler joueur: pseudo raison: grief</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id || item.name || JSON.stringify(item)} className="card">
            <h3 className="text-xl font-black">{item.title || item.name || item.player || item.itemName || item.label || 'Entrée'}</h3>
            <div className="mt-3 space-y-1 text-white/70">
              <p>Joueur : {item.player || '—'}</p>
<p>Raison : {item.reason || '—'}</p>
<p>Discord : {item.guildId || '—'}</p>
<p>Signalé par : {item.reporter || '—'}</p>
              {item.createdAt && <p>Date : {item.createdAt}</p>}
              {item.status && <p>Statut : {item.status}</p>}
            </div>
          </div>
        ))}

        {!items.length && (
          <div className="card md:col-span-2 xl:col-span-3">
            <p>Aucune donnée pour le moment.</p>
            <p className="mt-2 text-white/60">Configure le module depuis Discord ou depuis Config propriétaires.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}

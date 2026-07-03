import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default function Page() {
  const db = readDb();
  const items = Array.isArray(db.leaderboard) ? db.leaderboard : [];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Classements</h2>

      <div className="card mb-6">
        <p className="text-white/70">Classements killfeed, quêtes, battle pass, économie et activité.</p>
        
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id || item.name || JSON.stringify(item)} className="card">
            <h3 className="text-xl font-black">{item.title || item.name || item.player || item.itemName || item.label || 'Entrée'}</h3>
            <div className="mt-3 space-y-1 text-white/70">
              <p>Joueur : {item.player || '—'}</p>
<p>Score : {item.score || '—'}</p>
<p>Serveur : {item.serverId || '—'}</p>
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

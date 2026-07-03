import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default function Page() {
  const db = readDb();
  const items = Array.isArray(db.deliveries) ? db.deliveries : [];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Livraisons Shop</h2>

      <div className="card mb-6">
        <p className="text-white/70">Commandes en attente de restart, coordonnées carte et historique des achats.</p>
        <div className="mt-4 rounded-2xl bg-black/40 p-4 font-mono text-sm">/shop buy id: ID_ITEM x: 5000 z: 5000</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id || item.name || JSON.stringify(item)} className="card">
            <h3 className="text-xl font-black">{item.title || item.name || item.player || item.itemName || item.label || 'Entrée'}</h3>
            <div className="mt-3 space-y-1 text-white/70">
              <p>Serveur : {item.serverId || '—'}</p>
<p>Map : {item.map || '—'}</p>
<p>Joueur : {item.userId || '—'}</p>
<p>X : {item.x || '—'}</p>
<p>Z : {item.z || '—'}</p>
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

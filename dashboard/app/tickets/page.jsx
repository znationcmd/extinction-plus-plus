import ModuleEditor from '../../components/ModuleEditor';
import Shell from '../../components/Shell';
import { readPageDb as readDb } from '../../lib/db';

export default async function Page() {
  const db = (await readDb());
  const items = Array.isArray(db.tickets) ? db.tickets : [];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Tickets Support</h2>

      <div className="card mb-6">
        <p className="text-white/70">Support joueur, demandes staff, preuves, litiges, achats et whitelist.</p>
        
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id || item.name || JSON.stringify(item)} className="card">
            <h3 className="text-xl font-black">{item.title || item.name || item.player || item.itemName || item.label || 'Entrée'}</h3>
            <div className="mt-3 space-y-1 text-white/70">
              <p>Joueur : {item.userId || '—'}</p>
<p>Catégorie : {item.category || '—'}</p>
<p>Message : {item.message || '—'}</p>
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
    <ModuleEditor endpoint="/api/tickets" fields={[{"name": "subject", "label": "Objet"}, {"name": "userId", "label": "Joueur"}, {"name": "message", "label": "Message"}, {"name": "status", "label": "Statut", "options": {"open": "Ouvert", "closed": "Fermé"}}]} /></Shell>
  );
}

import RestartDeliveries from '../../components/RestartDeliveries';
import ModuleEditor from '../../components/ModuleEditor';
import Shell from '../../components/Shell';
import { readPageDb as readDb } from '../../lib/db';

export default async function Page() {
  const db = (await readDb());
  const items = Array.isArray(db.deliveries) ? db.deliveries : [];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Livraisons Shop</h2><RestartDeliveries/>

      <div className="card mb-6">
        <p className="text-white/70">Commandes, résultats des adaptateurs et confirmations du staff. Une annulation d’achat rembourse la banque une seule fois. Les commandes en cours ne peuvent pas être annulées ; un compte rendu de vérification est requis.</p>
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
<p>X : {item.x ?? '—'}</p>
<p>Altitude Y : {item.y ?? '—'}</p>
<p>Z : {item.z ?? '—'}</p>
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
    <ModuleEditor allowDelete={false} endpoint="/api/deliveries" fields={[{"name": "itemName", "label": "Objet"}, {"name": "userId", "label": "ID joueur"}, {"name": "serverId", "label": "Serveur"}, {name:'reviewNote',label:'Compte rendu du staff : inventaire vérifié, ou absence de livraison pour annuler'},{"name": "status", "label": "Statut", "options": {"awaiting_staff": "À traiter", "delivered": "Livré par le staff", "cancelled": "Annulé"}}]} /></Shell>
  );
}

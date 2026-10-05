import ModerationNetwork from '../../components/ModerationNetwork';
import ModuleEditor from '../../components/ModuleEditor';
import Shell from '../../components/Shell';
import { readPageDb as readDb } from '../../lib/db';

export default async function Page() {
  const db = (await readDb());
  const items = Array.isArray(db.interpol) ? db.interpol : [];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Interpol communautaire</h2>

      <div className="card mb-6">
        <p className="text-white/70">Signalements joueurs entre serveurs avec validation admin.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {['EXTINCTION ++ RSS','DAYZ GATE','BOT ARK'].map(name => <div key={name} className="rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4"><p className="font-black">{name}</p><p className="mt-1 text-xs text-white/60">PARTENAIRE OFFICIEL · INTERPOL CONNECTÉ</p></div>)}
        </div>
        <p className="mt-4 text-sm text-white/60">Réseau Valhalla Extinction : Interpol relie la modération et les partenariats des trois services.</p>
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
    <ModuleEditor endpoint="/api/interpol" fields={[{"name": "player", "label": "Joueur"}, {"name": "reason", "label": "Motif"}, {"name": "status", "label": "Statut", "options": {"pending": "À examiner", "resolved": "Résolu", "dismissed": "Classé"}}]} /><ModerationNetwork/></Shell>
  );
}

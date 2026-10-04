import ReviewPanel from '../../components/ReviewPanel';
import ModuleEditor from '../../components/ModuleEditor';
import Shell from '../../components/Shell';
import { readPageDb as readDb } from '../../lib/db';

export default async function QuestsAdminPage() {
  const db = (await readDb());
  const quests = Array.isArray(db.quests) ? db.quests : [];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Quêtes RSS</h2>
      <div className="card mb-6">Quêtes journalières, hebdomadaires, événements, récompenses, XP, coins et validation admin.</div>
      <div className="grid gap-4 md:grid-cols-3">
        {quests.map(q => (
          <div key={q.id} className="card">
            <h3 className="text-xl font-black">{q.title}</h3>
            <p>Serveur : {q.serverId}</p>
            <p>Type : {q.type}</p>
            <p>Objectif : {q.objective}</p>
            <p>Récompense : {q.reward}</p>
            <p>Statut : {q.enabled === false ? 'Désactivée' : 'Activée'}</p>
          </div>
        ))}
        {!quests.length && <div className="card md:col-span-3">Aucune quête configurée.</div>}
      </div>
    <ModuleEditor endpoint="/api/quests" fields={[{"name": "title", "label": "Titre", "required": true}, {"name": "game", "label": "Jeu"}, {"name": "serverId", "label": "Serveur"}, {"name": "objective", "label": "Objectif"}, {"name": "reward", "label": "Récompense banque", "type": "integer"}, {"name": "xp", "label": "XP", "type": "integer"}, {"name": "type", "label": "Fréquence"}, {"name": "enabled", "label": "Activée", "type": "boolean"}]} /><ReviewPanel endpoint="/api/quest-proofs" idKey="proofId" title="Valider les preuves et attribuer les récompenses" /></Shell>
  );
}

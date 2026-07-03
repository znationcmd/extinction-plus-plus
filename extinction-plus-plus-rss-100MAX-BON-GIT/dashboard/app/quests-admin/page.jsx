import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default function QuestsAdminPage() {
  const db = readDb();
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
    </Shell>
  );
}

import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default function BattlePassPage() {
  const db = readDb();
  const bp = db.battlepass || {};
  const levels = bp.levels || [];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Battle Pass RSS</h2>
      <div className="card mb-6">
        <h3 className="text-2xl font-black">Pass de combat par serveur</h3>
        <p className="mt-2 text-white/70">Niveaux, XP, récompenses gratuites/premium, missions et saison configurable.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {levels.map(l => (
          <div key={l.level || l.id} className="card">
            <h3 className="text-xl font-black">Niveau {l.level}</h3>
            <p>XP : {l.xp || 0}</p>
            <p>Récompense : {l.reward || '—'}</p>
            <p>Premium : {l.premium ? 'Oui' : 'Non'}</p>
          </div>
        ))}
        {!levels.length && <div className="card md:col-span-3">Aucun niveau configuré.</div>}
      </div>
    </Shell>
  );
}

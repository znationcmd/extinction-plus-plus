import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default function Killfeed() {
  const db = readDb();
  const events = (db.events || []).slice(-150).reverse();

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Killfeed</h2>
      <div className="card mb-6">
        <p className="text-white/70">Kills, connexions, déconnexions, morts IA/zombie/animal, arme et distance.</p>
        <div className="mt-4 rounded-2xl bg-black/40 p-4 font-mono text-sm">/event kill jeu: DayZ serveur: Sakhal killer: joueur1 victim: joueur2 weapon: M4 distance: 300</div>
      </div>
      <div className="card space-y-3">
        {events.map(e => (
          <div key={e.id || `${e.type}-${e.createdAt}`} className="rounded-2xl bg-black/30 p-4">
            <p className="font-bold">{e.type === 'kill' ? `☠️ ${e.killer} → ${e.victim}` : `${e.type || 'event'} ${e.player || ''}`}</p>
            <p className="text-white/70">{e.weapon || ''} {e.distance ? `— ${e.distance}m` : ''}</p>
            <p className="text-white/50">{e.game || ''} {e.server || ''} {e.createdAt || ''}</p>
          </div>
        ))}
        {!events.length && <p>Aucun événement.</p>}
      </div>
    </Shell>
  );
}

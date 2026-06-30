import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default function StatsPage() {
  const db = readDb();
  const ownerServers = Object.values(db.ownerConfigs || {}).reduce((a, cfg) => a + (cfg.servers || []).length, 0);
  const guildServers = Object.values(db.guilds || {}).reduce((a, g) => a + (g.servers || []).length, 0);

  const cards = [
    ['Discords', Object.keys(db.guilds || {}).length],
    ['Propriétaires', Object.keys(db.ownerConfigs || {}).length],
    ['Serveurs', ownerServers + guildServers + (db.servers || []).length],
    ['Kills/Events', (db.events || []).length],
    ['Commandes shop', (db.shopPurchases || []).length],
    ['Livraisons', (db.deliveries || []).length],
    ['Whitelist', (db.pendingWhitelist || []).length],
    ['Interpol', (db.interpol || []).length],
  ];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Statistiques RSS</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="card">
            <p className="text-white/60">{label}</p>
            <p className="text-4xl font-black">{value}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}

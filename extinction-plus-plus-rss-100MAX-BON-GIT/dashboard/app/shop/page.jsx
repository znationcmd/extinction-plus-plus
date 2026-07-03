import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default function Shop() {
  const db = readDb();
  const guildShop = Object.values(db.guilds || {}).flatMap(g => (g.shop || []).map(i => ({...i, guild: g.name || g.id})));
  const globalShop = db.shop || [];
  const shops = [...guildShop, ...globalShop];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Shop</h2>
      <div className="card mb-6">
        <h3 className="text-2xl font-black">Shop par serveur / map</h3>
        <p className="mt-2 text-white/70">Créer un item : /shop create jeu: DayZ serveur: MonServeur map: Sakhal name: Kit prix: 100</p>
        <p className="mt-2 text-white/70">Acheter : /shop buy id: ID x: 5000 z: 5000</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shops.map(i => (
          <div className="card" key={i.id || i.name}>
            <h3 className="text-2xl font-black">{i.name}</h3>
            <p>{i.guild || i.guildId || 'Global'} — {i.server || i.serverId || 'Serveur'} — {i.map || 'Map'}</p>
            <p>Prix : {i.price || 0}</p>
            <p>Catégorie : {i.category || '—'}</p>
            <p>ID : {i.id || '—'}</p>
          </div>
        ))}
        {!shops.length && <div className="card md:col-span-2 xl:col-span-3">Aucun item. Utilise /shop create.</div>}
      </div>
    </Shell>
  );
}

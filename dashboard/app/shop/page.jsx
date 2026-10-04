import ModuleEditor from '../../components/ModuleEditor';
import Shell from '../../components/Shell';
import { publicShop } from '../../lib/public-shop';
import {activeGuild} from '../../lib/dashboard-auth';

export default async function Shop({searchParams}) {
  const query=await searchParams;let admin=false,id=query.guildId;
  try{const active=await activeGuild();if(!id)id=active;admin=active===id;}catch{}
  const shops=await publicShop(id);

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
    {admin&&<ModuleEditor endpoint="/api/shop" fields={[{"name": "name", "label": "Nom", "required": true}, {"name": "game", "label": "Jeu"}, {"name": "serverId", "label": "Serveur (ID ou nom)"}, {"name": "enabled", "label": "Activé", "type": "boolean"}, {"name": "server", "label": "Nom du serveur"}, {"name": "map", "label": "Carte"}, {"name": "price", "label": "Prix banque", "type": "integer"}, {"name": "category", "label": "Catégorie"}, {"name":"deliveryMode","label":"Méthode de livraison","options":{"manual":"Staff","bridge":"Adaptateur de jeu installé"}},{"name":"className","label":"Classe de l’objet pour l’adaptateur"},{"name":"quantity","label":"Quantité pour l’adaptateur","type":"integer"},{"name": "blueprint", "label": "Blueprint ou ID ARK"}, {"name": "hidden", "label": "Masqué", "type": "boolean"}]} />}</Shell>
  );
}

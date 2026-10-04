import ServerActions from '../../components/ServerActions';
import ModuleEditor from '../../components/ModuleEditor';
import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

async function getServers() {
  const db = (await readDb());
  const servers = [
    ...(db.connectedServers || []),
    ...(db.servers || []),
    ...Object.entries(db.guilds || {}).flatMap(([guildId, g]) =>
      (g.servers || []).map(s => ({ ...s, guildId: s.guildId || guildId }))),
    ...Object.values(db.ownerConfigs || {}).flatMap(cfg => cfg.servers || [])
  ];
  return [...new Map(servers.map(s => [s.id, s])).values()];
}

export default async function Servers() {
  const servers = await getServers();

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Serveurs</h2>

      <div className="card mb-6">
        <h3 className="text-2xl font-black">Serveurs ajoutés depuis Discord</h3>
        <p className="mt-2 text-white/70">Les serveurs créés avec <b>/serveur ajouter</b> apparaissent ici avec les serveurs configurés dans le dashboard.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {servers.map((s) => (
          <div key={s.id} className="card">
            {s.image && <img src={s.image} alt={s.name} className="mb-4 h-36 w-full rounded-2xl object-cover" />}
            <h4 className="text-xl font-black">{s.name || 'Serveur sans nom'}</h4>
            <p className="text-white/70">{s.game || 'Jeu'} — {s.platform || 'Plateforme'}</p>
            <p>Map : {s.map || '—'}</p>
            <p>ID Nitrado : {s.nitradoId || s.nitradoServiceId || '—'}</p>
            <p>IP/Port : {s.ip || '—'} {s.port ? `:${s.port}` : ''}</p>
            <p>Discord : {s.guildId || '—'}</p>
          </div>
        ))}
        {!servers.length && <div className="card md:col-span-2 xl:col-span-3">Aucun serveur configuré. Ajoute-en un avec /serveur ajouter.</div>}
      </div>
    <ModuleEditor endpoint="/api/servers" fields={[{"name": "name", "label": "Nom", "required": true}, {"name": "game", "label": "Jeu", "required": true}, {"name": "platform", "label": "Plateforme"}, {"name": "map", "label": "Carte"}, {"name": "nitradoId", "label": "ID Nitrado"}, {"name": "ip", "label": "Adresse"}, {"name": "port", "label": "Port du jeu"}, {"name": "rconHost", "label": "Adresse RCON"}, {"name": "rconPort", "label": "Port RCON", "type": "integer"}, {"name": "rconPassword", "label": "Mot de passe RCON", "type": "password"}, {"name": "rconProtocol", "label": "Protocole RCON", "options": {"source": "Source (ARK / Palworld / Conan)", "battleye": "BattlEye (DayZ PC / Arma)"}}, {"name": "enabled", "label": "Activé", "type": "boolean"}]} readKey="servers" /><ServerActions /></Shell>
  );
}

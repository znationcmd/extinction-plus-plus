import Shell from '../../components/Shell';
import { ensureTables, getPool, normalizeServer } from '../../lib/pgdb';

async function getServers() {
  try {
    await ensureTables();
    const result = await getPool().query('SELECT * FROM servers ORDER BY created_at DESC');
    return result.rows.map(normalizeServer);
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function Servers() {
  const servers = await getServers();

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Serveurs</h2>

      <div className="card mb-6">
        <h3 className="text-2xl font-black">Serveurs ajoutés depuis Discord</h3>
        <p className="mt-2 text-white/70">Les serveurs créés avec <b>/serveur ajouter</b> sont maintenant lus depuis PostgreSQL.</p>
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
        {!servers.length && <div className="card md:col-span-2 xl:col-span-3">Aucun serveur en base PostgreSQL. Ajoute-en un avec /serveur ajouter après ce patch.</div>}
      </div>
    </Shell>
  );
}

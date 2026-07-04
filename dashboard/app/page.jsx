import Shell from '../../components/Shell';
import { ensureTables, getPool, normalizeWhitelist } from '../../lib/pgdb';

async function getWhitelistRequests() {
  try {
    await ensureTables();
    const result = await getPool().query('SELECT * FROM whitelist_requests ORDER BY created_at DESC');
    return result.rows.map(normalizeWhitelist);
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function WhitelistPage() {
  const requests = await getWhitelistRequests();

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Whitelist</h2>

      <div className="grid gap-5">
        <div className="card">
          <h3 className="mb-3 text-2xl font-black">Panneau whitelist</h3>
          <p className="text-white/70">Crée un panneau depuis Discord avec :</p>
          <div className="mt-4 rounded-2xl bg-black/40 p-4 font-mono text-sm">/whitelist-panel serveur: sakhal map: sakhal salon: #whitelist-demandes</div>
        </div>

        <div className="card">
          <h3 className="mb-4 text-2xl font-black">Demandes en attente</h3>
          {!requests.length && <p className="text-white/60">Aucune demande whitelist en base PostgreSQL.</p>}
          <div className="grid gap-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="font-bold">Discord : {r.guildId}</p>
                <p>Joueur Discord : {r.userId}</p>
                <p>Serveur : {r.server}</p>
                <p>Map : {r.map}</p>
                <p>Plateforme : {r.plateforme || r.platform}</p>
                <p>Pseudo / ID : {r.pseudo}</p>
                <p>Status : {r.status}</p>
                <p className="text-white/50">Date : {String(r.createdAt || '')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

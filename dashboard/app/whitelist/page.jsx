import Shell from '../../components/Shell';

async function getWhitelistData() {
  try {
    const baseUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/whitelist`, {
      cache: 'no-store',
    });

    const data = await res.json();

    return {
      requests: data.requests || [],
      servers: data.servers || [],
    };
  } catch (error) {
    console.error('Whitelist page error:', error);
    return { requests: [], servers: [] };
  }
}

export default async function WhitelistPage() {
  const { requests, servers } = await getWhitelistData();

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Whitelist</h2>

      <div className="grid gap-5">
        <div className="card">
          <h3 className="mb-3 text-2xl font-black">Serveurs whitelist configurés</h3>
          {!servers.length && <p className="text-white/60">Aucun serveur whitelist configuré.</p>}
          <div className="grid gap-3">
            {servers.map((s, i) => (
              <div key={s.id || i} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="font-bold">{s.name || s.server_name || 'Serveur sans nom'}</p>
                <p>Map : {s.map || 'inconnue'}</p>
                <p>Plateforme : {s.platform || s.plateforme || s.game || 'inconnue'}</p>
                <p>ID Nitrado : {s.nitradoServiceId || s.nitrado_service_id || s.service_id || 'non renseigné'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 text-2xl font-black">Demandes whitelist</h3>
          {!requests.length && <p className="text-white/60">Aucune demande whitelist.</p>}
          <div className="grid gap-3">
            {requests.map((r, i) => (
              <div key={r.id || i} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="font-bold">Discord : {r.guildId || r.guild_id || 'inconnu'}</p>
                <p>Joueur Discord : {r.userId || r.user_id || r.discord_id || 'inconnu'}</p>
                <p>Serveur : {r.server || r.server_name || r.server_id || 'inconnu'}</p>
                <p>Map : {r.map || 'inconnue'}</p>
                <p>Plateforme : {r.plateforme || r.platform || 'inconnue'}</p>
                <p>Pseudo / ID : {r.pseudo || r.steam_id || r.uid || 'non renseigné'}</p>
                <p>Status : {r.status || 'pending'}</p>
                <p className="text-white/50">Date : {String(r.createdAt || r.created_at || '')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

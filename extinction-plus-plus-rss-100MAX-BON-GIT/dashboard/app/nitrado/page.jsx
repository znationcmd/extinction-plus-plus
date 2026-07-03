import Shell from '../../components/Shell';
import { readDb } from '../../lib/db';

export default function Page() {
  const db = readDb();
  const accounts = Object.values(db.nitradoAccounts || {});
  const guilds = Object.values(db.guilds || {});
  const connectedServers = Array.isArray(db.connectedServers) ? db.connectedServers : [];

  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Nitrado SaaS Multi-Discord</h2>

      <div className="card mb-6">
        <h3 className="text-2xl font-black">Connexion client</h3>
        <p className="mt-2 text-white/70">
          Chaque Discord connecte son propre compte Nitrado avec la commande Discord :
        </p>
        <pre className="mt-4 overflow-auto rounded-xl bg-black/40 p-4 text-sm text-green-200">/nitrado connect token:TON_TOKEN_NITRADO</pre>
        <p className="mt-3 text-white/60">
          Ensuite : <b>/nitrado services</b> puis <b>/nitrado link-server</b>. Le token est chiffré dans la base avec SECRET_KEY / SESSION_SECRET.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map((item) => {
          const guild = guilds.find(g => String(g.id) === String(item.guildId));
          return (
            <div key={item.guildId} className="card">
              <h3 className="text-xl font-black">{guild?.name || item.guildName || item.guildId}</h3>
              <div className="mt-3 space-y-1 text-white/70">
                <p>Discord ID : {item.guildId}</p>
                <p>Token : {item.tokenPreview || 'connecté'}</p>
                <p>Services au test : {item.serviceCount ?? '—'}</p>
                <p>Mise à jour : {item.updatedAt || '—'}</p>
              </div>
            </div>
          );
        })}
        {!accounts.length && <div className="card md:col-span-2 xl:col-span-3">Aucun compte Nitrado client connecté.</div>}
      </div>

      <h3 className="mb-4 mt-8 text-2xl font-black">Serveurs Nitrado liés</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {connectedServers.map((s) => (
          <div key={s.id} className="card">
            <h3 className="text-xl font-black">{s.name}</h3>
            <div className="mt-3 space-y-1 text-white/70">
              <p>Discord : {s.guildId}</p>
              <p>Jeu : {s.game}</p>
              <p>Map : {s.map || '—'}</p>
              <p>Service ID : {s.nitradoServiceId || s.nitradoId}</p>
              <p>Whitelist : {s.whitelistPath || 'non configurée'}</p>
            </div>
          </div>
        ))}
        {!connectedServers.length && <div className="card md:col-span-2 xl:col-span-3">Aucun serveur Nitrado lié.</div>}
      </div>
    </Shell>
  );
}

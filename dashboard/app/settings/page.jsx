import Shell from '../../components/Shell';

export default function SettingsPage() {
  return (
    <Shell>
      <h2 className="mb-6 text-4xl font-black">Paramètres</h2>
      <div className="grid gap-5">
        <div className="card">
          <h3 className="mb-3 text-2xl font-black">Railway</h3>
          <div className="space-y-2 rounded-2xl bg-black/40 p-4 font-mono text-sm">
            <p>Root Directory : vide</p>
            <p>Build Command : npm run build</p>
            <p>Start Command : npm run start</p>
          </div>
        </div>
        <div className="card">
          <h3 className="mb-3 text-2xl font-black">Variables</h3>
          <div className="space-y-2 rounded-2xl bg-black/40 p-4 font-mono text-sm">
            <p>DISCORD_TOKEN</p>
            <p>TOKEN</p>
            <p>CLIENT_ID</p>
            <p>DASHBOARD_URL</p>
            <p>SHOP_URL</p>
          </div>
        </div>
        <div className="card">
          <h3 className="mb-3 text-2xl font-black">Commandes</h3>
          <div className="space-y-2 rounded-2xl bg-black/40 p-4 font-mono text-sm">
            <p>npm run deploy</p>
            <p>npm run check-env</p>
            <p>npm run doctor</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

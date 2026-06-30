import Link from 'next/link';
import Shell, { links } from '../components/Shell';
import { readDb } from '../lib/db';

export default function Home() {
  const db = readDb();
  const ownerConfigs = Object.keys(db.ownerConfigs || {}).length;
  const guildCount = Object.keys(db.guilds || {}).length;
  const guildServers = Object.values(db.guilds || {}).reduce((a, g) => a + (g.servers || []).length, 0);
  const ownerServers = Object.values(db.ownerConfigs || {}).reduce((a, cfg) => a + (cfg.servers || []).length, 0);
  const servers = guildServers + ownerServers + (db.servers || []).length;

  return (
    <Shell>
      <div className="card mb-5 overflow-hidden">
        <img src="/extinction-banner.png" alt="Extinction++ RSS" className="mb-5 h-48 w-full rounded-3xl object-cover sm:h-72" />
        <h2 className="text-4xl font-black text-red-500 sm:text-5xl">Dashboard Extinction++ RSS</h2>
        <p className="mt-2 text-white/70">Real Survival System — PC, console et téléphone.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Link href="/owner-config" prefetch={false} className="card block active:bg-red-900">
          <p>Configs propriétaires</p>
          <p className="text-4xl font-black">{ownerConfigs}</p>
        </Link>
        <Link href="/servers" prefetch={false} className="card block active:bg-red-900">
          <p>Discords</p>
          <p className="text-4xl font-black">{guildCount}</p>
        </Link>
        <Link href="/servers" prefetch={false} className="card block active:bg-red-900">
          <p>Serveurs</p>
          <p className="text-4xl font-black">{servers}</p>
        </Link>
        <Link href="/killfeed" prefetch={false} className="card block active:bg-red-900">
          <p>Événements</p>
          <p className="text-4xl font-black">{(db.events || []).length}</p>
        </Link>
      </div>

      <h3 className="mt-8 mb-4 text-3xl font-black">Modules</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {links.filter(([href]) => href !== '/').map(([href, label, Icon]) => (
          <Link key={href} href={href} prefetch={false} className="flex min-h-[120px] flex-col items-center justify-center rounded-3xl bg-white/10 p-5 text-center hover:bg-white/15 active:bg-red-600">
            <Icon size={34} />
            <span className="mt-3 text-lg font-bold">{label}</span>
          </Link>
        ))}
      </div>
    </Shell>
  );
}

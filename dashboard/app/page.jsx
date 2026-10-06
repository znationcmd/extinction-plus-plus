import SetupGuide from '../components/SetupGuide';
import Link from 'next/link';
import Shell from '../components/Shell';
import ModuleGrid from '../components/ModuleGrid';
import { readPageDb as readDb } from '../lib/db';

export default async function Home() {
  const db = (await readDb());
  const ownerConfigs = Object.keys(db.ownerConfigs || {}).length;
  const guildCount = Object.keys(db.guilds || {}).length;
  const guildServers = Object.values(db.guilds || {}).reduce((a, g) => a + (g.servers || []).length, 0);
  const ownerServers = Object.values(db.ownerConfigs || {}).reduce((a, cfg) => a + (cfg.servers || []).length, 0);
  const servers = guildServers + ownerServers + (db.servers || []).length + (db.connectedServers || []).length;

  return (
    <Shell><SetupGuide/>
      <div className="card mb-5 overflow-hidden">
        <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
          <div className="rounded-3xl border border-purple-500/30 bg-black/40 p-4">
            <img src="/extinction-logo.png" alt="Logo Extinction++ RSS" className="mx-auto max-h-72 w-full rounded-3xl object-contain" />
          </div>
          <div className="rounded-3xl border border-purple-500/30 bg-black/40 p-4">
            <img src="/extinction-banner.png" alt="Présentation Extinction++ RSS" className="mx-auto max-h-[760px] w-full rounded-3xl object-contain" />
          </div>
        </div>
        <h2 className="mt-6 text-4xl font-black text-purple-400 sm:text-5xl">Dashboard Extinction++ RSS</h2>
        <p className="mt-2 text-white/70">Real Survival System — PC, console et téléphone.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Link href="/owner-config" prefetch={false} className="card block active:bg-purple-900">
          <p>Configs propriétaires</p>
          <p className="text-4xl font-black">{ownerConfigs}</p>
        </Link>
        <Link href="/servers" prefetch={false} className="card block active:bg-purple-900">
          <p>Discords</p>
          <p className="text-4xl font-black">{guildCount}</p>
        </Link>
        <Link href="/servers" prefetch={false} className="card block active:bg-purple-900">
          <p>Serveurs</p>
          <p className="text-4xl font-black">{servers}</p>
        </Link>
        <Link href="/killfeed" prefetch={false} className="card block active:bg-purple-900">
          <p>Événements</p>
          <p className="text-4xl font-black">{(db.events || []).length}</p>
        </Link>
      </div>

      <section id="applications" className="mt-8 scroll-mt-28">
        <span id="modules" className="sr-only">Modules</span>
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[.18em] text-purple-300/70">EXTINCTION ++ RSS</p>
          <h3 className="text-3xl font-black">Applications</h3>
          <p className="mt-1 text-sm text-white/55">Tous les outils et modules en accès rapide, comme avant.</p>
        </div>
        <ModuleGrid />
      </section>
    </Shell>
  );
}

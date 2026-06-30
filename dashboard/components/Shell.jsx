import Link from 'next/link';
import {
  Map,
  ShoppingCart,
  Skull,
  Shield,
  Settings,
  Palette,
  Trophy,
  ClipboardList,
  Home,
  Menu,
  PackageCheck,
  Siren,
  Search,
  BriefcaseBusiness,
  BarChart3,
  Coins,
  Plug,
  Brain,
  Ticket,
  Tags,
  Cloud,
  KeyRound
} from 'lucide-react';

export const links = [
  ['/', 'Accueil', Home],
  ['/servers', 'Serveurs', Map],
  ['/nitrado', 'Nitrado', Cloud],
  ['/owner-config', 'Config propriétaires', KeyRound],
  ['/whitelist', 'Whitelist', Shield],
  ['/shop', 'Shop', ShoppingCart],
  ['/deliveries', 'Livraisons', PackageCheck],
  ['/coupons', 'Promos', Tags],
  ['/battlepass-admin', 'Battle Pass', Trophy],
  ['/quests-admin', 'Quêtes', ClipboardList],
  ['/rp', 'RP', BriefcaseBusiness],
  ['/economy', 'Économie', Coins],
  ['/alarms', 'Alarmes', Siren],
  ['/interpol', 'Interpol', Search],
  ['/killfeed', 'Killfeed', Skull],
  ['/leaderboard', 'Classements', Trophy],
  ['/stats', 'Stats', BarChart3],
  ['/tickets', 'Tickets', Ticket],
  ['/plugins', 'Plugins', Plug],
  ['/ai', 'IA', Brain],
  ['/customization', 'Personnalisation', Palette],
  ['/settings', 'Paramètres', Settings],
];

const bottomLinks = [
  ['/', 'Accueil', Home],
  ['/servers', 'Serveurs', Map],
  ['/whitelist', 'Whitelist', Shield],
  ['/shop', 'Shop', ShoppingCart],
  ['/killfeed', 'Killfeed', Skull],
];

export default function Shell({ children }) {
  return (
    <main className="min-h-screen bg-extinction-bg pb-28 text-white">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 overflow-y-auto border-r border-white/10 bg-black/40 p-6 backdrop-blur-xl lg:block">
        <Link href="/" prefetch={false} className="mb-8 block">
          <img src="/extinction-logo.png" alt="Extinction++ RSS" className="mb-4 w-full rounded-2xl object-cover" />
          <h1 className="text-2xl font-black text-red-500">EXTINCTION++ RSS</h1>
          <p className="text-xs text-white/50">Real Survival System</p>
        </Link>

        <nav className="space-y-2 pb-8">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/10 active:bg-red-600"
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-black/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/" prefetch={false} className="flex items-center gap-3">
          <img src="/extinction-logo.png" alt="Extinction++ RSS" className="h-12 w-12 rounded-xl object-cover" />
          <div>
            <p className="text-xl font-black text-red-500">Extinction++ RSS</p>
            <p className="text-sm text-white/50">Real Survival System</p>
          </div>
        </Link>
        <Menu className="text-white/80" size={32} />
      </header>

      <nav className="grid grid-cols-3 gap-3 border-b border-white/10 bg-[#08111f] p-4 lg:hidden">
        {links.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="flex min-h-[92px] flex-col items-center justify-center rounded-2xl bg-white/10 px-2 py-4 text-center text-sm active:bg-red-600"
          >
            <Icon size={28} />
            <span className="mt-2 leading-tight">{label}</span>
          </Link>
        ))}
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 gap-1 border-t border-white/10 bg-black/95 p-2 backdrop-blur-xl lg:hidden">
        {bottomLinks.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="flex min-h-[58px] flex-col items-center justify-center rounded-xl px-1 py-2 text-[11px] active:bg-red-600"
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <section className="px-4 py-5 lg:ml-72 lg:p-10">
        {children}
      </section>
    </main>
  );
}

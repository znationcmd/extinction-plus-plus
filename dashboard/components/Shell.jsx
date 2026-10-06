'use client';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from './LanguageProvider';
import {useState} from 'react';
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
  KeyRound,
  Radio
} from 'lucide-react';

export const links = [
  ['/', 'Accueil', Home],
  ['/servers', 'Serveurs', Map],
  ['/integrations', 'CFTools & BattleMetrics', Plug],
  ['/maps', 'Cartes interactives', Map],
  ['/top-servers', 'Top Serveurs', Trophy],
  ['/premium', 'Premium', Trophy],
  ['/explorer/ark', 'Dinos & ressources ARK', Search],
  ['/explorer/palworld', 'Pals & ressources', Search],
  ['/explorer/conan', 'Guide Conan Exiles', Search],
  ['/explorer/aniimo', 'Aniimo & ressources', Search],
  ['/explorer/dayz', 'Loot DayZ', Search],
  ['/atlas-admin', 'Gérer les emplacements', Map],
  ['/groups', 'Groupes de joueurs', Map],
  ['/install', 'Installer l’application', Home],
  ['/nitrado', 'Nitrado', Cloud],
  ['/dayz-mods', 'Mods DayZ PC', PackageCheck],
  ['/file-validator', 'Valider JSON / XML', ClipboardList],
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
  ['/operations', 'Primes & automatisations', Trophy],
  ['/radio', 'Radio & messages', Radio],
  ['/interpol', 'Interpol', Search],
  ['/killfeed', 'Killfeed', Skull],
  ['/leaderboard', 'Classements', Trophy],
  ['/stats', 'Stats', BarChart3],
  ['/tickets', 'Tickets', Ticket],
  ['/plugins', 'Plugins', Plug],
  ['/ai', 'Assistant gratuit', Brain],
  ['/customization', 'Personnalisation', Palette],
  ['/settings', 'Paramètres', Settings],
  ['/select-discord', 'Changer de Discord', KeyRound],
];

const bottomLinks = [
  ['/', 'Accueil', Home],
  ['/servers', 'Serveurs', Map],
  ['/integrations', 'CFTools & BattleMetrics', Plug],
  ['/whitelist', 'Whitelist', Shield],
  ['/shop', 'Shop', ShoppingCart],
  ['/killfeed', 'Killfeed', Skull],
];

export default function Shell({ children }) {
  const { t } = useLanguage();
  const [menuOpen,setMenuOpen]=useState(false);
  return (
    <main className="dashboard-motion-bg min-h-screen bg-extinction-bg pb-28 text-white">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 overflow-y-auto border-r border-white/10 bg-black/40 p-6 backdrop-blur-xl lg:block">
        <Link href="/" prefetch={false} className="mb-8 block">
          <img src="/extinction-logo.png" alt="Extinction++ RSS" className="mb-4 w-full rounded-2xl object-cover" />
          <h1 className="text-2xl font-black text-purple-400">EXTINCTION++ RSS</h1>
          <p className="text-xs text-white/50">Real Survival System</p>
        </Link>

        <div className="mb-5"><LanguageSelector /></div>
        <nav className="space-y-2 pb-8">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/10 active:bg-red-600"
            >
              <Icon size={20} />
              {t(label)}
            </Link>
          ))}
        </nav>
      </aside>

      <header className="mobile-header sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-black/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/" prefetch={false} className="flex items-center gap-3">
          <img src="/extinction-logo.png" alt="Extinction++ RSS" className="h-12 w-12 rounded-xl object-cover" />
          <div>
            <p className="text-xl font-black text-purple-400">Extinction++ RSS</p>
            <p className="text-sm text-white/50">Real Survival System</p>
          </div>
        </Link>
        <button type="button" aria-label={menuOpen?t('Fermer le menu'):t('Ouvrir le menu')} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={()=>setMenuOpen(open=>!open)} className="p-2 text-white/80"><Menu size={32}/></button>
      </header>

      <div className="border-b border-white/10 bg-[#08111f] px-4 py-3 lg:hidden"><LanguageSelector /></div>
      <nav id="mobile-menu" aria-label={t('Navigation mobile')} className={`${menuOpen?'grid':'hidden'} grid-cols-3 gap-3 border-b border-white/10 bg-[#08111f] p-4 lg:hidden`}>
        {links.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            onClick={()=>setMenuOpen(false)}
            className="flex min-h-[92px] flex-col items-center justify-center rounded-2xl bg-white/10 px-2 py-4 text-center text-sm active:bg-red-600"
          >
            <Icon size={28} />
            <span className="mt-2 leading-tight">{t(label)}</span>
          </Link>
        ))}
      </nav>

      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 gap-1 border-t border-white/10 bg-black/95 p-2 backdrop-blur-xl lg:hidden">
        {bottomLinks.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="flex min-h-[58px] flex-col items-center justify-center rounded-xl px-1 py-2 text-[11px] active:bg-red-600"
          >
            <Icon size={22} />
            <span>{t(label)}</span>
          </Link>
        ))}
      </nav>

      <section className="px-4 py-5 lg:ml-72 lg:p-10">
        {children}
      </section>
    </main>
  );
}

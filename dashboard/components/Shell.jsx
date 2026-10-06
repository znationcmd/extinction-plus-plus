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
  ['/dayz-tools', 'Outils DayZ complets', ClipboardList],
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
  const [menuQuery,setMenuQuery]=useState('');
  const visibleLinks=links.filter(([,label])=>t(label).toLowerCase().includes(menuQuery.trim().toLowerCase()));
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
      {menuOpen&&<div className="fixed inset-0 z-[58] bg-black/70 lg:hidden" onClick={()=>setMenuOpen(false)} />}
      <aside id="mobile-menu" aria-label={t('Navigation mobile')} className={`${menuOpen?'translate-x-0':'-translate-x-full'} fixed bottom-0 left-0 top-0 z-[60] flex w-[min(92vw,380px)] flex-col border-r border-white/10 bg-[#171d24]/[.99] shadow-2xl backdrop-blur-xl transition-transform duration-200 lg:hidden`}>
        <div className="border-b border-white/10 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="/extinction-logo.png" alt="" className="h-11 w-11 rounded-xl object-cover" />
              <div><p className="font-black text-purple-300">EXTINCTION++ RSS</p><p className="text-xs text-white/45">Modules du Discord sélectionné</p></div>
            </div>
            <button type="button" onClick={()=>setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-xl">×</button>
          </div>
          <div className="mt-4"><LanguageSelector /></div>
          <label className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
            <Search size={20} className="text-white/45"/><input value={menuQuery} onChange={e=>setMenuQuery(e.target.value)} placeholder={t('Rechercher un module')} className="w-full bg-transparent text-white outline-none placeholder:text-white/35"/>
          </label>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-4">
          {visibleLinks.length?visibleLinks.map(([href,label,Icon])=>(
            <Link key={href} href={href} prefetch={false} onClick={()=>setMenuOpen(false)} className="mb-1 flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-white/80 hover:bg-white/10 active:bg-purple-700">
              <Icon size={21}/><span>{t(label)}</span>
            </Link>
          )):<p className="rounded-xl bg-white/5 p-4 text-sm text-white/55">{t('Aucun module trouvé')}</p>}
        </nav>
      </aside>

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

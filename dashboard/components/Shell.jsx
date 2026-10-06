'use client';
import LanguageSelector from './LanguageSelector';
import {usePwa} from './PwaProvider';
import { useLanguage } from './LanguageProvider';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {
  Map,ShoppingCart,Skull,Shield,Settings,Palette,Trophy,ClipboardList,Home,Menu,
  PackageCheck,Siren,Search,BriefcaseBusiness,BarChart3,Coins,Plug,Brain,Ticket,
  Tags,Cloud,KeyRound,Radio,RefreshCw
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

const groups = [
  ['PARAMÈTRES',['/settings','/customization','/owner-config']],
  ['ACCUEIL DES MEMBRES',['/whitelist','/groups','/select-discord']],
  ['ENGAGEMENT',['/battlepass-admin','/quests-admin','/leaderboard','/economy']],
  ['SÉCURITÉ',['/interpol','/killfeed','/alarms']],
  ['COMMUNICATION',['/tickets','/radio','/operations']],
  ['COMMUNAUTÉ',['/rp','/shop','/deliveries','/coupons','/stats']],
  ['SERVEURS & OUTILS',['/servers','/nitrado','/integrations','/maps','/dayz-mods','/dayz-tools','/file-validator','/atlas-admin']],
  ['EXPLORATEURS',['/explorer/ark','/explorer/palworld','/explorer/conan','/explorer/aniimo','/explorer/dayz']],
  ['RÉSEAU',['/premium','/top-servers','/plugins','/ai','/install']],
];

const bottomLinks = [
  ['/', 'Accueil', Home],
  ['/servers', 'Serveurs', Map],
  ['/integrations', 'CFTools & BattleMetrics', Plug],
  ['/whitelist', 'Whitelist', Shield],
  ['/shop', 'Shop', ShoppingCart],
];

const byHref=new Map(links.map(x=>[x[0],x]));
const initials=name=>String(name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?';

export default function Shell({ children }) {
  const { t } = useLanguage();
  const {refreshApp,refreshing}=usePwa();
  const [menuOpen,setMenuOpen]=useState(false);
  const [menuQuery,setMenuQuery]=useState('');
  const [workspace,setWorkspace]=useState({guilds:[],selectedGuildId:null});

  useEffect(()=>{
    let cancelled=false;
    fetch('/api/workspace',{cache:'no-store'}).then(async r=>{
      const body=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(body.error||'workspace');
      if(!cancelled)setWorkspace(body);
    }).catch(()=>{});
    return()=>{cancelled=true};
  },[]);

  const selectedGuild=workspace.guilds?.find(g=>g.id===workspace.selectedGuildId)||workspace.guilds?.[0]||null;
  const visibleGroups=useMemo(()=>{
    const q=menuQuery.trim().toLowerCase();
    return groups.map(([title,hrefs])=>{
      const items=hrefs.map(h=>byHref.get(h)).filter(Boolean).filter(([,label])=>!q||t(label).toLowerCase().includes(q));
      return [title,items];
    }).filter(([,items])=>items.length);
  },[menuQuery,t]);

  async function selectGuild(guildId){
    try{
      const r=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId})});
      if(!r.ok)return;
      location.reload();
    }catch{}
  }

  return (
    <main className="dashboard-motion-bg min-h-screen bg-extinction-bg pb-28 text-white">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 overflow-y-auto border-r border-white/10 bg-black/40 p-6 backdrop-blur-xl lg:block">
        <Link href="/" prefetch={false} className="mb-6 block">
          <img src="/extinction-logo.png" alt="Extinction++ RSS" className="mb-4 w-full rounded-2xl object-cover" />
          <h1 className="text-2xl font-black text-purple-400">EXTINCTION++ RSS</h1>
          <p className="text-xs text-white/50">Real Survival System</p>
        </Link>
        <div className="mb-3"><LanguageSelector /></div>
        <button type="button" onClick={refreshApp} disabled={refreshing} className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-purple-400/30 bg-white/5 px-3 py-3 text-sm font-bold text-white/80 hover:bg-white/10 disabled:opacity-50">
          <RefreshCw size={18} className={refreshing?'animate-spin':''}/>{refreshing?t('Actualisation…'):t('Actualiser')}
        </button>
        <nav className="pb-8">
          {groups.map(([title,hrefs])=>{
            const items=hrefs.map(h=>byHref.get(h)).filter(Boolean);
            return <section key={title} className="mb-5">
              <h3 className="mb-2 px-3 text-[11px] font-black tracking-[.13em] text-white/35">{title}</h3>
              {items.map(([href,label,Icon])=><Link key={href} href={href} prefetch={false} className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/75 hover:bg-white/10 active:bg-red-600"><Icon size={20}/>{t(label)}</Link>)}
            </section>
          })}
        </nav>
      </aside>

      <header className="ext-draft-header lg:hidden">
        <button type="button" aria-label={menuOpen?t('Fermer le menu'):t('Ouvrir le menu')} onClick={()=>setMenuOpen(v=>!v)}><Menu size={34}/></button>
        <img src="/extinction-logo.png" alt="EXTINCTION++ RSS"/>
        <div className="ext-header-actions">
          <button type="button" className="ext-refresh-button" onClick={refreshApp} disabled={refreshing} aria-label={t('Actualiser')} title={t('Actualiser')}>
            <RefreshCw size={29} className={refreshing?'animate-spin':''}/>
          </button>
          <button type="button" aria-label="Modules" className="ext-grid-button" onClick={()=>setMenuOpen(v=>!v)}><i/><i/><i/><i/></button>
        </div>
      </header>

      {menuOpen&&<div className="ext-menu-shade lg:hidden" onClick={()=>setMenuOpen(false)}/>}

      <div className={`ext-guild-rail lg:hidden ${menuOpen?'open':''}`} aria-label="Discord installés">
        {(workspace.guilds||[]).map(g=><button key={g.id} type="button" title={g.name} onClick={()=>selectGuild(g.id)} className={`ext-guild-bubble ${selectedGuild?.id===g.id?'active':''}`}>
          {g.icon?<img src={g.icon} alt=""/>:<span>{initials(g.name)}</span>}
        </button>)}
      </div>

      <aside className={`ext-module-panel lg:hidden ${menuOpen?'open':''}`}>
        <div className="ext-module-top">
          <div className="ext-server-context">
            {selectedGuild?.icon?<img src={selectedGuild.icon} alt=""/>:<div className="ext-server-fallback">{initials(selectedGuild?.name||'EX')}</div>}
            <div><strong>{selectedGuild?.name||'EXTINCTION++ RSS'}</strong><small>{selectedGuild?'Bot installé':'Discord sélectionné'}</small></div>
          </div>
          <label className="ext-module-search"><Search size={21}/><input value={menuQuery} onChange={e=>setMenuQuery(e.target.value)} placeholder={t('Rechercher un module')}/></label>
        </div>
        <nav className="ext-module-scroll">
          {visibleGroups.map(([title,items])=><section key={title} className="ext-module-group">
            <h3>{title}<span>⌄</span></h3>
            {items.map(([href,label,Icon])=><Link key={href} href={href} prefetch={false} onClick={()=>setMenuOpen(false)}><Icon size={21}/><span>{t(label)}</span></Link>)}
          </section>)}
          {!visibleGroups.length&&<p className="p-4 text-sm text-white/45">{t('Aucun module trouvé')}</p>}
        </nav>
        <div className="ext-module-footer"><LanguageSelector/></div>
      </aside>

      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 gap-1 border-t border-white/10 bg-black/95 p-2 backdrop-blur-xl lg:hidden">
        {bottomLinks.map(([href,label,Icon])=><Link key={href} href={href} prefetch={false} className="flex min-h-[58px] flex-col items-center justify-center rounded-xl px-1 py-2 text-[11px] active:bg-red-600"><Icon size={22}/><span>{t(label)}</span></Link>)}
      </nav>

      <section className="ext-content px-4 py-5 lg:ml-72 lg:p-10">{children}</section>
    </main>
  );
}

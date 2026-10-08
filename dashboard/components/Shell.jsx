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
  ['/top-servers', 'CMD Top Serveur', Trophy],
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
  ['/discord-module/messages', 'Messages', Radio],
  ['/discord-module/welcome', 'Arrivées et départs', Home],
  ['/discord-module/autoroles', 'Rôles automatiques', Shield],
  ['/discord-module/verification', 'Vérification', Shield],
  ['/discord-module/levels', 'Niveaux', Trophy],
  ['/discord-module/invitations', 'Invitations', KeyRound],
  ['/discord-module/reputation', 'Réputation', Trophy],
  ['/discord-module/tempvoice', 'Salons vocaux temporaires', Radio],
  ['/discord-module/infinity', 'Route de l’Infini', Trophy],
  ['/discord-module/suggestions', 'Suggestions', Brain],
  ['/discord-module/secureroles', 'Rôles sécurisés', Shield],
  ['/discord-module/moderation', 'Modération', Shield],
  ['/discord-module/automod', 'Auto-Modération', Shield],
  ['/discord-module/reports', 'Signalements', Siren],
  ['/discord-module/giveaways', 'Lots & Giveaways', Trophy],
  ['/discord-module/polls', 'Sondages', ClipboardList],
  ['/discord-module/embeds', 'Embeds', Radio],
  ['/discord-module/snippets', 'Snippets', ClipboardList],
  ['/discord-module/social', 'Notifications sociales', Radio],
  ['/discord-module/recurring', 'Messages récurrents', RefreshCw],
  ['/discord-module/statschannels', 'Salons de statistiques', BarChart3],
  ['/discord-module/counters', 'Compteurs', BarChart3],
  ['/discord-module/birthdays', 'Anniversaires', Trophy],
  ['/discord-module/customcommands', 'Commandes personnalisées', Settings],
  ['/discord-module/wordreactions', 'Réactions de mots', Brain],
  ['/discord-module/starboard', 'Starboards', Trophy],
  ['/discord-module/reactionroles', 'Rôles-Réactions', Tags],
];

const groups = [
  ['PARAMÈTRES',['/settings','/customization','/owner-config','/discord-module/messages']],
  ['ACCUEIL DES MEMBRES',['/whitelist','/groups','/select-discord','/discord-module/welcome','/discord-module/autoroles','/discord-module/verification']],
  ['ENGAGEMENT',['/battlepass-admin','/quests-admin','/leaderboard','/economy','/discord-module/levels','/discord-module/invitations','/discord-module/reputation','/discord-module/tempvoice','/discord-module/infinity','/discord-module/suggestions']],
  ['SÉCURITÉ',['/interpol','/killfeed','/alarms','/discord-module/secureroles','/discord-module/moderation','/discord-module/automod','/discord-module/reports']],
  ['COMMUNICATION',['/tickets','/radio','/operations','/discord-module/giveaways','/discord-module/polls','/discord-module/embeds','/discord-module/snippets','/discord-module/social','/discord-module/recurring','/discord-module/statschannels','/discord-module/counters']],
  ['COMMUNAUTÉ',['/rp','/shop','/deliveries','/coupons','/stats','/discord-module/birthdays','/discord-module/customcommands','/discord-module/wordreactions','/discord-module/starboard','/discord-module/reactionroles']],
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

const byHref=new globalThis.Map(links.map(x=>[x[0],x]));
const initials=name=>String(name||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?';

function GuildAvatar({guild}) {
  const raw=String(guild?.icon||'').trim();
  const [ready,setReady]=useState(true);
  useEffect(()=>setReady(true),[raw]);
  const link=/^https:\/\//i.test(raw)||/^\/[^/]/.test(raw)||/^data:image\//i.test(raw)
    ?raw
    :/^\d{15,22}$/.test(String(guild?.id||''))&&/^[a-z0-9_]{12,100}$/i.test(raw)
    ?'https://cdn.discordapp.com/icons/'+guild.id+'/'+raw+'.webp?size=256'
    :'';
  return ready&&link
    ?<img src={link} alt="" className="block h-full w-full rounded-full object-cover" onError={()=>setReady(false)} loading="lazy"/>
    :<span className="grid h-full w-full place-items-center rounded-full bg-purple-900/40 text-xs font-black">{initials(guild?.name)}</span>;
}

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

  const selectedGuild=workspace.guilds?.find(g=>g.id===workspace.selectedGuildId&&g.installed!==false)||workspace.guilds?.find(g=>g.installed!==false)||workspace.guilds?.[0]||null;
  const visibleGroups=useMemo(()=>{
    const q=menuQuery.trim().toLowerCase();
    return groups.map(([title,hrefs])=>{
      const items=hrefs.map(h=>byHref.get(h)).filter(Boolean).filter(([,label])=>!q||t(label).toLowerCase().includes(q));
      return [title,items];
    }).filter(([,items])=>items.length);
  },[menuQuery,t]);

  async function installGuild(guild){
    if(!guild?.inviteUrl)return;
    const popup=window.open('about:blank','extinction-bot-install');
    if(!popup){location.href=guild.inviteUrl;return}
    try{popup.opener=null;popup.location.href=guild.inviteUrl}catch{}
    const started=Date.now();
    const timer=setInterval(async()=>{
      if(Date.now()-started>120000){clearInterval(timer);return}
      try{
        const r=await fetch('/api/workspace',{cache:'no-store'}),body=await r.json();
        const ready=(body.guilds||[]).find(g=>String(g.id)===String(guild.id)&&g.installed!==false);
        if(!ready)return;
        clearInterval(timer);
        await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId:guild.id})});
        try{popup.location.href=location.origin+'/?installedGuild='+encodeURIComponent(guild.id)}catch{}
        location.reload();
      }catch{}
    },1500);
  }

  async function selectGuild(guild){
    if(!guild)return;
    if(guild.installed===false){await installGuild(guild);return}
    try{
      const r=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId:guild.id})});
      if(!r.ok)return;
      location.reload();
    }catch{}
  }

  return (
    <main className="dashboard-motion-bg min-h-screen bg-extinction-bg pb-28 text-white">
      <div className="fixed left-0 top-0 z-50 hidden h-screen w-20 flex-col items-center gap-3 overflow-y-auto border-r border-white/10 bg-[#161a1e]/95 px-2 py-5 lg:flex" aria-label="Discord installés sur ordinateur">
        {(workspace.guilds||[]).map(g=>{const installed=g.installed!==false;return <button key={g.id} type="button" title={`${g.name}${installed?'':' · Bot non installé · Cliquer pour inviter'}`} onClick={()=>selectGuild(g)} className={`relative grid h-14 w-14 min-h-14 place-items-center overflow-hidden rounded-full border-2 transition ${installed?'':'opacity-50 grayscale border-dashed hover:opacity-80 hover:grayscale-0'} ${selectedGuild?.id===g.id&&installed?'border-purple-400 shadow-[0_0_0_3px_rgba(167,139,250,.18)]':'border-transparent bg-white/10'}`}>
          <GuildAvatar guild={g}/>
          {!installed&&<span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full border border-black/60 bg-[#252a2e] text-base font-black leading-none text-white">+</span>}
        </button>})}
      </div>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 overflow-y-auto border-r border-white/10 bg-black/40 p-6 backdrop-blur-xl lg:left-20 lg:block">
        <Link href="/" prefetch={false} className="mb-6 block">
          <img src="/extinction-logo.png?v=20261008" alt="CMD Extinction++ RSS" className="mx-auto mb-4 h-28 w-28 rounded-full object-cover" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="/cmd-official.svg?v=20261008"}}/>
          <h1 className="text-2xl font-black text-purple-400">CMD EXTINCTION++ RSS</h1>
          <p className="text-xs text-white/50">Real Survival System</p>
        </Link>
          <a href="https://cmd-top-serveur-production.up.railway.app/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full border border-purple-400/35 bg-purple-500/10 px-3 py-1.5 text-[11px] font-black tracking-wide text-purple-200 hover:bg-purple-500/20">
            <img src="/cmd-official.svg?v=20261008" alt="CMD" className="h-5 w-5"/> CMD OFFICIEL
          </a>
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
        <img src="/extinction-logo.png?v=20261008" alt="CMD Extinction++ RSS" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="/cmd-official.svg?v=20261008"}}/>
        <a href="https://cmd-top-serveur-production.up.railway.app/" target="_blank" rel="noopener noreferrer" title="CMD Officiel" className="grid h-8 w-8 place-items-center rounded-full border border-purple-400/35 bg-purple-500/10"><img src="/cmd-official.svg?v=20261008" alt="CMD" className="h-6 w-6"/></a>
        <div className="ext-header-actions">
          <button type="button" className="ext-refresh-button" onClick={refreshApp} disabled={refreshing} aria-label={t('Actualiser')} title={t('Actualiser')}>
            <RefreshCw size={29} className={refreshing?'animate-spin':''}/>
          </button>
          <button type="button" aria-label="Applications" title="Applications" className="ext-grid-button" onClick={()=>{setMenuOpen(false);window.location.href='/#applications'}}><i/><i/><i/><i/></button>
        </div>
      </header>

      {menuOpen&&<div className="ext-menu-shade lg:hidden" onClick={()=>setMenuOpen(false)}/>} 

      <div className={`ext-guild-rail lg:hidden ${menuOpen?'open':''}`} aria-label="Discord installés">
        {(workspace.guilds||[]).map(g=>{const installed=g.installed!==false;return <button key={g.id} type="button" title={`${g.name}${installed?'':' · Bot non installé · Cliquer pour inviter'}`} onClick={()=>selectGuild(g)} className={`ext-guild-bubble relative ${installed?'':'opacity-50 grayscale border-dashed'} ${selectedGuild?.id===g.id&&installed?'active':''}`}>
          {g.icon?<img src={g.icon} alt=""/>:<span>{initials(g.name)}</span>}
          {!installed&&<span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full border border-black/60 bg-[#252a2e] text-base font-black leading-none text-white">+</span>}
        </button>})}
      </div>

      <aside className={`ext-module-panel lg:hidden ${menuOpen?'open':''}`}>
        <div className="ext-module-top">
          <div className="ext-server-context">
            {selectedGuild?.icon?<img src={selectedGuild.icon} alt=""/>:<div className="ext-server-fallback">{initials(selectedGuild?.name||'EX')}</div>}
            <div><strong>{selectedGuild?.name||'EXTINCTION++ RSS'}</strong><small>{selectedGuild?(selectedGuild.installed===false?'Bot non installé':'Bot installé'):'Discord sélectionné'}</small></div>
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

      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 gap-0.5 border-t border-white/10 bg-black/95 px-1 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))] backdrop-blur-xl lg:hidden">
        {bottomLinks.map(([href,label,Icon])=><Link key={href} href={href} prefetch={false} className="flex min-w-0 min-h-[57px] flex-col items-center justify-start gap-1 rounded-xl px-0.5 py-1.5 text-[10px] active:bg-red-600"><Icon size={21} className="shrink-0"/><span className="w-full text-center leading-tight break-words line-clamp-2">{label==='CFTools & BattleMetrics'?'CFTools':t(label)}</span></Link>)}
      </nav>

      <section className="ext-content px-4 py-5 lg:ml-[23rem] lg:p-10">{children}</section>
    </main>
  );
}

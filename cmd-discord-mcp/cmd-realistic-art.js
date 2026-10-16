// Photographic artwork registry. Legacy item IDs remain valid for saved profiles.
export const CMD_REALISTIC_ART={
 frame:{amethyst:'amethyst-frame',amethystspire:'amethyst-frame',cyanfire:'cyanfire-frame',pinkfire:'pinkfire-frame',solar:'gold-frame',floral:'rose-frame',royal:'gold-frame',sunflower:'sunflower-frame',pearls:'pearls-frame',darkvine:'ivy-frame',moonstars:'moon-frame',frost:'frost-frame',leopard:'leopard-frame',flame:'fire-frame',glacialcrown:'frost-frame',rubysurge:'ruby-frame',emeraldgeode:'emerald-frame',sapphirearcane:'sapphire-frame',celestialgold:'gold-frame',obsidianflame:'fire-frame',midnightrose:'rose-frame',moonstone:'moon-frame',prismaticglow:'prism-frame',autumnember:'autumn-frame',starforged:'star-frame'},
 avatar:{colosseum:'colosseum-avatar',crystal:'amethyst-avatar',fire:'fire-avatar',halo:'eclipse-avatar',flowers:'rose-avatar',neon:'neon-avatar',viking:'viking-avatar',skull:'skull-avatar',radioactive:'radioactive-avatar',amethystorbit:'amethyst-avatar',frosthalo:'frost-avatar',rubyhalo:'ruby-avatar',emeraldaura:'emerald-avatar',runicorbit:'runic-avatar',solareclipse:'eclipse-avatar',emberwreath:'fire-avatar',sakuraring:'rose-avatar',stardust:'stardust-avatar',moonpetals:'moon-avatar',magmaring:'fire-avatar',nebulabloom:'nebula-avatar',crown:'eclipse-avatar',diamond:'amethyst-avatar',stars:'stardust-avatar'},
 effect:{aurora:'aurora-scene',purplelightning:'lightning-scene',moonmist:'moon-scene',zombie:'zombie-scene',ghostship:'ghostship-scene',shadow:'shadow-scene',apocalypse:'apocalypse-scene',stars:'stars-scene',pulse:'pulse-scene',sparkle:'sparkle-scene'},
 nameplate:{urban:'urban-scene',nebula:'nebula-scene',emerald:'emerald-scene',moon:'moon-scene',heart:'heart-scene',leopard:'leopard-scene',cosmic:'nebula-scene',flowers:'flowers-scene',midnight:'urban-scene',halloween:'halloween-scene',aurora:'aurora-scene'}
};
CMD_REALISTIC_ART.badge=Object.fromEntries(['dayz','ark','gaming','creator','helper','event','pve','pvp','viking','star'].map(id=>[id,'badge-medal']));
export const CMD_REALISTIC_IDS=new Set(Object.values(CMD_REALISTIC_ART).flatMap(group=>Object.values(group)));
export function realisticShopItem(item){const type=item.type==='decoration'?'avatar':item.type;return item.type==='badge'||Boolean(CMD_REALISTIC_ART[type]&&Object.hasOwn(CMD_REALISTIC_ART[type],item.key))}
export function realisticArtworkPath(type,key,full=false){const group=Object.hasOwn(CMD_REALISTIC_ART,type)?CMD_REALISTIC_ART[type]:null;const id=group&&Object.hasOwn(group,key)?group[key]:null;return id?'/cmd-realistic/v1/'+id+(full?'-4k':'-preview')+'.webp':null}
export const CMD_REALISTIC_SHOP_CSS=`
/* Photographic assets: no tint, synthetic glow or animated brightness filter. */
.wrap .item .art.cmd-gem-art,.cmd-shop-preview-art .art.cmd-gem-art{aspect-ratio:16/9;background:radial-gradient(ellipse at 50% 30%,#302735,#111016);}
.wrap .item .art.cmd-avatar-art,.cmd-shop-preview-art .art.cmd-avatar-art{aspect-ratio:1;}
.wrap .item .art>img,.cmd-shop-preview-art .art>img{filter:none!important;animation:none!important;object-fit:contain}
.wrap .item .art.cmd-avatar-art .cmd-gem-mock,.cmd-shop-preview-art .cmd-avatar-art .cmd-gem-mock{width:58%;height:auto;aspect-ratio:1;left:50%;top:50%;transform:translate(-50%,-50%);inset-inline-end:auto;inset-block-end:auto}
.wrap .item .art.cmd-effect-preview{padding:0;aspect-ratio:16/9}
.wrap .item .art.cmd-effect-preview img,.cmd-shop-preview-art .cmd-effect-preview img{object-fit:cover}
.art.cmd-photo-nameplate{position:relative;display:grid;place-items:center;overflow:hidden;background:#111;isolation:isolate}
.cmd-photo-nameplate>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover!important;z-index:-1}
.cmd-photo-nameplate .shop-nameplate{position:relative;margin:0;display:block;padding:15px 28px;background:#100b1d8c;border:1px solid #ffffff35;border-radius:12px;font-size:20px;color:white;backdrop-filter:blur(8px)}
`;

export const CMD_REALISTIC_BADGE_CSS=`.art.cmd-photo-badge{position:relative;display:grid;place-items:center;isolation:isolate}.cmd-photo-badge>img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.cmd-photo-badge>b{position:relative;z-index:2;max-width:55%;text-align:center;font-size:clamp(14px,1.6vw,22px);letter-spacing:.06em;color:#e9dcff;text-shadow:0 2px 3px #000;font-weight:750}.cmd-shop-preview-art .cmd-photo-badge>b{font-size:clamp(24px,4vw,44px)}
`;

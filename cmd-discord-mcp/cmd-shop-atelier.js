// Shared, scoped storefront presentation. No payments or profile writes on preview.
export const CMD_SHOP_ATELIER_CSS = `
/* CMD_SHOP_URGENT_MOTION_20261016 — lightweight, accessible effects, no purchased asset changes */
.wrap .item .art{isolation:isolate;contain:paint;background:radial-gradient(ellipse at 30% 12%,#75459a30,transparent 62%),linear-gradient(145deg,#24172d,#100d17 83%)}
.wrap .item .art img{image-rendering:auto;object-fit:contain;backface-visibility:hidden}
.wrap .item .itemLine b{overflow-wrap:anywhere}
.wrap .item:focus-within{outline:2px solid #72e3f7;outline-offset:3px}
.cmd-shop-preview-art img{image-rendering:auto;filter:none!important}
.cmd-shop-motion-toggle{margin-left:auto;border:1px solid #78d5ea;border-radius:15px;padding:11px 16px;background:#121323;color:#b8f2ff;font:inherit;font-weight:600;cursor:pointer;min-height:44px}
.cmd-shop-motion-toggle:focus-visible{outline:3px solid #c0ecff;outline-offset:2px}
@keyframes cmdShopSoftGleam{0%,22%{transform:translateX(-150%);opacity:0}35%{opacity:.48}65%,100%{transform:translateX(150%);opacity:0}}
@keyframes cmdShopGentleFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
body:not(.cmd-shop-motion-off) .cmd-shop-group .item .art:after{content:'';position:absolute;inset:0;pointer-events:none;z-index:3;background:linear-gradient(108deg,transparent 24%,#9deeff0c 40%,#e9d2ff40 50%,#9deeff0c 60%,transparent 76%);animation:cmdShopSoftGleam 11s ease-in-out infinite}
body:not(.cmd-shop-motion-off) .cmd-shop-group .item:nth-child(3n+2) .art:after{animation-delay:-4s}
body:not(.cmd-shop-motion-off) .cmd-shop-preview-art .art>img{animation:cmdShopGentleFloat 8s ease-in-out infinite}
body.cmd-shop-motion-off .cmd-shop-group .item .art:after{animation:none!important;content:none!important}
body.cmd-shop-motion-off .cmd-shop-preview-art img{animation:none!important}
@media(prefers-reduced-motion:reduce){body .cmd-shop-group .item .art:after{animation:none!important;content:none!important}body .cmd-shop-preview-art img{animation:none!important}}

/* CMD Sphere boutique 4K: responsive gallery, high-resolution assets, immersive premium lighting */
.wrap .item .art img{image-rendering:auto;object-fit:contain;max-width:100%;max-height:100%;filter:none!important}
.wrap .item .art{overflow:hidden;isolation:isolate;background:radial-gradient(ellipse at 50% 18%,#6e3c9b44,transparent 60%),linear-gradient(155deg,#231331,#09080e 80%)}
.wrap .item{overflow:hidden;box-shadow:0 12px 36px #05030b66;transition:transform .24s ease,border-color .24s ease,box-shadow .24s ease}
.wrap .item:hover{transform:translateY(-4px);border-color:#b58bff;box-shadow:0 18px 45px #6b28a733}
.wrap .item .art:after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,transparent 15%,#ffffff09 48%,transparent 75%);transform:translateX(-110%);transition:transform .65s ease}
.wrap .item:hover .art:after{transform:translateX(110%)}
.cmd-shop-preview-dialog{box-shadow:0 30px 110px #000b,0 0 65px #8e4ed52b}
.cmd-shop-preview-art img{object-fit:contain!important;image-rendering:auto}
@media(prefers-reduced-motion:reduce){.wrap .item,.wrap .item .art:after{transition:none!important;transform:none!important}}

body:has(.cmd-shop-group){background:#0b0911;color:#f3efff}
.wrap:has(.cmd-shop-group){max-width:1480px!important;padding:28px clamp(14px,3vw,48px) 80px}
.wrap .hero{min-height:245px;display:flex;flex-direction:column;justify-content:center;padding:38px!important;background:radial-gradient(ellipse at 90% 0%,#6d28d944,transparent 60%),linear-gradient(120deg,#201431,#11121e)!important;box-shadow:none!important}
.wrap .hero h1{max-width:700px;font-size:clamp(32px,5vw,60px);font-weight:750;letter-spacing:-.05em;margin:0 0 12px}
.wrap .hero p{font-size:17px;line-height:1.6;max-width:600px;margin:0;color:#c8bed8}
.wrap .cmd-showcase-intro{display:none}
.cmd-shop-filter{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:28px 0 16px;padding:18px 0;border:0;border-bottom:1px solid #ffffff18;background:none}
.cmd-shop-filter label{font-size:12px;color:#c4b5d4}.cmd-shop-filter input,.cmd-shop-filter select{min-height:48px;border-radius:12px;padding:12px 14px;border:1px solid #6a567d;background:#17121f;color:#fff;font:inherit;max-width:100%}.cmd-shop-filter input{flex:1;min-width:180px}.cmd-shop-filter p{width:100%;margin:0;color:#a99ab8;font-size:13px}
.cmd-shop-categories{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px}.cmd-shop-categories button{padding:11px 17px;min-height:44px;border:1px solid #ffffff20;border-radius:24px;color:#c4bad1;background:#19121f;cursor:pointer;font:inherit}.cmd-shop-categories button[aria-pressed=true]{background:#e7d5ff;color:#29183b;border-color:#e7d5ff}
.cmd-shop-group{scroll-margin-top:90px;margin:30px 0 48px}.cmd-shop-group h2{font-size:25px!important;font-weight:650;letter-spacing:-.025em;margin:0 0 20px}
.wrap .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.wrap .item{min-width:0;padding:0 0 16px;display:flex;flex-direction:column;gap:10px;border:1px solid #ffffff13;border-radius:20px;background:#17121f;box-shadow:none;transition:border-color .18s}
.wrap .item:hover{transform:none;border-color:#b590dc;box-shadow:none}
.wrap .item .art{position:relative;width:100%;height:auto!important;min-height:0;aspect-ratio:1.35;border:0;border-bottom:1px solid #ffffff12;border-radius:19px 19px 0 0;background:radial-gradient(ellipse at 50% 20%,#3b2b50,#111019 75%)}
.wrap .item .art.cmd-avatar-art{aspect-ratio:1.35}.wrap .item .art.cmd-avatar-art>img{inset:0;width:100%;height:100%;object-fit:contain}
.wrap .item .art.cmd-avatar-art .cmd-gem-mock{inset:auto;top:50%;left:50%;width:48%;height:auto;aspect-ratio:1;transform:translate(-50%,-50%)}
.wrap .item .itemLine,.wrap .item>small{margin:0 18px}.wrap .item .itemLine{gap:8px;display:flex;justify-content:space-between;align-items:start}.wrap .item .itemLine b{font-size:17px;line-height:1.4;font-weight:650}.wrap .item>small{color:#b4a5c4;line-height:1.5;font-size:12px}
.wrap .item>button{margin:0 16px;min-height:44px;border-radius:10px;font-size:13px;font-weight:650}.wrap .item>.cmd-shop-preview-btn{margin-top:auto;background:transparent;color:#e2cafa;border:1px solid #665074}.wrap .item>button[data-type]{background:#a576df;border:0;color:#150923}.wrap .item>button:disabled{opacity:.5}.wrap .item>.cmd-shop-preview-btn:hover{background:#33233f}
.cmd-shop-group[hidden],.cmd-shop-group .item[hidden],.cmd-shop-empty[hidden]{display:none!important}.cmd-shop-empty{padding:36px;text-align:center;color:#d0bddf;border:1px solid #ffffff20;border-radius:16px}
.cmd-shop-membership{padding:22px;border:1px solid #ffffff20;border-radius:18px;background:#141019;margin-top:32px}.cmd-shop-membership>summary{font-size:17px;cursor:pointer;min-height:40px;align-content:center}
.cmd-shop-preview-overlay{position:fixed;inset:0;z-index:99999;background:#08050de8;backdrop-filter:blur(14px);padding:20px;display:grid;place-items:center}.cmd-shop-preview-overlay[hidden]{display:none!important}
.cmd-shop-preview-dialog{width:min(850px,100%);max-height:92dvh;overflow:auto;position:relative;border:1px solid #a17bc365;border-radius:26px;background:#17111f;padding:28px;color:#fff;box-shadow:0 30px 100px #0009}
.cmd-shop-preview-dialog h2{font-size:27px;letter-spacing:-.03em;margin:0 48px 8px 0}.cmd-shop-preview-close{position:absolute;right:18px;top:18px;width:44px;height:44px;border:1px solid #ffffff30;border-radius:50%;background:#35233f;color:#fff;font-size:24px;cursor:pointer}
.cmd-shop-preview-art .art{position:relative;display:grid;place-items:center;margin:24px auto;width:100%;height:auto!important;aspect-ratio:16/10;max-height:58dvh;overflow:hidden;border-radius:18px;background:radial-gradient(ellipse at 50% 15%,#372447,#0c0b12 75%)}
.cmd-shop-preview-art .art>img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:none;animation:none}.cmd-shop-preview-art .cmd-avatar-art{aspect-ratio:1.35;max-width:580px}.cmd-shop-preview-art .cmd-avatar-art .cmd-gem-mock{inset:auto;left:50%;top:50%;width:48%;height:auto;aspect-ratio:1;transform:translate(-50%,-50%)}
.cmd-shop-preview-art .cmd-gem-mock{inset:15% 12%}.cmd-shop-preview-art .cmd-avatar-art>img{inset:0;width:100%;height:100%}
.cmd-gem-avatar.cmd-shop-real-avatar{background-position:center!important;background-size:cover!important}.cmd-gem-avatar.cmd-shop-real-avatar:before,.cmd-gem-avatar.cmd-shop-real-avatar:after{content:none!important}
.cmd-shop-preview-status{color:#cbb6dc;font-size:14px;line-height:1.6}.cmd-shop-preview-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.cmd-shop-preview-apply{padding:13px 22px;border:0;border-radius:11px;background:#d7b4ff;color:#20102c;font:inherit;font-weight:650;cursor:pointer}.cmd-shop-preview-apply:disabled{opacity:.5;cursor:not-allowed}.cmd-shop-preview-actions a{color:#d7b4ff;padding:12px}
body.cmd-shop-modal-open{overflow:hidden}.cmd-shop-preview-dialog button:focus-visible,.cmd-shop-categories button:focus-visible{outline:3px solid #e8cfff;outline-offset:3px}
@media(min-width:1450px){.wrap .grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:760px){.wrap .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wrap .item .itemLine{margin:0 12px;flex-wrap:wrap}.wrap .item .itemLine b{font-size:14px}.wrap .item>small{margin:0 12px}.wrap .item>button{margin:0 10px}.cmd-shop-filter{align-items:stretch}.cmd-shop-filter input{flex-basis:100%;order:0}.cmd-shop-filter label{width:100%}.cmd-shop-filter select{flex:1}.cmd-shop-preview-dialog{padding:18px;border-radius:18px}.cmd-shop-preview-dialog h2{font-size:22px}.cmd-shop-preview-overlay{padding:10px}.cmd-shop-preview-art .art{aspect-ratio:1.2}.wrap .hero{padding:25px!important;min-height:210px}.cmd-shop-categories button{font-size:12px;padding:10px 13px}}
@media(max-width:350px){.wrap .grid{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.cmd-shop-preview-overlay *,.cmd-shop-group *{animation:none!important;transition:none!important}}
`;

export function shopAtelierClient(){
 'use strict';
 const $=(s,r=document)=>r.querySelector(s),all=(s,r=document)=>[...r.querySelectorAll(s)];
 const groups=all('.cmd-shop-group');if(!groups.length)return;

 const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 let motionEnabled=!media?.matches;
 try{if(localStorage.getItem('cmd-shop-motion')==='off')motionEnabled=false}catch{}
 function syncMotion(){document.body.classList.toggle('cmd-shop-motion-off',!motionEnabled||Boolean(media?.matches));const b=document.querySelector('.cmd-shop-motion-toggle');if(b){b.textContent=motionEnabled&&!media?.matches?'Animations : actives':'Animations : désactivées';b.setAttribute('aria-pressed',String(motionEnabled&&!media?.matches))}}
 const motionToggle=document.createElement('button');motionToggle.type='button';motionToggle.className='cmd-shop-motion-toggle';motionToggle.textContent='Animations';motionToggle.addEventListener('click',()=>{motionEnabled=!motionEnabled;try{localStorage.setItem('cmd-shop-motion',motionEnabled?'on':'off')}catch{}syncMotion()});
 media?.addEventListener?.('change',syncMotion);

 const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
 const nav=document.createElement('nav');nav.className='cmd-shop-categories';nav.setAttribute('aria-label','Types de personnalisation');
 let category='all';
 for(const [value,label] of [['all','Tout'],...groups.map(g=>[g.dataset.group,$('h2',g).textContent])]){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.category=value;b.setAttribute('aria-pressed',String(value==='all'));
  b.onclick=()=>{category=value;all('button',nav).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));filter()};nav.append(b);
 }
 $('.cmd-shop-filter').after(nav);
 const empty=document.createElement('p');empty.className='cmd-shop-empty';empty.textContent='Aucun élément ne correspond à ta recherche.';empty.hidden=true;nav.after(empty);
 function filter(){const q=fold($('#cmdShopSearch').value.trim()),tier=$('#cmdShopTier').value;let count=0;
  groups.forEach(g=>{let n=0;all('.item',g).forEach(c=>{const match=(!q||fold(c.dataset.search).includes(q))&&(tier==='all'||c.dataset.tier===tier)&&(category==='all'||g.dataset.group===category);c.hidden=!match;if(match){n++;count++}});g.hidden=!n});
  $('#cmdShopCount').textContent=count+' décoration'+(count>1?'s':'')+' disponible'+(count>1?'s':'');empty.hidden=count>0;
 }
 nav.append(motionToggle);syncMotion();
 $('#cmdShopSearch').addEventListener('input',filter);$('#cmdShopTier').addEventListener('change',filter);filter();
 let overlay=null,lastFocus=null,currentCard=null,avatar='';
 function close(){if(!overlay)return;overlay.hidden=true;$('.cmd-shop-preview-art',overlay).replaceChildren();document.body.classList.remove('cmd-shop-modal-open');lastFocus?.focus()}
 function open(card,trigger){
  if(!overlay){overlay=document.createElement('div');overlay.className='cmd-shop-preview-overlay';overlay.hidden=true;overlay.innerHTML='<section class="cmd-shop-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="cmdShopPreviewTitle"><button type="button" class="cmd-shop-preview-close" aria-label="Fermer l’aperçu">×</button><h2 id="cmdShopPreviewTitle"></h2><div class="cmd-shop-preview-art"></div><p class="cmd-shop-preview-status" role="status"></p><div class="cmd-shop-preview-actions"><button type="button" class="cmd-shop-preview-apply">Appliquer à mon profil</button><a href="/profile">Voir mon profil</a></div></section>';document.body.append(overlay);
   overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('.cmd-shop-preview-close'))close()});
   $('.cmd-shop-preview-apply',overlay).onclick=async()=>{const source=$('button[data-type][data-key]',currentCard),b=$('.cmd-shop-preview-apply',overlay),status=$('.cmd-shop-preview-status',overlay);if(!source||source.disabled||b.disabled)return;b.disabled=true;status.textContent='Application en cours…';try{const r=await fetch('/api/shop/install',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:source.dataset.type,key:source.dataset.key})});const d=await r.json();if(!r.ok)throw Error(d.error||'Application impossible');source.textContent='Appliqué ✓';status.textContent='Décoration enregistrée sur ton profil.'}catch(e){status.textContent=e.message}finally{b.disabled=false}};
  }
  currentCard=card;lastFocus=trigger;$('#cmdShopPreviewTitle',overlay).textContent=$('.itemLine b',card).textContent;
  const art=$('.art',card).cloneNode(true);all('img',art).forEach(img=>{img.loading='eager';img.decoding='async'});
  if(avatar)all('.cmd-gem-avatar',art).forEach(el=>{el.classList.add('cmd-shop-real-avatar');el.style.backgroundImage='url('+JSON.stringify(avatar)+')'});
  $('.cmd-shop-preview-art',overlay).replaceChildren(art);const source=$('button[data-type][data-key]',card),apply=$('.cmd-shop-preview-apply',overlay);apply.disabled=!source||source.disabled;apply.textContent=apply.disabled?'Débloquer dans la boutique Diamants':'Appliquer à mon profil';
  $('.cmd-shop-preview-status',overlay).textContent=apply.disabled?'Cette collection nécessite Premium ou un déblocage avec des diamants.':'Aperçu uniquement. Applique cette décoration pour l’enregistrer sur ton profil.';
  overlay.hidden=false;document.body.classList.add('cmd-shop-modal-open');$('.cmd-shop-preview-close',overlay).focus();
 }
 document.addEventListener('click',e=>{const b=e.target.closest('.cmd-shop-preview-btn');if(b)open(b.closest('.item'),b)});
 document.addEventListener('keydown',e=>{if(!overlay||overlay.hidden)return;if(e.key==='Escape'){e.preventDefault();close()}else if(e.key==='Tab'){const items=all('button:not(:disabled),a[href]',overlay),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 fetch('/api/profile',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{const v=d?.profile?.avatar||'';if(/^data:image\/(png|jpeg|webp|gif);base64,/.test(v)||/^https:\/\//.test(v)||/^\/(?!\/)/.test(v))avatar=v}).catch(()=>{});
}
export const CMD_SHOP_ATELIER_FILTER='<section class="cmd-shop-filter"><label for="cmdShopSearch">Rechercher une décoration</label><input id="cmdShopSearch" type="search" placeholder="Cristaux, roses, lune…" autocomplete="off"><label for="cmdShopTier">Collection</label><select id="cmdShopTier"><option value="all">Toutes</option><option value="free">Gratuites</option><option value="premium">Premium</option></select><p id="cmdShopCount" aria-live="polite"></p></section>';
export const CMD_SHOP_ATELIER_MARKUP='<style>'+CMD_SHOP_ATELIER_CSS+'</style><script>('+shopAtelierClient.toString()+')();</script>';

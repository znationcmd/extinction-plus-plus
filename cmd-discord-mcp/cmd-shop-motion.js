/* Photographic material animation. Pauses offscreen, in background tabs and on request. */
(()=>{'use strict';if(window.__cmdPhotoMotion)return;window.__cmdPhotoMotion=true;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let enabled=!reduced.matches;
try{if(localStorage.getItem('cmd-photo-motion')==='off')enabled=false}catch{}
const style=document.createElement('style');style.textContent=`
.cmd-photo-sheen{position:absolute;inset:0;pointer-events:none;z-index:6;background:linear-gradient(112deg,transparent 15%,#e9d7ff00 34%,#ffffff6b 43%,#ffffff12 47%,transparent 54%);background-size:280% 100%;background-position:130% 0;mix-blend-mode:screen;mask-repeat:no-repeat;mask-position:center;mask-size:contain;-webkit-mask-repeat:no-repeat;-webkit-mask-position:center;-webkit-mask-size:contain;animation:cmdRealPhotoShine 9s ease-in-out infinite;animation-play-state:paused;opacity:.65}
.cmd-motion-visible .cmd-photo-sheen,.cmd-motion-visible.cmd-photo-sheen{animation-play-state:running}
.cmd-photo-scene .art{overflow:hidden}.cmd-photo-scene.cmd-motion-visible .art>img{animation:cmdRealSceneDrift 24s ease-in-out infinite alternate!important;transform-origin:50% 45%;will-change:transform}
.cmd-photo-lightning.cmd-motion-visible .art:after{content:'';position:absolute;inset:0;background:#dfd0ff;pointer-events:none;opacity:0;animation:cmdRealLightning 11s linear infinite}
.cmd-profile-art-avatar.cmd-motion-visible{animation:cmdRealAvatarBreathe 7s ease-in-out infinite!important}
.cmd-profile-effect-art.cmd-motion-visible{animation:cmdRealSceneDrift 28s ease-in-out infinite alternate!important;transform-origin:50% 40%}
.cmd-profile-photo-sheen{position:absolute;inset:0;pointer-events:none;z-index:7;mask-size:100% 100%;-webkit-mask-size:100% 100%}
.cmd-profile-avatar-sheen{position:absolute;left:9px;top:-89px;width:180px;height:180px;pointer-events:none;z-index:8}
.cmd-photo-motion-toggle{min-height:44px;border:1px solid #8b6ba5;border-radius:24px;background:#21162e;color:#e6d1f7;padding:10px 16px;cursor:pointer;font:inherit}
.cmd-motion-paused .cmd-photo-sheen,.cmd-motion-paused .cmd-photo-scene .art>img,.cmd-motion-paused .cmd-profile-effect-art,.cmd-motion-paused .cmd-profile-art-avatar,.cmd-motion-paused .cmd-photo-lightning .art:after{animation-play-state:paused!important;will-change:auto}
@keyframes cmdRealPhotoShine{0%,22%{background-position:140% 0;opacity:0}35%{opacity:.5}58%{background-position:-70% 0;opacity:0}100%{background-position:-70% 0;opacity:0}}
@keyframes cmdRealSceneDrift{from{transform:scale(1.005) translate3d(-.3%,0,0)}to{transform:scale(1.04) translate3d(.3%,-.4%,0)}}
@keyframes cmdRealAvatarBreathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.8px)}}
@keyframes cmdRealLightning{0%,18%,24%,100%{opacity:0}19%{opacity:.13}20%{opacity:.02}21%{opacity:.1}23%{opacity:0}}
@media(prefers-reduced-motion:reduce){.cmd-photo-sheen,.cmd-photo-scene .art>img,.cmd-profile-effect-art,.cmd-profile-art-avatar,.cmd-photo-lightning .art:after{animation:none!important;will-change:auto!important}}
`;
document.head.append(style);const observed=new Set();
const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>entries.forEach(e=>{e.target.classList.toggle('cmd-motion-visible',e.isIntersecting);if(e.isIntersecting)activate(e.target)}),{rootMargin:'40px'}):null;
function activate(el){for(const s of (el.matches('.cmd-photo-sheen')?[el]:el.querySelectorAll('.cmd-photo-sheen'))){const src=s.dataset.maskSrc;if(src){s.style.maskImage='url('+JSON.stringify(src)+')';s.style.webkitMaskImage='url('+JSON.stringify(src)+')'}}}
function observe(el){if(observed.has(el))return;observed.add(el);if(observer)observer.observe(el);else el.classList.add('cmd-motion-visible')}
function refresh(){for(const img of document.querySelectorAll('.art>img,.cmd-profile-art-frame,.cmd-profile-art-avatar,.cmd-profile-effect-art')){
 const src=img.getAttribute('src')||'';if(!src.startsWith('/cmd-art/')&&!src.startsWith('/cmd-realistic/'))continue;
 const parent=img.closest('.item,.diamondCard,.cmd-shop-preview-art')||img;observe(parent);
 const isEffect=src.includes('/effect/')||/-scene-/.test(src);if(isEffect){parent.classList.add('cmd-photo-scene');if(src.includes('purplelightning')||src.includes('lightning-scene'))parent.classList.add('cmd-photo-lightning');continue}
 if(img.dataset.photoSheen)return;img.dataset.photoSheen='1';const sheen=document.createElement('span');sheen.setAttribute('aria-hidden','true');sheen.className='cmd-photo-sheen';sheen.dataset.maskSrc=src;sheen.style.animationDelay='-'+(observed.size%7)+'s';
 if(img.matches('.cmd-profile-art-frame')){sheen.classList.add('cmd-profile-photo-sheen');img.after(sheen);observe(sheen)}
 else if(img.matches('.cmd-profile-art-avatar')){sheen.classList.add('cmd-profile-avatar-sheen');img.after(sheen);observe(sheen);observe(img)}
 else {img.parentElement.append(sheen);if(parent.classList.contains('cmd-motion-visible'))activate(parent)}
 }
 for(const el of observed)if(!el.isConnected){observer?.unobserve(el);observed.delete(el)}
}
function sync(){document.documentElement.classList.toggle('cmd-motion-paused',!enabled||document.hidden);for(const b of document.querySelectorAll('.cmd-photo-motion-toggle')){b.textContent=enabled?'Animations : activées':'Animations : coupées';b.setAttribute('aria-pressed',String(enabled))}document.dispatchEvent(new CustomEvent('cmd:photo-motion',{detail:{enabled:enabled&&!document.hidden&&!reduced.matches}}))}
window.cmdPhotoMotionEnabled=()=>enabled&&!document.hidden&&!reduced.matches;
function start(){const anchor=document.querySelector('.cmd-shop-categories,.cmd-pm-detail-tabs,.tabs');if(anchor&&!document.querySelector('.cmd-photo-motion-toggle')){const b=document.createElement('button');b.type='button';b.className='cmd-photo-motion-toggle';b.onclick=()=>{enabled=!enabled;try{localStorage.setItem('cmd-photo-motion',enabled?'on':'off')}catch{}sync()};anchor.after(b)}refresh();sync();}
reduced.addEventListener('change',e=>{if(e.matches)enabled=false;sync()});document.addEventListener('visibilitychange',sync);document.addEventListener('cmd:photo-preview',refresh);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

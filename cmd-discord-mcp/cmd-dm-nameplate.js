/* Active user nameplate in personal messages; no server channel nameplates. */
(()=>{'use strict';const host=document.querySelector('#messages');if(!host)return;
const css=document.createElement('style');css.textContent=`
#messages .bubble{position:relative;box-sizing:border-box}
#messages .bubble .cmd-dm-active-plate{display:block;max-width:min(220px,100%);height:31px;border-radius:8px;margin:0 0 6px;padding:5px 9px;background-position:center;background-size:cover;overflow:hidden}
#messages .bubble .cmd-dm-active-plate span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:750;color:#fff;text-shadow:0 1px 4px #07040b}
@media(max-width:550px){#messages .bubble .cmd-dm-active-plate{max-width:160px;height:27px}}
`;document.head.append(css);
let profile=null;
fetch('/api/profile',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{profile=data?.profile||null;paint()}).catch(()=>{});
let busy=false;
function paint(){if(!profile)return;const key=String(profile.nameplateStyle||'none');if(!/^[a-z0-9-]{1,60}$/.test(key)||key==='none')return;
 host.querySelectorAll('.bubble.me').forEach(b=>{if(b.querySelector('.cmd-dm-active-plate'))return;const plate=document.createElement('div');plate.className='cmd-dm-active-plate';
 const name=document.createElement('span');name.textContent=profile.displayName||profile.username||'Mon profil';
 plate.style.backgroundImage='linear-gradient(90deg,#21132d77,#21132d55),url("/cmd-art/nameplate/'+encodeURIComponent(key)+'.svg?v=20261016dm")';
 plate.append(name);b.prepend(plate)});
}
new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;paint()})}).observe(host,{childList:true,subtree:true});
})();
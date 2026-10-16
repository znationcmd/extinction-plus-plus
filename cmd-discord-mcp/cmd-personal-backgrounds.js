/* CMD Sphere custom photographic backgrounds — private IndexedDB device storage. */
(()=>{'use strict';
const host=document.querySelector('#channelMessages')||document.querySelector('#messages');
if(!host)return;
const native=Boolean(document.querySelector('#channelMessages'));
const scope=()=>{
 if(native){const g=typeof CHAT!=='undefined'?CHAT.guildId:new URLSearchParams(location.search).get('guildId');const c=typeof CHAT!=='undefined'?CHAT.channelId:new URLSearchParams(location.search).get('channelId');return 'server:'+String(g||'default')}
 const open=new URLSearchParams(location.search).get('open')||document.querySelector('.thread.active')?.dataset.id||'default';return 'private:'+open;
};
const css=document.createElement('style');
css.textContent='.cmd-background-tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding:8px;margin:8px 0;border:1px solid #8056ad66;border-radius:12px;background:#1d1228;color:#efe4ff}.cmd-background-tools button,.cmd-background-tools label{background:#342448;border:1px solid #916eba;color:#fff;border-radius:9px;padding:10px 12px;min-height:42px;font:600 13px system-ui;cursor:pointer}.cmd-background-tools input[type=file]{position:absolute;width:1px;height:1px;clip-path:inset(50%)}.cmd-background-tools .cmd-bg-state{font:12px system-ui;color:#b8a5d0}.cmd-custom-background{background-size:cover!important;background-position:center!important;background-attachment:local!important;position:relative;isolation:isolate}.cmd-custom-background:before{content:"";position:absolute;inset:0;background:#100a1bc2;pointer-events:none;z-index:-1}';
document.head.append(css);
const tools=document.createElement('div');tools.className='cmd-background-tools';
const mode=document.createElement('select');mode.setAttribute('aria-label','Portée du fond');mode.innerHTML='<option value="global">Fond principal (partout)</option><option value="server">Fond par serveur</option>';mode.style.cssText='background:#342448;color:white;border:1px solid #916eba;border-radius:9px;padding:10px;max-width:100%';
const selectedKey=()=>mode.value==='global'?'global':scope();
mode.value=native?'server':'global';
mode.onchange=()=>{lastScope='';paint()};
const label=document.createElement('label');label.textContent='📷 Importer mon image';const picker=document.createElement('input');picker.type='file';picker.accept='image/jpeg,image/png,image/webp';label.append(picker);
const reset=document.createElement('button');reset.type='button';reset.textContent='Supprimer le fond';
const state=document.createElement('span');state.className='cmd-bg-state';state.textContent='Fond personnel : principal ou par serveur (sur cet appareil)';
tools.append(mode,label,reset,state);host.before(tools);
const dbPromise=new Promise((resolve,reject)=>{if(!indexedDB){reject(Error('Stockage local indisponible'));return}const r=indexedDB.open('cmd-personal-scenes',1);r.onupgradeneeded=()=>r.result.createObjectStore('backgrounds');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const op=async(method,key,value)=>{const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction('backgrounds','readwrite'),store=tx.objectStore('backgrounds');const req=method==='put'?store.put(value,key):method==='delete'?store.delete(key):store.get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})};
let lastScope='',activeUrl='';
const surfaces=()=>[host,...document.querySelectorAll('.cmd-server-sidebar,.cmd-server-panel,.server-sidebar,.channel-sidebar,.guild-sidebar,#guildSidebar,#channelSidebar')];
function clearSurfaces(){for(const el of surfaces()){el.classList.remove('cmd-custom-background');el.style.removeProperty('background-image')}}
async function paint(){const k=scope();if(k===lastScope)return;lastScope=k;if(activeUrl)URL.revokeObjectURL(activeUrl);activeUrl='';clearSurfaces();try{const blob=await op('get',k)||await op('get','global');if(k!==scope())return;if(blob){activeUrl=URL.createObjectURL(blob);for(const el of surfaces()){el.style.backgroundImage='linear-gradient(#100a1b77,#100a1b77),url('+JSON.stringify(activeUrl)+')';el.classList.add('cmd-custom-background')}}}catch{state.textContent='Stockage local indisponible'}}
picker.addEventListener('change',async()=>{const file=picker.files?.[0];if(!file)return;if(file.size>8*1024*1024){alert('Image trop volumineuse (maximum 8 Mo).');return}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){alert('Format non accepté.');return}try{const bitmap=await createImageBitmap(file);if(bitmap.width>8000||bitmap.height>8000)throw Error('Dimensions trop grandes');const canvas=document.createElement('canvas');const ratio=Math.min(1,1920/bitmap.width,1080/bitmap.height);canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const blob=await new Promise(ok=>canvas.toBlob(ok,'image/webp',.83));if(!blob)throw Error('Image impossible à traiter');await op('put',selectedKey(),blob);lastScope='';await paint();state.textContent='Image personnalisée enregistrée sur cet appareil'}catch(e){alert('Import impossible : '+e.message)}finally{picker.value=''}});
reset.onclick=async()=>{try{await op('delete',selectedKey());lastScope='';await paint();state.textContent='Fond supprimé'}catch(e){alert(e.message)}};
paint();setInterval(()=>{if(scope()!==lastScope)paint()},1200);window.addEventListener('popstate',()=>{lastScope='';paint()});
})();
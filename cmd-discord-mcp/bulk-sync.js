/* One action, two durable server jobs: structure then accessible history/catalogs. */
(function(){
'use strict';
let timer=null,busy=false,visible=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function request(path,body){const r=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const d=await r.json();if(d.needsLink){location.href='/dashboard-login?link=1&next='+encodeURIComponent('/dashboard?sync=1');return null}if(!r.ok)throw Error(d.error||'Synchronisation indisponible');return d}
const panel=document.createElement('section');panel.id='cmd-bulk-sync';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Tout synchroniser');
panel.innerHTML='<div class="cmd-bulk-card"><header><h2>Tout synchroniser</h2><button type="button" data-close aria-label="Fermer">×</button></header><p>Serveurs, catégories, salons, rôles, bots, webhooks et historique accessibles aux bots autorisés.</p><div data-progress role="status" aria-live="polite"></div><div class="cmd-bulk-actions"><button type="button" data-start>Lancer / reprendre</button><button type="button" data-check>Actualiser</button><button type="button" data-diagnostics>Vérifier ce qui est réellement importé</button><button type="button" data-restore>Restaurer les archives déjà sauvegardées</button><button type="button" data-audit-button>Vérifier les données réellement importées</button></div><p>La récupération continue sur le serveur après fermeture de cette fenêtre. Les réglages privés des bots tiers ne sont pas exportés par Discord.</p></div>';
const style=document.createElement('style');style.textContent='#cmd-bulk-sync[hidden]{display:none}#cmd-bulk-sync{position:fixed;inset:0;z-index:110010;background:#090610d9;display:grid;place-items:center;padding:12px;box-sizing:border-box}#cmd-bulk-sync *{box-sizing:border-box}.cmd-bulk-card{width:min(620px,100%);max-height:calc(100dvh - 24px);overflow:auto;background:#25212e;color:#f5f0ff;border:1px solid #8e65c8;border-radius:18px;padding:20px;overflow-wrap:anywhere}.cmd-bulk-card header{display:flex;gap:10px;align-items:center}.cmd-bulk-card h2{flex:1;margin:0;font-size:22px}.cmd-bulk-card p{line-height:1.5;font-size:14px}.cmd-bulk-card button{background:#6742a3;color:white;border:0;border-radius:9px;padding:11px;cursor:pointer}.cmd-bulk-card button:disabled{opacity:.6}.cmd-bulk-actions{display:flex;gap:10px;flex-wrap:wrap}.cmd-bulk-card progress{width:100%;accent-color:#ac7cf4}.cmd-bulk-card li{margin:6px 0}.cmd-bulk-rail{flex:none;min-height:52px;width:52px;border-radius:50%;background:#6742a3;color:white;border:0;cursor:pointer;font-weight:800;font-size:12px}';document.head.append(style);document.body.append(panel);
const status=panel.querySelector('[data-progress]'),startButton=panel.querySelector('[data-start]');
function show(){visible=true;panel.hidden=false}
function stop(){visible=false;panel.hidden=true;clearTimeout(timer);timer=null}
function draw(title,detail,percent,errors=[]){status.innerHTML='<h3>'+esc(title)+'</h3><progress max="100" value="'+percent+'"></progress><p>'+esc(detail)+'</p>'+(errors.length?'<details open><summary>Éléments à vérifier ('+errors.length+')</summary><ul>'+errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul></details>':'')}
async function check(){
 clearTimeout(timer);timer=null;
 try{
  const data=await request('/api/discord/sync-job');if(!data)return;const j=data.job;
  if(!j){draw('Prêt','Clique sur Lancer pour récupérer tous tes serveurs liés.',0);return}
  const p=j.progress||{},s=j.summary||{};
  let errors=[s.error,...(s.failed||[]).map(e=>(e.name||e.id)+': '+e.error),...(s.warnings||[]).map(e=>(e.name||e.id)+': '+e.error),...(s.botErrors||[]).map(e=>e.error)].filter(Boolean);
  let running=['queued','running'].includes(j.status);
  if(running)draw('1/2 · Serveurs et salons',Number(p.index||0)+' / '+Number(p.total||0)+' serveurs · '+(p.name||'Préparation'),p.total?Math.min(45,45*p.index/p.total):0,errors);
  else if(j.status==='failed')draw('Synchronisation interrompue',s.error||'Relance pour réessayer.',0,errors);
  else if(s.mirrorJob){
   const result=await request('/api/mirror/status?jobId='+encodeURIComponent(s.mirrorJob));if(!result)return;const m=result.job;
   if(!m)throw Error('La tâche de sauvegarde est introuvable. Actualise ou relance la synchronisation.');
   const mp=m.progress||{},ms=m.summary||{};running=['queued','running'].includes(m.status);
   errors.push(...(ms.errors||[]).map(e=>(e.guildName||e.guildId||'Discord')+(e.channelId?' / '+e.channelId:'')+': '+e.error));
   if(ms.shellGuilds)errors.push(ms.shellGuilds+' serveur(s) sans bot CMD : contenu non accessible.');
   const counts=Number(ms.bots||0)+' bots · '+Number(ms.webhooks||0)+' webhooks · '+Number(ms.messages??mp.messages??0)+' messages';
   draw(running?'2/2 · Bots, webhooks et messages':m.status==='failed'?'Sauvegarde interrompue':errors.length?'Terminé avec des éléments inaccessibles':'Synchronisation terminée',running?(mp.label||'Archivage')+' · '+(mp.guildName||'')+(mp.channelName?' / #'+mp.channelName:'')+' · '+Number(mp.messages||0)+' messages':counts,running?45+Math.min(54,mp.guildCount?54*Math.max(0,(mp.guildIndex||1)-1)/mp.guildCount:0):m.status==='complete'?100:45,errors);
  }else draw('Synchronisation partielle',Number(p.full||0)+' serveurs avec salons · '+Number(p.shell||0)+' sans bot. Historique non récupéré.',45,errors);
  startButton.disabled=running||busy;startButton.textContent=running?'Synchronisation en cours…':'Tout synchroniser à nouveau';
  if(running&&visible)timer=setTimeout(check,3000);
 }catch(e){draw('Suivi indisponible',e.message+' La fermeture du suivi ne stoppe pas le travail serveur.',0);startButton.disabled=false}
}
async function start(){if(busy)return;busy=true;show();startButton.disabled=true;draw('Démarrage','Recherche des serveurs accessibles…',0);try{await request('/api/discord/sync',{});await check()}catch(e){draw('Impossible de démarrer',e.message,0);startButton.disabled=false}finally{busy=false}}

async function restoreArchive(){
  const button=panel.querySelector('[data-restore]');
  if(button.disabled)return;
  if(!confirm('Reconstruire les serveurs et salons CMD Sphere depuis les copies Discord déjà sauvegardées ? Les messages et modifications CMD existants seront conservés ; aucune modification ne sera envoyée à Discord.'))return;
  show();button.disabled=true;
  let offset=0,total=0,processed=0,restoredServers=0,channels=0,roles=0,errors=[];
  try{
    do{
      const r=await request('/api/native/restore-from-mirror',{offset,limit:6});if(!r)return;
      total=Number(r.total||0);processed+=Number(r.processed||0);restoredServers+=Number(r.restoredServers||0);
      channels+=Number(r.newChannels||0);roles+=Number(r.newRoles||0);
      errors.push(...(r.issues||[]).map(e=>(e.guildId||'Serveur')+': '+e.error));
      offset=Number(r.nextOffset??(offset+6));
      draw('Restauration des archives Discord dans CMD Sphere',
        'Traitement '+Math.min(offset,total)+' / '+total+' sauvegardes · '+channels+' nouveaux salons · '+roles+' nouveaux rôles. Les messages déjà archivés restent conservés.',
        total?Math.min(99,Math.round(100*offset/total)):100,errors.slice(-15));
      if(!r.hasMore)break;
    }while(true);
    draw('Restauration terminée',
      total+' sauvegardes vérifiées · '+processed+' traitées · '+channels+' nouveaux salons · '+roles+' nouveaux rôles. Les serveurs déjà présents ne sont pas écrasés.',
      100,errors.slice(-15));
    const link=document.createElement('button');link.type='button';link.textContent='Actualiser CMD Sphere';
    link.onclick=()=>location.assign('/dashboard?restored=1');status.appendChild(link);
  }catch(err){draw('Restauration interrompue',
    err.message+' · '+Math.min(offset,total)+' / '+total+' sauvegardes traitées. Relance pour reprendre sans effacer les données.',0,errors.slice(-10))}
  finally{button.disabled=false}
}
panel.querySelector('[data-audit-button]').onclick=async()=>{
  show();draw('Vérification des données importées','Lecture des données stockées dans CMD Sphere…',20);
  try{
    const d=await request('/api/native/import-diagnostics');if(!d)return;
    draw('Vérification des données enregistrées',
      Number(d.nativeGuilds||0)+' serveurs CMD · '+Number(d.mirroredGuilds||0)+' archives Discord · '+
      Number(d.archivedMessages||0)+' messages sauvegardés · '+
      Number(d.readableMessages||0)+' messages avec texte · '+Number(d.nativeMessages||0)+' messages CMD locaux.',
      100,(d.guilds||[]).filter(g=>!g.channels||g.archivedMessages&&!g.readableMessages).map(g=>
         g.name+': '+Number(g.channels)+' salon(s) · '+Number(g.archivedMessages)+' messages archivés · '+Number(g.readableMessages)+' textes'));
  }catch(e){draw('Diagnostic impossible',e.message,0)}
};

async function importDiagnostics(){
  show();const button=panel.querySelector('[data-diagnostics]');button.disabled=true;
  draw('Contrôle de l’import','Lecture des serveurs, des salons et des textes réellement présents dans PostgreSQL…',20);
  try{
    const d=await request('/api/native/import-diagnostics');
    const count=Number(d.archivedMessages||0),readable=Number(d.readableMessages||0),native=Number(d.nativeMessages||0);
    const rows=(d.guilds||[]).filter(x=>Number(x.archivedMessages||0)>0||Number(x.channels||0)>0);
    const problems=rows.filter(x=>Number(x.archivedMessages||0)>0&&Number(x.readableMessages||0)===0).map(x=>(x.name||'Serveur')+' : '+Number(x.archivedMessages||0)+' messages archivés, aucun texte fourni au bot. Vérifier Message Content Intent.');
    draw('Contrôle réel de l’import',
      Number(d.nativeGuilds||0)+' serveurs CMD · '+Number(d.mirroredGuilds||0)+' serveurs sauvegardés · '+count+' messages archivés dont '+readable+' avec texte · '+native+' messages CMD locaux.',
      100,problems);
    if(!readable&&count)status.insertAdjacentHTML('beforeend','<p>Les messages ont été enregistrés sans texte. CMD Sphere ne peut pas reconstruire ce que Discord n’a pas fourni au bot.</p>');
    const restore=panel.querySelector('[data-restore]');if(restore)restore.focus();
  }catch(err){draw('Contrôle indisponible',err.message,0)}
  finally{button.disabled=false}
}
panel.querySelector('[data-close]').onclick=stop;panel.querySelector('[data-start]').onclick=start;panel.querySelector('[data-check]').onclick=check;panel.querySelector('[data-diagnostics]').onclick=importDiagnostics;panel.querySelector('[data-restore]').onclick=restoreArchive;
const rail=document.querySelector('.server-rail');if(rail){const button=document.createElement('button');button.className='cmd-bulk-rail';button.type='button';button.title='Tout synchroniser';button.setAttribute('aria-label','Tout synchroniser');button.textContent='↻ Tout';button.onclick=start;rail.prepend(button)}
const old=document.querySelector('#syncDiscordBtn');if(old){old.textContent='↻ Tout synchroniser';old.onclick=start}
window.cmdSphereBulkSync={start,open:()=>{show();return check()}};
})();

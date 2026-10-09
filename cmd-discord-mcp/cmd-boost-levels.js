// CMD Sphere server boosts and real feature entitlements. Does not modify Discord servers.
const tiers=Object.freeze([
{level:0,required:0,name:"Niveau de base",title:"Les essentiels",advantages:["Salons et catégories","Rôles et permissions","Invitations et messages"]},
{level:1,required:2,name:"Niveau 1",title:"Communauté remarquable",advantages:["Badge et couleurs de boost","Packs de badges pour ton tag","Icône GIF animée du serveur"]},
{level:2,required:5,name:"Niveau 2",title:"Personnalisation avancée",advantages:["Tags de serveur dès 3 boosts","Rôles dégradés et icônes dès 3 boosts","Bannière de serveur personnalisée"]},
{level:3,required:7,name:"Niveau 3",title:"Communauté légendaire",advantages:["Lien d'invitation personnalisé","Bannière GIF animée","Tous les avantages des niveaux précédents"]}
]);
export const CMD_BOOST_TIERS=tiers;
export const cmdBoostLevel=n=>n>=7?3:n>=5?2:n>=2?1:0;
export const cmdBoostNext=n=>n>=7?null:n>=5?7:n>=2?5:2;
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const validId=x=>/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(x||""));
const botSafe=x=>String(x||"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,30);
export async function cmdBoostCount(pool,id){
 if(!validId(id))throw Error("Serveur CMD Sphere invalide.");
 const {rows}=await pool.query("SELECT g.owner_user_id,g.founder_auto_boost,((SELECT COUNT(*)::int FROM cmd_server_boosts b WHERE b.guild_id=g.id AND b.active=TRUE)+(SELECT COUNT(*)::int FROM cmd_star_boosts sb WHERE sb.guild_id=g.id AND sb.expires_at>NOW())+CASE WHEN g.founder_auto_boost THEN 7 ELSE 0 END)::int AS boosts FROM cmd_native_guilds g WHERE g.id=$1",[id]);
 if(!rows[0])throw Error("Serveur CMD Sphere introuvable.");
 const boosts=Number(rows[0].boosts||0),founder=Boolean(rows[0].founder_auto_boost);
 const rr=await pool.query("SELECT perk FROM cmd_server_boost_perks WHERE guild_id=$1 AND active=TRUE",[id]);
 const active=new Set(rr.rows.map(x=>String(x.perk))),extras={tag:founder,roleStyles:founder};
 let allocated=0;
 if(!founder){for(const perk of ["tag","roleStyles"]){if(active.has(perk)&&boosts-allocated>=3){extras[perk]=true;allocated+=3}}}
 return {boosts,founder,extras,allocated,levelBoosts:founder?Math.max(7,boosts):Math.max(0,boosts-allocated),ownerId:String(rows[0].owner_user_id)};
}
export async function requireCmdBoosts(pool,guildId,min){
 const state=await cmdBoostCount(pool,guildId);
 if(state.levelBoosts<min)throw Error("Cette option demande "+min+" boosts affectés aux niveaux. "+state.allocated+" sont réservés aux avantages supplémentaires.");
 return state;
}
export async function requireCmdExtraPerk(pool,guildId,perk){const x=await cmdBoostCount(pool,guildId);if(!x.extras[perk])throw Error("Active cet avantage avec 3 boosts dans le menu du serveur.");return x;}
function htmlPage(g,state,access,baseUrl){
 const count=state.boosts,credits=state.levelBoosts,level=cmdBoostLevel(credits),next=cmdBoostNext(credits),canEdit=access==="owner",url=baseUrl+"/invite/"+g.invite_code;
 const tiersHTML=tiers.slice(1).map(t=>'<article class="tier '+(level>=t.level?'ready':'')+'"><div class="tier-head"><span class="orb">✦</span><div><small>NIVEAU '+t.level+'</small><h3>'+t.title+'</h3></div><span class="state">'+(level>=t.level?'✓ Débloqué':'🔒 '+t.required+' boosts')+'</span></div><div class="progress"><div style="width:'+Math.min(100,credits/t.required*100)+'%"></div></div><div class="perk-list">'+t.advantages.map(a=>'<div><span>✦</span> '+esc(a)+'</div>').join('')+'</div></article>').join("");
const perkButton=k=>'<button type="button" class="cmdExtraToggle" data-perk="'+k+'" data-enabled="'+(state.extras[k]?'yes':'no')+'" style="display:block;border:1px solid #8c73b2;border-radius:9px;background:#54447d;color:white;font-weight:800;padding:10px;margin-top:10px;width:100%" '+(!canEdit||state.founder||(!state.extras[k]&&credits<3)?'disabled':'')+'>'+(state.founder?'👑 Activé à vie':state.extras[k]?'✓ Actif · récupérer 3 boosts':credits>=3?'Débloquer avec 3 boosts':'3 boosts libres nécessaires')+'</button>';
 const other='<section class="perks"><h2>Avantages supplémentaires</h2><p>Indépendants des niveaux : chaque avantage activé consomme 3 boosts. Désactive-le pour les récupérer. Le fondateur dispose de tous les avantages gratuitement.</p><div class="extras"><div><b>🏷️ Tag personnalisé</b><small>3 boosts, sans niveau requis</small>'+perkButton("tag")+'</div><div><b>🌈 Styles de rôles améliorés</b><small>3 boosts, sans niveau requis</small>'+perkButton("roleStyles")+'</div><div><b>💎 Badges de tag</b><small>Inclus au niveau 1</small></div><div><b>🖼️ Bannière de serveur</b><small>Image au niveau 2 · GIF au niveau 3</small></div><div><b>🔗 Invitation personnalisée</b><small>Incluse au niveau 3</small></div></div></section>';
 const controls=canEdit?'<section class="controls"><h2>Modifier les avantages</h2><label>Lien actuel de ton serveur<input id="cmdInviteValue" value="'+esc(url)+'" readonly></label><button type="button" id="cmdCopyLink">Copier le lien</button><form id="cmdVanityForm"><label>Code d’invitation personnalisé <small>7 boosts</small><input name="code" placeholder="ex. valhalla-extinction" pattern="[a-z0-9_-]{4,30}" minlength="4" maxlength="30" '+(credits>=7?'':'disabled')+'></label><button '+(credits>=7?'':'disabled')+' type="submit">Enregistrer le lien</button></form><form id="cmdIconForm"><label>Icône du serveur <small>PNG, JPEG et WebP pour tous · GIF animée à partir de 2 boosts</small><input id="cmdIconInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><button type="submit">Enregistrer l’icône</button></form><form id="cmdBannerForm"><label>Bannière du serveur <small>5 boosts · PNG, JPEG ou WebP (GIF à 7 boosts)</small><input id="cmdBannerInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" '+(credits>=5?'':'disabled')+'></label><button '+(credits>=5?'':'disabled')+' type="submit">Enregistrer la bannière</button></form><p id="cmdBoostFeedback" role="status"></p><p>Ces options sont propres à CMD Sphere et ne débloquent aucune fonctionnalité sur Discord.</p></section>':'';
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#1e1e26"><title>Boosts de serveur · CMD Sphere</title><style>'+
 '*{box-sizing:border-box}body{background:#1d1d23;color:#f1eef6;font:15px/1.5 system-ui,-apple-system,Arial;margin:0}a{color:#b6afff}button{cursor:pointer}.bar{position:sticky;top:0;z-index:5;background:#222128;border-bottom:1px solid #ffffff17;display:flex;align-items:center;gap:20px;padding:15px 20px}.bar b{font-size:20px}.bar a{text-decoration:none}.wrap{max-width:1000px;margin:auto;padding:20px 15px 90px}.hero{background:#29282e;border:1px solid #424047;border-radius:18px;padding:24px;margin-bottom:20px}.hero h1{margin:0;font-size:clamp(24px,5vw,34px)}.hero p{color:#bcb9c4}.stats{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #38353e;border-radius:13px;overflow:hidden;margin:17px 0}.stats div{padding:15px;text-align:center;border-right:1px solid #424047}.stats div:last-child{border:0}.stats strong{font-size:30px;color:#eaa1ff;display:block}.stats small{color:#bbb8c2}.list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.tier{background:#29292f;border:1px solid #45434d;border-radius:23px;padding:19px;min-width:0}.tier.ready{border-color:#cf9cff}.tier-head{display:flex;align-items:start;gap:9px}.tier-head h3{margin:2px 0 0;font-size:20px}.tier-head small{letter-spacing:.08em;color:#b9a2cd}.orb{font-size:24px;color:#db9ff8}.state{margin-left:auto;font-size:11px;border:1px solid #6b617a;border-radius:20px;padding:6px;white-space:nowrap}.ready .state{border-color:#82ebcd;color:#83edcc}.progress{height:7px;border-radius:9px;background:#414048;overflow:hidden;margin:24px 0 17px}.progress div{height:100%;background:linear-gradient(90deg,#c269f4,#6e70fc);border-radius:8px}.perk-list{display:grid;gap:13px;color:#c7c3ce;font-size:13px}.perk-list span{color:#ac80d4}.perks,.controls{margin:25px 0;padding:23px;background:#28272e;border:1px solid #423e49;border-radius:18px}.perks h2,.controls h2{margin:0 0 7px}.perks p,.controls p{color:#aaa5b4}.extras{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.extras>div{background:#323039;border:1px solid #45404c;border-radius:14px;padding:15px}.extras small{display:block;color:#b6adbb;margin-top:6px}.controls label{display:block;margin:15px 0;font-weight:700}.controls label small{font-weight:400;color:#a7a2b1}.controls input{width:100%;background:#1b1a21;border:1px solid #676075;border-radius:10px;padding:12px;color:white;font:inherit;margin-top:7px}.controls button,.footer a{border:0;border-radius:10px;background:#5963ef;color:white;padding:12px 16px;font-weight:800;display:inline-block;margin:3px 0 8px;text-decoration:none}.controls button:disabled{opacity:.5;cursor:default}.footer{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}.founder{background:linear-gradient(130deg,#4a3172,#27263c);padding:13px;border-radius:12px;color:#f0dafa}#cmdBoostFeedback{min-height:24px;color:#80eac8}@media(max-width:800px){.list{grid-template-columns:1fr}.extras{grid-template-columns:1fr}.bar b{font-size:16px}.hero{padding:16px}.tier-head h3{font-size:18px}}'+
 '</style></head><body><header class="bar"><a href="/dashboard">✕</a><b>Boosts de serveur</b><a style="margin-left:auto" href="/stars">★ Étoiles</a></header><main class="wrap"><div class="hero"><h1>'+esc(g.name)+'</h1><p>Un boost contribue aux niveaux et améliore les fonctionnalités de ton serveur CMD Sphere.</p>'+(state.founder?'<p class="founder">👑 Serveur fondateur · niveau 3 activé automatiquement et à vie</p>':'')+'<div class="stats"><div><strong>'+Math.max(0,7-credits)+'</strong><small>Jusqu’au niveau 3</small></div><div><strong>'+count+'</strong><small>Boosts actifs</small></div><div><strong>'+level+'</strong><small>Niveau du serveur</small></div></div><p>'+(next?'Encore '+Math.max(0,next-credits)+' boost(s) pour le niveau suivant.':'Tous les niveaux sont débloqués !')+'</p></div><h2>Niveaux de boost</h2><div class="list">'+tiersHTML+'</div>'+other+controls+'<nav class="footer"><a href="/stars">★ Booster ce serveur</a><a href="/dashboard?openNative='+encodeURIComponent(g.id)+'">← Retour au serveur</a></nav></main><script>'+
 '(function(){const q=s=>document.querySelector(s),feedback=q("#cmdBoostFeedback");function say(t){if(feedback)feedback.textContent=t;else alert(t)}async function post(url,data){const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify(data)}),d=await r.json();if(!r.ok)throw Error(d.error||"Erreur");return d}const guild='+JSON.stringify(String(g.id))+';q("#cmdCopyLink")?.addEventListener("click",async()=>{const el=q("#cmdInviteValue");try{await navigator.clipboard.writeText(el.value);say("Lien copié !")}catch{el.select();say("Copie le lien sélectionné.")}});q("#cmdVanityForm")?.addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;try{const d=await post("/api/server-boosts/vanity",{guildId:guild,code:f.elements.code.value.trim()});q("#cmdInviteValue").value=d.inviteUrl;say("Lien personnalisé activé !")}catch(err){say(err.message)}finally{b.disabled=false}});q("#cmdIconForm")?.addEventListener("submit",async e=>{e.preventDefault();const file=q("#cmdIconInput").files?.[0];if(!file)return say("Choisis une icône.");if(file.size>2*1024*1024)return say("Icône limitée à 2 Mo.");const btn=e.currentTarget.querySelector("button");btn.disabled=true;try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error("Image illisible"));reader.readAsDataURL(file)});await post("/api/server-boosts/icon",{guildId:guild,image:dataUrl});say("Icône enregistrée ! Recharge le serveur pour la voir.")}catch(err){say(err.message)}finally{btn.disabled=false}});q("#cmdBannerForm")?.addEventListener("submit",async e=>{e.preventDefault();const file=q("#cmdBannerInput").files?.[0];if(!file)return say("Choisis une image.");if(file.size>3*1024*1024)return say("Image limitée à 3 Mo.");const btn=e.currentTarget.querySelector("button");btn.disabled=true;try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error("Fichier illisible"));reader.readAsDataURL(file)});await post("/api/server-boosts/banner",{guildId:guild,image:dataUrl});say("Bannière enregistrée !")}catch(err){say(err.message)}finally{btn.disabled=false}})})()'+
 '</script><script>(function(){document.querySelectorAll(".cmdExtraToggle").forEach(b=>b.onclick=async()=>{const active=b.dataset.enabled!=="yes";if(!confirm(active?"Affecter 3 boosts à cet avantage (cela peut réduire le niveau du serveur) ?":"Désactiver l’avantage et récupérer 3 boosts ?"))return;b.disabled=true;try{const r=await fetch("/api/server-boosts/perk",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({guildId:'+JSON.stringify(String(g.id))+',perk:b.dataset.perk,active})}),d=await r.json();if(!r.ok)throw Error(d.error||"Erreur");location.reload()}catch(e){alert(e.message);b.disabled=false}})})()</script></body></html>';
}
export async function handleCmdServerBoosts(req,res,url,{pool,auth,baseUrl,html,sendJson,redirect,readBodyJson,requireNativeOwner,requireNativeMember}){
 const pathname=url.pathname;
 if(!pathname.startsWith("/server-boosts/")&&!pathname.startsWith("/api/server-boosts/"))return false;
 if(!auth){if(req.method==="GET")redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent(pathname));else sendJson(res,401,{error:"Connexion requise."});return true}
 try{
  if(req.method==="GET"&&pathname.startsWith("/server-boosts/")){
   const guildId=pathname.slice("/server-boosts/".length);const membership=await requireNativeMember(auth,guildId);const state=await cmdBoostCount(pool,guildId);
   const guild=(await pool.query("SELECT id,name,invite_code FROM cmd_native_guilds WHERE id=$1",[guildId])).rows[0];
   html(res,htmlPage(guild,state,String(membership.membership_role||""),baseUrl));return true;
  }
  if(req.method==="GET"&&pathname==="/api/server-boosts/state"){
   const id=url.searchParams.get("guildId");await requireNativeMember(auth,id);const state=await cmdBoostCount(pool,id);
   sendJson(res,200,{...state,level:cmdBoostLevel(state.levelBoosts),next:cmdBoostNext(state.levelBoosts),tiers});return true;
  }
  if(req.method==="POST"&&pathname==="/api/server-boosts/perk"){
   const body=await readBodyJson(req),id=String(body.guildId||""),perk=String(body.perk||"");
   if(!["tag","roleStyles"].includes(perk)||typeof body.active!=="boolean")throw Error("Avantage invalide.");
   await requireNativeOwner(auth,id);
   const client=await pool.connect();
   try{
     await client.query("BEGIN");
     await client.query("SELECT id FROM cmd_native_guilds WHERE id=$1 FOR UPDATE",[id]);
     const state=await cmdBoostCount(pool,id);
     if(state.founder){await client.query("COMMIT");sendJson(res,200,{ok:true,founder:true});return true;}
     if(body.active&&!state.extras[perk]&&state.levelBoosts<3)throw Error("3 boosts libres sont nécessaires.");
     await client.query("INSERT INTO cmd_server_boost_perks(guild_id,perk,active) VALUES($1,$2,$3) ON CONFLICT(guild_id,perk) DO UPDATE SET active=EXCLUDED.active",[id,perk,body.active]);
     await client.query("COMMIT");
   }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
   sendJson(res,200,{ok:true,active:body.active});return true;
  }
  if(req.method==="POST"&&pathname==="/api/server-boosts/vanity"){
   const b=await readBodyJson(req),id=String(b.guildId||"");await requireNativeOwner(auth,id);await requireCmdBoosts(pool,id,7);
   const code=botSafe(b.code);
   if(code.length<4||code.length>30||!(/^[a-z][a-z0-9_-]{3,29}$/.test(code)))throw Error("Lien invalide : 4 à 30 caractères, commence par une lettre.");
   if(["api","login","join","invite","oauth","dashboard","admin","cmd","sphere"].includes(code))throw Error("Ce nom est réservé.");
   const exists=await pool.query("SELECT id FROM cmd_native_guilds WHERE invite_code=$1 AND id<>$2 LIMIT 1",[code,id]);
   if(exists.rows.length)throw Error("Cette invitation est déjà utilisée.");
   await pool.query("UPDATE cmd_native_guilds SET invite_code=$2,updated_at=NOW() WHERE id=$1",[id,code]);
   sendJson(res,200,{ok:true,inviteUrl:baseUrl+"/invite/"+code});return true;
  }
  if(req.method==="POST"&&pathname==="/api/server-boosts/icon"){
    const b=await readBodyJson(req),id=String(b.guildId||"");await requireNativeOwner(auth,id);
    const img=String(b.image||"");if(!/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(img)||img.length>2800000||img.length<120)throw Error("Icône invalide : PNG, JPEG, WebP ou GIF jusqu’à 2 Mo.");
    if(/^data:image\/gif/i.test(img))await requireCmdBoosts(pool,id,2);
    await pool.query("UPDATE cmd_native_guilds SET icon=$2,updated_at=NOW() WHERE id=$1",[id,img]);
    sendJson(res,200,{ok:true,message:"Icône du serveur CMD Sphere mise à jour."});return true;
   }
   if(req.method==="POST"&&pathname==="/api/server-boosts/banner"){
   const b=await readBodyJson(req),id=String(b.guildId||"");await requireNativeOwner(auth,id);
   const state=await requireCmdBoosts(pool,id,5),data=String(b.image||"");
   if(!/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(data)||data.length>4200000||data.length<100)throw Error("Image invalide : PNG, JPEG, WebP ou GIF, jusqu’à 3 Mo.");
   if(/^data:image\/gif/i.test(data)&&state.levelBoosts<7)throw Error("Les bannières GIF sont réservées au niveau 3 (7 boosts).");
   await pool.query("UPDATE cmd_native_guilds SET server_banner=$2,updated_at=NOW() WHERE id=$1",[id,data]);
   sendJson(res,200,{ok:true,message:"Bannière enregistrée."});return true;
  }
  sendJson(res,405,{error:"Méthode non autorisée."});return true;
 }catch(e){sendJson(res,400,{error:String(e.message||e)}) ;return true}
}

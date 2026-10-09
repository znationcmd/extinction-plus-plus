/* CMD Sphere — polished premium profile on the ORIGINAL /profile route.
   Keeps genuine saved banner, avatar, identity, roles, badges, editing actions.
   Social links are user-declared (not falsely shown as OAuth verified). */
(()=>{"use strict";
if(window.__cmdPremiumProfile)return;window.__cmdPremiumProfile=true;
const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
const esc=x=>String(x||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const providers=[["facebook","Facebook"],["instagram","Instagram"],["tiktok","TikTok"],["x","X"],["youtube","YouTube"],["steam","Steam"],["playstation","PlayStation"],["xbox","Xbox"],["nintendo","Nintendo"],["spotify","Spotify"],["website","Site web"]];
let extras={note:"",wishlist:[],socialLinks:[]},loading=false,currentTab="principal";
const profile=$(".page");
if(!profile)return;
const content=$(".hero",profile),about=$(".section .card",profile);
function section(className,inside){const el=document.createElement("section");el.className="cmd-pm-section "+className;el.innerHTML=inside;return el}
function message(str){const el=$("#cmdPmNotice");if(el){el.textContent=str;el.hidden=!str}}
async function call(method="GET",body=null){
 const resp=await fetch("/api/profile/premium",{method,credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
 const data=await resp.json().catch(()=>({}));if(!resp.ok)throw Error(data.error||"Impossible de charger le profil");return data
}
async function save(){if(loading)return;loading=true;message("Enregistrement…");try{extras=await call("POST",extras);message("Enregistré sur ton compte CMD Sphere.");return true}catch(error){message("Erreur : "+error.message);return false}finally{loading=false}}
function createShell(){
 profile.classList.add("cmd-premium-profile");
 document.body.classList.add("cmd-premium-body");
 const crown=document.createElement("div");crown.className="cmd-pm-crystal-crown";crown.setAttribute("aria-hidden","true");content.before(crown);
 const subtitle=document.createElement("p");subtitle.className="cmd-pm-kicker";subtitle.textContent="CMD SPHERE · MON PROFIL";crown.append(subtitle);
 const hero=$(".hero",profile);hero.classList.add("cmd-pm-hero");
 // The original banner must remain editable and keep its actual uploaded image.
 const edit=$("#editBtn");if(edit){edit.textContent="✎ Modifier le profil";edit.setAttribute("aria-label","Modifier le profil et ses décorations")}
 const bioBox=about?.closest(".section");if(bioBox){bioBox.classList.add("cmd-pm-bio-original");const heading=$("h3",bioBox);if(heading)heading.textContent="Bio";}
 // Existing badges and role chips are real, and are not replaced by invented content.
 const main=document.createElement("div");main.className="cmd-pm-detail-main";main.id="cmdPmDetailMain";
 const anchor=edit?.closest(".section")||hero;anchor.after(main);
 const tabs=document.createElement("nav");tabs.className="cmd-pm-detail-tabs";tabs.setAttribute("aria-label","Rubriques du profil");tabs.innerHTML='<button type="button" data-premium-tab="principal" aria-selected="true">Principal</button><button type="button" data-premium-tab="tableau" aria-selected="false">Tableau</button><button type="button" data-premium-tab="wishlist" aria-selected="false">Liste de souhaits</button>';
 main.append(tabs);
 const basic=section("cmd-pm-panel-principal",'<div class="cmd-pm-info-grid"><div class="cmd-pm-balance cmd-pm-card"><div><b>💎 Mes diamants</b><small>Solde CMD Sphere</small></div><strong id="cmdPmBalance">—</strong></div></div>');
 basic.dataset.panel="principal";main.append(basic);
 const extraBio=about?about.closest(".section"):null;if(extraBio){main.append(extraBio);extraBio.dataset.panel="principal";}
 const links=section("cmd-pm-panel-principal",'<div class="cmd-pm-card"><div class="cmd-pm-card-head"><h3>🔗 Connexions</h3><button type="button" id="cmdPmEditLinks" aria-label="Ajouter ou modifier les liens du profil">✎ Modifier</button></div><p class="cmd-pm-muted">Liens ajoutés par toi (sans vérification automatique).</p><div id="cmdPmSocialRows"></div><div id="cmdPmLinksEditor" hidden></div></div>');
 links.dataset.panel="principal";main.append(links);
 const friends=section("cmd-pm-panel-principal",'<div class="cmd-pm-card"><div class="cmd-pm-card-head"><h3>👥 Amis</h3><a href="/messages" class="cmd-pm-see-more">Voir les amis ›</a></div><div id="cmdPmFriends">Chargement…</div></div>');
 friends.dataset.panel="principal";main.append(friends);
 const note=section("cmd-pm-panel-principal",'<div class="cmd-pm-card"><div class="cmd-pm-card-head"><h3>📝 Note (visible uniquement par toi)</h3><button type="button" id="cmdPmEditNote">✎ Modifier</button></div><div id="cmdPmNoteText" class="cmd-pm-note-text"></div><div id="cmdPmNoteEdit" hidden><textarea id="cmdPmNoteInput" maxlength="1200" placeholder="Une note privée…"></textarea><button type="button" id="cmdPmSaveNote">Enregistrer ma note</button></div></div>');
 note.dataset.panel="principal";main.append(note);
 const tableau=section("cmd-pm-panel-tableau",'<div class="cmd-pm-card"><h3>📊 Mon tableau</h3><div id="cmdPmStats" class="cmd-pm-stats"><div><strong id="cmdPmFriendCount">—</strong><span>Amis</span></div><div><strong id="cmdPmWishCount">0</strong><span>Souhaits</span></div><div><strong id="cmdPmSocialCount">0</strong><span>Liens</span></div></div></div><div class="cmd-pm-card"><h3>Mes serveurs</h3><p class="cmd-pm-muted">Sélectionne « Profils par serveur » en haut de la page pour personnaliser chaque communauté.</p><a class="cmd-pm-see-more" href="/dashboard">Ouvrir mes serveurs ›</a></div>');
 tableau.dataset.panel="tableau";main.append(tableau);
 const wishlist=section("cmd-pm-panel-wishlist",'<div class="cmd-pm-card"><div class="cmd-pm-card-head"><h3>🎁 Ma liste de souhaits</h3><span id="cmdPmWishBadge"></span></div><form id="cmdPmWishlistForm"><input id="cmdPmWishInput" maxlength="140" placeholder="Une idée ou un objectif…" required><button type="submit">＋ Ajouter</button></form><div id="cmdPmWishlistItems"></div></div>');
 wishlist.dataset.panel="wishlist";main.append(wishlist);
 const status=document.createElement("p");status.id="cmdPmNotice";status.hidden=true;status.role="status";main.append(status);
 const dock=document.createElement("nav");dock.className="cmd-pm-bottom";dock.setAttribute("aria-label","Navigation CMD Sphere");
 dock.innerHTML='<a href="/diamonds" title="Quêtes et diamants"><span>✦</span>Quêtes</a><a href="/shop" title="Boutique"><span>▦</span>Boutique</a><a href="/dashboard" title="Paramètres et tableau de bord"><span>⚙</span>Paramètres</a>';
 main.append(dock);
 $$("[data-premium-tab]",tabs).forEach(b=>b.addEventListener("click",()=>selectTab(b.dataset.premiumTab)));
 $("#cmdPmEditLinks").onclick=()=>{$("#cmdPmLinksEditor").hidden=!$("#cmdPmLinksEditor").hidden};
 $("#cmdPmEditNote").onclick=()=>{$("#cmdPmNoteEdit").hidden=!$("#cmdPmNoteEdit").hidden;$("#cmdPmNoteInput").value=extras.note||""};
 $("#cmdPmSaveNote").onclick=async()=>{extras.note=$("#cmdPmNoteInput").value;if(await save()){$("#cmdPmNoteEdit").hidden=true;renderNote()}};
 $("#cmdPmWishlistForm").onsubmit=async e=>{e.preventDefault();const v=$("#cmdPmWishInput").value.trim();if(!v)return;if(extras.wishlist.includes(v)){message("Cet élément figure déjà dans la liste.");return}if(extras.wishlist.length>=35){message("35 souhaits maximum.");return}extras.wishlist.push(v);if(await save()){$("#cmdPmWishInput").value="";renderWishlist()}};
 selectTab("principal");
}
function selectTab(tab){
 currentTab=tab;
 $$("[data-premium-tab]").forEach(b=>{const on=b.dataset.premiumTab===tab;b.classList.toggle("selected",on);b.setAttribute("aria-selected",on?"true":"false")});
 $$("[data-panel]").forEach(el=>{el.hidden=el.dataset.panel!==tab});
}
function renderNote(){const box=$("#cmdPmNoteText");box.textContent=extras.note?.trim()||"Aucune note enregistrée.";box.classList.toggle("cmd-pm-muted",!extras.note)}
function renderWishlist(){
 const root=$("#cmdPmWishlistItems");root.replaceChildren();$("#cmdPmWishCount").textContent=extras.wishlist.length;$("#cmdPmWishBadge").textContent=extras.wishlist.length+" / 35";
 if(!extras.wishlist.length){const p=document.createElement("p");p.className="cmd-pm-muted";p.textContent="Aucun souhait pour le moment.";root.append(p);return}
 for(const [index,entry] of extras.wishlist.entries()){
  const row=document.createElement("div");row.className="cmd-pm-wish-row";
  const title=document.createElement("span");title.textContent=entry;
  const del=document.createElement("button");del.type="button";del.title="Supprimer ce souhait";del.textContent="✕";
  del.onclick=async()=>{extras.wishlist.splice(index,1);if(await save())renderWishlist()};
  row.append(title,del);root.append(row);
 }
}
function renderLinks(){
 const list=$("#cmdPmSocialRows");list.replaceChildren();$("#cmdPmSocialCount").textContent=extras.socialLinks.length;
 if(!extras.socialLinks.length){const p=document.createElement("p");p.className="cmd-pm-muted";p.textContent="Ajoute les liens de tes comptes pour les afficher ici.";list.append(p)}
 for(const link of extras.socialLinks){
  const row=document.createElement("div");row.className="cmd-pm-social-row";
  const a=document.createElement("a");a.href=link.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=(providers.find(([id])=>id===link.platform)?.[1]||link.platform)+" ↗";
  const span=document.createElement("small");try{span.textContent=new URL(link.url).hostname}catch{};
  row.append(a,span);list.append(row);
 }
 const editor=$("#cmdPmLinksEditor");editor.replaceChildren();
 const title=document.createElement("p");title.className="cmd-pm-muted";title.textContent="Ces liens ne prouvent pas qu’un compte externe est vérifié.";
 const form=document.createElement("form");form.id="cmdPmSocialForm";
 const select=document.createElement("select");select.id="cmdPmSocialPlatform";providers.forEach(([id,label])=>select.append(new Option(label,id)));
 const field=document.createElement("input");field.id="cmdPmSocialURL";field.type="url";field.required=true;field.placeholder="https://…";field.maxLength=500;
 const add=document.createElement("button");add.type="submit";add.textContent="Ajouter le lien";form.append(select,field,add);form.onsubmit=async e=>{
  e.preventDefault();let url;try{url=new URL(field.value);if(url.protocol!=="https:")throw Error("URL HTTPS requise.")}catch{message("Utilise un lien HTTPS valide.");return}
  extras.socialLinks=extras.socialLinks.filter(x=>x.platform!==select.value).concat({platform:select.value,url:field.value});
  if(await save())renderLinks()
 };
 editor.append(title,form);
 for(const l of extras.socialLinks){
  const b=document.createElement("button");b.type="button";b.className="cmd-pm-link-remove";
  b.textContent="✕ Retirer "+(providers.find(x=>x[0]===l.platform)?.[1]||l.platform);
  b.onclick=async()=>{extras.socialLinks=extras.socialLinks.filter(x=>x.platform!==l.platform);if(await save())renderLinks()};
  editor.append(b);
 }
}
async function loadFriends(){
 const box=$("#cmdPmFriends");
 try{
  const r=await fetch("/api/friends",{credentials:"same-origin"});if(!r.ok)throw Error("Amis indisponibles");
  const data=await r.json(),friends=Array.isArray(data.friends)?data.friends:[];
  $("#cmdPmFriendCount").textContent=friends.length;
  box.replaceChildren();
  if(!friends.length){box.textContent="Aucun ami à afficher pour le moment.";return}
  const icons=document.createElement("div");icons.className="cmd-pm-friend-avatars";
  friends.slice(0,9).forEach(friend=>{
   const im=document.createElement(friend.avatar?"img":"span");
   if(friend.avatar){im.src=friend.avatar;im.loading="lazy";im.alt=friend.displayName||friend.username||"Ami"}else im.textContent="👤";
   im.title=friend.displayName||friend.username||"Ami";icons.append(im);
  });
  const count=document.createElement("b");count.textContent=friends.length+" ami"+(friends.length>1?"s":"");box.append(icons,count);
 }catch{box.textContent="Liste des amis momentanément indisponible.";$("#cmdPmFriendCount").textContent="—"}
}
async function loadBalance(){
 const el=$("#cmdPmBalance");try{const r=await fetch("/api/diamonds/status",{credentials:"same-origin"});if(!r.ok)throw Error();const d=await r.json();el.textContent=d.owner?"∞":Number(d.balance||0).toLocaleString("fr-FR")}catch{el.textContent="—"}
}
async function bootstrap(){
 createShell();renderNote();renderWishlist();renderLinks();
 await Promise.allSettled([(async()=>{try{const data=await call();extras={note:data.note||"",wishlist:Array.isArray(data.wishlist)?data.wishlist:[],socialLinks:Array.isArray(data.socialLinks)?data.socialLinks:[]};renderNote();renderWishlist();renderLinks()}catch(e){message("Options personnelles indisponibles : "+e.message)}})(),loadFriends(),loadBalance()]);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootstrap);else bootstrap();
})();
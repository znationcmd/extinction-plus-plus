const PROVIDERS=[
  ["epic","Epic Games","◼"],["github","GitHub","◉"],["roblox","Roblox","◇"],
  ["twitch","Twitch","🟪"],["youtube","YouTube","▶️"],["paypal","PayPal","🅿️"],
  ["steam","Steam","⚪"],["playstation","PlayStation Network","🎮"],["spotify","Spotify","🟢"],
  ["xbox","Xbox","🟩"],["bungie","Bungie.net","🛡️"],["facebook","Facebook","🔵"],
  ["riot","Riot Games","🔺"],["battlenet","Battle.net","🔷"],["bluesky","Bluesky","🦋"],
  ["reddit","Reddit","🟠"],["x","X","𝕏"],["ebay","eBay","🛍️"],
  ["crunchyroll","Crunchyroll","🟠"],["amazonmusic","Amazon Music","🎵"],["domain","Domaine","🌐"],
  ["tiktok","TikTok","🎵"],["instagram","Instagram","📸"],["nintendo","Nintendo","🔴"]
];
export const CONNECTION_PROVIDERS=PROVIDERS.map(([key,label,icon])=>({key,label,icon}));
const KEYS=new Set(CONNECTION_PROVIDERS.map(x=>x.key));
const safe=(v,n=300)=>String(v??"").trim().slice(0,n);
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
const norm=v=>{
  if(!v)return null;
  if(typeof v==="string"){const value=safe(v);return value?{value,showProfile:true,showStatus:false,showDetails:true}:null}
  const value=safe(v.value);if(!value)return null;
  return {value,showProfile:v.showProfile!==false,showStatus:Boolean(v.showStatus),showDetails:v.showDetails!==false};
};
export async function initConnections(pool){
  await pool.query("ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb");
}
export async function getConnections(pool,userId){
  const r=await pool.query("SELECT social_links FROM cmd_global_profiles WHERE user_id=$1 LIMIT 1",[String(userId)]);
  const raw=r.rows[0]?.social_links&&typeof r.rows[0].social_links==="object"?r.rows[0].social_links:{};
  const out={};
  for(const p of CONNECTION_PROVIDERS){const x=norm(raw[p.key]);if(x)out[p.key]=x}
  return out;
}
export async function saveConnection(pool,userId,input){
  const provider=String(input.provider||"").toLowerCase();
  if(!KEYS.has(provider))throw new Error("Connexion non prise en charge.");
  const value=safe(input.value);if(!value)throw new Error("Identifiant ou lien requis.");
  const current=await getConnections(pool,userId);
  current[provider]={value,showProfile:input.showProfile!==false,showStatus:Boolean(input.showStatus),showDetails:input.showDetails!==false};
  await pool.query("INSERT INTO cmd_global_profiles(user_id,social_links) VALUES($1,$2::jsonb) ON CONFLICT(user_id) DO UPDATE SET social_links=EXCLUDED.social_links,updated_at=NOW()",[String(userId),JSON.stringify(current)]);
  return current;
}
export async function removeConnection(pool,userId,provider){
  provider=String(provider||"").toLowerCase();
  if(!KEYS.has(provider))throw new Error("Connexion non prise en charge.");
  const current=await getConnections(pool,userId);delete current[provider];
  await pool.query("INSERT INTO cmd_global_profiles(user_id,social_links) VALUES($1,$2::jsonb) ON CONFLICT(user_id) DO UPDATE SET social_links=EXCLUDED.social_links,updated_at=NOW()",[String(userId),JSON.stringify(current)]);
  return current;
}
export function profileConnectionsHtml(connections){
  const rows=CONNECTION_PROVIDERS.map(p=>({p,c:norm(connections?.[p.key])})).filter(x=>x.c?.showProfile);
  if(!rows.length)return '<div class="mutedBox">Aucune connexion affichée sur ton profil.</div>';
  return '<div class="connections">'+rows.map(({p,c})=>{
    const v=esc(c.value),linked=/^https?:\/\//i.test(c.value);
    return '<div class="conn"><div class="connIcon">'+p.icon+'</div><div class="connMain"><b>'+esc(p.label)+'</b>'+(linked?'<a href="'+v+'" target="_blank" rel="noopener">'+v+'</a>':'<span>'+v+'</span>')+(c.showDetails?'<small>Détails affichés sur le profil</small>':'')+'</div><span class="ok">✓</span></div>';
  }).join("")+'</div>';
}
export function statusConnection(connections){
  return CONNECTION_PROVIDERS.map(p=>({p,c:norm(connections?.[p.key])})).find(x=>x.c?.showStatus)||null;
}
export function connectionsPage(auth,connections){
  const cards=CONNECTION_PROVIDERS.filter(p=>connections[p.key]).map(p=>{
    const c=connections[p.key],v=esc(c.value);
    return '<section class="card" data-card="'+p.key+'"><div class="topline"><div class="ico">'+p.icon+'</div><div class="grow"><b>'+esc(p.label)+'</b><span>'+v+'</span></div><button class="remove" data-remove="'+p.key+'" aria-label="Supprimer">×</button></div>'+
      '<label class="setting"><span>Afficher sur mon profil</span><input class="toggle" type="checkbox" data-key="'+p.key+'" data-field="showProfile" '+(c.showProfile?'checked':'')+'></label>'+
      '<label class="setting"><span>Afficher '+esc(p.label)+' comme statut</span><input class="toggle" type="checkbox" data-key="'+p.key+'" data-field="showStatus" '+(c.showStatus?'checked':'')+'></label>'+
      '<label class="setting"><span>Afficher les détails sur mon profil</span><input class="toggle" type="checkbox" data-key="'+p.key+'" data-field="showDetails" '+(c.showDetails?'checked':'')+'></label></section>';
  }).join("");
  const providerOptions=CONNECTION_PROVIDERS.map(p=>'<button class="pick" type="button" data-provider="'+p.key+'"><span class="pico">'+p.icon+'</span><span>'+esc(p.label)+'</span><span class="chev">›</span></button>').join("");
  const discord=auth.user?.discordId?'<section class="card"><div class="topline"><div class="ico">💬</div><div class="grow"><b>Discord</b><span>Compte vérifié et lié à CMD Sphere</span></div><span class="verified">✓</span></div><label class="setting"><span>Afficher sur mon profil</span><input class="toggle" type="checkbox" checked disabled></label></section>':"";
  const initial=JSON.stringify(connections).replace(/</g,"\\u003c");
  const providers=JSON.stringify(CONNECTION_PROVIDERS).replace(/</g,"\\u003c");
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#1f1e24"><link rel="manifest" href="/manifest.webmanifest"><title>Connexions · CMD Sphere</title><style>'+
  '*{box-sizing:border-box}body{margin:0;background:#08070b;color:#f7f4f8;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial}.page{max-width:760px;margin:auto;min-height:100vh;padding:86px 18px 100px}.head{position:fixed;z-index:8;left:50%;transform:translateX(-50%);top:0;width:min(760px,100%);height:70px;padding:0 18px;display:flex;align-items:center;gap:14px;background:#1e1d22;border-bottom:1px solid #ffffff10}.head a{color:#fff;text-decoration:none;font-size:29px}.head h1{margin:0;flex:1;font-size:25px}.add{border:0;background:transparent;color:#8ea1ff;font-size:18px;font-weight:900}.card{background:#2b2a30;border:1px solid #ffffff0d;border-radius:20px;overflow:hidden;margin:14px 0}.topline{display:flex;align-items:center;gap:14px;padding:17px 18px}.ico{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#ffffff10;font-size:25px}.grow{flex:1;min-width:0}.grow b,.grow span{display:block}.grow span{color:#bbb4be;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}.verified{font-size:22px}.remove{border:0;background:transparent;color:#c8c3cb;font-size:32px}.setting{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-top:1px solid #ffffff0d;font-size:17px}.toggle{appearance:none;width:54px;height:31px;border-radius:999px;background:#4b4852;position:relative;transition:.2s}.toggle:after{content:"";position:absolute;width:25px;height:25px;top:3px;left:3px;background:#fff;border-radius:50%;transition:.2s}.toggle:checked{background:#5865f2}.toggle:checked:after{left:26px}.empty{padding:28px;text-align:center;color:#a9a1ad}.modal{display:none;position:fixed;inset:0;z-index:20;background:#000a;align-items:flex-end;justify-content:center}.modal.on{display:flex}.sheet{width:min(760px,100%);max-height:88vh;overflow:auto;background:#232228;border-radius:28px 28px 0 0;padding:20px}.grab{width:75px;height:6px;background:#4a4850;border-radius:999px;margin:0 auto 18px}.sheet h2{text-align:center}.pick{width:100%;border:0;border-bottom:1px solid #ffffff0c;background:transparent;color:#fff;padding:15px 6px;display:flex;align-items:center;gap:13px;text-align:left;font-size:18px}.pick .pico{font-size:23px;width:34px}.chev{margin-left:auto;color:#bbb;font-size:27px}.editor{display:none}.editor.on{display:block}.editor input[type=text]{width:100%;background:#111015;color:#fff;border:1px solid #ffffff16;border-radius:12px;padding:13px;font:inherit}.editor label{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 0}.save{width:100%;border:0;border-radius:12px;background:#5865f2;color:#fff;padding:14px;font-weight:900;font-size:17px}.backbtn{width:100%;margin-top:8px;border:1px solid #ffffff16;background:#ffffff08;color:#fff;border-radius:12px;padding:12px}</style></head><body>'+
  '<div class="head"><a href="/profile">←</a><h1>Connexions</h1><button class="add" id="add">Ajouter</button></div><main class="page">'+discord+(cards||'<div class="empty">Aucune connexion ajoutée.</div>')+'</main>'+
  '<div class="modal" id="modal"><div class="sheet"><div class="grab"></div><div id="picker"><h2>Ajouter une nouvelle connexion</h2>'+providerOptions+'</div><div class="editor" id="editor"><h2 id="editTitle">Connexion</h2><input id="value" type="text" maxlength="300" placeholder="Identifiant ou lien public"><label>Afficher sur mon profil<input class="toggle" id="showProfile" type="checkbox" checked></label><label>Afficher comme statut<input class="toggle" id="showStatus" type="checkbox"></label><label>Afficher les détails sur mon profil<input class="toggle" id="showDetails" type="checkbox" checked></label><button class="save" id="save">Enregistrer</button><button class="backbtn" id="back">Retour</button></div></div></div>'+
  '<script>const C='+initial+',P='+providers+';let current=null;const modal=document.getElementById("modal"),picker=document.getElementById("picker"),editor=document.getElementById("editor");function openEditor(k){current=k;const p=P.find(x=>x.key===k),c=C[k]||{};document.getElementById("editTitle").textContent=p.label;document.getElementById("value").value=c.value||"";document.getElementById("showProfile").checked=c.showProfile!==false;document.getElementById("showStatus").checked=!!c.showStatus;document.getElementById("showDetails").checked=c.showDetails!==false;picker.style.display="none";editor.classList.add("on")}document.getElementById("add").onclick=()=>{picker.style.display="block";editor.classList.remove("on");modal.classList.add("on")};document.querySelectorAll("[data-provider]").forEach(b=>b.onclick=()=>openEditor(b.dataset.provider));document.getElementById("back").onclick=()=>{picker.style.display="block";editor.classList.remove("on")};modal.onclick=e=>{if(e.target===modal)modal.classList.remove("on")};document.getElementById("save").onclick=async()=>{const body={provider:current,value:document.getElementById("value").value,showProfile:document.getElementById("showProfile").checked,showStatus:document.getElementById("showStatus").checked,showDetails:document.getElementById("showDetails").checked};const r=await fetch("/api/connections",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)return alert(d.error||"Erreur");location.reload()};document.querySelectorAll("[data-key]").forEach(x=>x.onchange=async()=>{const k=x.dataset.key,c=C[k],body={provider:k,value:c.value,showProfile:c.showProfile,showStatus:c.showStatus,showDetails:c.showDetails};body[x.dataset.field]=x.checked;const r=await fetch("/api/connections",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});if(!r.ok)location.reload()});document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=async()=>{if(!confirm("Supprimer cette connexion ?"))return;const r=await fetch("/api/connections/"+encodeURIComponent(b.dataset.remove),{method:"DELETE"});if(r.ok)location.reload()});</script></body></html>';
}
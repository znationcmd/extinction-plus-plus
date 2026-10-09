// CMD Sphere ★ boosts (independent from Discord Nitro and game-server hosting).
// A star is a consumable credit: one star -> one CMD Sphere boost lasting 30 days.
// PayPal.me transactions are never self-confirmed: the CMD founder manually approves them.
import crypto from "node:crypto";

const PACKS=Object.freeze({
  solo:{label:"1 étoile",stars:1,cents:200},
  trio:{label:"3 étoiles",stars:3,cents:500},
  constellation:{label:"10 étoiles",stars:10,cents:1500}
});
const PRICE_NOTE="Les achats d’étoiles sont vérifiés manuellement par le fondateur après paiement PayPal.";
const htmlEsc=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const idOk=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||""));
const price=c=>(c/100).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
export const CMD_STAR_BOOST_DAY_COUNT=30;
export async function initCmdStarsDb(pool){
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_star_wallets(user_id TEXT PRIMARY KEY,balance INTEGER NOT NULL DEFAULT 0 CHECK(balance>=0),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_star_orders(id UUID PRIMARY KEY,user_id TEXT NOT NULL,pack_id TEXT NOT NULL,stars INTEGER NOT NULL CHECK(stars>0),price_cents INTEGER NOT NULL CHECK(price_cents>0),payment_reference TEXT NOT NULL UNIQUE,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','approved','rejected')),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),reviewed_at TIMESTAMPTZ,reviewed_by TEXT)");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_star_orders_user_idx ON cmd_star_orders(user_id,created_at DESC)");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_star_boosts(id UUID PRIMARY KEY,user_id TEXT NOT NULL,guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),expires_at TIMESTAMPTZ NOT NULL)");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_star_boosts_active_idx ON cmd_star_boosts(guild_id,expires_at)");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_star_boosts_user_idx ON cmd_star_boosts(user_id,expires_at)");
}

async function getStarsState(pool,auth,isFounder,withAdmin=false){
 const uid=String(auth.user.id),owner=isFounder(auth);
 const [wallet,history,owned,pending]=await Promise.all([
   pool.query("SELECT balance FROM cmd_star_wallets WHERE user_id=$1",[uid]),
   pool.query("SELECT id::text,pack_id,stars,price_cents,status,created_at FROM cmd_star_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 25",[uid]),
   pool.query("SELECT s.id::text,s.guild_id::text,g.name,s.created_at,s.expires_at FROM cmd_star_boosts s JOIN cmd_native_guilds g ON g.id=s.guild_id WHERE s.user_id=$1 AND s.expires_at>NOW() ORDER BY s.expires_at DESC",[uid]),
   withAdmin&&owner?pool.query("SELECT o.id::text,o.user_id,o.pack_id,o.stars,o.price_cents,o.payment_reference,o.created_at,a.username FROM cmd_star_orders o LEFT JOIN cmd_accounts a ON a.id::text=o.user_id WHERE o.status='pending' ORDER BY o.created_at LIMIT 100"):Promise.resolve({rows:[]})
 ]);
 return {owner,balance:owner?null:Number(wallet.rows[0]?.balance||0),packs:PACKS,history:history.rows,boosts:owned.rows,adminPending:pending.rows,periodDays:CMD_STAR_BOOST_DAY_COUNT,manualReview:true};
}

async function requestStarOrder(pool,auth,input){
 const pack=PACKS[String(input?.pack||"")];
 if(!pack)throw new Error("Pack d’étoiles inconnu.");
 const ref=String(input?.paymentReference||"").trim().slice(0,140);
 if(ref.length<8||!/^[A-Za-z0-9._+:/\-\s]{8,140}$/.test(ref))throw new Error("Renseigne la référence de transaction PayPal (8 à 140 caractères).");
 const uid=String(auth.user.id);
 const last=await pool.query("SELECT COUNT(*)::int AS n FROM cmd_star_orders WHERE user_id=$1 AND status='pending'",[uid]);
 if(Number(last.rows[0]?.n||0)>=3)throw new Error("Trois demandes attendent déjà la vérification du paiement.");
 try{
   const id=crypto.randomUUID();
   await pool.query("INSERT INTO cmd_star_orders(id,user_id,pack_id,stars,price_cents,payment_reference) VALUES($1,$2,$3,$4,$5,$6)",[id,uid,String(input.pack),pack.stars,pack.cents,ref]);
   return {ok:true,id,status:"pending",stars:pack.stars,priceCents:pack.cents,message:"Demande reçue. Les étoiles seront créditées uniquement après vérification du paiement par CMD Sphere."};
 }catch(e){
   if(e?.code==="23505")throw new Error("Cette référence de transaction existe déjà.");
   throw e;
 }
}

async function reviewOrder(pool,auth,isFounder,id,action){
 if(!isFounder(auth))throw new Error("Seul le fondateur CMD Sphere peut confirmer des paiements.");
 if(!idOk(id)||!["approve","reject"].includes(action))throw new Error("Demande de paiement invalide.");
 const client=await pool.connect();
 try{
   await client.query("BEGIN");
   const rows=await client.query("SELECT * FROM cmd_star_orders WHERE id=$1 FOR UPDATE",[id]);
   const order=rows.rows[0];
   if(!order||order.status!=="pending")throw new Error("Paiement déjà traité ou introuvable.");
   if(action==="approve"){
     await client.query("INSERT INTO cmd_star_wallets(user_id,balance) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET balance=cmd_star_wallets.balance+EXCLUDED.balance,updated_at=NOW()",[order.user_id,order.stars]);
   }
   await client.query("UPDATE cmd_star_orders SET status=$2,reviewed_at=NOW(),reviewed_by=$3 WHERE id=$1",[id,action==="approve"?"approved":"rejected",String(auth.user.id)]);
   await client.query("COMMIT");
   return {ok:true,status:action==="approve"?"approved":"rejected",stars:action==="approve"?Number(order.stars):0};
 }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
}

async function applyStarBoost(pool,auth,guildId,isFounder){
 if(!idOk(guildId))throw new Error("Serveur CMD Sphere inconnu.");
 const uid=String(auth.user.id),client=await pool.connect();
 try{
   await client.query("BEGIN");
   const member=await client.query("SELECT m.user_id,g.owner_user_id,g.founder_auto_boost FROM cmd_native_members m JOIN cmd_native_guilds g ON g.id=m.guild_id WHERE m.guild_id=$1 AND m.user_id=$2",[guildId,uid]);
   if(!member.rows[0])throw new Error("Rejoins ce serveur CMD Sphere avant de le booster.");
   if(member.rows[0].founder_auto_boost&&String(member.rows[0].owner_user_id)===uid&&isFounder(auth)){
     await client.query("COMMIT");return {ok:true,founder:true,message:"Ce serveur est déjà boosté à vie avec ton privilège fondateur."};
   }
   if(isFounder(auth)){
     const id=crypto.randomUUID();
     await client.query("INSERT INTO cmd_star_boosts(id,user_id,guild_id,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '30 days')",[id,uid,guildId]);
     await client.query("COMMIT");return {ok:true,founder:true,id,message:"Boost fondateur ajouté gratuitement pour 30 jours à ce serveur."};
   }
   await client.query("INSERT INTO cmd_star_wallets(user_id,balance) VALUES($1,0) ON CONFLICT DO NOTHING",[uid]);
   const credit=await client.query("UPDATE cmd_star_wallets SET balance=balance-1,updated_at=NOW() WHERE user_id=$1 AND balance>=1 RETURNING balance",[uid]);
   if(!credit.rows[0])throw new Error("Tu n’as pas assez d’étoiles. Achète un pack ou utilise Premium.");
   const id=crypto.randomUUID();
   await client.query("INSERT INTO cmd_star_boosts(id,user_id,guild_id,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '30 days')",[id,uid,guildId]);
   await client.query("COMMIT");
   return {ok:true,id,balance:Number(credit.rows[0].balance),expiresInDays:30,message:"★ Ton serveur bénéficie d’un boost CMD Sphere pour 30 jours."};
 }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
}

function starsPage(auth,state,guilds,premium,payPalUrl){
 const owner=state.owner;
 const serverCards=guilds.map(g=>{
   const founderBoost=Boolean(g.founder_auto_boost),count=Number(g.boost_count||0);
   return '<article class="server"><div class="serversub"><div><b>'+htmlEsc(g.name||"Serveur")+'</b><small>'+count+' boost(s) actif(s) '+(founderBoost?' · 👑 Fondateur à vie':'')+'</small></div><span class="star">★ '+count+'</span></div>'+(founderBoost?'<span class="permanent">👑 Boost permanent activé</span>':'<div class="actions"><button type="button" class="starBoost" data-guild="'+htmlEsc(g.id)+'">★ Booster avec 1 étoile</button>'+(premium.active?'<button type="button" class="premiumBoost" data-guild="'+htmlEsc(g.id)+'">✦ Booster via Premium</button>':'')+'</div>')+'</article>';
 }).join("")||'<p class="muted">Tu n’as pas encore rejoint de serveur CMD Sphere. <a href="/servers/add">Crée le tien</a>.</p>';
 const packs=Object.entries(PACKS).map(([id,x])=>'<article class="pack"><strong>★ '+x.stars+'</strong><h3>'+htmlEsc(x.label)+'</h3><p>1 étoile = 1 boost CMD Sphere pendant 30 jours.</p><b class="cost">'+price(x.cents)+'</b><a target="_blank" rel="noopener noreferrer" href="'+htmlEsc(payPalUrl)+'/'+(x.cents/100)+'">Payer avec PayPal</a><button type="button" class="request" data-pack="'+id+'">J’ai payé, soumettre la référence</button></article>').join("");
 const history=state.history.map(x=>'<div class="purchase"><span>'+htmlEsc(PACKS[x.pack_id]?.label||"Étoiles")+' · '+new Date(x.created_at).toLocaleDateString("fr-FR")+'</span><strong class="'+htmlEsc(x.status)+'">'+htmlEsc(x.status==="approved"?"Validé":x.status==="rejected"?"Refusé":"En attente")+'</strong></div>').join("")||'<p class="muted">Aucun achat d’étoiles.</p>';
 const approvals=owner?'<section class="pane"><h2>👑 Paiements à valider</h2><p class="muted">Compare toujours la référence et le montant au paiement réellement reçu sur ton PayPal avant de créditer des étoiles.</p>'+state.adminPending.map(x=>'<div class="pending"><b>'+htmlEsc(x.username||x.user_id)+'</b><small>★ '+Number(x.stars)+' · '+price(Number(x.price_cents))+' · Réf. '+htmlEsc(x.payment_reference)+'</small><button type="button" class="review" data-id="'+htmlEsc(x.id)+'" data-action="approve">✓ Paiement vérifié</button><button type="button" class="review reject" data-id="'+htmlEsc(x.id)+'" data-action="reject">✕ Refuser</button></div>').join("")+(state.adminPending.length?"":'<p>Aucun paiement en attente.</p>')+'</section>':"";
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#161025"><title>Étoiles & boosts · CMD Sphere</title><style>'+
 '*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 50% -20%,#4f2680,#11111a 60%);color:#f5edff;font:14px/1.55 system-ui,-apple-system,Arial}.nav{position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:11px;background:#161320ee;backdrop-filter:blur(15px);padding:14px 18px;border-bottom:1px solid #ffffff24}.nav a,.pack a{color:#dfc0ff}.nav b{font-size:18px}.wrap{max-width:1000px;margin:auto;padding:22px 15px 80px}.hero{padding:26px;background:radial-gradient(circle at 90% 0,#f3c66a40,transparent 45%),linear-gradient(125deg,#332047,#131c32);border:1px solid #ac7cd055;border-radius:22px}.hero h1{font-size:clamp(27px,4vw,40px);margin:0}.hero p{color:#d0bde3}.balance{display:flex;align-items:center;gap:18px;font-size:20px;font-weight:750}.balance strong{font-size:42px;color:#ffde91;text-shadow:0 0 25px #d7986b}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.pack,.pane,.server{padding:18px;border:1px solid #735697;border-radius:18px;background:#201b2ddd}.pack strong{font-size:34px;color:#f9d591}.pack h3{margin:0;font-size:19px}.pack p,.muted,.hint{color:#bfb3d2}.cost{font-size:23px;display:block;margin:13px 0}.pack a,.pack button,.actions button,.pending button,.create{display:inline-block;width:100%;padding:12px;border:1px solid #986bc1;border-radius:11px;text-align:center;text-decoration:none;font-weight:800;cursor:pointer;color:#fff;background:#503281;margin-top:8px}.pack a{background:#006bb5}.pane{margin:16px 0}.pane h2{margin:0 0 11px;font-size:21px}.servers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.serversub{display:flex;justify-content:space-between;align-items:center;gap:10px}.serversub small{display:block;color:#aea3c0;margin-top:3px}.star{font-weight:900;color:#fee293}.permanent{display:block;color:#89ead7;font-weight:850;margin-top:12px}.pending,.purchase{padding:9px;border-bottom:1px solid #ffffff22}.pending small{display:block;color:#d6bddc;margin:6px 0}.pending button{max-width:180px;margin-right:9px;padding:8px}.pending button.reject{background:#563143}.purchase{display:flex;justify-content:space-between;gap:15px}.purchase strong.approved{color:#91efc2}.purchase strong.pending{color:#ffd694}.hint{font-size:12px;margin:12px 0}.tools{display:flex;gap:9px;flex-wrap:wrap;margin-top:17px}.tools a{color:#e9d5ff;border:1px solid #a67de2;padding:10px 12px;border-radius:11px;text-decoration:none}.toast{display:none;position:fixed;bottom:25px;left:50%;transform:translateX(-50%);max-width:min(500px,90vw);background:#282037;color:white;padding:14px 20px;border:1px solid #b495d1;border-radius:14px;z-index:90}.toast.on{display:block}@media(max-width:700px){.grid,.servers{grid-template-columns:1fr}.nav b{font-size:15px}.wrap{padding:14px}.hero{padding:17px}}\n'+
 '</style></head><body><nav class="nav"><a href="/dashboard">← CMD Sphere</a><b>★ Étoiles & boosts</b><a style="margin-left:auto" href="/shop">Boutique</a></nav><main class="wrap"><header class="hero"><h1>★ Boost tes serveurs</h1><p>Crée une communauté gratuitement. Pour booster un serveur CMD Sphere, utilise Premium ou des étoiles.</p><div class="balance"><strong>'+(owner?"∞":Number(state.balance).toLocaleString("fr-FR"))+'</strong> ★ étoiles'+(owner?' · 👑 Fondateur, boosts à vie':"")+'</div><div class="tools"><a href="/servers/add">＋ Créer mon serveur</a><a href="/shop">★ Abonnement Premium (3 boosts)</a><a href="/diamonds">💎 Boutique Diamants</a></div></header><section class="pane"><h2>Mes serveurs</h2><p class="muted">Un boost obtenu avec une étoile dure 30 jours. Un serveur peut recevoir plusieurs boosts. Les serveurs du fondateur sont boostés en permanence.</p><div class="servers">'+serverCards+'</div></section><section class="pane"><h2>⭐ Acheter des étoiles</h2><p class="muted">'+htmlEsc(PRICE_NOTE)+'</p><div class="grid">'+packs+'</div><p class="hint">Après ton paiement, saisis sa référence PayPal. Un paiement déclaré n’ajoute pas automatiquement les étoiles : le fondateur doit le vérifier.</p></section><section class="pane"><h2>Historique des achats</h2>'+history+'</section>'+approvals+'<p class="hint">Les étoiles et boosts CMD Sphere ne sont pas liés à Discord Nitro ni à la location de serveurs de jeux.</p></main><div class="toast" id="starToast" role="status"></div><script>'+
 'const toast=document.getElementById("starToast");function message(x){toast.textContent=x;toast.classList.add("on");setTimeout(()=>toast.classList.remove("on"),3800)}async function api(url,body){const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw Error(d.error||"Erreur");return d}'+
 'document.querySelectorAll(".request").forEach(b=>b.onclick=async()=>{const reference=prompt("Saisis la référence de transaction PayPal (le paiement doit être effectué avant).");if(!reference)return;b.disabled=true;try{const d=await api("/api/stars/request",{pack:b.dataset.pack,paymentReference:reference});message(d.message);setTimeout(()=>location.reload(),900)}catch(e){message(e.message)}finally{b.disabled=false}});'+
 'document.querySelectorAll(".starBoost").forEach(b=>b.onclick=async()=>{if(!confirm("Utiliser une étoile pour booster ce serveur CMD Sphere pendant 30 jours ?"))return;b.disabled=true;try{const d=await api("/api/stars/boost",{guildId:b.dataset.guild});message(d.message);setTimeout(()=>location.reload(),900)}catch(e){message(e.message)}finally{b.disabled=false}});'+
 'document.querySelectorAll(".premiumBoost").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api("/api/premium/boost",{guildId:b.dataset.guild});message("Boost Premium activé.");setTimeout(()=>location.reload(),900)}catch(e){message(e.message)}finally{b.disabled=false}});'+
 'document.querySelectorAll(".review").forEach(b=>b.onclick=async()=>{if(!confirm(b.dataset.action==="approve"?"As-tu vérifié ce paiement sur ton compte PayPal ?":"Refuser cette demande d’achat ?"))return;b.disabled=true;try{await api("/api/stars/review",{id:b.dataset.id,action:b.dataset.action});message("Demande traitée.");setTimeout(()=>location.reload(),900)}catch(e){message(e.message)}finally{b.disabled=false}});'+
 '</script></body></html>';
}

export async function handleCmdStars(req,res,url,opts){
 const {pool,baseUrl,auth,html,sendJson,redirect,readBodyJson,isFounder,getPremiumState,listNativeGuilds}=opts;
 const path=url.pathname;
 if(!path.startsWith("/api/stars/")&&path!=="/stars")return false;
 if(!auth){
   if(path==="/stars")redirect(res,baseUrl+"/dashboard-login?next="+encodeURIComponent("/stars"));
   else sendJson(res,401,{error:"Connexion CMD Sphere requise"});
   return true;
 }
 try{
   if(path==="/stars"&&req.method==="GET"){
     const [state,guilds,premium]=await Promise.all([getStarsState(pool,auth,isFounder,true),listNativeGuilds(auth),getPremiumState(auth)]);
     html(res,starsPage(auth,state,guilds,premium,"https://www.paypal.me/ZnationCmdofficiel"));return true;
   }
   if(path==="/api/stars/status"&&req.method==="GET"){
     const [state,guilds]=await Promise.all([getStarsState(pool,auth,isFounder,true),listNativeGuilds(auth)]);
     sendJson(res,200,{...state,guilds:guilds.map(g=>({id:g.id,name:g.name,boostCount:Number(g.boost_count||0),founderAutoBoost:Boolean(g.founder_auto_boost)}))});return true;
   }
   if(req.method!=="POST"){sendJson(res,405,{error:"Méthode non autorisée"});return true}
   const input=await readBodyJson(req);
   if(path==="/api/stars/request"){sendJson(res,202,await requestStarOrder(pool,auth,input));return true}
   if(path==="/api/stars/review"){sendJson(res,200,await reviewOrder(pool,auth,isFounder,input.id,input.action));return true}
   if(path==="/api/stars/boost"){sendJson(res,200,await applyStarBoost(pool,auth,input.guildId,isFounder));return true}
   sendJson(res,404,{error:"Action étoiles inconnue"});return true;
 }catch(e){
   const message=e?.message||"Erreur de gestion des étoiles.";
   sendJson(res,400,{error:message});return true;
 }
}

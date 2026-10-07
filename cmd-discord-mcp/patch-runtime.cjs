const fs=require("fs");
const p="server.js";
let s=fs.readFileSync(p,"utf8");
let n=0;
function rep(a,b,label){
  if(s.includes(a)){s=s.replace(a,b);n++;console.log("[patch] "+label)}
  else console.log("[patch] skip "+label);
}

// Keep session cookie compact enough for iPhone/Safari.
rep(
\`function sessionPayload(authData){
  return signPayload({typ:"dashboard_session",exp:Date.now()+10*365*24*3600*1000,user:authData.user,guildIds:authData.guildIds||[],guilds:authData.guilds||[]});
}\`,
\`function sessionPayload(authData){
  const u=authData.user||{};
  const user={id:String(u.id||""),name:String(u.name||"CMD").slice(0,100),displayName:String(u.displayName||u.name||"CMD").slice(0,100),discordId:u.discordId?String(u.discordId):null};
  return signPayload({typ:"dashboard_session",exp:Date.now()+10*365*24*3600*1000,user,guildIds:(authData.guildIds||[]).map(String).slice(0,100)});
}\`,
"compact session"
);

// Use a conservative persistent cookie lifetime and no oversized metadata.
rep(
\`function dashboardCookie(value,maxAge=10*365*24*3600){
  return "cmd_sphere_session="+encodeURIComponent(value)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+maxAge+"; Expires="+new Date(Date.now()+maxAge*1000).toUTCString();
}\`,
\`function dashboardCookie(value,maxAge=365*24*3600){
  return "cmd_sphere_session="+encodeURIComponent(value)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+maxAge;
}\`,
"cookie lifetime"
);

// Return the token to native account login so the browser can keep a local first-party fallback.
rep(
\`sendJson(res,201,{ok:true,user:authData.user},{"set-cookie":dashboardCookie(session)});\`,
\`sendJson(res,201,{ok:true,user:authData.user,session},{"set-cookie":dashboardCookie(session)});\`,
"signup session fallback"
);
rep(
\`sendJson(res,200,{ok:true,user:authData.user},{"set-cookie":dashboardCookie(session)});\`,
\`sendJson(res,200,{ok:true,user:authData.user,session},{"set-cookie":dashboardCookie(session)});\`,
"login session fallback"
);

// Persist native-login token to localStorage + JS cookie before entering the dashboard.
rep(
\`if(!r.ok)throw new Error(d.error||"Erreur");location.href="/dashboard"}\`,
\`if(!r.ok)throw new Error(d.error||"Erreur");if(d.session){localStorage.setItem("cmd_sphere_session",d.session);document.cookie="cmd_sphere_session="+encodeURIComponent(d.session)+"; Path=/; Max-Age=31536000; SameSite=Lax; Secure"}location.href="/dashboard"}\`,
"native login persistence"
);

// Discord OAuth: set both server cookie and a first-party JS/localStorage fallback.
rep(
\`res.writeHead(302,{Location:(String(tx.next||"/dashboard").startsWith("/")?baseUrl+String(tx.next):baseUrl+"/dashboard"),"set-cookie":dashboardCookie(session),"cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0"});res.end();return;\`,
\`const target=(String(tx.next||"/dashboard").startsWith("/")?baseUrl+String(tx.next):baseUrl+"/dashboard");
          const cookie=dashboardCookie(session);
          const page='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CMD Sphere</title><body style="margin:0;background:#08060d;color:white;font-family:system-ui;display:grid;place-items:center;min-height:100vh"><div style="text-align:center"><h2>CMD Sphere</h2><p>Connexion en cours…</p></div><script>try{localStorage.setItem("cmd_sphere_session",'+JSON.stringify(session)+');document.cookie="cmd_sphere_session="+encodeURIComponent('+JSON.stringify(session)+')+"; Path=/; Max-Age=31536000; SameSite=Lax; Secure"}catch(e){}location.replace('+JSON.stringify(target)+');<\\/script></body>';
          html(res,page,200,{"set-cookie":cookie,"cache-control":"no-store, no-cache, must-revalidate"});return;\`,
"discord persistence"
);

// Clear local fallback on explicit logout.
rep(
\`html(res,'<!doctype html><meta charset="utf-8"><script>location.replace("/")</script>',200,{"set-cookie":clearDashboardCookies()});return;\`,
\`html(res,'<!doctype html><meta charset="utf-8"><script>try{localStorage.removeItem("cmd_sphere_session");sessionStorage.removeItem("cmd_restore_try")}catch(e){}location.replace("/")<\\/script>',200,{"set-cookie":clearDashboardCookies()});return;\`,
"logout local cleanup"
);

// Global language + refresh controls, and localStorage session recovery.
const injectFn = String.raw\`
function injectUi(body){
  if(typeof body!=="string"||!/<body/i.test(body))return body;
  const ui='<div id="cmd-global-tools" style="position:fixed;z-index:99999;right:10px;top:max(10px,env(safe-area-inset-top));display:flex;gap:7px;align-items:center;background:#0b0810dd;border:1px solid #ffffff1b;border-radius:14px;padding:6px;backdrop-filter:blur(14px)">'+
    '<select id="cmd-language" aria-label="Langue" style="background:#17101e;color:#fff;border:1px solid #ffffff1c;border-radius:9px;padding:8px 7px;font-weight:800">'+
    '<option value="fr">🇫🇷 FR</option><option value="en">🇺🇸 EN</option><option value="de">🇩🇪 DE</option><option value="es">🇪🇸 ES</option><option value="it">🇮🇹 IT</option><option value="ru">🇷🇺 RU</option><option value="pt">🇵🇹 PT</option><option value="ja">🇯🇵 JA</option><option value="ko">🇰🇷 KO</option><option value="zh">🇨🇳 ZH</option></select>'+
    '<button id="cmd-refresh" title="Actualiser" style="border:0;border-radius:9px;background:#ffffff10;color:white;padding:8px 10px;font-size:18px">↻</button></div>';
  const js='<script>(function(){'+
  'const D={'+
  'fr:{"CMD Sphere":"CMD Sphere","Continuer avec Discord":"Continuer avec Discord","Se connecter":"Se connecter","Créer un compte CMD Sphere":"Créer un compte CMD Sphere","Connexion CMD Sphere":"Connexion CMD Sphere","Créer mon compte":"Créer mon compte","Mon profil":"Mon profil","Déconnexion":"Déconnexion","Mes Discord":"Mes Discord","Actualiser":"Actualiser","Créer un serveur":"Créer un serveur","J’ai une invitation":"J’ai une invitation","Découvrir":"Découvrir","Importer Discord":"Importer Discord","Copier invitation":"Copier invitation","Rôles":"Rôles","Catégories & salons":"Catégories & salons","Nouveau rôle":"Nouveau rôle","Nouveau salon":"Nouveau salon","Nouvelle catégorie":"Nouvelle catégorie","Créer":"Créer","Retour":"Retour","Rejoindre":"Rejoindre","Modifier le profil":"Modifier le profil","Enregistrer":"Enregistrer","Annuler":"Annuler","Bio":"Bio","Principal":"Principal","Serveurs":"Serveurs","Vote pour tes serveurs préférés":"Vote pour tes serveurs préférés"},'+
  'en:{"Continuer avec Discord":"Continue with Discord","Se connecter":"Sign in","Créer un compte CMD Sphere":"Create a CMD Sphere account","Connexion CMD Sphere":"CMD Sphere sign in","Créer mon compte":"Create my account","Mon profil":"My profile","Déconnexion":"Log out","Mes Discord":"My Discord servers","Actualiser":"Refresh","Créer un serveur":"Create a server","J’ai une invitation":"I have an invite","Découvrir":"Discover","Importer Discord":"Import Discord","Copier invitation":"Copy invite","Rôles":"Roles","Catégories & salons":"Categories & channels","Nouveau rôle":"New role","Nouveau salon":"New channel","Nouvelle catégorie":"New category","Créer":"Create","Retour":"Back","Rejoindre":"Join","Modifier le profil":"Edit profile","Enregistrer":"Save","Annuler":"Cancel","Bio":"Bio","Principal":"Main","Serveurs":"Servers","Vote pour tes serveurs préférés":"Vote for your favorite servers"},'+
  'de:{"Continuer avec Discord":"Mit Discord fortfahren","Se connecter":"Anmelden","Créer un compte CMD Sphere":"CMD-Sphere-Konto erstellen","Connexion CMD Sphere":"CMD Sphere Anmeldung","Créer mon compte":"Konto erstellen","Mon profil":"Mein Profil","Déconnexion":"Abmelden","Mes Discord":"Meine Discord-Server","Actualiser":"Aktualisieren","Créer un serveur":"Server erstellen","J’ai une invitation":"Ich habe eine Einladung","Découvrir":"Entdecken","Importer Discord":"Discord importieren","Copier invitation":"Einladung kopieren","Rôles":"Rollen","Catégories & salons":"Kategorien & Kanäle","Nouveau rôle":"Neue Rolle","Nouveau salon":"Neuer Kanal","Nouvelle catégorie":"Neue Kategorie","Créer":"Erstellen","Retour":"Zurück","Rejoindre":"Beitreten","Modifier le profil":"Profil bearbeiten","Enregistrer":"Speichern","Annuler":"Abbrechen","Bio":"Bio","Principal":"Start","Serveurs":"Server","Vote pour tes serveurs préférés":"Stimme für deine Lieblingsserver"},'+
  'es:{"Continuer avec Discord":"Continuar con Discord","Se connecter":"Iniciar sesión","Créer un compte CMD Sphere":"Crear una cuenta CMD Sphere","Connexion CMD Sphere":"Inicio de sesión CMD Sphere","Créer mon compte":"Crear mi cuenta","Mon profil":"Mi perfil","Déconnexion":"Cerrar sesión","Mes Discord":"Mis servidores Discord","Actualiser":"Actualizar","Créer un serveur":"Crear servidor","J’ai une invitation":"Tengo una invitación","Découvrir":"Descubrir","Importer Discord":"Importar Discord","Copier invitation":"Copiar invitación","Rôles":"Roles","Catégories & salons":"Categorías y canales","Nouveau rôle":"Nuevo rol","Nouveau salon":"Nuevo canal","Nouvelle catégorie":"Nueva categoría","Créer":"Crear","Retour":"Volver","Rejoindre":"Unirse","Modifier le profil":"Editar perfil","Enregistrer":"Guardar","Annuler":"Cancelar","Bio":"Bio","Principal":"Principal","Serveurs":"Servidores","Vote pour tes serveurs préférés":"Vota por tus servidores favoritos"},'+
  'it:{"Continuer avec Discord":"Continua con Discord","Se connecter":"Accedi","Créer un compte CMD Sphere":"Crea un account CMD Sphere","Connexion CMD Sphere":"Accesso CMD Sphere","Créer mon compte":"Crea il mio account","Mon profil":"Il mio profilo","Déconnexion":"Disconnetti","Mes Discord":"I miei server Discord","Actualiser":"Aggiorna","Créer un serveur":"Crea server","J’ai une invitation":"Ho un invito","Découvrir":"Scopri","Importer Discord":"Importa Discord","Copier invitation":"Copia invito","Rôles":"Ruoli","Catégories & salons":"Categorie e canali","Nouveau rôle":"Nuovo ruolo","Nouveau salon":"Nuovo canale","Nouvelle catégorie":"Nuova categoria","Créer":"Crea","Retour":"Indietro","Rejoindre":"Unisciti","Modifier le profil":"Modifica profilo","Enregistrer":"Salva","Annuler":"Annulla","Bio":"Bio","Principal":"Principale","Serveurs":"Server","Vote pour tes serveurs préférés":"Vota i tuoi server preferiti"},'+
  'ru:{"Continuer avec Discord":"Продолжить с Discord","Se connecter":"Войти","Créer un compte CMD Sphere":"Создать аккаунт CMD Sphere","Connexion CMD Sphere":"Вход CMD Sphere","Créer mon compte":"Создать аккаунт","Mon profil":"Мой профиль","Déconnexion":"Выйти","Mes Discord":"Мои серверы Discord","Actualiser":"Обновить","Créer un serveur":"Создать сервер","J’ai une invitation":"У меня есть приглашение","Découvrir":"Обзор","Importer Discord":"Импорт Discord","Copier invitation":"Копировать приглашение","Rôles":"Роли","Catégories & salons":"Категории и каналы","Nouveau rôle":"Новая роль","Nouveau salon":"Новый канал","Nouvelle catégorie":"Новая категория","Créer":"Создать","Retour":"Назад","Rejoindre":"Войти","Modifier le profil":"Изменить профиль","Enregistrer":"Сохранить","Annuler":"Отмена","Bio":"О себе","Principal":"Главная","Serveurs":"Серверы","Vote pour tes serveurs préférés":"Голосуй за любимые серверы"},'+
  'pt:{"Continuer avec Discord":"Continuar com Discord","Se connecter":"Entrar","Créer un compte CMD Sphere":"Criar conta CMD Sphere","Connexion CMD Sphere":"Entrar no CMD Sphere","Créer mon compte":"Criar minha conta","Mon profil":"Meu perfil","Déconnexion":"Sair","Mes Discord":"Meus servidores Discord","Actualiser":"Atualizar","Créer un serveur":"Criar servidor","J’ai une invitation":"Tenho um convite","Découvrir":"Descobrir","Importer Discord":"Importar Discord","Copier invitation":"Copiar convite","Rôles":"Cargos","Catégories & salons":"Categorias e canais","Nouveau rôle":"Novo cargo","Nouveau salon":"Novo canal","Nouvelle catégorie":"Nova categoria","Créer":"Criar","Retour":"Voltar","Rejoindre":"Entrar","Modifier le profil":"Editar perfil","Enregistrer":"Salvar","Annuler":"Cancelar","Bio":"Bio","Principal":"Principal","Serveurs":"Servidores","Vote pour tes serveurs préférés":"Vote nos seus servidores favoritos"},'+
  'ja:{"Continuer avec Discord":"Discordで続行","Se connecter":"ログイン","Créer un compte CMD Sphere":"CMD Sphereアカウントを作成","Connexion CMD Sphere":"CMD Sphereログイン","Créer mon compte":"アカウント作成","Mon profil":"マイプロフィール","Déconnexion":"ログアウト","Mes Discord":"マイDiscordサーバー","Actualiser":"更新","Créer un serveur":"サーバー作成","J’ai une invitation":"招待があります","Découvrir":"探す","Importer Discord":"Discordをインポート","Copier invitation":"招待をコピー","Rôles":"ロール","Catégories & salons":"カテゴリとチャンネル","Nouveau rôle":"新しいロール","Nouveau salon":"新しいチャンネル","Nouvelle catégorie":"新しいカテゴリ","Créer":"作成","Retour":"戻る","Rejoindre":"参加","Modifier le profil":"プロフィール編集","Enregistrer":"保存","Annuler":"キャンセル","Bio":"自己紹介","Principal":"メイン","Serveurs":"サーバー","Vote pour tes serveurs préférés":"お気に入りのサーバーに投票"},'+
  'ko:{"Continuer avec Discord":"Discord로 계속","Se connecter":"로그인","Créer un compte CMD Sphere":"CMD Sphere 계정 만들기","Connexion CMD Sphere":"CMD Sphere 로그인","Créer mon compte":"계정 만들기","Mon profil":"내 프로필","Déconnexion":"로그아웃","Mes Discord":"내 Discord 서버","Actualiser":"새로고침","Créer un serveur":"서버 만들기","J’ai une invitation":"초대가 있어요","Découvrir":"찾아보기","Importer Discord":"Discord 가져오기","Copier invitation":"초대 복사","Rôles":"역할","Catégories & salons":"카테고리 및 채널","Nouveau rôle":"새 역할","Nouveau salon":"새 채널","Nouvelle catégorie":"새 카테고리","Créer":"만들기","Retour":"뒤로","Rejoindre":"참여","Modifier le profil":"프로필 수정","Enregistrer":"저장","Annuler":"취소","Bio":"소개","Principal":"메인","Serveurs":"서버","Vote pour tes serveurs préférés":"좋아하는 서버에 투표"},'+
  'zh:{"Continuer avec Discord":"使用 Discord 继续","Se connecter":"登录","Créer un compte CMD Sphere":"创建 CMD Sphere 账户","Connexion CMD Sphere":"CMD Sphere 登录","Créer mon compte":"创建账户","Mon profil":"我的资料","Déconnexion":"退出登录","Mes Discord":"我的 Discord 服务器","Actualiser":"刷新","Créer un serveur":"创建服务器","J’ai une invitation":"我有邀请","Découvrir":"发现","Importer Discord":"导入 Discord","Copier invitation":"复制邀请","Rôles":"角色","Catégories & salons":"分类和频道","Nouveau rôle":"新角色","Nouveau salon":"新频道","Nouvelle catégorie":"新分类","Créer":"创建","Retour":"返回","Rejoindre":"加入","Modifier le profil":"编辑资料","Enregistrer":"保存","Annuler":"取消","Bio":"简介","Principal":"主页","Serveurs":"服务器","Vote pour tes serveurs préférés":"为你喜欢的服务器投票"}'+
  '};'+
  'const reverse={};Object.entries(D).forEach(([lang,o])=>Object.entries(o).forEach(([k,v])=>{reverse[k]=k;reverse[v]=k}));'+
  'function applyLang(lang){lang=D[lang]?lang:"fr";localStorage.setItem("cmd_lang",lang);document.documentElement.lang=lang;const t=D[lang];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(w.nextNode())nodes.push(w.currentNode);nodes.forEach(x=>{const raw=x.nodeValue,trim=raw.trim(),k=reverse[trim];if(k&&t[k])x.nodeValue=raw.replace(trim,t[k])});document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(e=>{const k=reverse[e.placeholder];if(k&&t[k])e.placeholder=t[k]})}'+
  'function start(){const sel=document.getElementById("cmd-language"),lng=localStorage.getItem("cmd_lang")||((navigator.language||"fr").slice(0,2));if(sel){sel.value=D[lng]?lng:"fr";sel.onchange=()=>applyLang(sel.value)}document.getElementById("cmd-refresh")?.addEventListener("click",()=>location.reload());applyLang(D[lng]?lng:"fr");'+
  'const loginPage=!document.querySelector(".sphere-app")&&(location.pathname==="/"||location.pathname==="/dashboard");const tok=localStorage.getItem("cmd_sphere_session");if(loginPage&&tok&&!sessionStorage.getItem("cmd_restore_try")){sessionStorage.setItem("cmd_restore_try","1");document.cookie="cmd_sphere_session="+encodeURIComponent(tok)+"; Path=/; Max-Age=31536000; SameSite=Lax; Secure";location.replace("/dashboard?restored=1");return}if(document.querySelector(".sphere-app"))sessionStorage.removeItem("cmd_restore_try");if(loginPage&&new URLSearchParams(location.search).get("restored")==="1"){localStorage.removeItem("cmd_sphere_session");sessionStorage.removeItem("cmd_restore_try")}document.querySelectorAll("a[href=\\"/dashboard-logout\\"]").forEach(a=>a.addEventListener("click",()=>{localStorage.removeItem("cmd_sphere_session");sessionStorage.removeItem("cmd_restore_try")}));'+
  'let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>applyLang(localStorage.getItem("cmd_lang")||"fr"),30)}).observe(document.body,{childList:true,subtree:true});}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start):start();})();<\\/script>';
  return body.replace(/<body([^>]*)>/i,function(m,a){return m+ui}).replace(/<\\/body>/i,js+"</body>");
}
\`;

if(!s.includes("function injectUi(body){")){
  s=s.replace("function html(res,body,status=200,headers={}){",injectFn+"\nfunction html(res,body,status=200,headers={}){");
  n++;
}
rep(
\`res.writeHead(status,{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer",...headers});res.end(body);\`,
\`res.writeHead(status,{"content-type":"text/html; charset=utf-8","cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0","x-content-type-options":"nosniff","referrer-policy":"no-referrer",...headers});res.end(injectUi(body));\`,
"global ui injection"
);

// Make service worker aggressively take the new version and never serve cached HTML.
rep(
\`res.writeHead(200,{"content-type":"application/javascript","cache-control":"no-cache"});res.end("self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>self.clients.claim());self.addEventListener('fetch',()=>{});");return;\`,
\`res.writeHead(200,{"content-type":"application/javascript","cache-control":"no-store"});res.end("self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.clients.claim()})()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(fetch(e.request,{cache:'no-store'}));});");return;\`,
"PWA cache refresh"
);

fs.writeFileSync(p,s);
console.log("[patch] applied changes="+n);

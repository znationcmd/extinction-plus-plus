const fs=require("fs");
const p="server.js";
let s=fs.readFileSync(p,"utf8");
let changed=0;
function rep(a,b,label){
  if(s.includes(a)){s=s.replace(a,b);changed++;console.log("[patch] "+label)}
  else console.log("[patch] anchor missing: "+label);
}

// Compact persistent session (Safari/iPhone friendly).
rep(`function sessionPayload(authData){
  return signPayload({typ:"dashboard_session",exp:Date.now()+10*365*24*3600*1000,user:authData.user,guildIds:authData.guildIds||[],guilds:authData.guilds||[]});
}`,`function sessionPayload(authData){
  const u=authData.user||{};
  const user={id:String(u.id||""),name:String(u.name||"CMD").slice(0,100),displayName:String(u.displayName||u.name||"CMD").slice(0,100),discordId:u.discordId?String(u.discordId):null};
  return signPayload({typ:"dashboard_session",exp:Date.now()+365*24*3600*1000,user,guildIds:(authData.guildIds||[]).map(String).slice(0,100)});
}`,"compact session");

rep(`function dashboardCookie(value,maxAge=10*365*24*3600){
  return "cmd_sphere_session="+encodeURIComponent(value)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+maxAge+"; Expires="+new Date(Date.now()+maxAge*1000).toUTCString();
}`,`function dashboardCookie(value,maxAge=365*24*3600){
  return "cmd_sphere_session="+encodeURIComponent(value)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+maxAge;
}`,"persistent cookie");

// Native account login returns the session token too, so Safari can restore it from localStorage if needed.
rep(`sendJson(res,201,{ok:true,user:authData.user},{"set-cookie":dashboardCookie(session)});`,
    `sendJson(res,201,{ok:true,user:authData.user,session},{"set-cookie":dashboardCookie(session)});`,
    "signup session token");
rep(`sendJson(res,200,{ok:true,user:authData.user},{"set-cookie":dashboardCookie(session)});`,
    `sendJson(res,200,{ok:true,user:authData.user,session},{"set-cookie":dashboardCookie(session)});`,
    "login session token");
rep(`if(!r.ok)throw new Error(d.error||"Erreur");location.href="/dashboard"}`,
    `if(!r.ok)throw new Error(d.error||"Erreur");if(d.session){try{localStorage.setItem("cmd_sphere_session",d.session);document.cookie="cmd_sphere_session="+encodeURIComponent(d.session)+"; Path=/; Max-Age=31536000; SameSite=Lax; Secure"}catch{}}location.href="/dashboard"}`,
    "native login browser persistence");

// Discord callback: set server cookie + first-party browser fallback before dashboard navigation.
rep(`res.writeHead(302,{Location:(String(tx.next||"/dashboard").startsWith("/")?baseUrl+String(tx.next):baseUrl+"/dashboard"),"set-cookie":dashboardCookie(session),"cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0"});res.end();return;`,
`const target=(String(tx.next||"/dashboard").startsWith("/")?baseUrl+String(tx.next):baseUrl+"/dashboard");
          const cookie=dashboardCookie(session);
          const callbackPage='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CMD Sphere</title></head><body style="margin:0;background:#08060d;color:#fff;font-family:system-ui;display:grid;place-items:center;min-height:100vh"><div style="text-align:center"><h2>CMD Sphere</h2><p>Connexion en cours…</p></div><script>try{localStorage.setItem("cmd_sphere_session",'+JSON.stringify(session)+');document.cookie="cmd_sphere_session="+encodeURIComponent('+JSON.stringify(session)+')+"; Path=/; Max-Age=31536000; SameSite=Lax; Secure"}catch(e){}location.replace('+JSON.stringify(target)+');<\\/script></body></html>';
          html(res,callbackPage,200,{"set-cookie":cookie,"cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0"});return;`,
"Discord persistent callback");

// Logout also clears browser fallback.
rep(`html(res,'<!doctype html><meta charset="utf-8"><script>location.replace("/")</script>',200,{"set-cookie":clearDashboardCookies()});return;`,
`html(res,'<!doctype html><meta charset="utf-8"><script>try{localStorage.removeItem("cmd_sphere_session");sessionStorage.removeItem("cmd_sphere_restore")}catch(e){}location.replace("/")<\\/script>',200,{"set-cookie":clearDashboardCookies()});return;`,
"logout persistence");

// BOT ARK language system adapted to CMD Sphere: same 10 languages and localStorage behavior.
const injectCode = `
function injectCmdSphereUi(body){
  if(typeof body!=="string"||body.indexOf("<body")<0)return body;
  const toolbar='<div id="cmd-sphere-tools" style="position:fixed;z-index:99999;right:10px;top:max(10px,env(safe-area-inset-top));display:flex;gap:7px;align-items:center;background:#0b0810e8;border:1px solid #ffffff1b;border-radius:14px;padding:6px;backdrop-filter:blur(14px)">'+
    '<select id="cmd-sphere-language" aria-label="Langue" style="max-width:155px;background:#17101e;color:#fff;border:1px solid #ffffff1c;border-radius:9px;padding:8px 7px;font-weight:800">'+
    '<option value="fr">🇫🇷 Français</option>'+
    '<option value="en">🇬🇧 English</option>'+
    '<option value="us">🇺🇸 English (US)</option>'+
    '<option value="de">🇩🇪 Deutsch</option>'+
    '<option value="es">🇪🇸 Español</option>'+
    '<option value="it">🇮🇹 Italiano</option>'+
    '<option value="ru">🇷🇺 Русский</option>'+
    '<option value="ko">🇰🇷 한국어</option>'+
    '<option value="ja">🇯🇵 日本語</option>'+
    '<option value="zh">🇨🇳 中文</option>'+
    '</select><button id="cmd-sphere-refresh" type="button" title="Actualiser / vérifier les mises à jour" aria-label="Actualiser" style="border:0;border-radius:9px;background:#ffffff10;color:#fff;padding:8px 10px;font-size:19px;font-weight:900">↻</button></div>';

  const client='<script>(function(){'+
  'const languages=["fr","en","us","de","es","it","ru","ko","ja","zh"];'+
  'const dict={'+
  'fr:{"Continue with Discord":"Continuer avec Discord","Sign in":"Se connecter","Create a CMD Sphere account":"Créer un compte CMD Sphere","CMD Sphere sign in":"Connexion CMD Sphere","Create my account":"Créer mon compte","My profile":"Mon profil","Log out":"Déconnexion","My Discord servers":"Mes Discord","Refresh":"Actualiser","Create a server":"Créer un serveur","I have an invite":"J’ai une invitation","Discover":"Découvrir","Import Discord":"Importer Discord","Copy invite":"Copier invitation","Roles":"Rôles","Categories & channels":"Catégories & salons","New role":"Nouveau rôle","New channel":"Nouveau salon","New category":"Nouvelle catégorie","Create":"Créer","Back":"Retour","Join":"Rejoindre","Edit profile":"Modifier le profil","Save":"Enregistrer","Cancel":"Annuler","Main":"Principal","Servers":"Serveurs","Vote for your favorite servers":"Vote pour tes serveurs préférés","Language":"Langue","Settings":"Configuration","Name":"Nom","Password":"Mot de passe"},'+
  'en:{"Continuer avec Discord":"Continue with Discord","Se connecter":"Sign in","Créer un compte CMD Sphere":"Create a CMD Sphere account","Connexion CMD Sphere":"CMD Sphere sign in","Créer mon compte":"Create my account","Mon profil":"My profile","Déconnexion":"Log out","Mes Discord":"My Discord servers","Actualiser":"Refresh","Créer un serveur":"Create a server","J’ai une invitation":"I have an invite","Découvrir":"Discover","Importer Discord":"Import Discord","Copier invitation":"Copy invite","Rôles":"Roles","Catégories & salons":"Categories & channels","Nouveau rôle":"New role","Nouveau salon":"New channel","Nouvelle catégorie":"New category","Créer":"Create","Retour":"Back","Rejoindre":"Join","Modifier le profil":"Edit profile","Enregistrer":"Save","Annuler":"Cancel","Principal":"Main","Serveurs":"Servers","Vote pour tes serveurs préférés":"Vote for your favorite servers","Langue":"Language","Configuration":"Settings","Nom":"Name","Mot de passe":"Password"},'+
  'us:{"Continuer avec Discord":"Continue with Discord","Se connecter":"Sign in","Créer un compte CMD Sphere":"Create a CMD Sphere account","Connexion CMD Sphere":"CMD Sphere sign in","Créer mon compte":"Create my account","Mon profil":"My profile","Déconnexion":"Log out","Mes Discord":"My Discord servers","Actualiser":"Refresh","Créer un serveur":"Create a server","J’ai une invitation":"I have an invite","Découvrir":"Discover","Importer Discord":"Import Discord","Copier invitation":"Copy invite","Rôles":"Roles","Catégories & salons":"Categories & channels","Nouveau rôle":"New role","Nouveau salon":"New channel","Nouvelle catégorie":"New category","Créer":"Create","Retour":"Back","Rejoindre":"Join","Modifier le profil":"Edit profile","Enregistrer":"Save","Annuler":"Cancel","Principal":"Main","Serveurs":"Servers","Vote pour tes serveurs préférés":"Vote for your favorite servers","Langue":"Language","Configuration":"Settings","Nom":"Name","Mot de passe":"Password"},'+
  'de:{"Continuer avec Discord":"Mit Discord fortfahren","Se connecter":"Anmelden","Créer un compte CMD Sphere":"CMD-Sphere-Konto erstellen","Connexion CMD Sphere":"CMD Sphere Anmeldung","Créer mon compte":"Konto erstellen","Mon profil":"Mein Profil","Déconnexion":"Abmelden","Mes Discord":"Meine Discord-Server","Actualiser":"Aktualisieren","Créer un serveur":"Server erstellen","J’ai une invitation":"Ich habe eine Einladung","Découvrir":"Entdecken","Importer Discord":"Discord importieren","Copier invitation":"Einladung kopieren","Rôles":"Rollen","Catégories & salons":"Kategorien & Kanäle","Nouveau rôle":"Neue Rolle","Nouveau salon":"Neuer Kanal","Nouvelle catégorie":"Neue Kategorie","Créer":"Erstellen","Retour":"Zurück","Rejoindre":"Beitreten","Modifier le profil":"Profil bearbeiten","Enregistrer":"Speichern","Annuler":"Abbrechen","Principal":"Start","Serveurs":"Server","Vote pour tes serveurs préférés":"Stimme für deine Lieblingsserver","Langue":"Sprache","Configuration":"Einstellungen","Nom":"Name","Mot de passe":"Passwort"},'+
  'es:{"Continuer avec Discord":"Continuar con Discord","Se connecter":"Iniciar sesión","Créer un compte CMD Sphere":"Crear una cuenta CMD Sphere","Connexion CMD Sphere":"Inicio de sesión CMD Sphere","Créer mon compte":"Crear mi cuenta","Mon profil":"Mi perfil","Déconnexion":"Cerrar sesión","Mes Discord":"Mis servidores Discord","Actualiser":"Actualizar","Créer un serveur":"Crear servidor","J’ai une invitation":"Tengo una invitación","Découvrir":"Descubrir","Importer Discord":"Importar Discord","Copier invitation":"Copiar invitación","Rôles":"Roles","Catégories & salons":"Categorías y canales","Nouveau rôle":"Nuevo rol","Nouveau salon":"Nuevo canal","Nouvelle catégorie":"Nueva categoría","Créer":"Crear","Retour":"Volver","Rejoindre":"Unirse","Modifier le profil":"Editar perfil","Enregistrer":"Guardar","Annuler":"Cancelar","Principal":"Principal","Serveurs":"Servidores","Vote pour tes serveurs préférés":"Vota por tus servidores favoritos","Langue":"Idioma","Configuration":"Configuración","Nom":"Nombre","Mot de passe":"Contraseña"},'+
  'it:{"Continuer avec Discord":"Continua con Discord","Se connecter":"Accedi","Créer un compte CMD Sphere":"Crea un account CMD Sphere","Connexion CMD Sphere":"Accesso CMD Sphere","Créer mon compte":"Crea il mio account","Mon profil":"Il mio profilo","Déconnexion":"Esci","Mes Discord":"I miei server Discord","Actualiser":"Aggiorna","Créer un serveur":"Crea server","J’ai une invitation":"Ho un invito","Découvrir":"Scopri","Importer Discord":"Importa Discord","Copier invitation":"Copia invito","Rôles":"Ruoli","Catégories & salons":"Categorie e canali","Nouveau rôle":"Nuovo ruolo","Nouveau salon":"Nuovo canale","Nouvelle catégorie":"Nuova categoria","Créer":"Crea","Retour":"Indietro","Rejoindre":"Unisciti","Modifier le profil":"Modifica profilo","Enregistrer":"Salva","Annuler":"Annulla","Principal":"Principale","Serveurs":"Server","Vote pour tes serveurs préférés":"Vota i tuoi server preferiti","Langue":"Lingua","Configuration":"Configurazione","Nom":"Nome","Mot de passe":"Password"},'+
  'ru:{"Continuer avec Discord":"Продолжить с Discord","Se connecter":"Войти","Créer un compte CMD Sphere":"Создать аккаунт CMD Sphere","Connexion CMD Sphere":"Вход CMD Sphere","Créer mon compte":"Создать аккаунт","Mon profil":"Мой профиль","Déconnexion":"Выйти","Mes Discord":"Мои серверы Discord","Actualiser":"Обновить","Créer un serveur":"Создать сервер","J’ai une invitation":"У меня есть приглашение","Découvrir":"Обзор","Importer Discord":"Импорт Discord","Copier invitation":"Копировать приглашение","Rôles":"Роли","Catégories & salons":"Категории и каналы","Nouveau rôle":"Новая роль","Nouveau salon":"Новый канал","Nouvelle catégorie":"Новая категория","Créer":"Создать","Retour":"Назад","Rejoindre":"Войти","Modifier le profil":"Изменить профиль","Enregistrer":"Сохранить","Annuler":"Отмена","Principal":"Главная","Serveurs":"Серверы","Vote pour tes serveurs préférés":"Голосуй за любимые серверы","Langue":"Язык","Configuration":"Настройки","Nom":"Имя","Mot de passe":"Пароль"},'+
  'ko:{"Continuer avec Discord":"Discord로 계속","Se connecter":"로그인","Créer un compte CMD Sphere":"CMD Sphere 계정 만들기","Connexion CMD Sphere":"CMD Sphere 로그인","Créer mon compte":"계정 만들기","Mon profil":"내 프로필","Déconnexion":"로그아웃","Mes Discord":"내 Discord 서버","Actualiser":"새로고침","Créer un serveur":"서버 만들기","J’ai une invitation":"초대가 있어요","Découvrir":"찾아보기","Importer Discord":"Discord 가져오기","Copier invitation":"초대 복사","Rôles":"역할","Catégories & salons":"카테고리 및 채널","Nouveau rôle":"새 역할","Nouveau salon":"새 채널","Nouvelle catégorie":"새 카테고리","Créer":"만들기","Retour":"뒤로","Rejoindre":"참여","Modifier le profil":"프로필 수정","Enregistrer":"저장","Annuler":"취소","Principal":"메인","Serveurs":"서버","Vote pour tes serveurs préférés":"좋아하는 서버에 투표","Langue":"언어","Configuration":"설정","Nom":"이름","Mot de passe":"비밀번호"},'+
  'ja:{"Continuer avec Discord":"Discordで続行","Se connecter":"ログイン","Créer un compte CMD Sphere":"CMD Sphereアカウントを作成","Connexion CMD Sphere":"CMD Sphereログイン","Créer mon compte":"アカウント作成","Mon profil":"マイプロフィール","Déconnexion":"ログアウト","Mes Discord":"マイDiscordサーバー","Actualiser":"更新","Créer un serveur":"サーバー作成","J’ai une invitation":"招待があります","Découvrir":"探す","Importer Discord":"Discordをインポート","Copier invitation":"招待をコピー","Rôles":"ロール","Catégories & salons":"カテゴリとチャンネル","Nouveau rôle":"新しいロール","Nouveau salon":"新しいチャンネル","Nouvelle catégorie":"新しいカテゴリ","Créer":"作成","Retour":"戻る","Rejoindre":"参加","Modifier le profil":"プロフィール編集","Enregistrer":"保存","Annuler":"キャンセル","Principal":"メイン","Serveurs":"サーバー","Vote pour tes serveurs préférés":"お気に入りのサーバーに投票","Langue":"言語","Configuration":"設定","Nom":"名前","Mot de passe":"パスワード"},'+
  'zh:{"Continuer avec Discord":"使用 Discord 继续","Se connecter":"登录","Créer un compte CMD Sphere":"创建 CMD Sphere 账户","Connexion CMD Sphere":"CMD Sphere 登录","Créer mon compte":"创建账户","Mon profil":"我的资料","Déconnexion":"退出登录","Mes Discord":"我的 Discord 服务器","Actualiser":"刷新","Créer un serveur":"创建服务器","J’ai une invitation":"我有邀请","Découvrir":"发现","Importer Discord":"导入 Discord","Copier invitation":"复制邀请","Rôles":"角色","Catégories & salons":"分类和频道","Nouveau rôle":"新角色","Nouveau salon":"新频道","Nouvelle catégorie":"新分类","Créer":"创建","Retour":"返回","Rejoindre":"加入","Modifier le profil":"编辑资料","Enregistrer":"保存","Annuler":"取消","Principal":"主页","Serveurs":"服务器","Vote pour tes serveurs préférés":"为你喜欢的服务器投票","Langue":"语言","Configuration":"设置","Nom":"名称","Mot de passe":"密码"}'+
  '};'+
  'const base=Object.keys(dict.en);const reverse={};Object.entries(dict).forEach(([l,d])=>Object.entries(d).forEach(([a,b])=>{reverse[a]=a;reverse[b]=a}));'+
  'function t(lang,key){const canonical=reverse[key]||key;if(lang==="fr")return dict.fr[canonical]||canonical;return (dict[lang]&&dict[lang][canonical])||dict.en[canonical]||canonical}'+
  'function translate(lang){if(!languages.includes(lang))lang="fr";localStorage.setItem("cmd-sphere-language",lang);document.documentElement.lang=lang==="us"?"en-US":lang;const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>{const raw=n.nodeValue,trim=raw.trim();if(!trim)return;const out=t(lang,trim);if(out!==trim)n.nodeValue=raw.replace(trim,out)});document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(e=>{const out=t(lang,e.placeholder);if(out!==e.placeholder)e.placeholder=out})}'+
  'async function forceRefresh(){const b=document.getElementById("cmd-sphere-refresh");if(b){b.disabled=true;b.textContent="…"}try{if("caches" in window){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)))}if("serviceWorker" in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.update().catch(()=>{})))}}catch(e){}location.reload()}'+
  'function boot(){let language=localStorage.getItem("cmd-sphere-language")||"fr";if(!languages.includes(language))language="fr";const sel=document.getElementById("cmd-sphere-language");if(sel){sel.value=language;sel.onchange=e=>translate(e.target.value)}document.getElementById("cmd-sphere-refresh")?.addEventListener("click",forceRefresh);translate(language);'+
  'const loginPage=!document.querySelector(".sphere-app")&&(location.pathname==="/"||location.pathname==="/dashboard");const token=localStorage.getItem("cmd_sphere_session");if(loginPage&&token&&!sessionStorage.getItem("cmd_sphere_restore")){sessionStorage.setItem("cmd_sphere_restore","1");document.cookie="cmd_sphere_session="+encodeURIComponent(token)+"; Path=/; Max-Age=31536000; SameSite=Lax; Secure";location.replace("/dashboard?restore=1");return}if(document.querySelector(".sphere-app"))sessionStorage.removeItem("cmd_sphere_restore");if(loginPage&&new URLSearchParams(location.search).get("restore")==="1"){localStorage.removeItem("cmd_sphere_session");sessionStorage.removeItem("cmd_sphere_restore")}document.querySelectorAll("a[href=\"/dashboard-logout\"]").forEach(a=>a.addEventListener("click",()=>localStorage.removeItem("cmd_sphere_session")));'+
  'let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>translate(localStorage.getItem("cmd-sphere-language")||"fr"),50)}).observe(document.body,{childList:true,subtree:true})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",boot):boot();})();<\\/script>';

  const start=body.indexOf("<body");
  if(start<0)return body;
  const gt=body.indexOf(">",start);
  if(gt<0)return body;
  body=body.slice(0,gt+1)+toolbar+body.slice(gt+1);
  const end=body.lastIndexOf("</body>");
  return end>=0?body.slice(0,end)+client+body.slice(end):body+client;
}
`;

if(s.indexOf("function injectCmdSphereUi(body){")<0){
  const pos=s.indexOf("function html(res,body,status=200,headers={}){");
  if(pos>=0){s=s.slice(0,pos)+injectCode+"\n"+s.slice(pos);changed++;console.log("[patch] BOT ARK language UI")}
}

rep(`res.writeHead(status,{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer",...headers});res.end(body);`,
`res.writeHead(status,{"content-type":"text/html; charset=utf-8","cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0","x-content-type-options":"nosniff","referrer-policy":"no-referrer",...headers});res.end(injectCmdSphereUi(body));`,
"inject language toolbar");

rep(`res.writeHead(200,{"content-type":"application/javascript","cache-control":"no-cache"});res.end("self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>self.clients.claim());self.addEventListener('fetch',()=>{});");return;`,
`res.writeHead(200,{"content-type":"application/javascript","cache-control":"no-store"});res.end("self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.clients.claim()})()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(fetch(e.request,{cache:'no-store'}));});");return;`,
"PWA force refresh");

fs.writeFileSync(p,s);
console.log("[patch] total changes="+changed);

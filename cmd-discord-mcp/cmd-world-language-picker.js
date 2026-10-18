/* CMD universal language picker — 8148 ISO 639-3 / BCP47 entries.
 * A language preference is NOT a claim that every interface text is translated.
 * Works without cookies, API keys, databases, tracking or paid services.
 */
(function(){
 "use strict";
 if(typeof window==="undefined"||window.CMDWorldLanguagePicker)return;
 const tag=/^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,5}(?:-x(?:-[a-z0-9]{1,8}){1,5})?$/i;
 const originalChoices=["fr","en","us","de","es","it","ru","ko","ja","zh","co","pt"];
 const status={languages:null,loading:null};
 const existing=()=>{
  try{const chosen=localStorage.getItem("cmd-world-language");if(chosen)return chosen}catch{}
  // Use the visitor's actual browser language, not an assumed country or IP location.
  const preferred=typeof navigator!=="undefined"?(navigator.languages||[navigator.language]).filter(Boolean):[];
  return preferred[0]||"fr";
 };
 const root=document.createElement("div");
 root.id="cmd-world-language-root";
 root.style.cssText="position:fixed;right:14px;bottom:14px;z-index:2147483000;pointer-events:none";
 const shadow=root.attachShadow({mode:"open"});
 const style=document.createElement("style");
 style.textContent=`
*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}
.trigger{pointer-events:auto;display:flex;gap:6px;align-items:center;justify-content:center;min-width:51px;min-height:48px;padding:9px;border:1px solid #9772ff;color:#fff;border-radius:15px;background:linear-gradient(145deg,#281443,#111322);box-shadow:0 8px 28px #0008}
.panel{pointer-events:auto;position:absolute;bottom:58px;right:0;width:min(360px,calc(100vw - 25px));height:min(510px,calc(100dvh - 100px));padding:16px;display:flex;flex-direction:column;gap:10px;color:#f8f4ff;border:1px solid #9b69ec;border-radius:18px;background:#111323;box-shadow:0 14px 40px #000b;font:14px/1.4 system-ui,-apple-system,Arial,sans-serif}
.panel[hidden]{display:none}.head{display:flex;align-items:center;justify-content:space-between;gap:12px}.head strong{font-size:16px}
.close{border:1px solid #65517c;border-radius:10px;background:#27203b;color:#fff;padding:5px 12px}
input{min-height:42px;border:1px solid #604984;border-radius:10px;background:#202239;color:#fff;padding:9px;width:100%;outline-offset:2px}
.results{min-height:80px;overflow-y:auto;flex:1;border:1px solid #2d2541;border-radius:9px}
.choice{display:block;width:100%;background:transparent;color:#e9e6f5;border:0;border-bottom:1px solid #342e4c;text-align:left;padding:9px 10px;overflow-wrap:anywhere}
.choice:hover,.choice:focus{background:#352052}
.letter{margin:0;border-bottom:1px solid #342e4c}
.letter>summary{display:flex;justify-content:space-between;align-items:center;padding:12px;cursor:pointer;min-height:44px;font-weight:750;background:#1d1730;list-style-position:inside}
.letter>summary:hover,.letter>summary:focus-visible{background:#33204c}
.letter[open]>summary{background:#392153}
.letter .choice{padding-left:22px}
.letter small{color:#cbb5e5;font-weight:500}
.choice[aria-selected="true"]{color:#dbbcff;background:#322044}
.results>p{padding:12px;margin:0}
.muted{font-size:12px;color:#cfc4e9;line-height:1.45;margin:0}
.status{font-size:12px;color:#bcefd3;min-height:20px;overflow-wrap:anywhere}
`;
 const trigger=document.createElement("button");trigger.type="button";trigger.className="trigger";
 trigger.setAttribute("aria-label","Choisir une langue ou un dialecte");
 trigger.title="Langues du monde, y compris le suisse allemand";trigger.textContent="🌐";
 const panel=document.createElement("section");panel.className="panel";panel.hidden=true;
 panel.setAttribute("aria-label","Langues et dialectes du monde");panel.setAttribute("role","dialog");
 const head=document.createElement("div");head.className="head";
 const title=document.createElement("strong");title.textContent="🌐 Langues du monde";
 const close=document.createElement("button");close.type="button";close.className="close";close.textContent="Fermer";head.append(title,close);
 const query=document.createElement("input");query.type="search";query.placeholder="Rechercher : suisse allemand, bernois, gsw-CH…";
 query.setAttribute("aria-label","Rechercher une langue ou un dialecte");
 const results=document.createElement("div");results.className="results";results.setAttribute("role","group");results.setAttribute("aria-label","Langues classées de A à Z");
 const custom=document.createElement("input");custom.type="text";custom.maxLength=64;
 custom.placeholder="Code régional personnel : gsw-CH-x-bern";
 custom.setAttribute("aria-label","Code de langue régional BCP 47");
 const applyCustom=document.createElement("button");applyCustom.type="button";applyCustom.className="close";applyCustom.textContent="Utiliser ce code";
 const note=document.createElement("p");note.className="muted";
 note.textContent="Les 8 148 codes identifient des langues, pas 8 148 traductions. Si une interface n'est pas traduite, elle garde sa langue existante. Le dialecte suisse allemand peut utiliser l'allemand standard comme secours.";
 const msg=document.createElement("p");msg.className="status";msg.setAttribute("role","status");
 const customRow=document.createElement("div");customRow.append(custom,applyCustom);
 panel.append(head,query,results,customRow,note,msg);
 shadow.append(style,panel,trigger);
 function fallback(code){
  const base=String(code).split("-")[0].toLowerCase();
  return ({gsw:"de",fra:"fr",eng:"en",deu:"de",ger:"de",spa:"es",ita:"it",zho:"zh",cos:"co",por:"pt"})[base]||base;
 }
 function validate(input){
  const raw=String(input||"").trim();if(!tag.test(raw)||raw.length>64)return null;
  try{return Intl.getCanonicalLocales(raw)[0]||null}catch{return null}
 }
 function save(code,label){
  const safe=validate(code);if(!safe){msg.textContent="Code BCP 47 invalide.";return}
  const fb=fallback(safe);
  try{localStorage.setItem("cmd-world-language",safe)}catch{}
  document.documentElement.lang=safe;
  const ids=["language","mobile-language","lng","lang","aiLanguage","cmdLangPicker","cmd-sphere-language","cmdLanguageChoice","cmdSettingsLanguagePicker"];
  for(const id of ids){
   const select=document.getElementById(id);
   if(!select||select.tagName!=="SELECT")continue;
   const candidates=[safe,fb,fb==="en"?"us":""];
   const match=candidates.find(c=>c&&[...select.options].some(option=>option.value===c));
   if(match&&select.value!==match){
    select.value=match;select.dispatchEvent(new Event("change",{bubbles:true}));
   }
  }
  const known=originalChoices.includes(fb);
  // Notify the individual applications, including CMD Sphere settings and React views.
  try{localStorage.setItem("cmd-sphere-language",known?fb:safe)}catch{}
  window.dispatchEvent(new CustomEvent("cmd-sphere-language-change",{detail:{language:known?fb:safe,selectedLanguage:safe}}));
  window.dispatchEvent(new CustomEvent("cmd-language-change",{detail:{language:safe,fallback:fb}}));
  if(known){
   const legacyKeys=["cmdLang","cmdpad-language","cmdpad-ui-lang","dayz-gate-language","ark-language","cmd-browser-lang"];
   for(const key of legacyKeys){try{if(localStorage.getItem(key)!==null)localStorage.setItem(key,fb)}catch{}}
  }
  window.dispatchEvent(new CustomEvent("cmd-world-language-change",{detail:{language:safe,fallback:fb}}));
  msg.textContent="✓ "+(label||safe)+" sélectionné : "+safe+". "+(safe!==fb?"Interface existante : "+fb+" si disponible.":"");
  trigger.setAttribute("aria-label","Langue choisie : "+safe);
  trigger.title="Langue : "+safe;
 }
 function normalized(value){return String(value||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLocaleLowerCase()}
 function render(){
  results.replaceChildren();
  if(!status.languages){results.textContent="Chargement du catalogue…";return}
  const needle=normalized(query.value.trim());
  const buckets=new Map();
  for(const [code,name] of status.languages){
   if(needle&&!normalized(code+" "+name).includes(needle))continue;
   const first=normalized(name).charAt(0).toUpperCase();
   const letter=/^[A-Z]$/.test(first)?first:"#";
   if(!buckets.has(letter))buckets.set(letter,[]);
   buckets.get(letter).push([code,name]);
  }
  const letters=[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter(letter=>buckets.has(letter));
  if(buckets.has("#"))letters.push("#");
  if(!letters.length){const none=document.createElement("p");none.textContent="Aucune langue correspondante.";results.append(none);return}
  const selected=existing();
  for(const letter of letters){
   const rows=buckets.get(letter);
   const section=document.createElement("details");section.className="letter";
   const summary=document.createElement("summary");
   const heading=document.createElement("span");heading.textContent=letter==="#"?"Autres":letter;
   const count=document.createElement("small");count.textContent=rows.length+" langues";
   summary.append(heading,count);section.append(summary);
   const entries=document.createElement("div");entries.setAttribute("role","listbox");entries.setAttribute("aria-label","Langues "+letter);section.append(entries);
   // Create options only when a letter opens: all 8,148 entries remain accessible
   // without generating thousands of interactive DOM nodes at every keystroke.
   const fill=()=>{
    if(entries.childElementCount)return;
    const fragment=document.createDocumentFragment();
    for(const [code,name] of rows){
     const button=document.createElement("button");button.type="button";button.className="choice";
     button.setAttribute("role","option");button.setAttribute("aria-selected",String(code===selected));
     button.textContent=name+" · "+code;
     button.addEventListener("click",()=>{save(code,name);panel.hidden=true;trigger.setAttribute("aria-expanded","false")});
     fragment.append(button);
    }
    entries.append(fragment);
   };
   section.addEventListener("toggle",()=>{if(section.open)fill()});
   // Short search results expand directly; larger matches stay neatly grouped.
   if(needle&&rows.length<=35){section.open=true;fill()}
   results.append(section);
  }
 }
 async function load(){
  if(status.languages)return;
  if(!status.loading){
   status.loading=fetch("/cmd-world-languages.json",{cache:"force-cache"})
    .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
    .then(o=>{if(!Array.isArray(o.languages)||o.languages.length<8000)throw Error("Catalogue incomplet");status.languages=o.languages})
    .catch(e=>{msg.textContent="Catalogue indisponible : "+e.message+". Saisie régionale possible.";results.textContent="Recherche indisponible."})
    .finally(()=>{status.loading=null;render()});
  }
  await status.loading;
 }
 async function toggle(){panel.hidden=!panel.hidden;trigger.setAttribute("aria-expanded",String(!panel.hidden));if(!panel.hidden){query.focus();await load();}}
 trigger.addEventListener("click",toggle);
 close.addEventListener("click",()=>{panel.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus()});
 query.addEventListener("input",render);
 applyCustom.addEventListener("click",()=>save(custom.value,custom.value));
 custom.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();save(custom.value,custom.value)}});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!panel.hidden){panel.hidden=true;trigger.setAttribute("aria-expanded","false")}});
 document.addEventListener("DOMContentLoaded",()=>{if(!document.getElementById(root.id))document.body.append(root)},{once:true});
 if(document.readyState!=="loading")document.body.append(root);
 const saved=existing();if(validate(saved)){
  document.documentElement.lang=saved;
  // Synchronize the initial preference once widgets and app menus have mounted.
  const signal=()=>window.dispatchEvent(new CustomEvent("cmd-world-language-change",{detail:{language:saved,fallback:fallback(saved),initial:true}}));
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",signal,{once:true});else queueMicrotask(signal);
 }

 // Shared interface glossary: translate real navigation controls, not user content.
 // Unknown languages keep their selected BCP-47 code and use the nearest available UI fallback.
 const uiKeys=["Accueil","Messages","Serveurs","Profil","Paramètres","Langue","Boutique","Rechercher","Enregistrer","Annuler","Fermer","Créer","Modifier","Supprimer","Retour","Aide","Notifications","Amis","Appels","Déconnexion","Se connecter","Inviter","Tableau de bord","Mes serveurs","Fichiers","Sauvegardes","Console","Joueurs","Assistance","Facturation","Portefeuille","Membres","Rôles","Confidentialité","Sécurité","Apparence","Applications","Télécharger","Partager","Traduire"];
 const uiValues={
  en:["Home","Messages","Servers","Profile","Settings","Language","Shop","Search","Save","Cancel","Close","Create","Edit","Delete","Back","Help","Notifications","Friends","Calls","Log out","Log in","Invite","Dashboard","My servers","Files","Backups","Console","Players","Support","Billing","Wallet","Members","Roles","Privacy","Security","Appearance","Apps","Download","Share","Translate"],
  de:["Startseite","Nachrichten","Server","Profil","Einstellungen","Sprache","Shop","Suchen","Speichern","Abbrechen","Schließen","Erstellen","Bearbeiten","Löschen","Zurück","Hilfe","Benachrichtigungen","Freunde","Anrufe","Abmelden","Anmelden","Einladen","Dashboard","Meine Server","Dateien","Backups","Konsole","Spieler","Support","Abrechnung","Guthaben","Mitglieder","Rollen","Datenschutz","Sicherheit","Darstellung","Apps","Herunterladen","Teilen","Übersetzen"],
  es:["Inicio","Mensajes","Servidores","Perfil","Ajustes","Idioma","Tienda","Buscar","Guardar","Cancelar","Cerrar","Crear","Editar","Eliminar","Volver","Ayuda","Notificaciones","Amigos","Llamadas","Cerrar sesión","Iniciar sesión","Invitar","Panel de control","Mis servidores","Archivos","Copias de seguridad","Consola","Jugadores","Ayuda","Facturación","Monedero","Miembros","Roles","Privacidad","Seguridad","Apariencia","Aplicaciones","Descargar","Compartir","Traducir"],
  it:["Home","Messaggi","Server","Profilo","Impostazioni","Lingua","Negozio","Cerca","Salva","Annulla","Chiudi","Crea","Modifica","Elimina","Indietro","Aiuto","Notifiche","Amici","Chiamate","Esci","Accedi","Invita","Pannello di controllo","I miei server","File","Backup","Console","Giocatori","Assistenza","Fatturazione","Portafoglio","Membri","Ruoli","Privacy","Sicurezza","Aspetto","App","Scarica","Condividi","Traduci"],
  pt:["Início","Mensagens","Servidores","Perfil","Definições","Idioma","Loja","Pesquisar","Guardar","Cancelar","Fechar","Criar","Editar","Eliminar","Voltar","Ajuda","Notificações","Amigos","Chamadas","Terminar sessão","Iniciar sessão","Convidar","Painel","Meus servidores","Ficheiros","Cópias de segurança","Consola","Jogadores","Suporte","Faturação","Carteira","Membros","Funções","Privacidade","Segurança","Aparência","Aplicações","Transferir","Partilhar","Traduzir"],
  ru:["Главная","Сообщения","Серверы","Профиль","Настройки","Язык","Магазин","Поиск","Сохранить","Отмена","Закрыть","Создать","Изменить","Удалить","Назад","Помощь","Уведомления","Друзья","Звонки","Выйти","Войти","Пригласить","Панель управления","Мои серверы","Файлы","Копии","Консоль","Игроки","Поддержка","Оплата","Кошелёк","Участники","Роли","Конфиденциальность","Безопасность","Внешний вид","Приложения","Скачать","Поделиться","Перевести"],
  ko:["홈","메시지","서버","프로필","설정","언어","상점","검색","저장","취소","닫기","만들기","수정","삭제","뒤로","도움말","알림","친구","통화","로그아웃","로그인","초대","대시보드","내 서버","파일","백업","콘솔","플레이어","지원","결제","지갑","멤버","역할","개인정보","보안","화면","앱","다운로드","공유","번역"],
  ja:["ホーム","メッセージ","サーバー","プロフィール","設定","言語","ショップ","検索","保存","キャンセル","閉じる","作成","編集","削除","戻る","ヘルプ","通知","友達","通話","ログアウト","ログイン","招待","ダッシュボード","マイサーバー","ファイル","バックアップ","コンソール","プレイヤー","サポート","請求","ウォレット","メンバー","ロール","プライバシー","セキュリティ","外観","アプリ","ダウンロード","共有","翻訳"],
  zh:["首页","消息","服务器","个人资料","设置","语言","商店","搜索","保存","取消","关闭","创建","编辑","删除","返回","帮助","通知","好友","通话","退出登录","登录","邀请","控制面板","我的服务器","文件","备份","控制台","玩家","支持","账单","钱包","成员","角色","隐私","安全","外观","应用","下载","分享","翻译"]
 };
 const labelOriginal=new WeakMap(),attrOriginal=new WeakMap();
 const aliases={gsw:"de",bar:"de",deu:"de",ger:"de",fra:"fr",eng:"en",spa:"es",ita:"it",por:"pt",rus:"ru",jpn:"ja",kor:"ko",zho:"zh",cmn:"zh"};
 const availableUI=code=>{
  const base=String(code||"fr").split("-")[0].toLowerCase();
  return aliases[base]||(uiValues[base]?base:"fr");
 };
 const uiSelectors='nav a,nav button,nav span,header a,header button,header span,aside a,aside button,aside span,[role="navigation"] a,[role="navigation"] button,[class*="sidebar"] a,[class*="sidebar"] button,[class*="topbar"] button,[class*="menu"] a,[class*="menu"] button,[class*="dock"] button';
 function translateMenus(code){
  const lang=availableUI(code),values=uiValues[lang],dict=new Map();
  if(values)uiKeys.forEach((key,i)=>dict.set(key,values[i]||key));
  const elements=document.querySelectorAll(uiSelectors);
  for(const el of elements){
   if(el.closest('[contenteditable="true"],[data-message-id],.chat-messages,#chatMessages'))continue;
   for(const node of el.childNodes){
    if(node.nodeType!==Node.TEXT_NODE)continue;
    if(!labelOriginal.has(node))labelOriginal.set(node,node.textContent);
    const source=labelOriginal.get(node),m=/^(\s*)(.*?)(\s*)$/s.exec(source);
    if(m&&uiKeys.includes(m[2])){
     const next=m[1]+(dict.get(m[2])||m[2])+m[3];
     if(node.textContent!==next)node.textContent=next;
    }
   }
   let originals=attrOriginal.get(el);
   if(!originals){originals={};for(const attribute of ["title","aria-label"]){if(el.hasAttribute(attribute))originals[attribute]=el.getAttribute(attribute)}attrOriginal.set(el,originals)}
   for(const [attribute,source] of Object.entries(originals)){
    if(uiKeys.includes(source)){
     const next=dict.get(source)||source;
     if(el.getAttribute(attribute)!==next)el.setAttribute(attribute,next);
    }
   }
  }
 }
 let menuLanguage=existing(),menuScheduled=false;
 function menuRefresh(){
  if(menuScheduled)return;menuScheduled=true;
  requestAnimationFrame(()=>{menuScheduled=false;translateMenus(menuLanguage)});
 }
 window.addEventListener("cmd-world-language-change",event=>{menuLanguage=event.detail?.language||existing();menuRefresh()});
 window.addEventListener("cmd-language-change",event=>{menuLanguage=event.detail?.language||existing();menuRefresh()});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",menuRefresh,{once:true});else menuRefresh();
 const watchMenus=new MutationObserver(records=>{
  if(records.some(record=>{
   const el=record.target.nodeType===1?record.target:record.target.parentElement;
   return el?.closest?.('nav,header,aside,[role="navigation"],[class*="sidebar"],[class*="menu"],[class*="dock"],[class*="topbar"]');
  }))menuRefresh();
 });
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>watchMenus.observe(document.body,{childList:true,subtree:true}),{once:true});
 else watchMenus.observe(document.body,{childList:true,subtree:true});
 window.CMDWorldLanguagePicker={get language(){return existing()},open:()=>{if(panel.hidden)void toggle()},set:(code)=>save(code,code)};
})();

/* CMD UI translation bridge: localizes fixed navigation labels, NEVER user content.
 * 8,148 catalogue entries are identifiers; not 8,148 pretranslated interfaces.
 */
(function(){
"use strict";
if(typeof window==="undefined"||window.CMDMenuI18n)return;
const words={"en":{"Accueil":"Home","Serveurs":"Servers","Cartes interactives":"Interactive maps","Installer l’application":"Install the app","Nitrado":"Nitrado","Mods DayZ PC":"DayZ PC mods","Valider JSON / XML":"Validate JSON / XML","Config propriétaires":"Owner settings","Whitelist":"Whitelist","Shop":"Shop","Livraisons":"Deliveries","Promos":"Offers","Battle Pass":"Battle Pass","Quêtes":"Quests","RP":"RP","Économie":"Economy","Alarmes":"Alarms","Interpol":"Interpol","Killfeed":"Killfeed","Classements":"Rankings","Stats":"Stats","Tickets":"Tickets","Plugins":"Plugins","IA":"AI","Personnalisation":"Customization","Paramètres":"Settings","Changer de Discord":"Switch Discord","Rejoins la communauté Valhalla Extinction.":"Join the Valhalla Extinction community.","Langue":"Language","Dinos & ressources ARK":"ARK dinos & resources","Pals & ressources":"Pals & resources","Guide Conan Exiles":"Conan Exiles guide","Aniimo & ressources":"Aniimo & resources","Loot DayZ":"DayZ loot","Gérer les emplacements":"Manage locations","Groupes de joueurs":"Player groups","Primes & automatisations":"Bounties & automation","Assistant gratuit":"Free assistant","Fermer le menu":"Close menu","Ouvrir le menu":"Open menu","Navigation mobile":"Mobile navigation","Tes Discord où tu es propriétaire ou administrateur apparaissent ici. Tu peux gérer ceux où le bot est installé et inviter le bot sur les autres.":"Your Discord servers where you are owner or administrator appear here. You can manage servers where the bot is installed and invite it to the others.","Discord avec EXTINCTION ++ RSS":"Discords with EXTINCTION ++ RSS","Aucun Discord installé pour le moment.":"No Discord server has the bot installed yet.","Inviter le bot sur un de tes Discord":"Invite the bot to one of your Discords","Tous les Discord que tu peux gérer ont déjà le bot, ou aucun autre Discord n’est disponible.":"All Discord servers you can manage already have the bot, or no other server is available.","Gérer":"Manage","Inviter EXTINCTION ++ RSS":"Invite EXTINCTION ++ RSS","Reconnexion Discord":"Reconnect Discord","Tableau de bord":"Dashboard","Mes serveurs":"My servers","Boutique":"Shop","Nouvelle location":"New rental","Machines":"Machines","Fichiers":"Files","Sauvegardes":"Backups","Console":"Console","Joueurs":"Players","Facturation":"Billing","Portefeuille":"Wallet","Assistance":"Support","Profil":"Profile","Messages":"Messages","Amis":"Friends","Notifications":"Notifications","Déconnexion":"Sign out","Connexion":"Sign in","Créer un compte":"Create account","Rechercher":"Search","Aide":"Help","Vidéos":"Videos","Studio":"Studio","Applications":"Apps","Développeur":"Developer","Sécurité":"Security","Confidentialité":"Privacy","Apparence":"Appearance","Accessibilité":"Accessibility","Mes appareils":"My devices","Inviter":"Invite","Annuler":"Cancel","Enregistrer":"Save","Fermer":"Close","Installer":"Install","Retour":"Back","Salons":"Channels","Rôles":"Roles","Membres":"Members","Événements":"Events","Créer":"Create","Modifier":"Edit","Supprimer":"Delete","Compte":"Account","Traduire":"Translate","Général":"General","Langues du monde":"World languages"},"de":{"Accueil":"Startseite","Serveurs":"Server","Cartes interactives":"Interaktive Karten","Installer l’application":"App installieren","Nitrado":"Nitrado","Mods DayZ PC":"DayZ-PC-Mods","Valider JSON / XML":"JSON / XML prüfen","Config propriétaires":"Eigentümereinstellungen","Whitelist":"Whitelist","Shop":"Shop","Livraisons":"Lieferungen","Promos":"Angebote","Battle Pass":"Battle Pass","Quêtes":"Quests","RP":"RP","Économie":"Wirtschaft","Alarmes":"Alarme","Interpol":"Interpol","Killfeed":"Killfeed","Classements":"Ranglisten","Stats":"Statistiken","Tickets":"Tickets","Plugins":"Plugins","IA":"KI","Personnalisation":"Anpassung","Paramètres":"Einstellungen","Changer de Discord":"Discord wechseln","Rejoins la communauté Valhalla Extinction.":"Tritt der Valhalla-Extinction-Community bei.","Langue":"Sprache","Dinos & ressources ARK":"ARK-Dinos & Ressourcen","Pals & ressources":"Pals & Ressourcen","Guide Conan Exiles":"Conan-Exiles-Guide","Aniimo & ressources":"Aniimo & Ressourcen","Loot DayZ":"DayZ-Beute","Gérer les emplacements":"Standorte verwalten","Groupes de joueurs":"Spielergruppen","Primes & automatisations":"Kopfgelder & Automatisierung","Assistant gratuit":"Kostenloser Assistent","Fermer le menu":"Menü schließen","Ouvrir le menu":"Menü öffnen","Navigation mobile":"Mobile Navigation","Tes Discord où tu es propriétaire ou administrateur apparaissent ici. Tu peux gérer ceux où le bot est installé et inviter le bot sur les autres.":"Hier erscheinen deine Discord-Server, auf denen du Besitzer oder Administrator bist. Installierte Server kannst du verwalten und den Bot auf weitere Server einladen.","Discord avec EXTINCTION ++ RSS":"Discords mit EXTINCTION ++ RSS","Aucun Discord installé pour le moment.":"Noch kein Discord mit installiertem Bot.","Inviter le bot sur un de tes Discord":"Bot auf einen deiner Discords einladen","Tous les Discord que tu peux gérer ont déjà le bot, ou aucun autre Discord n’est disponible.":"Alle verwaltbaren Discords haben den Bot bereits oder es ist kein weiterer verfügbar.","Gérer":"Verwalten","Inviter EXTINCTION ++ RSS":"EXTINCTION ++ RSS einladen","Reconnexion Discord":"Discord neu verbinden","Tableau de bord":"Übersicht","Mes serveurs":"Meine Server","Boutique":"Shop","Nouvelle location":"Neuer Mietserver","Machines":"Maschinen","Fichiers":"Dateien","Sauvegardes":"Backups","Console":"Konsole","Joueurs":"Spieler","Facturation":"Abrechnung","Portefeuille":"Geldbörse","Assistance":"Support","Profil":"Profil","Messages":"Nachrichten","Amis":"Freunde","Notifications":"Benachrichtigungen","Déconnexion":"Abmelden","Connexion":"Anmelden","Créer un compte":"Konto erstellen","Rechercher":"Suchen","Aide":"Hilfe","Vidéos":"Videos","Studio":"Studio","Applications":"Apps","Développeur":"Entwickler","Sécurité":"Sicherheit","Confidentialité":"Datenschutz","Apparence":"Darstellung","Accessibilité":"Barrierefreiheit","Mes appareils":"Meine Geräte","Inviter":"Einladen","Annuler":"Abbrechen","Enregistrer":"Speichern","Fermer":"Schließen","Installer":"Installieren","Retour":"Zurück","Salons":"Kanäle","Rôles":"Rollen","Membres":"Mitglieder","Événements":"Veranstaltungen","Créer":"Erstellen","Modifier":"Bearbeiten","Supprimer":"Löschen","Compte":"Konto","Traduire":"Übersetzen","Général":"Allgemein","Langues du monde":"Sprachen der Welt"},"it":{"Accueil":"Home","Serveurs":"Server","Cartes interactives":"Mappe interattive","Installer l’application":"Installa l’app","Nitrado":"Nitrado","Mods DayZ PC":"Mod DayZ PC","Valider JSON / XML":"Convalida JSON / XML","Config propriétaires":"Impostazioni proprietari","Whitelist":"Whitelist","Shop":"Negozio","Livraisons":"Consegne","Promos":"Offerte","Battle Pass":"Battle Pass","Quêtes":"Missioni","RP":"RP","Économie":"Economia","Alarmes":"Allarmi","Interpol":"Interpol","Killfeed":"Killfeed","Classements":"Classifiche","Stats":"Statistiche","Tickets":"Ticket","Plugins":"Plugin","IA":"IA","Personnalisation":"Personalizzazione","Paramètres":"Impostazioni","Changer de Discord":"Cambia Discord","Rejoins la communauté Valhalla Extinction.":"Unisciti alla comunità Valhalla Extinction.","Langue":"Lingua","Dinos & ressources ARK":"Dinosauri e risorse ARK","Pals & ressources":"Pals e risorse","Guide Conan Exiles":"Guida Conan Exiles","Aniimo & ressources":"Aniimo e risorse","Loot DayZ":"Bottino DayZ","Gérer les emplacements":"Gestisci posizioni","Groupes de joueurs":"Gruppi di giocatori","Primes & automatisations":"Taglie e automazioni","Assistant gratuit":"Assistente gratuito","Fermer le menu":"Chiudi menu","Ouvrir le menu":"Apri menu","Navigation mobile":"Navigazione mobile","Tes Discord où tu es propriétaire ou administrateur apparaissent ici. Tu peux gérer ceux où le bot est installé et inviter le bot sur les autres.":"Qui compaiono i tuoi server Discord dove sei proprietario o amministratore. Puoi gestire quelli con il bot installato e invitarlo negli altri.","Discord avec EXTINCTION ++ RSS":"Discord con EXTINCTION ++ RSS","Aucun Discord installé pour le moment.":"Nessun Discord ha ancora il bot installato.","Inviter le bot sur un de tes Discord":"Invita il bot su uno dei tuoi Discord","Tous les Discord que tu peux gérer ont déjà le bot, ou aucun autre Discord n’est disponible.":"Tutti i Discord che puoi gestire hanno già il bot oppure non ce ne sono altri disponibili.","Gérer":"Gestisci","Inviter EXTINCTION ++ RSS":"Invita EXTINCTION ++ RSS","Reconnexion Discord":"Riconnetti Discord","Tableau de bord":"Pannello","Mes serveurs":"I miei server","Boutique":"Negozio","Nouvelle location":"Nuovo noleggio","Machines":"Macchine","Fichiers":"File","Sauvegardes":"Backup","Console":"Console","Joueurs":"Giocatori","Facturation":"Fatturazione","Portefeuille":"Portafoglio","Assistance":"Assistenza","Profil":"Profilo","Messages":"Messaggi","Amis":"Amici","Notifications":"Notifiche","Déconnexion":"Esci","Connexion":"Accedi","Créer un compte":"Crea un account","Rechercher":"Cerca","Aide":"Aiuto","Vidéos":"Video","Studio":"Studio","Applications":"Applicazioni","Développeur":"Sviluppatore","Sécurité":"Sicurezza","Confidentialité":"Privacy","Apparence":"Aspetto","Accessibilité":"Accessibilità","Mes appareils":"I miei dispositivi","Inviter":"Invita","Annuler":"Annulla","Enregistrer":"Salva","Fermer":"Chiudi","Installer":"Installa","Retour":"Indietro","Salons":"Canali","Rôles":"Ruoli","Membres":"Membri","Événements":"Eventi","Créer":"Crea","Modifier":"Modifica","Supprimer":"Elimina","Compte":"Account","Traduire":"Traduci","Général":"Generale","Langues du monde":"Lingue del mondo"},"es":{"Accueil":"Inicio","Serveurs":"Servidores","Cartes interactives":"Mapas interactivos","Installer l’application":"Instalar la aplicación","Nitrado":"Nitrado","Mods DayZ PC":"Mods DayZ PC","Valider JSON / XML":"Validar JSON / XML","Config propriétaires":"Configuración de propietarios","Whitelist":"Whitelist","Shop":"Tienda","Livraisons":"Entregas","Promos":"Ofertas","Battle Pass":"Pase de batalla","Quêtes":"Misiones","RP":"RP","Économie":"Economía","Alarmes":"Alarmas","Interpol":"Interpol","Killfeed":"Killfeed","Classements":"Clasificaciones","Stats":"Estadísticas","Tickets":"Tickets","Plugins":"Plugins","IA":"IA","Personnalisation":"Personalización","Paramètres":"Ajustes","Changer de Discord":"Cambiar Discord","Rejoins la communauté Valhalla Extinction.":"Únete a la comunidad Valhalla Extinction.","Langue":"Idioma","Dinos & ressources ARK":"Dinosaurios y recursos ARK","Pals & ressources":"Pals y recursos","Guide Conan Exiles":"Guía Conan Exiles","Aniimo & ressources":"Aniimo y recursos","Loot DayZ":"Botín DayZ","Gérer les emplacements":"Gestionar ubicaciones","Groupes de joueurs":"Grupos de jugadores","Primes & automatisations":"Recompensas y automatización","Assistant gratuit":"Asistente gratuito","Fermer le menu":"Cerrar menú","Ouvrir le menu":"Abrir menú","Navigation mobile":"Navegación móvil","Tes Discord où tu es propriétaire ou administrateur apparaissent ici. Tu peux gérer ceux où le bot est installé et inviter le bot sur les autres.":"Aquí aparecen tus servidores de Discord donde eres propietario o administrador. Puedes gestionar los que ya tienen el bot e invitarlo a los demás.","Discord avec EXTINCTION ++ RSS":"Discord con EXTINCTION ++ RSS","Aucun Discord installé pour le moment.":"Todavía no hay ningún Discord con el bot instalado.","Inviter le bot sur un de tes Discord":"Invitar el bot a uno de tus Discord","Tous les Discord que tu peux gérer ont déjà le bot, ou aucun autre Discord n’est disponible.":"Todos los Discord que puedes gestionar ya tienen el bot o no hay otro disponible.","Gérer":"Gestionar","Inviter EXTINCTION ++ RSS":"Invitar EXTINCTION ++ RSS","Reconnexion Discord":"Reconectar Discord","Tableau de bord":"Panel","Mes serveurs":"Mis servidores","Boutique":"Tienda","Nouvelle location":"Nuevo alquiler","Machines":"Máquinas","Fichiers":"Archivos","Sauvegardes":"Copias de seguridad","Console":"Consola","Joueurs":"Jugadores","Facturation":"Facturación","Portefeuille":"Monedero","Assistance":"Asistencia","Profil":"Perfil","Messages":"Mensajes","Amis":"Amigos","Notifications":"Notificaciones","Déconnexion":"Cerrar sesión","Connexion":"Iniciar sesión","Créer un compte":"Crear cuenta","Rechercher":"Buscar","Aide":"Ayuda","Vidéos":"Vídeos","Studio":"Estudio","Applications":"Aplicaciones","Développeur":"Desarrollador","Sécurité":"Seguridad","Confidentialité":"Privacidad","Apparence":"Apariencia","Accessibilité":"Accesibilidad","Mes appareils":"Mis dispositivos","Inviter":"Invitar","Annuler":"Cancelar","Enregistrer":"Guardar","Fermer":"Cerrar","Installer":"Instalar","Retour":"Volver","Salons":"Canales","Rôles":"Roles","Membres":"Miembros","Événements":"Eventos","Créer":"Crear","Modifier":"Editar","Supprimer":"Eliminar","Compte":"Cuenta","Traduire":"Traducir","Général":"General","Langues du monde":"Idiomas del mundo"},"ru":{"Accueil":"Главная","Serveurs":"Серверы","Cartes interactives":"Интерактивные карты","Installer l’application":"Установить приложение","Nitrado":"Nitrado","Mods DayZ PC":"Моды DayZ PC","Valider JSON / XML":"Проверить JSON / XML","Config propriétaires":"Настройки владельцев","Whitelist":"Белый список","Shop":"Магазин","Livraisons":"Доставки","Promos":"Акции","Battle Pass":"Боевой пропуск","Quêtes":"Задания","RP":"RP","Économie":"Экономика","Alarmes":"Сигналы тревоги","Interpol":"Интерпол","Killfeed":"Лента убийств","Classements":"Рейтинги","Stats":"Статистика","Tickets":"Обращения","Plugins":"Плагины","IA":"ИИ","Personnalisation":"Персонализация","Paramètres":"Настройки","Changer de Discord":"Сменить Discord","Rejoins la communauté Valhalla Extinction.":"Присоединяйтесь к сообществу Valhalla Extinction.","Langue":"Язык","Dinos & ressources ARK":"Динозавры и ресурсы ARK","Pals & ressources":"Палы и ресурсы","Guide Conan Exiles":"Руководство Conan Exiles","Aniimo & ressources":"Aniimo и ресурсы","Loot DayZ":"Добыча DayZ","Gérer les emplacements":"Управление местами","Groupes de joueurs":"Группы игроков","Primes & automatisations":"Награды и автоматизация","Assistant gratuit":"Бесплатный помощник","Fermer le menu":"Закрыть меню","Ouvrir le menu":"Открыть меню","Navigation mobile":"Мобильная навигация","Tes Discord où tu es propriétaire ou administrateur apparaissent ici. Tu peux gérer ceux où le bot est installé et inviter le bot sur les autres.":"Здесь показаны Discord-серверы, где вы владелец или администратор. Можно управлять серверами с установленным ботом и пригласить его на остальные.","Discord avec EXTINCTION ++ RSS":"Discord с EXTINCTION ++ RSS","Aucun Discord installé pour le moment.":"Пока нет Discord-серверов с установленным ботом.","Inviter le bot sur un de tes Discord":"Пригласить бота на один из ваших Discord","Tous les Discord que tu peux gérer ont déjà le bot, ou aucun autre Discord n’est disponible.":"На всех доступных вам Discord бот уже установлен или других серверов нет.","Gérer":"Управлять","Inviter EXTINCTION ++ RSS":"Пригласить EXTINCTION ++ RSS","Reconnexion Discord":"Переподключить Discord","Tableau de bord":"Панель","Mes serveurs":"Мои серверы","Boutique":"Магазин","Nouvelle location":"Новая аренда","Machines":"Машины","Fichiers":"Файлы","Sauvegardes":"Резервные копии","Console":"Консоль","Joueurs":"Игроки","Facturation":"Счета","Portefeuille":"Кошелёк","Assistance":"Поддержка","Profil":"Профиль","Messages":"Сообщения","Amis":"Друзья","Notifications":"Уведомления","Déconnexion":"Выйти","Connexion":"Войти","Créer un compte":"Создать аккаунт","Rechercher":"Поиск","Aide":"Помощь","Vidéos":"Видео","Studio":"Студия","Applications":"Приложения","Développeur":"Разработчик","Sécurité":"Безопасность","Confidentialité":"Конфиденциальность","Apparence":"Оформление","Accessibilité":"Доступность","Mes appareils":"Мои устройства","Inviter":"Пригласить","Annuler":"Отмена","Enregistrer":"Сохранить","Fermer":"Закрыть","Installer":"Установить","Retour":"Назад","Salons":"Каналы","Rôles":"Роли","Membres":"Участники","Événements":"События","Créer":"Создать","Modifier":"Изменить","Supprimer":"Удалить","Compte":"Аккаунт","Traduire":"Перевести","Général":"Общие","Langues du monde":"Языки мира"},"ja":{"Accueil":"ホーム","Serveurs":"サーバー","Cartes interactives":"インタラクティブマップ","Installer l’application":"アプリをインストール","Nitrado":"Nitrado","Mods DayZ PC":"DayZ PC MOD","Valider JSON / XML":"JSON / XML を検証","Config propriétaires":"オーナー設定","Whitelist":"ホワイトリスト","Shop":"ショップ","Livraisons":"配送","Promos":"オファー","Battle Pass":"バトルパス","Quêtes":"クエスト","RP":"RP","Économie":"経済","Alarmes":"アラーム","Interpol":"インターポール","Killfeed":"キルフィード","Classements":"ランキング","Stats":"統計","Tickets":"チケット","Plugins":"プラグイン","IA":"AI","Personnalisation":"カスタマイズ","Paramètres":"設定","Changer de Discord":"Discordを切り替える","Rejoins la communauté Valhalla Extinction.":"Valhalla Extinction コミュニティに参加しよう。","Langue":"言語","Dinos & ressources ARK":"ARK 恐竜と資源","Pals & ressources":"Pals と資源","Guide Conan Exiles":"Conan Exiles ガイド","Aniimo & ressources":"Aniimo と資源","Loot DayZ":"DayZ 戦利品","Gérer les emplacements":"場所を管理","Groupes de joueurs":"プレイヤーグループ","Primes & automatisations":"賞金と自動化","Assistant gratuit":"無料アシスタント","Fermer le menu":"メニューを閉じる","Ouvrir le menu":"メニューを開く","Navigation mobile":"モバイルナビゲーション","Tes Discord où tu es propriétaire ou administrateur apparaissent ici. Tu peux gérer ceux où le bot est installé et inviter le bot sur les autres.":"オーナーまたは管理者のDiscordサーバーがここに表示されます。Bot導入済みのサーバーを管理し、他のサーバーへ招待できます。","Discord avec EXTINCTION ++ RSS":"EXTINCTION ++ RSS 導入済みDiscord","Aucun Discord installé pour le moment.":"まだBotが導入されたDiscordはありません。","Inviter le bot sur un de tes Discord":"DiscordにBotを招待","Tous les Discord que tu peux gérer ont déjà le bot, ou aucun autre Discord n’est disponible.":"管理できるすべてのDiscordにBotが導入済みか、他に利用可能なサーバーがありません。","Gérer":"管理","Inviter EXTINCTION ++ RSS":"EXTINCTION ++ RSSを招待","Reconnexion Discord":"Discordを再接続","Tableau de bord":"ダッシュボード","Mes serveurs":"マイサーバー","Boutique":"ショップ","Nouvelle location":"新規レンタル","Machines":"マシン","Fichiers":"ファイル","Sauvegardes":"バックアップ","Console":"コンソール","Joueurs":"プレイヤー","Facturation":"請求","Portefeuille":"ウォレット","Assistance":"サポート","Profil":"プロフィール","Messages":"メッセージ","Amis":"友達","Notifications":"通知","Déconnexion":"ログアウト","Connexion":"ログイン","Créer un compte":"アカウント作成","Rechercher":"検索","Aide":"ヘルプ","Vidéos":"動画","Studio":"スタジオ","Applications":"アプリ","Développeur":"開発者","Sécurité":"セキュリティ","Confidentialité":"プライバシー","Apparence":"外観","Accessibilité":"アクセシビリティ","Mes appareils":"マイデバイス","Inviter":"招待","Annuler":"キャンセル","Enregistrer":"保存","Fermer":"閉じる","Installer":"インストール","Retour":"戻る","Salons":"チャンネル","Rôles":"ロール","Membres":"メンバー","Événements":"イベント","Créer":"作成","Modifier":"編集","Supprimer":"削除","Compte":"アカウント","Traduire":"翻訳","Général":"一般","Langues du monde":"世界の言語"},"ko":{"Accueil":"홈","Serveurs":"서버","Cartes interactives":"인터랙티브 지도","Installer l’application":"앱 설치","Nitrado":"Nitrado","Mods DayZ PC":"DayZ PC 모드","Valider JSON / XML":"JSON / XML 검증","Config propriétaires":"소유자 설정","Whitelist":"화이트리스트","Shop":"상점","Livraisons":"배송","Promos":"프로모션","Battle Pass":"배틀 패스","Quêtes":"퀘스트","RP":"RP","Économie":"경제","Alarmes":"알람","Interpol":"인터폴","Killfeed":"킬피드","Classements":"순위","Stats":"통계","Tickets":"티켓","Plugins":"플러그인","IA":"AI","Personnalisation":"개인화","Paramètres":"설정","Changer de Discord":"Discord 변경","Rejoins la communauté Valhalla Extinction.":"Valhalla Extinction 커뮤니티에 참여하세요.","Langue":"언어","Dinos & ressources ARK":"ARK 공룡 및 자원","Pals & ressources":"Pals 및 자원","Guide Conan Exiles":"Conan Exiles 가이드","Aniimo & ressources":"Aniimo 및 자원","Loot DayZ":"DayZ 전리품","Gérer les emplacements":"위치 관리","Groupes de joueurs":"플레이어 그룹","Primes & automatisations":"현상금 및 자동화","Assistant gratuit":"무료 도우미","Fermer le menu":"메뉴 닫기","Ouvrir le menu":"메뉴 열기","Navigation mobile":"모바일 탐색","Tes Discord où tu es propriétaire ou administrateur apparaissent ici. Tu peux gérer ceux où le bot est installé et inviter le bot sur les autres.":"소유자 또는 관리자인 Discord 서버가 여기에 표시됩니다. 봇이 설치된 서버를 관리하고 다른 서버에 봇을 초대할 수 있습니다.","Discord avec EXTINCTION ++ RSS":"EXTINCTION ++ RSS가 설치된 Discord","Aucun Discord installé pour le moment.":"아직 봇이 설치된 Discord가 없습니다.","Inviter le bot sur un de tes Discord":"내 Discord에 봇 초대","Tous les Discord que tu peux gérer ont déjà le bot, ou aucun autre Discord n’est disponible.":"관리 가능한 모든 Discord에 이미 봇이 설치되어 있거나 다른 서버가 없습니다.","Gérer":"관리","Inviter EXTINCTION ++ RSS":"EXTINCTION ++ RSS 초대","Reconnexion Discord":"Discord 다시 연결","Tableau de bord":"대시보드","Mes serveurs":"내 서버","Boutique":"상점","Nouvelle location":"새 대여","Machines":"머신","Fichiers":"파일","Sauvegardes":"백업","Console":"콘솔","Joueurs":"플레이어","Facturation":"결제","Portefeuille":"지갑","Assistance":"지원","Profil":"프로필","Messages":"메시지","Amis":"친구","Notifications":"알림","Déconnexion":"로그아웃","Connexion":"로그인","Créer un compte":"계정 만들기","Rechercher":"검색","Aide":"도움말","Vidéos":"동영상","Studio":"스튜디오","Applications":"앱","Développeur":"개발자","Sécurité":"보안","Confidentialité":"개인정보 보호","Apparence":"외관","Accessibilité":"접근성","Mes appareils":"내 기기","Inviter":"초대","Annuler":"취소","Enregistrer":"저장","Fermer":"닫기","Installer":"설치","Retour":"뒤로","Salons":"채널","Rôles":"역할","Membres":"멤버","Événements":"이벤트","Créer":"만들기","Modifier":"수정","Supprimer":"삭제","Compte":"계정","Traduire":"번역","Général":"일반","Langues du monde":"세계 언어"},"zh":{"Accueil":"首页","Serveurs":"服务器","Cartes interactives":"交互地图","Installer l’application":"安装应用","Nitrado":"Nitrado","Mods DayZ PC":"DayZ PC 模组","Valider JSON / XML":"验证 JSON / XML","Config propriétaires":"所有者设置","Whitelist":"白名单","Shop":"商店","Livraisons":"配送","Promos":"优惠","Battle Pass":"战斗通行证","Quêtes":"任务","RP":"RP","Économie":"经济","Alarmes":"警报","Interpol":"国际刑警","Killfeed":"击杀记录","Classements":"排行榜","Stats":"统计","Tickets":"工单","Plugins":"插件","IA":"AI","Personnalisation":"个性化","Paramètres":"设置","Changer de Discord":"切换 Discord","Rejoins la communauté Valhalla Extinction.":"加入 Valhalla Extinction 社区。","Langue":"语言","Dinos & ressources ARK":"ARK 恐龙与资源","Pals & ressources":"Pals 与资源","Guide Conan Exiles":"Conan Exiles 指南","Aniimo & ressources":"Aniimo 与资源","Loot DayZ":"DayZ 战利品","Gérer les emplacements":"管理位置","Groupes de joueurs":"玩家组","Primes & automatisations":"赏金与自动化","Assistant gratuit":"免费助手","Fermer le menu":"关闭菜单","Ouvrir le menu":"打开菜单","Navigation mobile":"移动导航","Tes Discord où tu es propriétaire ou administrateur apparaissent ici. Tu peux gérer ceux où le bot est installé et inviter le bot sur les autres.":"你作为所有者或管理员的 Discord 服务器会显示在这里。你可以管理已安装 Bot 的服务器，并邀请 Bot 到其他服务器。","Discord avec EXTINCTION ++ RSS":"已安装 EXTINCTION ++ RSS 的 Discord","Aucun Discord installé pour le moment.":"目前还没有安装 Bot 的 Discord。","Inviter le bot sur un de tes Discord":"邀请 Bot 到你的 Discord","Tous les Discord que tu peux gérer ont déjà le bot, ou aucun autre Discord n’est disponible.":"你可管理的所有 Discord 都已安装 Bot，或没有其他可用服务器。","Gérer":"管理","Inviter EXTINCTION ++ RSS":"邀请 EXTINCTION ++ RSS","Reconnexion Discord":"重新连接 Discord","Tableau de bord":"控制面板","Mes serveurs":"我的服务器","Boutique":"商店","Nouvelle location":"新租用","Machines":"机器","Fichiers":"文件","Sauvegardes":"备份","Console":"控制台","Joueurs":"玩家","Facturation":"账单","Portefeuille":"钱包","Assistance":"支持","Profil":"个人资料","Messages":"消息","Amis":"好友","Notifications":"通知","Déconnexion":"退出登录","Connexion":"登录","Créer un compte":"创建账户","Rechercher":"搜索","Aide":"帮助","Vidéos":"视频","Studio":"工作室","Applications":"应用","Développeur":"开发者","Sécurité":"安全","Confidentialité":"隐私","Apparence":"外观","Accessibilité":"无障碍","Mes appareils":"我的设备","Inviter":"邀请","Annuler":"取消","Enregistrer":"保存","Fermer":"关闭","Installer":"安装","Retour":"返回","Salons":"频道","Rôles":"角色","Membres":"成员","Événements":"活动","Créer":"创建","Modifier":"编辑","Supprimer":"删除","Compte":"账户","Traduire":"翻译","Général":"常规","Langues du monde":"世界语言"},"co":{"Accueil":"Accolta","Serveurs":"Servitori","Cartes interactives":"Carte interattive","Installer l’application":"Installà l’applicazione","Nitrado":"Nitrado","Mods DayZ PC":"Mods DayZ PC","Valider JSON / XML":"Cunvalidà JSON / XML","Config propriétaires":"Cunfigurazione di i pruprietarii","Whitelist":"Lista bianca","Shop":"Buttega","Livraisons":"Cunsegne","Promos":"Prumuzione","Battle Pass":"Pass di battaglia","Quêtes":"Missioni","RP":"RP","Économie":"Ecunumia","Alarmes":"Allarmi","Interpol":"Interpol","Killfeed":"Morti","Classements":"Classifiche","Stats":"Statistiche","Tickets":"Biglietti","Plugins":"Estensioni","IA":"IA","Personnalisation":"Persunalizazione","Paramètres":"Paràmetri","Changer de Discord":"Cambià Discord","Langue":"Lingua","Assistant gratuit":"Assistente gratuitu","Ouvrir le menu":"Apre u menù","Fermer le menu":"Chjode u menù","Navigation mobile":"Navigazione mobile","Gérer":"Gestisce","Reconnexion Discord":"Ricunnessione Discord","Aucun Discord installé pour le moment.":"Nisun servitore Discord installatu per avà.","Inviter le bot sur un de tes Discord":"Invità u bot nant'à unu di i to Discord","Discord avec EXTINCTION ++ RSS":"Discord cù CMD Extinction ++ RSS","Inviter EXTINCTION ++ RSS":"Invità CMD Extinction ++ RSS","Connecter mon compte Nitrado":"Cunnette u mo contu Nitrado","Dinos & ressources ARK":"Dinosauri è risorse ARK","Loot DayZ":"Ogetti DayZ","Groupes de joueurs":"Gruppi di ghjucatori","Primes & automatisations":"Ricumpense è autumatisazioni","Serveurs Discord":"Servitori Discord"},"pt":{"Tableau de bord":"Painel","Mes serveurs":"Meus servidores","Boutique":"Loja","Nouvelle location":"Nova locação","Machines":"Máquinas","Fichiers":"Ficheiros","Sauvegardes":"Cópias de segurança","Console":"Console","Joueurs":"Jogadores","Facturation":"Faturação","Portefeuille":"Carteira","Assistance":"Suporte","Profil":"Perfil","Messages":"Mensagens","Amis":"Amigos","Notifications":"Notificações","Déconnexion":"Sair","Connexion":"Entrar","Créer un compte":"Criar conta","Rechercher":"Pesquisar","Aide":"Ajuda","Vidéos":"Vídeos","Studio":"Estúdio","Applications":"Aplicações","Développeur":"Programador","Sécurité":"Segurança","Confidentialité":"Privacidade","Apparence":"Aparência","Accessibilité":"Acessibilidade","Mes appareils":"Meus dispositivos","Inviter":"Convidar","Annuler":"Cancelar","Enregistrer":"Guardar","Fermer":"Fechar","Installer":"Instalar","Retour":"Voltar","Gérer":"Gerir","Salons":"Canais","Rôles":"Cargos","Membres":"Membros","Événements":"Eventos","Créer":"Criar","Modifier":"Editar","Supprimer":"Eliminar","Compte":"Conta","Traduire":"Traduzir","Général":"Geral","Langues du monde":"Idiomas do mundo"},"nl":{"Tableau de bord":"Dashboard","Mes serveurs":"Mijn servers","Boutique":"Winkel","Nouvelle location":"Nieuwe huur","Machines":"Machines","Fichiers":"Bestanden","Sauvegardes":"Back-ups","Console":"Console","Joueurs":"Spelers","Facturation":"Facturatie","Portefeuille":"Portemonnee","Assistance":"Ondersteuning","Profil":"Profiel","Messages":"Berichten","Amis":"Vrienden","Notifications":"Meldingen","Déconnexion":"Uitloggen","Connexion":"Inloggen","Créer un compte":"Account aanmaken","Rechercher":"Zoeken","Aide":"Hulp","Vidéos":"Video's","Studio":"Studio","Applications":"Apps","Développeur":"Ontwikkelaar","Sécurité":"Beveiliging","Confidentialité":"Privacy","Apparence":"Uiterlijk","Accessibilité":"Toegankelijkheid","Mes appareils":"Mijn apparaten","Inviter":"Uitnodigen","Annuler":"Annuleren","Enregistrer":"Opslaan","Fermer":"Sluiten","Installer":"Installeren","Retour":"Terug","Gérer":"Beheren","Salons":"Kanalen","Rôles":"Rollen","Membres":"Leden","Événements":"Evenementen","Créer":"Maken","Modifier":"Bewerken","Supprimer":"Verwijderen","Compte":"Account","Traduire":"Vertalen","Général":"Algemeen","Langues du monde":"Wereldtalen"}};
const variants={gsw:"de",bar:"de",swg:"de",nds:"de",lmo:"it",scn:"it",nap:"it",yue:"zh",cmn:"zh",zho:"zh",fra:"fr",fre:"fr",eng:"en",deu:"de",ger:"de",spa:"es",ita:"it",rus:"ru",por:"pt",nld:"nl",dut:"nl",jpn:"ja",kor:"ko",cos:"co"};
const indexed=new Map(),tracked=new WeakMap(),trackedAttr=new WeakMap();
for(const [locale,dictionary] of Object.entries(words)){
 for(const [french,translation] of Object.entries(dictionary)){
  let entry=indexed.get(french);
  if(!entry){entry={fr:french};indexed.set(french,entry)}
  entry[locale]=translation;
 }
}
const aliases=new Map();
for(const entry of indexed.values())for(const variant of Object.values(entry))if(variant&&!aliases.has(variant.trim()))aliases.set(variant.trim(),entry);
function locale(code){
 const base=String(code||"fr").toLowerCase().split("-")[0];
 const target=variants[base]||base;
 return Object.hasOwn(words,target)||target==="fr"?target:"en";
}
function selected(){try{return localStorage.getItem("cmd-world-language")||navigator.languages?.[0]||navigator.language||"fr"}catch{return"fr"}}
let current=selected(),queued=false;
const selector="header a,header button,header summary,nav a,nav button,nav summary,aside a,aside button,aside summary,.sidebar a,.sidebar button,.side-nav a,.side-nav button,.topbar a,.topbar button,.power-nav a,.power-nav button,.tabs button,.cmd-settings-layer button,[role='menuitem'],[role='tab'],h1,h2,h3";
function targetFor(source,lang){const row=aliases.get(source.trim());return row?(row[lang]||row.en||row.fr):null}
function update(el,lang){
 if(el.closest("[contenteditable],[data-cmd-no-translate],.message-content,.chat-message,.message-text,.user-message,#messages,#chatMessages"))return;
 for(const node of el.childNodes){
  if(node.nodeType!==3)continue;
  const currentValue=node.textContent.trim();
  if(!aliases.has(currentValue)&&!tracked.has(node))continue;
  const original=tracked.get(node)||currentValue;
  if(!tracked.has(node))tracked.set(node,original);
  const wanted=targetFor(original,lang);
  if(wanted&&currentValue!==wanted)node.textContent=node.textContent.replace(currentValue,wanted);
 }
 for(const attr of ["aria-label","title","placeholder"]){
  if(!el.hasAttribute(attr))continue;
  const previous=trackedAttr.get(el)||{};
  let original=previous[attr];
  if(!original){
   const candidate=el.getAttribute(attr)?.trim()||"";
   if(!aliases.has(candidate))continue;
   previous[attr]=original=candidate;trackedAttr.set(el,previous);
  }
  const wanted=targetFor(original,lang);
  if(wanted&&wanted!==el.getAttribute(attr))el.setAttribute(attr,wanted);
 }
}
function refresh(){
 if(!document.body)return;
 const lang=locale(current);
 document.querySelectorAll(selector).forEach(el=>update(el,lang));
 const shadow=document.getElementById("cmd-world-language-root")?.shadowRoot;
 if(shadow)shadow.querySelectorAll("button,strong,summary").forEach(el=>update(el,lang));
}
function schedule(){
 if(queued)return;queued=true;
 const run=()=>{queued=false;refresh()};
 if(typeof requestAnimationFrame==="function")requestAnimationFrame(run);else queueMicrotask(run);
}
function change(code){current=code||selected();schedule()}
window.addEventListener("cmd-world-language-change",e=>change(e.detail?.language));
window.addEventListener("cmd-sphere-language-change",e=>change(e.detail?.selectedLanguage||e.detail?.language));
window.addEventListener("storage",e=>{if(e.key==="cmd-world-language")change(e.newValue)});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();
const observe=()=>{if(document.body)new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observe,{once:true});else observe();
window.CMDMenuI18n={get language(){return current},get translatedLocale(){return locale(current)},get supportedLocales(){return ["fr",...Object.keys(words)]},refresh:schedule};
})();
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
  const ids=["language","mobile-language","lng","cmd-sphere-language","cmdLanguageChoice","cmdSettingsLanguagePicker"];
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

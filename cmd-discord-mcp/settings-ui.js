(function(){
  'use strict';
  function init(){
    var app=document.querySelector('.sphere-app');
    if(!app||document.getElementById('cmdSettingsLayer'))return;
    var style=document.createElement('style');
    style.id='cmd-settings-style';
    style.textContent=[
      'body.cmd-settings-locked{overflow:hidden!important}',
      '.sphere-app .cmd-head-legacy{display:none!important}',
      '.sphere-app .cmd-app-controls{display:flex;align-items:center;gap:9px;margin-left:auto}',
      '.sphere-app .cmd-open-settings{display:inline-flex;align-items:center;gap:8px;justify-content:center;border:1px solid #ffffff22;background:#23232c;color:#f5f5f7;border-radius:13px;padding:11px 15px;font-size:14px;font-weight:750;cursor:pointer;white-space:nowrap}',
      '.sphere-app .cmd-open-settings:hover{background:#33343d}',
      '.cmd-settings-layer{position:fixed;inset:0;z-index:9999;background:#050509c9;display:none;align-items:center;justify-content:center;font-family:Inter,-apple-system,BlinkMacSystemFont,system-ui,Arial,sans-serif;color:#f4f4f5}',
      '.cmd-settings-layer.on{display:flex}',
      '.cmd-settings-panel{width:min(700px,96vw);height:min(900px,93dvh);max-height:93vh;display:flex;flex-direction:column;overflow:hidden;background:#232329;border:1px solid #48485055;border-radius:24px;box-shadow:0 24px 90px #000b}',
      '.cmd-settings-header{flex:none;padding:22px 23px 17px;background:#232329;border-bottom:1px solid #ffffff0b;z-index:1}',
      '.cmd-settings-title-row{display:flex;align-items:center;gap:16px;min-height:36px}',
      '.cmd-settings-close,.cmd-settings-back{display:grid;place-items:center;width:38px;height:38px;flex:none;border:0;background:transparent;color:#b7b7bd;font-size:29px;cursor:pointer;border-radius:10px}',
      '.cmd-settings-back{font-size:27px}',
      '.cmd-settings-close:hover,.cmd-settings-back:hover{color:#fff;background:#ffffff10}',
      '.cmd-settings-header h2{margin:0;flex:1;font-size:24px;letter-spacing:-.6px;font-weight:800}',
      '.cmd-settings-head-mark{border-radius:11px;background:#33343e;color:#bfc1ce;font-weight:850;font-size:11px;padding:6px 9px}',
      '.cmd-settings-search{display:flex;align-items:center;gap:11px;border:1px solid #484850;background:#1b1b20;border-radius:12px;margin-top:21px;padding:0 14px;height:48px}',
      '.cmd-settings-search svg{opacity:.62;flex:none}',
      '.cmd-settings-search input{width:100%;flex:1;color:#fafafa;font:inherit;font-size:16px;background:transparent;border:0;outline:0;min-width:0}',
      '.cmd-settings-search input::placeholder{color:#92929c}',
      '.cmd-settings-content{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:16px 22px 46px;scrollbar-color:#4c4c55 transparent}',
      '.cmd-settings-category{margin:15px 0 31px}',
      '.cmd-settings-category h3{color:#a8a8b2;font-size:16px;line-height:1.4;font-weight:600;margin:0 0 12px 2px}',
      '.cmd-settings-group{border-radius:20px;background:#2d2d35;overflow:hidden}',
      '.cmd-set-row{width:100%;min-height:65px;display:flex;align-items:center;gap:15px;text-align:left;border:0;background:transparent;color:#f7f7f9;cursor:pointer;font:inherit;font-size:16px;padding:12px 18px;position:relative}',
      '.cmd-set-row:not(:last-child):after{content:"";position:absolute;left:64px;bottom:0;right:17px;height:1px;background:#ffffff0f}',
      '.cmd-set-row:hover,.cmd-set-row:focus-visible{background:#ffffff0a}',
      '.cmd-set-row svg{flex:none;color:#f3f3f5;width:25px;height:25px;stroke-width:2.25}',
      '.cmd-set-row[hidden],.cmd-settings-category[hidden],.cmd-settings-search[hidden]{display:none!important}',
      '.cmd-set-label{flex:1;min-width:0;font-weight:560;line-height:1.3}',
      '.cmd-set-sub{display:block!important;font-size:12px;color:#a8a8b4;line-height:1.4;margin-top:4px;font-weight:400}',
      '.cmd-set-value{color:#a7a7b0;font-size:12px;max-width:35%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.cmd-set-chevron{font-size:28px;font-weight:300;color:#a1a2aa;margin-left:6px;line-height:1}',
      '.cmd-set-row.cmd-set-danger{color:#ff8587;margin-top:5px}',
      '.cmd-set-row.cmd-set-danger svg{color:#ff8587}',
      '.cmd-set-note{color:#aeb0ba;font-size:13px;line-height:1.65;margin:15px 6px}',
      '.cmd-settings-detail{background:#2d2d35;border-radius:18px;padding:19px;margin-top:8px}',
      '.cmd-settings-detail h3{font-size:19px;margin:0 0 11px}',
      '.cmd-settings-detail p{color:#c7c7ce;font-size:14px;line-height:1.7;margin:7px 0 17px}',
      '.cmd-settings-detail a,.cmd-settings-detail button{font:inherit;cursor:pointer}',
      '.cmd-settings-detail .cmd-set-cta{display:flex;align-items:center;justify-content:center;text-decoration:none;border:0;background:#5865f2;color:white;border-radius:11px;padding:13px 15px;font-weight:750;width:100%;margin:9px 0}',
      '.cmd-settings-detail .cmd-set-cta.secondary{background:#454650;color:#fff}',
      '.cmd-settings-detail .cmd-set-input,.cmd-settings-detail select{background:#1c1c23;border:1px solid #555561;color:#fff;border-radius:10px;padding:13px;width:100%;font-size:15px;margin:8px 0 15px}',
      '.cmd-settings-detail label{display:block;font-size:14px;color:#dedee5;margin:14px 0 4px}',
      '.cmd-settings-detail .cmd-setting-toggle{display:flex;align-items:center;gap:12px;margin:14px 0;color:#eee}',
      '.cmd-settings-detail .cmd-setting-toggle input{accent-color:#5865f2;width:19px;height:19px}',
      '.cmd-settings-detail .cmd-small{font-size:12px;color:#aeb0ba}',
      '.cmd-settings-detail .cmd-status{font-size:13px;margin:10px 0 0;color:#b5c1f9;overflow-wrap:anywhere}',
      '.cmd-settings-empty{color:#aaa;padding:32px;text-align:center}',
      'body.cmd-amoled .sphere-app{background:#000!important}',
      'body.cmd-less-motion *,body.cmd-less-motion *:before,body.cmd-less-motion *:after{animation-duration:.01ms!important;transition-duration:.01ms!important}',
      'body.cmd-bigger-type .sphere-app{font-size:110%}',
      /* Automatically adapt settings to tablet, compact phone and landscape */
      '@media(min-width:761px) and (max-width:1180px){.cmd-settings-panel{width:min(750px,94vw);height:min(870px,94dvh)}.sphere-app .wrap>.top{gap:9px}.sphere-app .cmd-app-controls{margin-left:auto}.cmd-settings-content{padding-inline:20px}.cmd-settings-group{border-radius:17px}}',
      '@media(max-width:520px){.cmd-settings-header{padding-left:14px;padding-right:14px}.cmd-settings-content{padding-left:12px;padding-right:12px}.cmd-settings-group{border-radius:15px}.cmd-set-row{padding:12px 13px;gap:11px;min-height:62px;font-size:15px}.cmd-set-row svg{width:23px;height:23px}.cmd-set-row:not(:last-child):after{left:49px}.cmd-settings-header h2{font-size:20px}.cmd-settings-head-mark{font-size:10px;padding:5px}.sphere-app .cmd-app-controls{justify-content:flex-start}.sphere-app .wrap>.top .brand{min-width:0}.sphere-app .wrap>.top .brand .muted{display:none}.sphere-app .cmd-open-settings{font-size:13px;min-height:42px}}',
      '@media(orientation:landscape) and (max-height:530px){.cmd-settings-header{padding:10px 16px}.cmd-settings-search{margin-top:9px;height:40px}.cmd-settings-content{padding-block:8px 24px}.cmd-set-row{min-height:50px}.cmd-settings-panel{height:100dvh;max-height:none}}',
      '@media(prefers-reduced-motion:reduce){.cmd-settings-layer *{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}',
      '@media(max-width:760px){.sphere-app .cmd-app-controls{width:100%;justify-content:flex-end}.sphere-app .cmd-open-settings{padding:9px 11px}.sphere-app .wrap>.top{align-items:flex-start}.sphere-app .wrap>.top .brand h1{font-size:21px!important}.sphere-app .wrap>.top .brand .muted{font-size:12px;line-height:1.45}.sphere-app .grid>aside.card{display:none!important}.sphere-app .grid{display:block!important}.sphere-app .grid>main.card{min-width:0}.sphere-app .brand-logo{max-height:175px;object-fit:contain}.cmd-settings-layer{align-items:stretch;justify-content:stretch;background:#232329}.cmd-settings-panel{width:100%;height:100dvh;max-height:none;border:0;border-radius:0}.cmd-settings-header{padding:calc(15px + env(safe-area-inset-top)) 17px 15px}.cmd-settings-header h2{font-size:22px}.cmd-settings-search{margin-top:19px}.cmd-settings-content{padding:16px 16px calc(34px + env(safe-area-inset-bottom))}.cmd-set-row{min-height:66px;padding:14px 18px}.cmd-settings-category{margin-bottom:29px}}'
    ].join('');
    document.head.appendChild(style);
    var oldTop=app.querySelector('.wrap > .top');
    var legacy=oldTop&&oldTop.lastElementChild;
    if(!oldTop||!legacy)return;
    legacy.classList.add('cmd-head-legacy');
    var headerControls=document.createElement('div');
    headerControls.className='cmd-app-controls';
    headerControls.innerHTML='<button class="cmd-open-settings" type="button" id="cmdSettingsOpenTop" aria-label="Paramètres CMD Sphere">'+glyph('settings')+' Paramètres</button>';
    oldTop.appendChild(headerControls);
    var dockGear=app.querySelector('.user-dock .user-dock-actions a[href="/profile"]');
    if(dockGear){
      var gear=document.createElement('button');gear.type='button';gear.id='cmdSettingsOpenDock';gear.title='Paramètres du compte';gear.setAttribute('aria-label','Paramètres du compte');gear.innerHTML=glyph('settings');dockGear.replaceWith(gear);
    }
    var layer=document.createElement('div');
    layer.id='cmdSettingsLayer';layer.className='cmd-settings-layer';layer.setAttribute('aria-hidden','true');
    layer.innerHTML='<div class="cmd-settings-panel" role="dialog" aria-modal="true" aria-label="Paramètres CMD Sphere">'
      +'<header class="cmd-settings-header"><div class="cmd-settings-title-row"><button type="button" class="cmd-settings-back" id="cmdSettingsBack" aria-label="Retour" hidden>‹</button>'
      +'<button type="button" class="cmd-settings-close" id="cmdSettingsClose" aria-label="Fermer">×</button><h2 id="cmdSettingsTitle">Paramètres</h2><span class="cmd-settings-head-mark">CMD Sphere</span></div>'
      +'<label class="cmd-settings-search" id="cmdSettingsSearchWrap">'+glyph('search')+'<input type="search" id="cmdSettingsSearch" placeholder="Rechercher" autocomplete="off" aria-label="Rechercher un paramètre"></label></header>'
      +'<main class="cmd-settings-content" id="cmdSettingsContent" tabindex="-1"></main></div>';
    document.body.appendChild(layer);
    var title=layer.querySelector('#cmdSettingsTitle'),view=layer.querySelector('#cmdSettingsContent'),search=layer.querySelector('#cmdSettingsSearch'),back=layer.querySelector('#cmdSettingsBack'),close=layer.querySelector('#cmdSettingsClose');
    var current='home',lastFocus=null;
    function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
    function glyph(name){
      var icons={
        settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M20.5 13.5v-3l-2-.6-.8-1.8 1-1.9-2.1-2.1-1.9 1-.8-.4-1-.4-.6-2h-3l-.6 2-1.8.8-1.9-1-2.1 2.1 1 1.9-.8 1.8-2 .6v3l2 .6.8 1.8-1 1.9 2.1 2.1 1.9-1 1.8.8.6 2h3l.6-2 1.8-.8 1.9 1 2.1-2.1-1-1.9.8-1.8Z"/>',
        user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/>',
        social:'<circle cx="8" cy="8" r="3"/><path d="M3 20v-2a5 5 0 0 1 10 0v2M15 7h6M18 4v6"/>',
        shield:'<path d="M12 22s9-4 9-11V5l-9-3-9 3v6c0 7 9 11 9 11Z"/><path d="M9 12l2 2 4-4"/>',
        people:'<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2M16 5a3 3 0 0 1 0 6M18 20v-2a6 6 0 0 0-3-5"/>',
        key:'<circle cx="8" cy="15" r="5"/><path d="M11.5 11.5 21 2l1 4-3 1-1 3-3 1"/>',
        device:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',
        link:'<path d="M10 13a5 5 0 0 0 7 .3l3-3a5 5 0 1 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.3l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
        qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 21h3M21 21h-3v-3"/>',
        shop:'<path d="m3 9 2-6h14l2 6M3 9v12h18V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 21v-8h6v8"/>',
        trophy:'<path d="M8 4h8v8a4 4 0 0 1-8 0V4ZM8 6H4v3a4 4 0 0 0 4 4M16 6h4v3a4 4 0 0 1-4 4M12 16v4M8 21h8"/>',
        gem:'<path d="M6 3h12l5 7-11 11L1 10l5-7ZM1 10h22M6 3l6 18 6-18"/>',
        gift:'<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M12 9S5 9 5 5a3 3 0 0 1 6 0l1 4ZM12 9s7 0 7-4a3 3 0 0 0-6 0l-1 4Z"/>',
        mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
        palette:'<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 2-3 2 2 0 0 1 2-3h1a4 4 0 0 0 4-4A9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="17" cy="10" r="1"/>',
        access:'<circle cx="12" cy="4" r="2"/><path d="M4 8h16M12 8v13M12 12l-5 9M12 12l5 9"/>',
        language:'<path d="M3 5h14M10 2v3M6 9c2 4 5 7 9 9M14 7c-2 6-6 10-11 12M13 21l5-12 5 12M15 17h6"/>',
        bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
        globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c5 5 5 15 0 20M12 2c-5 5-5 15 0 20"/>',
        terminal:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="m6 8 4 4-4 4M12 16h5"/>',
        help:'<circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1.5-2 3M12 18h.01"/>',
        spark:'<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>',
        logout:'<path d="M10 3H4v18h6M15 8l5 4-5 4M8 12h12"/>',
        folder:'<path d="M3 5h7l2 3h9v12H3V5Z"/>',
        bot:'<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M9 3h6M9 12h.01M15 12h.01M9 17h6"/>',
        save:'<path d="M4 2h13l3 3v17H4V2ZM7 2v7h10V2M7 22v-9h10v9"/>',
        sync:'<path d="M20 7V3l-4 4h4a8 8 0 1 0 1 10M4 17v4l4-4H4a8 8 0 0 0-1-10"/>',
        search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
        chart:'<path d="M4 20V4M4 20h17M8 16v-4M13 16V7M18 16V9"/>'
      };
      return '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.settings)+'</svg>';
    }
    var groups=[
      {label:'Paramètres du compte',rows:[
        ['Compte','user','profile','Profil, photo, bannière'],
        ['Contenu et social','social','social','Messages et amis'],
        ['Données et confidentialité','shield','privacy',''],
        ['Appareils','device','device',''],
        ['Applications autorisées','key','connections',''],
        ['Connexions','link','connections',''],
        ['Scanner / invitations','qr','invites','']
      ]},
      {label:'Paramètres de facturation',rows:[
        ['Boutique','shop','shop',''],
        ['Quêtes','trophy','quests',''],
        ['CMD Premium','gem','premium',''],
        ['Boost de serveur','spark','boost',''],
        ['Inventaire de récompenses','gift','inventory',''],
        ['Mes diamants','gem','diamonds','']
      ]},
      {label:"Paramètres de l'appli",rows:[
        ['Voix & Vidéo','mic','voice',''],
        ['Apparence','palette','appearance',''],
        ['Accessibilité','access','accessibility',''],
        ['Langue','language','language',''],
        ['Notifications','bell','notifications',''],
        ["Icône de l'appli",'device','appicon',''],
        ['Avancés','terminal','advanced','']
      ]},
      {label:'Outils CMD',rows:[
        ['Synchroniser mes Discord','sync','sync',''],
        ['Reconnecter Discord','link','relink',''],
        ['Dossiers de serveurs','folder','folders',''],
        ['Bots Discord','bot','bots',''],
        ['Webhooks','link','webhooks',''],
        ['Sauvegarde Discord','save','backup','']
      ]},
      {label:'Assistance',rows:[
        ['Assistance','help','support',''],
        ['Diagnostics','chart','diagnostics','']
      ]},
      {label:'Nouveautés',rows:[
        ['Nouveautés CMD Sphere','spark','whatsnew','']
      ]},
      {label:'Compte',rows:[
        ['Déconnexion','logout','logout','']
      ]}
    ];

    // Locale-specific settings labels. The account setting keys never change.
    var cmdSettingsLocales={"en":{"sections":"Account settings|Billing settings|App settings|CMD tools|Support|What's new|Account","rows":["Account|Content and social|Data and privacy|Devices|Authorized apps|Connections|Scan / invitations","Shop|Quests|CMD Premium|Server boosts|Rewards inventory|My diamonds","Voice and video|Appearance|Accessibility|Language|Notifications|App icon|Advanced","Sync my Discord servers|Reconnect Discord|Server folders|Discord bots|Webhooks|Discord backup","Help|Diagnostics","What's new in CMD Sphere","Log out"],"subs":"Profile, photo, banner|Messages and friends","title":"Settings","search":"Search","desc":"Manage this setting for your CMD Sphere account."},"es":{"sections":"Ajustes de la cuenta|Ajustes de facturación|Ajustes de la aplicación|Herramientas CMD|Ayuda|Novedades|Cuenta","rows":["Cuenta|Contenido y social|Datos y privacidad|Dispositivos|Aplicaciones autorizadas|Conexiones|Escanear / invitaciones","Tienda|Misiones|CMD Premium|Mejoras del servidor|Inventario de recompensas|Mis diamantes","Voz y vídeo|Apariencia|Accesibilidad|Idioma|Notificaciones|Icono de la aplicación|Avanzado","Sincronizar mis Discord|Reconectar Discord|Carpetas de servidores|Bots de Discord|Webhooks|Copia de seguridad Discord","Ayuda|Diagnóstico","Novedades CMD Sphere","Cerrar sesión"],"subs":"Perfil, foto y banner|Mensajes y amigos","title":"Ajustes","search":"Buscar","desc":"Gestiona este ajuste en tu cuenta de CMD Sphere."},"de":{"sections":"Kontoeinstellungen|Abrechnung|App-Einstellungen|CMD-Werkzeuge|Hilfe|Neuigkeiten|Konto","rows":["Konto|Inhalte und Soziales|Daten und Datenschutz|Geräte|Autorisierte Apps|Verbindungen|Scannen / Einladungen","Shop|Quests|CMD Premium|Server-Boosts|Belohnungsinventar|Meine Diamanten","Sprache und Video|Darstellung|Barrierefreiheit|Sprache|Benachrichtigungen|App-Symbol|Erweitert","Discord-Server synchronisieren|Discord erneut verbinden|Serverordner|Discord-Bots|Webhooks|Discord-Sicherung","Hilfe|Diagnose","CMD Sphere Neuigkeiten","Abmelden"],"subs":"Profil, Foto und Banner|Nachrichten und Freunde","title":"Einstellungen","search":"Suchen","desc":"Verwalte diese Einstellung in CMD Sphere."},"it":{"sections":"Impostazioni account|Fatturazione|Impostazioni app|Strumenti CMD|Assistenza|Novità|Account","rows":["Account|Contenuti e social|Dati e privacy|Dispositivi|App autorizzate|Connessioni|Scansione / inviti","Negozio|Missioni|CMD Premium|Boost server|Inventario ricompense|I miei diamanti","Voce e video|Aspetto|Accessibilità|Lingua|Notifiche|Icona app|Avanzate","Sincronizza i miei Discord|Riconnetti Discord|Cartelle server|Bot Discord|Webhook|Backup Discord","Assistenza|Diagnostica","Novità CMD Sphere","Disconnetti"],"subs":"Profilo, foto e banner|Messaggi e amici","title":"Impostazioni","search":"Cerca","desc":"Gestisci questa impostazione nel tuo account CMD Sphere."},"ru":{"sections":"Настройки аккаунта|Платежи|Настройки приложения|Инструменты CMD|Поддержка|Новости|Аккаунт","rows":["Аккаунт|Контент и общение|Данные и приватность|Устройства|Разрешённые приложения|Подключения|Сканер / приглашения","Магазин|Задания|CMD Premium|Усиления сервера|Награды|Мои алмазы","Голос и видео|Внешний вид|Доступность|Язык|Уведомления|Значок приложения|Дополнительно","Синхронизация Discord|Подключить Discord снова|Папки серверов|Боты Discord|Вебхуки|Резервная копия Discord","Поддержка|Диагностика","Новости CMD Sphere","Выйти"],"subs":"Профиль, фото, баннер|Сообщения и друзья","title":"Настройки","search":"Поиск","desc":"Настройки вашего аккаунта CMD Sphere."},"ko":{"sections":"계정 설정|결제 설정|앱 설정|CMD 도구|지원|새로운 소식|계정","rows":["계정|콘텐츠 및 소셜|데이터와 개인정보|기기|승인된 앱|연결|스캔 / 초대","상점|퀘스트|CMD 프리미엄|서버 부스트|보상 보관함|내 다이아몬드","음성 및 영상|외관|접근성|언어|알림|앱 아이콘|고급","Discord 서버 동기화|Discord 재연결|서버 폴더|Discord 봇|웹훅|Discord 백업","지원|진단","CMD Sphere 새로운 소식","로그아웃"],"subs":"프로필, 사진, 배너|메시지 및 친구","title":"설정","search":"검색","desc":"CMD Sphere 계정의 이 설정을 관리합니다."},"ja":{"sections":"アカウント設定|請求設定|アプリ設定|CMDツール|サポート|新着情報|アカウント","rows":["アカウント|コンテンツと交流|データとプライバシー|デバイス|認証済みアプリ|接続|スキャン / 招待","ショップ|クエスト|CMDプレミアム|サーバーブースト|報酬インベントリ|ダイヤモンド","音声・ビデオ|外観|アクセシビリティ|言語|通知|アプリアイコン|詳細設定","Discordサーバーの同期|Discordを再接続|サーバーフォルダー|Discordボット|ウェブフック|Discordバックアップ","サポート|診断","CMD Sphereの新機能","ログアウト"],"subs":"プロフィール、写真、バナー|メッセージとフレンド","title":"設定","search":"検索","desc":"CMD Sphereアカウントの設定を管理します。"},"zh":{"sections":"账户设置|账单设置|应用设置|CMD 工具|支持|新功能|账户","rows":["账户|内容与社交|数据与隐私|设备|已授权应用|连接|扫码 / 邀请","商店|任务|CMD 会员|服务器加成|奖励背包|我的钻石","语音与视频|外观|辅助功能|语言|通知|应用图标|高级","同步我的 Discord|重新连接 Discord|服务器文件夹|Discord 机器人|Webhook|Discord 备份","帮助|诊断","CMD Sphere 新功能","退出登录"],"subs":"个人资料、照片、横幅|消息和好友","title":"设置","search":"搜索","desc":"管理 CMD Sphere 账户中的此项设置。"},"co":{"sections":"Paràmetri di u contu|Fatturazione|Paràmetri di l'app|Arnesi CMD|Assistenza|Novità|Contu","rows":["Contu|Cuntenutu è suciale|Dati è riservatezza|Apparechji|Applicazioni auturizate|Cunnessioni|Scannà / inviti","Buttega|Missioni|CMD Premium|Boost di servore|Ricumpense|I mo diamanti","Voce è video|Aspettu|Accessibilità|Lingua|Nutificazioni|Icona di l'app|Avanzatu","Sincrunizà i mo Discord|Ricunnette Discord|Cartulari di servori|Bot Discord|Webhooks|Salvaguardia Discord","Assistenza|Diagnostichi","Novità CMD Sphere","Scunnettassi"],"subs":"Prufilu, fotò è bandera|Missaghji è amichi","title":"Paràmetri","search":"Circà","desc":"Gestisci stu paràmetru di u contu CMD Sphere."}};
    var cmdSettingsNativeNames={fr:'Français',en:'English',us:'English (US)',de:'Deutsch',es:'Español',it:'Italiano',ru:'Русский',ko:'한국어',ja:'日本語',zh:'中文',co:'Corsu'};
    function settingsLocale(){var code='fr';try{code=localStorage.getItem('cmd-sphere-language')||'fr'}catch(e){}return cmdSettingsLocales[code==='us'?'en':code]||null}
    function localizeSettings(){
      var L=settingsLocale(),language='fr';try{language=localStorage.getItem('cmd-sphere-language')||'fr'}catch(e){}
      title.textContent=L?L.title:'Paramètres';
      search.placeholder=L?L.search:'Rechercher';
      var groupsEls=view.querySelectorAll('.cmd-settings-category');
      groupsEls.forEach(function(section,index){
        var h=section.querySelector('h3'),g=groups[index];if(!g)return;
        if(h)h.textContent=L?L.sections.split('|')[index]:g.label;
        var labels=L?L.rows[index].split('|'):null;
        section.querySelectorAll('.cmd-set-row').forEach(function(row,j){
          var orig=g.rows[j],label=row.querySelector('.cmd-set-label');if(!orig||!label)return;
          var node=Array.from(label.childNodes).find(function(n){return n.nodeType===3});
          var translated=labels?labels[j]:orig[0];
          if(node)node.nodeValue=translated;
          var sub=label.querySelector('.cmd-set-sub');
          if(sub)sub.textContent=L?L.subs.split('|')[orig[2]==='profile'?0:1]:orig[3];
          row.dataset.cmdFilter=(translated+' '+(h?h.textContent:'')+' '+orig[0]+' '+g.label).toLocaleLowerCase();
        });
      });
      var currentLang=view.querySelector('#cmdCurrentLanguage');if(currentLang)currentLang.textContent=cmdSettingsNativeNames[language]||'Français';
      if(current!=='home'&&pages[current]){
        var d=pages[current],h=view.querySelector('.cmd-settings-detail h3'),p=view.querySelector('.cmd-settings-detail > p');
        var pageLabel=d[0];groups.forEach(function(g,i){g.rows.forEach(function(r,j){if(r[2]===current&&L)pageLabel=L.rows[i].split('|')[j]})});
        if(h)h.textContent=pageLabel;
        title.textContent=pageLabel;
        if(p&&L){
          var es={"social":"Accede a tus mensajes y administra tus amistades de CMD Sphere.","privacy":"Configura la privacidad de CMD Sphere. Discord mantiene sus propios permisos.","device":"Información de este dispositivo y tu sesión CMD Sphere.","invites":"Crea o acepta invitaciones desde tus servidores CMD Sphere.","premium":"Personalización, suscripciones y ventajas de CMD Sphere.","boost":"Opciones de mejora para los servidores CMD Sphere.","inventory":"Recompensas y objetos desbloqueados de tu perfil.","voice":"Comprueba el acceso al micrófono. Las llamadas usan CMD Sphere.","appearance":"Personaliza la apariencia de CMD Sphere en este dispositivo.","accessibility":"Ajusta la comodidad visual de este dispositivo.","language":"Elige el idioma de la interfaz de CMD Sphere.","notifications":"Activa las notificaciones de mensajes y llamadas de este dispositivo.","appicon":"Instala CMD Sphere desde el menú del navegador en la pantalla de inicio.","advanced":"Herramientas de administración de CMD Sphere según tus permisos.","support":"¿Problemas de conexión o sincronización? Consulta el diagnóstico o contacta con CMD.","diagnostics":"Comprueba la disponibilidad y actualiza los archivos de CMD Sphere.","whatsnew":"Nueva organización de ajustes con categorías y búsqueda."};
          p.textContent=language==='es'?(es[current]||d[1]):L.desc;
        }else if(p)p.textContent=d[1];
      }
    }
    document.addEventListener('change',function(e){
      if(e.target&&e.target.id==='cmd-sphere-language'){
        if(current==='home')draw();else detail(current);
      }
    });

    function draw(){
      current='home';title.textContent='Paramètres';back.hidden=true;layer.querySelector('#cmdSettingsSearchWrap').hidden=false;
      view.innerHTML=groups.map(function(g){
        return '<section class="cmd-settings-category"><h3>'+esc(g.label)+'</h3><div class="cmd-settings-group">'+g.rows.map(function(r){
          return '<button type="button" class="cmd-set-row'+(r[2]==='logout'?' cmd-set-danger':'')+'" data-cmd-action="'+esc(r[2])+'" data-cmd-filter="'+esc((r[0]+' '+g.label).toLowerCase())+'">'+glyph(r[1])+'<span class="cmd-set-label">'+esc(r[0])+(r[3]?'<span class="cmd-set-sub">'+esc(r[3])+'</span>':'')+'</span>'+(r[2]==='language'?'<span class="cmd-set-value" id="cmdCurrentLanguage">Français</span>':'')+'<span class="cmd-set-chevron">›</span></button>';
        }).join('')+'</div></section>';
      }).join('');
      search.value='';view.scrollTop=0;localizeSettings();
    }
    var pages={
      social:["Contenu et social","Accède à tes messages privés et gère les conversations et relations de CMD Sphere.",'<a class="cmd-set-cta" href="/messages">Ouvrir les messages</a>'],
      privacy:["Données et confidentialité","Paramètres de confidentialité de CMD Sphere. Les autorisations et le fonctionnement de Discord restent indépendants de CMD Sphere.",'<a class="cmd-set-cta" href="/connections">Gérer mes connexions</a><a class="cmd-set-cta secondary" href="/profile">Paramètres de mon profil</a>'],
      device:["Appareils","Informations concernant cet appareil et ta session CMD Sphere.",'<p id="cmdDeviceText" class="cmd-small"></p>'],
      invites:["Scanner / invitations","La création et la réception des invitations CMD Sphere se font depuis les serveurs.",'<a class="cmd-set-cta" href="/servers/add">Créer ou rejoindre un serveur</a>'],
      premium:["CMD Premium","Personnalisations, abonnements et avantages proposés par CMD Sphere.",'<a class="cmd-set-cta" href="/shop">Voir les offres CMD Premium</a>'],
      boost:["Boost de serveur","Retrouve les options de boost pour les serveurs CMD Sphere.",'<a class="cmd-set-cta" href="/shop">Accéder aux boosts</a>'],
      inventory:["Inventaire de récompenses","Retrouve la boutique et tes objets débloqués depuis le profil.",'<a class="cmd-set-cta" href="/shop">Boutique</a><a class="cmd-set-cta secondary" href="/profile">Mon profil</a>'],
      voice:["Voix & Vidéo","Vérifie l'accès au microphone sur cet appareil. Les appels passent par la fonction d'appel CMD Sphere.",'<button type="button" class="cmd-set-cta" data-cmd-subaction="mic">Tester le microphone</button><a class="cmd-set-cta secondary" href="/messages">Accéder aux appels et MP</a><p class="cmd-status" id="cmdSubStatus"></p>'],
      appearance:["Apparence","Personnalise l'affichage de CMD Sphere sur cet appareil.",'<label for="cmdThemeChoice">Thème</label><select id="cmdThemeChoice"><option value="dark">Sombre</option><option value="amoled">Noir AMOLED</option></select>'],
      accessibility:["Accessibilité","Réglages de confort visuel sur cet appareil.",'<label class="cmd-setting-toggle"><input id="cmdLessMotion" type="checkbox"> Réduire les animations</label><label class="cmd-setting-toggle"><input id="cmdBiggerType" type="checkbox"> Agrandir le texte</label>'],
      language:["Langue","Choisis la langue de l'interface CMD Sphere.",'<label for="cmdLanguageChoice">Langue de l’application</label><select id="cmdLanguageChoice"><option value="fr">Français</option><option value="en">English</option><option value="us">English (USA)</option><option value="de">Deutsch</option><option value="es">Español</option><option value="it">Italiano</option><option value="ru">Русский</option><option value="ko">한국어</option><option value="ja">日本語</option><option value="zh">中文</option><option value="co">Corsu</option></select><p id="cmdSubStatus" class="cmd-status"></p>'],
      notifications:["Notifications","Active les notifications de messages et d'appels sur cet appareil. L'autorisation système ne garantit pas à elle seule les alertes lorsque le navigateur est fermé.",'<p id="cmdNotifState" class="cmd-small"></p><button type="button" class="cmd-set-cta" data-cmd-subaction="notif">Autoriser les notifications</button><a class="cmd-set-cta secondary" href="/messages">Messages et appels</a><p id="cmdSubStatus" class="cmd-status"></p>'],
      appicon:["Icône de l'appli","Installe CMD Sphere depuis le menu de ton navigateur : « Ajouter à l'écran d'accueil » sur iPhone ou « Installer l'application » sur les navigateurs compatibles.",'<a class="cmd-set-cta secondary" href="/dashboard">Revenir à CMD Sphere</a>'],
      advanced:["Avancés","Outils d'administration CMD Sphere. Les actions utilisent tes autorisations actuelles.",'<button type="button" class="cmd-set-cta" data-cmd-subaction="sync">Synchroniser mes Discord</button><button type="button" class="cmd-set-cta secondary" data-cmd-subaction="folders">Dossiers de serveurs</button><button type="button" class="cmd-set-cta secondary" data-cmd-subaction="bots">Bots Discord</button><button type="button" class="cmd-set-cta secondary" data-cmd-subaction="webhooks">Webhooks</button><button type="button" class="cmd-set-cta secondary" data-cmd-subaction="backup">Sauvegarde Discord</button><a class="cmd-set-cta secondary" href="/dashboard-login?link=1&amp;next=%2Fdashboard%3Fsync%3D1">Reconnecter Discord</a>'],
      support:["Assistance","Un problème de connexion ou de synchronisation ? Vérifie les diagnostics et contacte l'équipe CMD.",'<a class="cmd-set-cta" href="mailto:znation.cmd@gmail.com?subject=Assistance%20CMD%20Sphere">Contacter CMD</a><button type="button" class="cmd-set-cta secondary" data-cmd-subaction="diagnostics">Voir les diagnostics</button>'],
      diagnostics:["Diagnostics","Vérifie la disponibilité de CMD Sphere et recharge les fichiers de l’application.",'<button type="button" class="cmd-set-cta" data-cmd-subaction="health">Tester le serveur</button><button type="button" class="cmd-set-cta secondary" data-cmd-subaction="refresh">Actualiser l’application</button><p id="cmdSubStatus" class="cmd-status"></p>'],
      whatsnew:["Nouveautés CMD Sphere","Nouvelle présentation des paramètres : menu regroupé par catégories, recherche, raccourcis de synchronisation et personnalisation locale.",'<button type="button" class="cmd-set-cta secondary" data-cmd-subaction="refresh">Actualiser l’application</button>']
    };
    function detail(key){
      var d=pages[key];if(!d)return;
      current=key;title.textContent=d[0];back.hidden=false;layer.querySelector('#cmdSettingsSearchWrap').hidden=true;
      view.innerHTML='<section class="cmd-settings-detail"><h3>'+esc(d[0])+'</h3><p>'+esc(d[1])+'</p>'+d[2]+'</section>';
      view.scrollTop=0;localizeSettings();
      if(key==='device')view.querySelector('#cmdDeviceText').textContent=(navigator.userAgent||'Navigateur')+(window.matchMedia('(display-mode: standalone)').matches?' · application installée':' · navigateur');
      if(key==='appearance'){var theme=view.querySelector('#cmdThemeChoice');theme.value=localStorage.getItem('cmd-sphere-appearance')||'dark';theme.onchange=function(){localStorage.setItem('cmd-sphere-appearance',theme.value);applyPreferences()}}
      if(key==='accessibility'){
        var less=view.querySelector('#cmdLessMotion'),big=view.querySelector('#cmdBiggerType');
        less.checked=localStorage.getItem('cmd-sphere-less-motion')==='1';big.checked=localStorage.getItem('cmd-sphere-bigger-type')==='1';
        less.onchange=function(){localStorage.setItem('cmd-sphere-less-motion',less.checked?'1':'0');applyPreferences()};
        big.onchange=function(){localStorage.setItem('cmd-sphere-bigger-type',big.checked?'1':'0');applyPreferences()};
      }
      if(key==='language'){var sel=view.querySelector('#cmdLanguageChoice');sel.value=localStorage.getItem('cmd-sphere-language')||'fr';sel.onchange=function(){var code=sel.value;localStorage.setItem('cmd-sphere-language',code);var original=document.querySelector('#cmd-sphere-language');if(original){original.value=code;original.dispatchEvent(new Event('change',{bubbles:true}))}else{localizeSettings()} }}
      if(key==='notifications'){var notif=view.querySelector('#cmdNotifState');notif.textContent=('Notification' in window)?('État : '+Notification.permission):'Notifications navigateur indisponibles sur cet appareil.'}
    }
    function status(s){var el=view.querySelector('#cmdSubStatus');if(el)el.textContent=String(s)}
    function applyPreferences(){
      document.body.classList.toggle('cmd-amoled',localStorage.getItem('cmd-sphere-appearance')==='amoled');
      document.body.classList.toggle('cmd-less-motion',localStorage.getItem('cmd-sphere-less-motion')==='1');
      document.body.classList.toggle('cmd-bigger-type',localStorage.getItem('cmd-sphere-bigger-type')==='1');
    }
    function open(){lastFocus=document.activeElement;draw();layer.classList.add('on');layer.setAttribute('aria-hidden','false');document.body.classList.add('cmd-settings-locked');close.focus()}
    function dismiss(){layer.classList.remove('on');layer.setAttribute('aria-hidden','true');document.body.classList.remove('cmd-settings-locked');if(lastFocus&&lastFocus.focus)lastFocus.focus()}
    function realButton(id){dismiss();var b=document.getElementById(id);if(b)b.click();else alert('Fonction indisponible pour cette session.')}
    function action(key){
      if(key==='profile')location.href='/profile';
      else if(key==='connections')location.href='/connections';
      else if(key==='shop')location.href='/shop';
      else if(key==='quests')location.href='/diamonds';
      else if(key==='diamonds')location.href='/diamonds/account';
      else if(key==='logout')location.href='/dashboard-logout';
      else if(key==='relink')location.href='/dashboard-login?link=1&next='+encodeURIComponent('/dashboard?sync=1');
      else if(key==='sync')realButton('syncDiscordBtn');
      else if(key==='folders')realButton('folderBtn');
      else if(key==='bots')realButton('botsBtn');
      else if(key==='webhooks')realButton('webhookBtn');
      else if(key==='backup')realButton('mirrorBtn');
      else detail(key);
    }
    function refreshApp(){
      status('Actualisation en cours…');
      (async function(){
        try{if('caches' in window){var keys=await caches.keys();await Promise.all(keys.map(function(k){return caches.delete(k)}))}
          if('serviceWorker' in navigator){var regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(function(r){return r.update().catch(function(){})}))}
        }catch(e){}
        location.reload();
      })();
    }
    async function subAction(which){
      if(['sync','folders','bots','webhooks','backup'].includes(which)){action(which);return}
      if(which==='diagnostics'){detail(which);return}
      if(which==='refresh'){refreshApp();return}
      if(which==='health'){status('Vérification…');try{var r=await fetch('/health',{cache:'no-store'});var d=await r.json();status(r.ok&&d.ok?'CMD Sphere répond correctement.':'Le serveur a retourné une erreur HTTP '+r.status)}catch(e){status('Serveur inaccessible : '+e.message)}return}
      if(which==='notif'){if(!('Notification' in window)){status('Notifications non prises en charge. Sur iPhone, ajoute CMD Sphere à l’écran d’accueil.');return}try{var p=await Notification.requestPermission();status('Autorisation : '+p+'. Active aussi les alertes dans les réglages de l’appareil.');var e=view.querySelector('#cmdNotifState');if(e)e.textContent='État : '+p}catch(e){status('Autorisation impossible : '+e.message)}return}
      if(which==='mic'){if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){status('Accès au microphone indisponible dans ce navigateur.');return}status('Demande d’autorisation microphone…');try{var stream=await navigator.mediaDevices.getUserMedia({audio:true});var count=stream.getAudioTracks().length;stream.getTracks().forEach(function(t){t.stop()});status(count?'Microphone accessible. Test d’autorisation réussi.':'Aucun microphone détecté.')}catch(e){status('Microphone non accessible : '+e.message)}}
    }
    layer.addEventListener('click',function(e){
      var sub=e.target.closest('[data-cmd-subaction]');if(sub){e.preventDefault();subAction(sub.dataset.cmdSubaction);return}
      var item=e.target.closest('[data-cmd-action]');if(item){e.preventDefault();action(item.dataset.cmdAction);return}
      if(e.target===layer)dismiss();
    });
    close.addEventListener('click',dismiss);
    back.addEventListener('click',draw);
    search.addEventListener('input',function(){
      var q=search.value.trim().toLocaleLowerCase('fr');
      view.querySelectorAll('.cmd-set-row').forEach(function(row){row.hidden=!!q&&!row.dataset.cmdFilter.includes(q)});
      view.querySelectorAll('.cmd-settings-category').forEach(function(g){g.hidden=!Array.from(g.querySelectorAll('.cmd-set-row')).some(function(r){return !r.hidden})});
      if(q&&!view.querySelector('.cmd-set-row:not([hidden])'))view.insertAdjacentHTML('beforeend','<p class="cmd-settings-empty" id="cmdSettingsNoResult">Aucun réglage trouvé.</p>');
      else view.querySelector('#cmdSettingsNoResult')?.remove();
    });
    layer.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();current==='home'?dismiss():draw()}});
    document.getElementById('cmdSettingsOpenTop').addEventListener('click',open);
    document.getElementById('cmdSettingsOpenDock')?.addEventListener('click',open);
    applyPreferences();
    draw();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
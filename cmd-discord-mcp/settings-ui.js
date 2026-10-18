(function(){
  'use strict';
  function init(){
    var app=document.querySelector('.sphere-app');
    if(!app||document.getElementById('cmdSettingsLayer'))return;
    var style=document.createElement('style');
    style.id='cmd-settings-style';
    style.textContent=[
      'body.cmd-settings-locked{overflow:hidden!important}',
      'body.cmd-settings-locked #cmd-sphere-tools{display:none!important}',
      '.cmd-settings-title-row{min-width:0}',
      '.cmd-settings-header h2{min-width:0;overflow-wrap:anywhere}',
      '.cmd-settings-local-language{flex:none;width:136px;min-width:108px;max-width:35vw;border:1px solid #666175;background:#19141f;color:white;border-radius:10px;padding:9px 6px;font-weight:700;font-size:13px;min-height:39px}',
      '.cmd-language-results{display:grid;gap:7px;max-height:48dvh;min-height:80px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:7px 4px;margin:10px 0 16px;border:1px solid #70608077;background:#0b0912;border-radius:16px}',
      '.cmd-language-more{border:1px solid #9b85d9;background:#24173a;color:#fff;border-radius:12px;font:inherit;font-weight:750;padding:14px;width:100%;min-height:46px}',
      '.cmd-language-alphabet{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;max-height:58dvh;overflow-y:auto;overscroll-behavior:contain;margin:12px 0 7px;padding:4px}',
      '.cmd-country-folder{border:1px solid #63518a;background:#191425;border-radius:14px;overflow:hidden}',
      '.cmd-country-folder summary{list-style:none;cursor:pointer;min-height:48px;display:flex;align-items:center;justify-content:space-between;padding:12px 15px;font-size:17px;font-weight:800;color:#f5edff}',
      '.cmd-country-folder summary::-webkit-details-marker{display:none}',
      '.cmd-country-folder summary:focus-visible{outline:2px solid #c3a9ff}',
      '.cmd-country-folder[open] summary{background:#322146;border-bottom:1px solid #665188}',
      '.cmd-country-folder-content{display:grid;gap:6px;padding:10px;max-height:44dvh;overflow-y:auto;overscroll-behavior:contain}',
      '.cmd-country-folder-content button{width:100%;min-height:46px;box-sizing:border-box}',
      '.cmd-country-divider{margin:10px 0 4px;padding:3px 0;color:#cabbef;font-weight:750}',
      '.cmd-country-controls{display:flex;flex-wrap:wrap;gap:9px;margin:10px 0}',
      '.cmd-country-controls button{min-height:44px;padding:10px 12px;border:1px solid #705694;background:#20172c;color:white;border-radius:10px;font-weight:700}',
      '.cmd-language-letter{border:1px solid #69518c;background:#1b1429;color:#efe6ff;border-radius:9px;min-width:0;min-height:43px;font:inherit;font-weight:800;padding:6px 2px;cursor:pointer}',
      '.cmd-language-letter[aria-pressed="true"]{border-color:#66d5fc;background:#32234e;box-shadow:0 0 0 1px #66d5fc66}',
      '.cmd-language-letter:focus-visible{outline:2px solid #fff;outline-offset:1px}',
      '.cmd-language-options{display:flex;flex-direction:column;gap:8px;margin:12px 0;color:#f3eeff}',
      '.cmd-language-custom{padding:8px 4px 16px}',
      '.cmd-language-custom summary{cursor:pointer;font-weight:650;color:#d9c9ff}',
      '.cmd-language-result{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;border:1px solid #62567580;border-radius:12px;background:linear-gradient(135deg,#242033,#17121f);padding:13px 14px;text-align:left;color:#f4f1ff;font-size:15px;font-weight:650;cursor:pointer;min-height:46px;overflow-wrap:anywhere}',
      '.cmd-language-result:hover,.cmd-language-result:focus-visible{outline:2px solid #ad8aff;outline-offset:1px}',
      '.cmd-language-result[aria-pressed="true"]{border-color:#73dbfa;background:linear-gradient(130deg,#262342,#161b33)}',
      '.cmd-language-code{font-size:12px;white-space:nowrap;color:#bcb2cf;flex:none}',
      '.cmd-language-selection{margin:8px 0 12px;padding:10px 12px;border-radius:11px;border:1px solid #7657ad55;background:#1e1731;font-size:14px}',
      '.cmd-language-results-empty{margin:10px 13px;color:#b5a9c8;font-size:14px}',
      '.cmd-settings-local-language{display:none!important}',
      '@media(max-width:520px){.cmd-settings-title-row{gap:8px!important}.cmd-settings-local-language{width:112px;max-width:36vw;font-size:12px;padding:7px 4px}.cmd-settings-back,.cmd-settings-close{width:30px;min-width:30px}}',
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
      '.cmd-settings-layer .cmd-set-row .cmd-set-label{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-auto-rows:auto!important;row-gap:4px!important;align-items:start!important;justify-content:start!important;flex:1 1 0!important;width:auto!important;min-width:0!important;max-width:100%!important;font-weight:560;line-height:1.3;overflow-wrap:anywhere}',
      '.cmd-settings-layer .cmd-set-row .cmd-set-name{display:block!important;position:static!important;grid-column:1!important;grid-row:auto!important;width:100%!important;max-width:100%!important;min-width:0!important;line-height:1.35!important;white-space:normal!important;overflow-wrap:anywhere}',
      '.cmd-settings-layer .cmd-set-row .cmd-set-sub{display:block!important;position:static!important;float:none!important;clear:both!important;grid-column:1!important;grid-row:auto!important;width:100%!important;min-width:0!important;max-width:100%!important;white-space:normal!important;font-size:12px;color:#a8a8b4;line-height:1.4!important;margin:0!important;padding:0!important;font-weight:400!important;overflow-wrap:anywhere}',
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
      +'<button type="button" class="cmd-settings-close" id="cmdSettingsClose" aria-label="Fermer">×</button><h2 id="cmdSettingsTitle">Paramètres</h2><select id="cmdSettingsLanguagePicker" class="cmd-settings-local-language" aria-label="Choisir la langue des paramètres"><option value="fr">🇫🇷 Français</option><option value="en">🇬🇧 English</option><option value="us">🇺🇸 English (US)</option><option value="es">🇪🇸 Español</option><option value="de">🇩🇪 Deutsch</option><option value="it">🇮🇹 Italiano</option><option value="ru">🇷🇺 Русский</option><option value="co">𓂆 Corsu</option><option value="ko">🇰🇷 한국어</option><option value="ja">🇯🇵 日本語</option><option value="zh">🇨🇳 中文</option></select></div>'
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
        ['Synchroniser mes serveurs liés','sync','sync',''],
        ['Reconnecter mon compte externe','link','relink',''],
        ['Dossiers de serveurs','folder','folders',''],
        ['Bots liés','bot','bots',''],
        ['Webhooks','link','webhooks',''],
        ['Sauvegarde des serveurs liés','save','backup','']
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
    var cmdSettingsLocales={"en":{"sections":"Account settings|Billing settings|App settings|CMD tools|Support|What's new|Account","rows":["Account|Content and social|Data and privacy|Devices|Authorized apps|Connections|Scan / invitations","Shop|Quests|CMD Premium|Server boosts|Rewards inventory|My diamonds","Voice and video|Appearance|Accessibility|Language|Notifications|App icon|Advanced","Sync linked servers|Reconnect external account|Server folders|Connected bots|Webhooks|Server backups","Help|Diagnostics","What's new in CMD Sphere","Log out"],"subs":"Profile, photo, banner|Messages and friends","title":"Settings","search":"Search","desc":"Manage this setting for your CMD Sphere account."},"es":{"sections":"Ajustes de la cuenta|Ajustes de facturación|Ajustes de la aplicación|Herramientas CMD|Ayuda|Novedades|Cuenta","rows":["Cuenta|Contenido y social|Datos y privacidad|Dispositivos|Aplicaciones autorizadas|Conexiones|Escanear / invitaciones","Tienda|Misiones|CMD Premium|Mejoras del servidor|Inventario de recompensas|Mis diamantes","Voz y vídeo|Apariencia|Accesibilidad|Idioma|Notificaciones|Icono de la aplicación|Avanzado","Sincronizar servidores vinculados|Reconectar cuenta externa|Carpetas de servidores|Bots conectados|Webhooks|Copias de seguridad","Ayuda|Diagnóstico","Novedades CMD Sphere","Cerrar sesión"],"subs":"Perfil, foto y banner|Mensajes y amigos","title":"Ajustes","search":"Buscar","desc":"Gestiona este ajuste en tu cuenta de CMD Sphere."},"de":{"sections":"Kontoeinstellungen|Abrechnung|App-Einstellungen|CMD-Werkzeuge|Hilfe|Neuigkeiten|Konto","rows":["Konto|Inhalte und Soziales|Daten und Datenschutz|Geräte|Autorisierte Apps|Verbindungen|Scannen / Einladungen","Shop|Quests|CMD Premium|Server-Boosts|Belohnungsinventar|Meine Diamanten","Sprache und Video|Darstellung|Barrierefreiheit|Sprache|Benachrichtigungen|App-Symbol|Erweitert","Verknüpfte Server synchronisieren|Externes Konto neu verbinden|Serverordner|Verbundene Bots|Webhooks|Server-Sicherung","Hilfe|Diagnose","CMD Sphere Neuigkeiten","Abmelden"],"subs":"Profil, Foto und Banner|Nachrichten und Freunde","title":"Einstellungen","search":"Suchen","desc":"Verwalte diese Einstellung in CMD Sphere."},"it":{"sections":"Impostazioni account|Fatturazione|Impostazioni app|Strumenti CMD|Assistenza|Novità|Account","rows":["Account|Contenuti e social|Dati e privacy|Dispositivi|App autorizzate|Connessioni|Scansione / inviti","Negozio|Missioni|CMD Premium|Boost server|Inventario ricompense|I miei diamanti","Voce e video|Aspetto|Accessibilità|Lingua|Notifiche|Icona app|Avanzate","Sincronizza i server collegati|Ricollega l’account esterno|Cartelle server|Bot collegati|Webhook|Backup server","Assistenza|Diagnostica","Novità CMD Sphere","Disconnetti"],"subs":"Profilo, foto e banner|Messaggi e amici","title":"Impostazioni","search":"Cerca","desc":"Gestisci questa impostazione nel tuo account CMD Sphere."},"ru":{"sections":"Настройки аккаунта|Платежи|Настройки приложения|Инструменты CMD|Поддержка|Новости|Аккаунт","rows":["Аккаунт|Контент и общение|Данные и приватность|Устройства|Разрешённые приложения|Подключения|Сканер / приглашения","Магазин|Задания|CMD Premium|Усиления сервера|Награды|Мои алмазы","Голос и видео|Внешний вид|Доступность|Язык|Уведомления|Значок приложения|Дополнительно","Синхронизировать связанные серверы|Повторно подключить внешний аккаунт|Папки серверов|Подключённые боты|Вебхуки|Резервные копии","Поддержка|Диагностика","Новости CMD Sphere","Выйти"],"subs":"Профиль, фото, баннер|Сообщения и друзья","title":"Настройки","search":"Поиск","desc":"Настройки вашего аккаунта CMD Sphere."},"ko":{"sections":"계정 설정|결제 설정|앱 설정|CMD 도구|지원|새로운 소식|계정","rows":["계정|콘텐츠 및 소셜|데이터와 개인정보|기기|승인된 앱|연결|스캔 / 초대","상점|퀘스트|CMD 프리미엄|서버 부스트|보상 보관함|내 다이아몬드","음성 및 영상|외관|접근성|언어|알림|앱 아이콘|고급","연결된 서버 동기화|외부 계정 다시 연결|서버 폴더|연결된 봇|웹훅|서버 백업","지원|진단","CMD Sphere 새로운 소식","로그아웃"],"subs":"프로필, 사진, 배너|메시지 및 친구","title":"설정","search":"검색","desc":"CMD Sphere 계정의 이 설정을 관리합니다."},"ja":{"sections":"アカウント設定|請求設定|アプリ設定|CMDツール|サポート|新着情報|アカウント","rows":["アカウント|コンテンツと交流|データとプライバシー|デバイス|認証済みアプリ|接続|スキャン / 招待","ショップ|クエスト|CMDプレミアム|サーバーブースト|報酬インベントリ|ダイヤモンド","音声・ビデオ|外観|アクセシビリティ|言語|通知|アプリアイコン|詳細設定","連携サーバーを同期|外部アカウントを再接続|サーバーフォルダー|連携ボット|ウェブフック|サーバーのバックアップ","サポート|診断","CMD Sphereの新機能","ログアウト"],"subs":"プロフィール、写真、バナー|メッセージとフレンド","title":"設定","search":"検索","desc":"CMD Sphereアカウントの設定を管理します。"},"zh":{"sections":"账户设置|账单设置|应用设置|CMD 工具|支持|新功能|账户","rows":["账户|内容与社交|数据与隐私|设备|已授权应用|连接|扫码 / 邀请","商店|任务|CMD 会员|服务器加成|奖励背包|我的钻石","语音与视频|外观|辅助功能|语言|通知|应用图标|高级","同步已连接的服务器|重新连接外部账号|服务器文件夹|已连接的机器人|Webhook|服务器备份","帮助|诊断","CMD Sphere 新功能","退出登录"],"subs":"个人资料、照片、横幅|消息和好友","title":"设置","search":"搜索","desc":"管理 CMD Sphere 账户中的此项设置。"},"co":{"sections":"Paràmetri di u contu|Fatturazione|Paràmetri di l'app|Arnesi CMD|Assistenza|Novità|Contu","rows":["Contu|Cuntenutu è suciale|Dati è riservatezza|Apparechji|Applicazioni auturizate|Cunnessioni|Scannà / inviti","Buttega|Missioni|CMD Premium|Boost di servore|Ricumpense|I mo diamanti","Voce è video|Aspettu|Accessibilità|Lingua|Nutificazioni|Icona di l'app|Avanzatu","Sincrunizà i servori ligati|Ricunnette u contu esternu|Cartulari di servori|Bot cunnessi|Webhooks|Salvaguardia di servori","Assistenza|Diagnostichi","Novità CMD Sphere","Scunnettassi"],"subs":"Prufilu, fotò è bandera|Missaghji è amichi","title":"Paràmetri","search":"Circà","desc":"Gestisci stu paràmetru di u contu CMD Sphere."}};
    var cmdSettingsNativeNames={fr:'Français',en:'English',us:'English (US)',de:'Deutsch',es:'Español',it:'Italiano',ru:'Русский',ko:'한국어',ja:'日本語',zh:'中文',co:'Corsu',
      'gsw-CH':'Schwiizertüütsch / Suisse allemand','de-CH':'Schweizer Hochdeutsch'};
    var languageCatalogue=[],languageCataloguePromise=null,settingsChosenLanguage='';
    function validLocaleCode(v){return /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,5}(?:-x(?:-[a-z0-9]{1,8}){1,5})?$/i.test(String(v||''))&&String(v).length<=64}
    function nativeLanguageLabel(code){
      if(cmdSettingsNativeNames[code])return cmdSettingsNativeNames[code];
      var found=languageCatalogue.find(function(entry){return entry[0]===code});
      return found?found[1]+' ('+code+')':code;
    }
    function ensureLanguageOption(select,code){
      if(!select||!validLocaleCode(code))return;
      if(!Array.from(select.options).some(function(option){return option.value===code})){
        var option=document.createElement('option');option.value=code;option.textContent=nativeLanguageLabel(code);select.add(option);
      }
      select.value=code;
    }
    function activeSettingsLanguage(){
      var selected=settingsChosenLanguage;
      try{selected=selected||localStorage.getItem('cmd-sphere-language')||document.querySelector('#cmd-sphere-language')?.value||'fr'}catch(e){}
      return validLocaleCode(selected)?selected:'fr';
    }
    function settingsLocale(){
      var selected=activeSettingsLanguage();
      if(selected==='us')selected='en';
      var base=selected.split('-')[0].toLowerCase();
      if(base==='gsw')base='de';
      if(base==='fr')return null; // French is the original interface: do not replace it with English.
      return cmdSettingsLocales[selected]||cmdSettingsLocales[base]||cmdSettingsLocales.en||null;
    }
    function loadLanguageCatalogue(){
      if(languageCataloguePromise)return languageCataloguePromise;
      languageCataloguePromise=fetch('/cmd-language-catalog.json',{credentials:'same-origin'})
        .then(function(response){if(!response.ok)throw Error('HTTP '+response.status);return response.json()})
        .then(function(payload){
          if(!payload||!Array.isArray(payload.languages)||payload.languages.length<7000)throw Error('Catalogue incomplet');
          languageCatalogue=payload.languages.filter(function(entry){return Array.isArray(entry)&&validLocaleCode(entry[0])&&typeof entry[1]==='string'});
          ensureLanguageOption(layer.querySelector('#cmdSettingsLanguagePicker'),activeSettingsLanguage());
          return languageCatalogue;
        }).catch(function(error){languageCataloguePromise=null;throw error});
      return languageCataloguePromise;
    }
    function localizeSettings(){
      var L=settingsLocale(),language=activeSettingsLanguage();
      var picker=layer.querySelector('#cmdSettingsLanguagePicker');if(picker){ensureLanguageOption(picker,language);picker.hidden=current==='language'}
      title.textContent=L?L.title:'Paramètres';
      search.placeholder=L?L.search:'Rechercher';
      var groupsEls=view.querySelectorAll('.cmd-settings-category');
      groupsEls.forEach(function(section,index){
        var h=section.querySelector('h3'),g=groups[index];if(!g)return;
        if(h)h.textContent=L?L.sections.split('|')[index]:g.label;
        var labels=L?L.rows[index].split('|'):null;
        section.querySelectorAll('.cmd-set-row').forEach(function(row,j){
          var orig=g.rows[j],label=row.querySelector('.cmd-set-label');if(!orig||!label)return;
          var nameNode=label.querySelector('.cmd-set-name');
          var translated=labels?labels[j]:orig[0];
          if(nameNode)nameNode.textContent=translated;
          var sub=label.querySelector('.cmd-set-sub');
          if(sub)sub.textContent=L?L.subs.split('|')[orig[2]==='profile'?0:1]:orig[3];
          row.dataset.cmdFilter=(translated+' '+(h?h.textContent:'')+' '+orig[0]+' '+g.label).toLocaleLowerCase();
        });
      });
      var currentLang=view.querySelector('#cmdCurrentLanguage');if(currentLang)currentLang.textContent=nativeLanguageLabel(language);
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
    // Keep settings synchronized even when language changes outside this panel.
    var lastAppliedLanguage='';
    function syncSettingsLanguage(chosen){
      var code=typeof chosen==='string'?chosen:'';
      if(!code){try{code=localStorage.getItem('cmd-sphere-language')||document.querySelector('#cmd-sphere-language')?.value||'fr'}catch(e){code='fr'}}
      if(!validLocaleCode(code))code='fr';
      settingsChosenLanguage=code;
      ensureLanguageOption(layer.querySelector('#cmdSettingsLanguagePicker'),code);
      if(code===lastAppliedLanguage&&view.querySelector('.cmd-settings-category')?.dataset.cmdLang===code)return;
      lastAppliedLanguage=code;
      localizeSettings();
      view.querySelectorAll('.cmd-settings-category').forEach(function(section){section.dataset.cmdLang=code});
    }
    function applySettingsLanguage(code){
      if(!validLocaleCode(code)){status('Code de langue invalide. Utilise le format BCP 47.');return}
      settingsChosenLanguage=code;lastAppliedLanguage='';
      try{var applied=window.CMDSphereLocale?.manual(code);if(applied)code=applied;else{localStorage.setItem('cmd-sphere-language',code);localStorage.setItem('cmd-sphere-language-mode','manual')}}catch(e){}
      var globalPicker=document.querySelector('#cmd-sphere-language');
      if(globalPicker){ensureLanguageOption(globalPicker,code);
        globalPicker.dispatchEvent(new Event('input',{bubbles:true}));
        globalPicker.dispatchEvent(new Event('change',{bubbles:true}))}
      syncSettingsLanguage(code);
      window.dispatchEvent(new CustomEvent('cmd-sphere-language-change',{detail:{language:code}}));
      status('Langue enregistrée : '+nativeLanguageLabel(code)+'. Traductions de menus limitées aux langues disponibles.');
    }
    layer.querySelector('#cmdSettingsLanguagePicker').addEventListener('change',function(e){
      applySettingsLanguage(e.target.value);
    });
    document.addEventListener('input',function(e){
      if(e.target&&e.target.id==='cmd-sphere-language')syncSettingsLanguage(e.target.value);
    });
    document.addEventListener('change',function(e){
      if(e.target&&e.target.id==='cmd-sphere-language')syncSettingsLanguage(e.target.value);
    });
    window.addEventListener('cmd-sphere-language-applied',function(){settingsChosenLanguage='';syncSettingsLanguage()});
    window.addEventListener('storage',function(e){if(e.key==='cmd-sphere-language'){settingsChosenLanguage='';syncSettingsLanguage(e.newValue||'fr')}});

    function draw(){
      current='home';title.textContent='Paramètres';back.hidden=true;layer.querySelector('#cmdSettingsSearchWrap').hidden=false;
      view.innerHTML=groups.map(function(g){
        return '<section class="cmd-settings-category"><h3>'+esc(g.label)+'</h3><div class="cmd-settings-group">'+g.rows.map(function(r){
          return '<button type="button" class="cmd-set-row'+(r[2]==='logout'?' cmd-set-danger':'')+'" data-cmd-action="'+esc(r[2])+'" data-cmd-filter="'+esc((r[0]+' '+g.label).toLowerCase())+'">'+glyph(r[1])+'<span class="cmd-set-label"><span class="cmd-set-name">'+esc(r[0])+'</span>'+(r[3]?'<span class="cmd-set-sub">'+esc(r[3])+'</span>':'')+'</span>'+(r[2]==='language'?'<span class="cmd-set-value" id="cmdCurrentLanguage">Français</span>':'')+'<span class="cmd-set-chevron">›</span></button>';
        }).join('')+'</div></section>';
      }).join('');
      search.value='';view.scrollTop=0;localizeSettings();
    }
    var pages={
      social:["Contenu et social","Accède à tes messages privés et gère les conversations et relations de CMD Sphere.",'<a class="cmd-set-cta" href="/messages">Ouvrir les messages</a>'],
      privacy:["Données et confidentialité","Gère tes informations CMD Sphere sans toucher aux serveurs externes.",'<a class="cmd-set-cta" href="/connections">Gérer mes connexions</a><a class="cmd-set-cta secondary" href="/profile">Paramètres de mon profil</a><button type="button" class="cmd-set-cta secondary" data-cmd-subaction="export-data">Exporter une copie de mes données (JSON)</button><p class="cmd-small">Export partiel : 500 éléments maximum par catégorie. Les pièces jointes, achats et archives complètes ne sont pas encore inclus.</p><p id="cmdSubStatus" class="cmd-status" role="status"></p>'],
      device:["Appareils","Informations concernant cet appareil et ta session CMD Sphere.",'<p id="cmdDeviceText" class="cmd-small"></p>'],
      invites:["Scanner / invitations","La création et la réception des invitations CMD Sphere se font depuis les serveurs.",'<a class="cmd-set-cta" href="/servers/add">Créer ou rejoindre un serveur</a>'],
      premium:["CMD Premium","Personnalisations, abonnements et avantages proposés par CMD Sphere.",'<a class="cmd-set-cta" href="/shop">Voir les offres CMD Premium</a>'],
      boost:["Boost de serveur","Retrouve les options de boost pour les serveurs CMD Sphere.",'<a class="cmd-set-cta" href="/shop">Accéder aux boosts</a>'],
      inventory:["Inventaire de récompenses","Retrouve la boutique et tes objets débloqués depuis le profil.",'<a class="cmd-set-cta" href="/shop">Boutique</a><a class="cmd-set-cta secondary" href="/profile">Mon profil</a>'],
      voice:["Voix & Vidéo","Vérifie l'accès au microphone sur cet appareil. Les appels passent par la fonction d'appel CMD Sphere.",'<button type="button" class="cmd-set-cta" data-cmd-subaction="mic">Tester le microphone</button><a class="cmd-set-cta secondary" href="/messages">Accéder aux appels et MP</a><p class="cmd-status" id="cmdSubStatus"></p>'],
      appearance:["Apparence","Personnalise l'affichage de CMD Sphere sur cet appareil.",'<label for="cmdThemeChoice">Thème</label><select id="cmdThemeChoice"><option value="dark">Sombre</option><option value="amoled">Noir AMOLED</option></select>'],
      accessibility:["Accessibilité","Réglages de confort visuel sur cet appareil.",'<label class="cmd-setting-toggle"><input id="cmdLessMotion" type="checkbox"> Réduire les animations</label><label class="cmd-setting-toggle"><input id="cmdBiggerType" type="checkbox"> Agrandir le texte</label>'],
      language:["Langue","Langue automatique ou choix personnel : tous les pays et dialectes disponibles dans la recherche.",'<label class="cmd-setting-toggle cmd-language-options"><input id="cmdLanguageAutomatic" type="checkbox"> 🌍 Détecter automatiquement la langue de mon appareil</label><p class="cmd-small" id="cmdLanguageAutoInfo">La région et la langue de l’appareil sont prises en compte. Aucun accès GPS requis.</p><label for="cmdLanguageSearch">Rechercher langue, patois, dialecte ou code</label><input id="cmdLanguageSearch" type="search" placeholder="Rechercher un pays, une langue ou un dialecte…" autocomplete="off" style="width:100%;min-height:43px;margin:10px 0"><p id="cmdLanguageSelected" class="cmd-language-selection" aria-live="polite">Langue actuelle : Français</p><label id="cmdLanguageAlphabetLabel">Pays classés par lettre : ouvre A, B, C… Z</label><div id="cmdLanguageAlphabet" class="cmd-language-alphabet" role="group" aria-labelledby="cmdLanguageAlphabetLabel"></div><div class="cmd-country-controls"><button type="button" id="cmdCountryBack" hidden>‹ Retour aux pays</button><button type="button" id="cmdShowAllLanguages">🌐 Voir les langues (A–Z)</button></div><label id="cmdLanguageResultsLabel">Ouvre A pour les pays en A, B pour les pays en B. Puis choisis la langue.</label><div id="cmdLanguageChoice" class="cmd-language-results" role="group" aria-labelledby="cmdLanguageResultsLabel"></div><details class="cmd-language-custom"><summary>Autres dialectes : saisir un code personnalisé (facultatif)</summary><label for="cmdLanguageCustomCode">Code régional BCP 47</label><input id="cmdLanguageCustomCode" type="text" maxlength="64" placeholder="Ex. gsw-CH-x-bern" style="width:100%;min-height:42px"><button type="button" data-cmd-subaction="custom-language" class="cmd-set-cta secondary">Utiliser ce code de langue</button></details><p class="cmd-small" id="cmdLanguageSupportNotice">Catalogue mondial en chargement. Les langues régionales et variantes sont enregistrées dans tes préférences. La traduction intégrale de tous les menus et les messages dans tous les dialectes dépend de traductions disponibles ; les menus peuvent utiliser une langue de secours.</p><label class="cmd-setting-toggle"><input id="cmdAutoTranslate" type="checkbox" checked> 🌐 Traduction automatique des messages</label><p class="cmd-small">Les fournisseurs gratuits de traduction ne couvrent pas toutes les langues et tous les patois. Le texte original reste visible.</p><p id="cmdSubStatus" class="cmd-status" role="status"></p>'],
      notifications:["Notifications","Active les notifications de messages et d'appels sur cet appareil. L'autorisation système ne garantit pas à elle seule les alertes lorsque le navigateur est fermé.",'<p id="cmdNotifState" class="cmd-small"></p><button type="button" class="cmd-set-cta" data-cmd-subaction="notif">Autoriser les notifications</button><a class="cmd-set-cta secondary" href="/messages">Messages et appels</a><p id="cmdSubStatus" class="cmd-status"></p>'],
      appicon:["Icône de l'appli","Installe CMD Sphere depuis le menu de ton navigateur : « Ajouter à l'écran d'accueil » sur iPhone ou « Installer l'application » sur les navigateurs compatibles.",'<a class="cmd-set-cta secondary" href="/dashboard">Revenir à CMD Sphere</a>'],
      advanced:["Avancés","Outils d'administration CMD Sphere. Les actions utilisent tes autorisations actuelles.",'<button type="button" class="cmd-set-cta" data-cmd-subaction="sync">Synchroniser mes serveurs liés</button><button type="button" class="cmd-set-cta secondary" data-cmd-subaction="folders">Dossiers de serveurs</button><button type="button" class="cmd-set-cta secondary" data-cmd-subaction="bots">Bots liés</button><button type="button" class="cmd-set-cta secondary" data-cmd-subaction="webhooks">Webhooks</button><button type="button" class="cmd-set-cta secondary" data-cmd-subaction="backup">Sauvegarde des serveurs liés</button><a class="cmd-set-cta secondary" href="/dashboard-login?link=1&amp;next=%2Fdashboard%3Fsync%3D1">Reconnecter mon compte externe</a>'],
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
      if(key==='language'){
        var results=view.querySelector('#cmdLanguageChoice'),searchInput=view.querySelector('#cmdLanguageSearch');
        var label=view.querySelector('#cmdLanguageResultsLabel'),alphabet=view.querySelector('#cmdLanguageAlphabet');
        var backCountry=view.querySelector('#cmdCountryBack'),allLanguagesButton=view.querySelector('#cmdShowAllLanguages');
        var countryCatalogue=[],countryCataloguePromise=null,chosenCountry=null,allLanguages=true;
        function loadCountryCatalogue(){
          if(countryCataloguePromise)return countryCataloguePromise;
          countryCataloguePromise=fetch('/cmd-country-language-catalog.json',{credentials:'same-origin'})
            .then(function(response){if(!response.ok)throw Error('HTTP '+response.status);return response.json()})
            .then(function(data){
              if(!data||!Array.isArray(data.countries)||data.countries.length<200)throw Error('Liste des pays incomplète');
              countryCatalogue=data.countries.filter(function(item){
                return /^[A-Z]{2}$/.test(item.code)&&typeof item.name==='string'&&Array.isArray(item.languages);
              });
              return countryCatalogue;
            }).catch(function(error){countryCataloguePromise=null;throw error});
          return countryCataloguePromise;
        }
        var alphabetLetters=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','#'];
        var activeLetter='A';
        function updateLetters(){renderCountryFolders()}
        function renderCountryFolders(){
          var visible=!chosenCountry&&!searchInput.value.trim();
          alphabet.hidden=!visible;
          if(!visible)return;
          alphabet.replaceChildren();
          if(allLanguages){
            // Render 27 real language folders. Language rows load when opened
            // in small batches, so the iPhone never creates 8,148 buttons at once.
            var letterGroups=new Map(alphabetLetters.map(function(letter){return [letter,[]]}));
            languageCatalogue.forEach(function(entry){
              var initial=normalizeLanguageQuery(entry[1]).replace(/^[^a-z0-9]+/i,'').charAt(0).toUpperCase();
              var letter=/^[A-Z]$/.test(initial)?initial:'#';
              letterGroups.get(letter).push(entry);
            });
            for(var letter of alphabetLetters){
              var items=letterGroups.get(letter);
              if(!items.length)continue;
              var folder=document.createElement('details');
              folder.className='cmd-country-folder cmd-language-folder';
              folder.dataset.cmdLetter=letter;
              folder._cmdEntries=items;folder._cmdOffset=0;
              var header=document.createElement('summary');
              header.textContent=letter+' · '+items.length.toLocaleString('fr-FR')+' langues';
              header.setAttribute('aria-label','Ouvrir toutes les langues commençant par '+letter);
              var inside=document.createElement('div');inside.className='cmd-country-folder-content';
              folder.append(header,inside);
              folder.addEventListener('toggle',function(){
                if(this.open&&this._cmdOffset===0)appendLanguageFolder(this);
              });
              alphabet.append(folder);
            }
            return;
          }
          for(var letter of alphabetLetters){
            var matching=countryCatalogue.filter(function(country){
              var initial=normalizeLanguageQuery(country.name).charAt(0).toUpperCase();
              return letter==='#'?!/^[A-Z]$/.test(initial):initial===letter;
            });
            if(!matching.length)continue;
            var folder=document.createElement('details');folder.className='cmd-country-folder';
            folder.dataset.cmdLetter=letter;
            var header=document.createElement('summary');
            header.textContent=letter+' · '+matching.length+' pays';
            header.setAttribute('aria-label','Ouvrir les pays commençant par '+letter);
            folder.append(header);
            var inside=document.createElement('div');inside.className='cmd-country-folder-content';
            for(var country of matching){
              var button=document.createElement('button');button.type='button';
              button.className='cmd-language-result cmd-country-item';
              button.dataset.cmdCountry=country.code;
              var name=document.createElement('span');name.textContent=country.name;
              var count=document.createElement('span');count.className='cmd-language-code';
              count.textContent=country.languages.length+' langues ›';
              button.append(name,count);inside.append(button);
            }
            folder.append(inside);alphabet.append(folder);
          }
          if(!countryCatalogue.length){
            var loading=document.createElement('p');loading.textContent='Chargement des pays et territoires…';
            alphabet.append(loading);
          }
        }
        function appendLanguageFolder(folder){
          var inside=folder.querySelector('.cmd-country-folder-content');
          if(!inside||!folder._cmdEntries)return;
          inside.querySelector('[data-cmd-folder-more]')?.remove();
          var items=folder._cmdEntries,stop=Math.min(items.length,folder._cmdOffset+75);
          for(var index=folder._cmdOffset;index<stop;index++){
            var entry=items[index],button=document.createElement('button');
            button.type='button';button.className='cmd-language-result';
            button.dataset.cmdLocale=entry[0];
            button.setAttribute('aria-pressed',String(activeSettingsLanguage()===entry[0]));
            var name=document.createElement('span');name.textContent=entry[1];
            var code=document.createElement('span');code.className='cmd-language-code';
            code.textContent=entry[0];button.append(name,code);inside.append(button);
          }
          folder._cmdOffset=stop;
          if(stop<items.length){
            var more=document.createElement('button');more.type='button';
            more.className='cmd-language-more';more.dataset.cmdFolderMore='1';
            more.textContent='Afficher la suite · '+stop.toLocaleString('fr-FR')+
              ' / '+items.length.toLocaleString('fr-FR');
            inside.append(more);
          }
        }
        alphabet.addEventListener('click',function(event){
          var more=event.target.closest('button[data-cmd-folder-more]');
          if(more&&alphabet.contains(more)){
            appendLanguageFolder(more.closest('details'));return;
          }
          var selected=event.target.closest('button[data-cmd-locale]');
          if(selected&&alphabet.contains(selected)){
            applySettingsLanguage(selected.dataset.cmdLocale);
            updateAutomaticUi();refreshCountryList('');return;
          }
          var button=event.target.closest('button[data-cmd-country]');
          if(!button||!alphabet.contains(button))return;
          chosenCountry=countryCatalogue.find(function(country){return country.code===button.dataset.cmdCountry})||null;
          searchInput.value='';allLanguages=false;refreshCountryList('');
        });
        var favourites=['fr','en','de','es','it','co','gsw-CH','gsw-CH-x-bern','gsw-CH-x-zueri','gsw-CH-x-basel','gsw-CH-x-wallis','gsw-CH-x-luzern','fr-CH','de-CH','pt','ar','ja','zh'];
        function normalizeLanguageQuery(value){
          return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
        }
        var matchedLanguages=[],loadedLanguages=0,pageSize=75;
        function addLanguageRow(entry,chosen){
          var item=document.createElement('button');item.type='button';item.className='cmd-language-result';
          item.dataset.cmdLocale=entry[0];item.setAttribute('aria-pressed',String(chosen===entry[0]));
          var name=document.createElement('span');name.textContent=entry[1];
          var code=document.createElement('span');code.className='cmd-language-code';
          code.textContent=(chosen===entry[0]?'✓ ':'')+entry[0];
          item.append(name,code);results.append(item);
        }
        function appendLanguages(){
          results.querySelector('[data-cmd-more]')?.remove();
          var chosen=activeSettingsLanguage(),end=Math.min(matchedLanguages.length,loadedLanguages+pageSize);
          for(var n=loadedLanguages;n<end;n++)addLanguageRow(matchedLanguages[n],chosen);
          loadedLanguages=end;
          if(loadedLanguages<matchedLanguages.length){
            var more=document.createElement('button');more.type='button';more.className='cmd-language-more';
            more.dataset.cmdMore='1';
            more.textContent='Afficher la suite · '+loadedLanguages.toLocaleString('fr-FR')+
              ' / '+matchedLanguages.length.toLocaleString('fr-FR');
            results.append(more);
          }
          label.textContent=(activeLetter&&!searchInput.value.trim()?'Langues en '+activeLetter+' : ':'Langues disponibles : ')+matchedLanguages.length.toLocaleString('fr-FR')+
            ' · '+loadedLanguages.toLocaleString('fr-FR')+' affichées';
        }
        function listMatches(term){
          var query=normalizeLanguageQuery(term).trim(),chosen=activeSettingsLanguage(),seen=new Set(),out=[];
          var indexed=new Map(languageCatalogue);
          function push(code,name){
            if(!code||seen.has(code))return;
            seen.add(code);out.push([code,name||nativeLanguageLabel(code)]);
          }
          // Show current language, then suggestions; everything else remains accessible.
          if(!query&&activeLetter){
            languageCatalogue.forEach(function(entry){
              var initial=normalizeLanguageQuery(entry[1]).replace(/^[^a-z0-9]+/i,'').charAt(0).toUpperCase();
              if(activeLetter==='#'?!/^[A-Z]$/.test(initial):initial===activeLetter)push(entry[0],entry[1]);
            });
          }else if(!query){
            push(chosen,indexed.get(chosen)||nativeLanguageLabel(chosen));
            favourites.forEach(function(code){push(code,indexed.get(code)||cmdSettingsNativeNames[code]||code)});
            languageCatalogue.forEach(function(entry){push(entry[0],entry[1])});
          }else{
            languageCatalogue.forEach(function(entry){
              var code=normalizeLanguageQuery(entry[0]),name=normalizeLanguageQuery(entry[1]);
              if(code===query||name===query||code.startsWith(query)||name.startsWith(query))push(entry[0],entry[1]);
            });
            languageCatalogue.forEach(function(entry){
              if(normalizeLanguageQuery(entry[0]+' '+entry[1]).includes(query))push(entry[0],entry[1]);
            });
          }
          matchedLanguages=out;loadedLanguages=0;results.replaceChildren();results.scrollTop=0;
          if(!out.length){
            var empty=document.createElement('p');empty.className='cmd-language-results-empty';
            empty.textContent=languageCatalogue.length
              ?'Aucune langue trouvée. Essaie un autre nom ou une autre orthographe.'
              :'Chargement du catalogue mondial…';
            results.append(empty);
          }else appendLanguages();
          var currentLabel=view.querySelector('#cmdLanguageSelected');
          if(currentLabel)currentLabel.textContent='Langue actuelle : '+nativeLanguageLabel(chosen);
          var notice=view.querySelector('#cmdLanguageSupportNotice');
          if(notice)notice.textContent=languageCatalogue.length.toLocaleString('fr-FR')+
            ' langues et variantes accessibles. Utilise la recherche ou « Afficher la suite ». '+
            'Si une traduction manque, une langue de secours est utilisée.';
        }
        function listCountries(term){
          var query=normalizeLanguageQuery(term).trim();
          results.replaceChildren();results.scrollTop=0;loadedLanguages=0;matchedLanguages=[];
          var countries=countryCatalogue.filter(function(country){
            if(query)return normalizeLanguageQuery(country.name+' '+country.code).includes(query);
            var initial=normalizeLanguageQuery(country.name).charAt(0).toUpperCase();
            return !activeLetter||(activeLetter==='#'?!/^[A-Z]$/.test(initial):initial===activeLetter);
          });
          for(var country of countries){
            var button=document.createElement('button');
            button.type='button';button.className='cmd-language-result cmd-country-item';
            button.dataset.cmdCountry=country.code;
            var name=document.createElement('span');name.textContent=country.name;
            var meta=document.createElement('span');meta.className='cmd-language-code';
            meta.textContent=country.languages.length+' langues ›';
            button.append(name,meta);results.append(button);
          }
          if(!countries.length){
            var empty=document.createElement('p');empty.className='cmd-language-results-empty';
            empty.textContent=countryCatalogue.length?'Aucun pays trouvé pour cette lettre.':'Chargement des pays…';
            results.append(empty);
          }
          label.textContent='Pays '+(activeLetter||'du monde')+' : '+countries.length+
            ' · Choisis un pays pour voir ses langues et dialectes';
          var notice=view.querySelector('#cmdLanguageSupportNotice');
          if(notice)notice.textContent=countryCatalogue.length+' pays et territoires. Les 8 148 langues restent accessibles par le bouton « Toutes les langues » et la recherche. Les langues proposées par pays ne sont pas toutes traduites.';
          var selected=view.querySelector('#cmdLanguageSelected');
          if(selected)selected.textContent='Langue actuelle : '+nativeLanguageLabel(activeSettingsLanguage());
        }
        function listCountryLanguages(country){
          results.replaceChildren();results.scrollTop=0;loadedLanguages=0;
          var byCode=new Map(languageCatalogue);
          matchedLanguages=country.languages.filter(function(code){return byCode.has(code)})
            .map(function(code){return [code,byCode.get(code)]});
          var info=document.createElement('p');info.className='cmd-country-divider';
          info.textContent='Langues et dialectes associés à '+country.name+' ('+country.code+')';
          results.append(info);
          if(matchedLanguages.length)appendLanguages();
          else{
            var missing=document.createElement('p');missing.className='cmd-language-results-empty';
            missing.textContent='Aucune langue répertoriée pour ce pays. Utilise « Toutes les langues ».';
            results.append(missing);
          }
          label.textContent=country.name+' — choisis une langue ou un dialecte';
          var notice=view.querySelector('#cmdLanguageSupportNotice');
          if(notice)notice.textContent='Les langues de '+country.name+' proviennent du catalogue CLDR. Le pays ne détermine pas à lui seul la langue de chacun : le choix est personnel. La traduction de toutes les variantes n’est pas garantie.';
          var selected=view.querySelector('#cmdLanguageSelected');
          if(selected)selected.textContent='Langue actuelle : '+nativeLanguageLabel(activeSettingsLanguage());
        }
        function refreshCountryList(term){
          var query=String(term||'').trim();
          backCountry.hidden=!chosenCountry;
          allLanguagesButton.textContent=allLanguages?'🌍 Rechercher par pays':'🔤 Revenir aux langues (A–Z)';
          allLanguagesButton.setAttribute('aria-pressed',String(allLanguages));
          var alphabetLabel=view.querySelector('#cmdLanguageAlphabetLabel');
          if(alphabetLabel)alphabetLabel.textContent=allLanguages
            ?'Toutes les langues par lettre : ouvre A, B, C… jusqu’à Z'
            :'Tous les pays par lettre : ouvre A, B, C… jusqu’à Z';
          renderCountryFolders();
          if(!chosenCountry&&!query){
            results.hidden=true;
            label.textContent=allLanguages
              ?'Ouvre le dossier A pour toutes les langues en A, B pour celles en B, etc.'
              :'Ouvre un dossier A, B, C… puis sélectionne ton pays';
            var note=view.querySelector('#cmdLanguageSupportNotice');
            if(note)note.textContent=allLanguages
              ?'8 148 langues classées dans les dossiers A à Z. Ouvre une lettre pour voir toutes ses langues, puis « Afficher la suite » si nécessaire.'
              :'249 pays et territoires classés de A à Z. Choisis ton pays pour afficher ses langues et dialectes.';
            return;
          }
          results.hidden=false;
          if(allLanguages){listMatches(query);return}
          if(chosenCountry&&!query){listCountryLanguages(chosenCountry);return}
          if(query){
            var found=countryCatalogue.some(function(country){
              return normalizeLanguageQuery(country.name+' '+country.code).includes(normalizeLanguageQuery(query));
            });
            if(!found&&languageCatalogue.length){listMatches(query);return}
          }
          listCountries(query);
        }
        backCountry.addEventListener('click',function(){
          chosenCountry=null;searchInput.value='';refreshCountryList('');
        });
        allLanguagesButton.addEventListener('click',function(){
          allLanguages=!allLanguages;chosenCountry=null;searchInput.value='';
          activeLetter='A';
          updateLetters();refreshCountryList('');
        });
        var automatic=view.querySelector('#cmdLanguageAutomatic'),automaticInfo=view.querySelector('#cmdLanguageAutoInfo');
        function updateAutomaticUi(){
          var pref=window.CMDSphereLocale?.current();
          var mode=pref?.mode||localStorage.getItem('cmd-sphere-language-mode')||'manual';
          automatic.checked=mode==='auto';
          automaticInfo.textContent=automatic.checked
            ?'Langue détectée : '+nativeLanguageLabel(pref?.code||activeSettingsLanguage())+
              '. Elle suit les préférences régionales et linguistiques du téléphone ou de l’ordinateur.'
            :'Langue choisie personnellement : elle ne sera pas modifiée automatiquement.';
        }
        automatic.addEventListener('change',function(){
          if(automatic.checked){
            var autoCode=window.CMDSphereLocale?.automatic()||activeSettingsLanguage();
            settingsChosenLanguage=autoCode;lastAppliedLanguage='';
            var globalPicker=document.querySelector('#cmd-sphere-language');
            if(globalPicker){ensureLanguageOption(globalPicker,autoCode);globalPicker.dispatchEvent(new Event('change',{bubbles:true}))}
            syncSettingsLanguage(autoCode);
            window.dispatchEvent(new CustomEvent('cmd-sphere-language-change',{detail:{language:autoCode,mode:'auto'}}));
          }else{
            var currentCode=activeSettingsLanguage();
            window.CMDSphereLocale?.manual(currentCode);
            try{localStorage.setItem('cmd-sphere-language-mode','manual')}catch(e){}
          }
          updateAutomaticUi();refreshCountryList(searchInput.value);
        });
        updateAutomaticUi();
        refreshCountryList('');
        searchInput.addEventListener('input',function(){
          chosenCountry=null;
          refreshCountryList(searchInput.value);
        });
        results.addEventListener('click',function(event){
          var more=event.target.closest('button[data-cmd-more]');
          if(more&&results.contains(more)){appendLanguages();return}
          var countryButton=event.target.closest('button[data-cmd-country]');
          if(countryButton&&results.contains(countryButton)){
            chosenCountry=countryCatalogue.find(function(country){return country.code===countryButton.dataset.cmdCountry})||null;
            allLanguages=false;searchInput.value='';refreshCountryList('');
            return;
          }
          var button=event.target.closest('button[data-cmd-locale]');
          if(!button||!results.contains(button))return;
          applySettingsLanguage(button.dataset.cmdLocale);
          searchInput.blur();
          updateAutomaticUi();
          refreshCountryList(searchInput.value);
        });
        Promise.all([loadLanguageCatalogue(),loadCountryCatalogue()]).then(function(){
          if(current==='language'&&view.querySelector('#cmdLanguageChoice')===results)
            refreshCountryList(searchInput.value);
        }).catch(function(error){
          // Still permit searching every language when country metadata cannot load.
          allLanguages=true;chosenCountry=null;
          if(current==='language'&&view.querySelector('#cmdLanguageChoice')===results)refreshCountryList(searchInput.value);
          var notice=view.querySelector('#cmdLanguageSupportNotice');
          if(notice)notice.textContent='Catalogue international indisponible : '+error.message+
            '. Tu peux utiliser un code BCP 47 personnalisé.';
        });
        var aut=view.querySelector('#cmdAutoTranslate');
        if(aut){aut.checked=localStorage.getItem('cmd-sphere-auto-translate')!=='0';
          aut.onchange=function(){localStorage.setItem('cmd-sphere-auto-translate',aut.checked?'1':'0');
            window.dispatchEvent(new Event('cmd-sphere-auto-translate-change'))}}
      }
      if(key==='notifications'){var notif=view.querySelector('#cmdNotifState');notif.textContent=('Notification' in window)?('État : '+Notification.permission):'Notifications navigateur indisponibles sur cet appareil.'}
    }
    function status(s){var el=view.querySelector('#cmdSubStatus');if(el)el.textContent=String(s)}
    function applyPreferences(){
      document.body.classList.toggle('cmd-amoled',localStorage.getItem('cmd-sphere-appearance')==='amoled');
      document.body.classList.toggle('cmd-less-motion',localStorage.getItem('cmd-sphere-less-motion')==='1');
      document.body.classList.toggle('cmd-bigger-type',localStorage.getItem('cmd-sphere-bigger-type')==='1');
    }
    function open(){settingsChosenLanguage='';lastAppliedLanguage='';lastFocus=document.activeElement;draw();syncSettingsLanguage();layer.classList.add('on');layer.setAttribute('aria-hidden','false');document.body.classList.add('cmd-settings-locked');close.focus()}
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
      if(which==='custom-language'){
        var raw=String(view.querySelector('#cmdLanguageCustomCode')?.value||'').trim();
        if(!validLocaleCode(raw)){status('Code BCP 47 invalide : exemple gsw-CH-x-bern.');return}
        try{raw=Intl.getCanonicalLocales(raw)[0]||raw}catch(e){status('Code de langue invalide : '+e.message);return}
        applySettingsLanguage(raw);
        return;
      }
      if(which==='diagnostics'){detail(which);return}
      if(which==='export-data'){
        const button=view.querySelector('[data-cmd-subaction="export-data"]');
        if(button)button.disabled=true;
        status('Création du fichier personnel…');
        try{
          const response=await fetch('/api/account/export-data',{
            method:'POST',credentials:'same-origin',cache:'no-store',
            headers:{'content-type':'application/json'},body:'{}'
          });
          if(!response.ok){
            const problem=await response.json().catch(()=>({}));
            throw Error(problem.error||'Export refusé (HTTP '+response.status+')');
          }
          const blob=await response.blob();
          const uri=URL.createObjectURL(blob);
          try{
            const link=document.createElement('a');
            link.href=uri;link.download='cmd-sphere-mes-donnees.json';
            link.style.display='none';document.body.append(link);link.click();link.remove();
          }finally{setTimeout(()=>URL.revokeObjectURL(uri),60000)}
          status('Export partiel prêt : conserve ce fichier privé. Les images et archives complètes restent à intégrer.');
        }catch(error){status('Export indisponible : '+(error?.message||'Erreur inconnue'))}
        finally{if(button)button.disabled=false}
        return;
      }
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
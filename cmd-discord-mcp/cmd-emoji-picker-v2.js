/* CMD Sphere — emoji picker: individual Unicode and accessible Discord custom emojis.
   Uses authorized backend extras only; does not scrape private Discord servers. */
(() => {
  "use strict";
  if (window.__cmdEmojiPickerV2) return;
  window.__cmdEmojiPickerV2 = true;
  const $ = s => document.querySelector(s);
  const state = {tab:"emoji",packs:[],selected:"all",items:[],query:"",loading:false,cache:new Map(),recent:[],library:[],libraryGuild:"",libraryRole:null};
  try { const r=JSON.parse(localStorage.getItem("cmd-emoji-recent-v2")||"[]");if(Array.isArray(r))state.recent=r.slice(0,48); } catch {}
  const escapeHtml = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const digits = v => /^\d{15,22}$/.test(String(v||""));
  const emojiCdn = (id,animated=false) => digits(id) ? "https://cdn.discordapp.com/emojis/"+id+(animated?".gif":".png")+"?size=64" : "";
  const stickerCdn = id => digits(id) ? "https://media.discordapp.net/stickers/"+id+".png?size=160" : "";
  const unicodeGroups = [
    ["Visages",0x1f600,0x1f64f],["Émotions",0x1f910,0x1f92f],
    ["Personnes",0x1f466,0x1f487],["Gestes",0x1f440,0x1f450],
    ["Animaux",0x1f400,0x1f43e],["Nature",0x1f330,0x1f3fa],
    ["Nourriture",0x1f950,0x1f96f],["Sports",0x1f3c0,0x1f3e0],
    ["Activités",0x1f380,0x1f3bf],["Voyages",0x1f680,0x1f6ff],
    ["Objets",0x1f4a0,0x1f4ff],["Symboles",0x1f500,0x1f53f],
    ["Supplémentaires",0x1f900,0x1faff],["Signes",0x2600,0x27bf]
  ];
  const glyphs = [...new Set(unicodeGroups.flatMap(([group,start,end]) => {
    const res=[];for(let i=start;i<=end;i++){
      const char=String.fromCodePoint(i);
      if (/\p{Emoji_Presentation}/u.test(char)||/\p{Extended_Pictographic}/u.test(char)) res.push(char);
    }return res;
  }).concat(["❤️","♥️","✔️","✅","☑️","☹️","☺️","✌️","⚠️","☠️","✈️","☕","☀️","⭐","🌈","🫶","🇫🇷","🇬🇧","🇺🇸","🇩🇪","🇪🇸","🇮🇹","🇯🇵","🇰🇷","🇨🇳","🇨🇦","🇮🇪","🏳️‍🌈","🏴‍☠️","👨‍👩‍👧","👩‍💻","🧑‍🚀","👨‍🚒","👮‍♂️","👩‍⚕️","🤦‍♂️","🫡","🫠"]))].map((char,i)=>({kind:"unicode",id:"u-"+i,name:char,value:char}));
  const fullUnicode=(()=>{
    const map=new Map();
    for(const [value,name] of Array.isArray(window.CMD_UNICODE_EMOJIS)?window.CMD_UNICODE_EMOJIS:[]){
      if(typeof value==="string"&&value&&!map.has(value))map.set(value,{kind:"unicode",id:"unicode-"+map.size,value,name:String(name||value),packName:"Unicode"});
    }
    for(const e of glyphs)if(!map.has(e.value))map.set(e.value,e);
    return [...map.values()];
  })();
  const pName = item => String(item?.name||"").trim().slice(0,80);
  function parsePack(data,pack,kind){
    const root=data?.extras||data||{};
    const arr=(kind==="sticker"?(root.stickers||data?.stickers):(root.emojis||data?.emojis))||[];
    return (Array.isArray(arr)?arr:[]).filter(e=>digits(e?.id)).map(e=>({
      kind, id:String(e.id),name:pName(e)||"emoji",guildId:pack.id,packName:pack.name,
      animated:Boolean(e.animated),image:kind==="sticker"?stickerCdn(e.id):emojiCdn(e.id,Boolean(e.animated)),
      value:kind==="sticker" ? stickerCdn(e.id) : "<"+(e.animated?"a":"")+":"+(pName(e).replace(/[^a-zA-Z0-9_]/g,"_")||"cmd")+":"+e.id+">"
    }));
  }
  function remember(item){
    state.recent=[item,...state.recent.filter(e=>e.kind+":"+e.id!==item.kind+":"+item.id)].slice(0,48);
    try {localStorage.setItem("cmd-emoji-recent-v2",JSON.stringify(state.recent))} catch {}
  }
  function insert(item){
    const input=$("#channelInput");if(!input)return;
    if(item.kind==="sticker"){const v=item.value;if(!v)return; const start=input.selectionStart??input.value.length;input.setRangeText(v,start,input.selectionEnd??start,"end")}
    else {const start=input.selectionStart??input.value.length;input.setRangeText(item.value,start,input.selectionEnd??start,"end")}
    input.dispatchEvent(new Event("input",{bubbles:true}));input.focus();remember(item);
    $("#channelEmojiSheet")?.classList.remove("on");
  }
  function listFor(){
    if(state.selected==="all")return state.tab==="sticker"?state.items:[...fullUnicode,...state.library,...state.items];
    if(["mine","community","server"].includes(state.selected))return state.library.filter(e=>e.scope===(state.selected==="mine"?"personal":state.selected));
    if(state.selected==="unicode")return fullUnicode;
    if(state.selected==="recent")return state.recent.filter(e=>state.tab==="emoji"?e.kind!=="sticker":e.kind==="sticker");
    return state.items;
  }
  let drawGeneration=0;
  let photoPreviewObserver=null;
  let allPacksGeneration=0;
  function drawItems(){
    const root=$("#cmdEmojiResults");if(!root)return;
    const generation=++drawGeneration;
    photoPreviewObserver?.disconnect();
    photoPreviewObserver=null;
    const oldTop=root.scrollTop;
    root.replaceChildren();
    if(state.tab==="gif"&&!["mine","community","server","all"].includes(state.selected)){
      root.innerHTML='<div class="cmd-emoji-hint">Les GIF peuvent être envoyés en collant leur lien dans le message. La recherche GIF en ligne nécessite un fournisseur connecté.</div>';return;
    }
    if(state.loading){root.innerHTML='<p class="cmd-emoji-hint">Chargement des emojis du serveur…</p>';return}
    const query=state.query.toLocaleLowerCase("fr").trim();
    const all=state.tab==="gif"?listFor().filter(x=>x.animated):listFor();
    const filtered=query?all.filter(i=>(i.name+" "+(i.packName||"")).toLocaleLowerCase("fr").includes(query)):all;
    const heading=$("#cmdEmojiHeading");if(heading){heading.title=filtered.length+" emojis disponibles";heading.dataset.count=String(filtered.length)}
    if(!filtered.length){root.innerHTML='<p class="cmd-emoji-hint">Aucun emoji accessible pour cette sélection. Choisis un autre serveur ou les emojis standards.</p>';return}
    let displayed=0,filling=false;
    const grid=document.createElement("div");grid.className="cmd-emoji-grid-v2";root.appendChild(grid);
    if("IntersectionObserver" in window){photoPreviewObserver=new IntersectionObserver(entries=>{for(const item of entries)item.target.classList.toggle("cmd-photo-visible",item.isIntersecting)},{root,rootMargin:"70px"})}
    root.scrollTop=oldTop;
    function more(){
      if(generation!==drawGeneration||filling||displayed>=filtered.length||!root.isConnected)return;
      filling=true;const end=Math.min(filtered.length,displayed+126),fragment=document.createDocumentFragment();
      for(let i=displayed;i<end;i++){
        const e=filtered[i],btn=document.createElement("button");btn.type="button";btn.className="cmd-emoji-icon-v2";
        btn.title=(e.packName?e.packName+" · ":"")+e.name;btn.setAttribute("aria-label",e.name);
        if(e.kind==="unicode")btn.textContent=e.value;
        else{const img=document.createElement("img");img.src=e.image;img.alt=e.name;img.loading="lazy";img.decoding="async";img.onerror=()=>btn.remove();if(e.kind==="cmd"&&!e.animated){img.classList.add("cmd-photo-motion");photoPreviewObserver?.observe(img)}btn.appendChild(img)}
        btn.addEventListener("click",()=>insert(e));fragment.appendChild(btn);
      }
      grid.appendChild(fragment);displayed=end;filling=false;
      if(oldTop>root.scrollTop)root.scrollTop=Math.min(oldTop,Math.max(0,root.scrollHeight-root.clientHeight));
      if(displayed<filtered.length)setTimeout(more,0);
    }
    more();
    // Render every emoji automatically, in batches so there is no "voir plus" button.
  }
  async function fetchPacks(){
    try{
      const res=await fetch("/api/dashboard/guilds",{credentials:"same-origin",cache:"no-store"});
      if(!res.ok)throw Error("Serveurs non disponibles");
      const data=await res.json();
      const found=(data.guilds||[]).filter(g=>g.installed&&(g.availableBots||[]).length&&digits(g.id));
      state.packs=found.map(g=>({id:String(g.id),name:String(g.name||"Serveur"),icon:icon(g),bot:String(g.availableBots[0].id||""),bots:[...new Set((g.availableBots||[]).map(b=>String(b.id||"")).filter(Boolean))]}));
      draw();
      if(state.selected==="all")await loadAllPacks();
    }catch{draw()}
  }
  async function fetchPackItems(pack,kind){
    // Different installed CMD bots can expose different custom emojis.
    // Merge by original Discord emoji ID, not by screenshot/grid position.
    const cacheKey=pack.id+":"+kind;
    if(state.cache.has(cacheKey))return state.cache.get(cacheKey);
    const combined=[],seen=new Set();
    const bots=[...new Set([...(pack.bots||[]),pack.bot].filter(Boolean))];
    for(const bot of bots){
      try{
        const url="/api/dashboard/extras?guildId="+encodeURIComponent(pack.id)+"&bot="+encodeURIComponent(bot);
        const response=await fetch(url,{credentials:"same-origin",cache:"no-store"});
        if(!response.ok)continue;
        const list=parsePack(await response.json(),pack,kind);
        for(const entry of list){
          const key=entry.kind+":"+entry.id;
          if(!seen.has(key)){seen.add(key);combined.push(entry)}
        }
      }catch(error){console.warn("[CMD Sphere emoji pack]",pack.name,error?.message||error)}
    }
    state.cache.set(cacheKey,combined);
    return combined;
  }
  async function loadAllPacks(){
    const generation=++allPacksGeneration;
    const kind=state.tab==="sticker"?"sticker":"emoji";
    state.items=[];draw();
    for(const pack of state.packs){
      if(generation!==allPacksGeneration||state.selected!=="all")return;
      const batch=await fetchPackItems(pack,kind);
      state.items.push(...batch);
      if(generation!==allPacksGeneration||state.selected!=="all")return;
      if(state.items.length)draw();
    }
  }
  function icon(g){
    const value=String(g?.icon||"");if(/^https:\/\//.test(value))return value;
    return digits(g?.id)&&/^[\w-]{12,100}$/.test(value)?"https://cdn.discordapp.com/icons/"+g.id+"/"+value+".webp?size=64":"";
  }
  async function loadPack(pack){
    if(!pack)return;
    const requested=state.selected,requestedTab=state.tab,kind=requestedTab==="sticker"?"sticker":"emoji";
    state.loading=true;draw();
    const items=await fetchPackItems(pack,kind);
    if(state.selected!==requested||state.tab!==requestedTab){state.loading=false;return;}
    state.items=items;state.loading=false;draw();
  }
  function draw(){
    const box=$("#emojiContent");if(!box)return;
    if(!$("#cmdEmojiSearch")){
      box.innerHTML='<div class="cmd-emoji-top"><input id="cmdEmojiSearch" type="search" placeholder="Trouver l’emoji parfait" autocomplete="off" aria-label="Rechercher un emoji"><button type="button" id="cmdEmojiCreate" onclick="window.cmdEmojiOpenCreator?.()">＋ Créer</button></div><div id="cmdEmojiHeading"></div><div id="cmdEmojiResults"></div><div id="cmdEmojiServerRail" aria-label="Packs d’emojis"></div>';
      $("#cmdEmojiSearch").addEventListener("input",e=>{state.query=e.target.value;drawItems()});
    }
    const query=$("#cmdEmojiSearch");if(query?.value!==state.query)query.value=state.query;
    const heading=$("#cmdEmojiHeading"),rail=$("#cmdEmojiServerRail");
    const pack=state.packs.find(p=>p.id===state.selected);
    heading.textContent=state.selected==="all"?"Tous les emojis disponibles":state.selected==="mine"?"Mes emojis":state.selected==="community"?"Partagés avec tous":state.selected==="server"?"Emojis du serveur":state.tab==="gif"?"GIF":state.selected==="unicode"?"Emojis Unicode":state.selected==="recent"?"Récemment utilisés":(pack?.name||"Emojis du serveur");
    rail.innerHTML="";
    const entries=[{id:"all",name:"Tous",glyph:"🌐"},{id:"recent",name:"Récents",glyph:"🕘"},{id:"unicode",name:"Standard",glyph:"😀"},{id:"mine",name:"Mes emojis",glyph:"👤"},{id:"community",name:"Partagés",glyph:"🌍"},...(state.libraryGuild?[{id:"server",name:"Ce serveur",glyph:"🏠"}]:[]),...state.packs];
    for(const entry of entries){
      const btn=document.createElement("button");btn.type="button";btn.title=entry.name;btn.className="cmd-emoji-server-pill"+(state.selected===entry.id?" active":"");
      if(entry.icon){const img=document.createElement("img");img.src=entry.icon;img.alt="";img.loading="lazy";btn.append(img)}
      else btn.textContent=entry.glyph||entry.name.slice(0,2);
      btn.onclick=()=>{allPacksGeneration++;state.selected=entry.id;state.query="";state.items=[];if(entry.id==="all"){draw();loadAllPacks()}else if(["recent","unicode","mine","community","server"].includes(entry.id)){draw()}else loadPack(entry)};
      rail.append(btn);
    }
    drawItems();
  }
  function open(tab="emoji",toggle=false){
    const sheet=$("#channelEmojiSheet");if(!sheet)return;
    if(toggle&&sheet.classList.contains("on")){sheet.classList.remove("on");$("#channelInput")?.focus();return}
    sheet.classList.add("on");$("#channelToolSheet")?.classList.remove("on");
    state.tab=tab==="sticker"?"sticker":tab==="gif"?"gif":"emoji";
    document.querySelectorAll("[data-emoji-tab]").forEach(b=>b.classList.toggle("active",b.dataset.emojiTab===state.tab));
    const activePack=state.packs.find(p=>p.id===state.selected);
    if(state.selected==="all"){draw();if(state.packs.length)loadAllPacks()}
    else if(activePack)loadPack(activePack);
    else draw();
    if(!state.packs.length)fetchPacks();
    window.cmdEmojiRefreshLibrary?.();
  }
  window.__cmdEmojiPickerBridge={state,draw,insert};
  document.addEventListener("click",e=>{
    const target=e.target.closest?.("#channelEmoji,[data-emoji-tab]");
    if(!target)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(target.id==="channelEmoji")open("emoji",true);else open(target.dataset.emojiTab);
  },true);
})();

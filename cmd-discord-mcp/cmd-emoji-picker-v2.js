/* CMD Sphere — emoji picker: individual Unicode and accessible Discord custom emojis.
   Uses authorized backend extras only; does not scrape private Discord servers. */
(() => {
  "use strict";
  if (window.__cmdEmojiPickerV2) return;
  window.__cmdEmojiPickerV2 = true;
  const $ = s => document.querySelector(s);
  const state = {tab:"emoji",packs:[],selected:"all",items:[],query:"",loading:false,cache:new Map(),recent:[],library:[],libraryGuild:"",libraryRole:null,webGifs:[],webGifLoading:false,mediaCategory:"for-you",favorites:[],gifSearchUnavailable:false};
  let gifSearchSequence=0,gifSearchTimer=null;
  const categories=[{id:"for-you",name:"Pour toi",search:"animated reaction gif"},{id:"trending",name:"Tendances",search:"animated loop gif"},{id:"funny",name:"Drôle",search:"funny animation gif"},{id:"reaction",name:"Réactions",search:"reaction gif"},{id:"love",name:"Amour",search:"love heart gif"},{id:"animals",name:"Animaux",search:"cat dog gif"},{id:"gaming",name:"Jeux",search:"video game gif"}];
  try{const a=JSON.parse(localStorage.getItem("cmd-media-favorites-v1")||"[]");if(Array.isArray(a))state.favorites=a.filter(x=>x&&typeof x.id==="string"&&typeof x.image==="string").slice(0,100)}catch{}
  const mediaKey=e=>String(e.kind||"")+":"+String(e.id||"");
  const isFavorite=e=>state.favorites.some(f=>mediaKey(f)===mediaKey(e));
  function toggleFavorite(e){
    state.favorites=isFavorite(e)?state.favorites.filter(f=>mediaKey(f)!==mediaKey(e)):[{...e},...state.favorites].slice(0,100);
    try{localStorage.setItem("cmd-media-favorites-v1",JSON.stringify(state.favorites))}catch{}
    drawItems();
  }
  const selectedCategory=()=>categories.find(c=>c.id===state.mediaCategory)||categories[0];
  function queuePublicGifs(){
    clearTimeout(gifSearchTimer);
    if(state.tab!=="gif"||state.selected!=="all"){gifSearchSequence++;state.webGifs=[];state.webGifLoading=false;return}
    const query=state.query.trim()||selectedCategory().search;
    gifSearchTimer=setTimeout(()=>searchPublicGifs(query),state.query.trim()?350:50);
  }
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
    const input=$("#channelInput");if(!input||input.disabled)return;
    const sendImmediately=["gif","sticker"].includes(state.tab)&&!input.value.trim();
    {const start=input.selectionStart??input.value.length;input.setRangeText(item.value,start,input.selectionEnd??start,"end")}
    input.dispatchEvent(new Event("input",{bubbles:true}));input.focus();remember(item);
    $("#channelEmojiSheet")?.classList.remove("on");
    if(sendImmediately){const form=input.closest("form");if(form?.requestSubmit)form.requestSubmit()}
  }
  function tabMatch(item){
    if(state.tab==="sticker")return item.kind==="sticker";
    if(state.tab==="gif")return item.kind==="gif"||item.kind==="webgif"||(item.animated&&(item.kind==="cmd"||item.kind==="emoji"));
    return item.kind==="unicode"||item.kind==="cmd"||item.kind==="emoji";
  }
  function listFor(){
    if(state.selected==="all")return [...(state.tab==="emoji"?fullUnicode:[]),...state.library,...state.items,...(state.tab==="gif"?state.webGifs:[])].filter(tabMatch);
    if(state.selected==="favorites")return state.favorites.filter(tabMatch);
    if(["mine","community","server"].includes(state.selected))return state.library.filter(e=>e.scope===(state.selected==="mine"?"personal":state.selected)&&tabMatch(e));
    if(state.selected==="unicode")return state.tab==="emoji"?fullUnicode:[];
    if(state.selected==="recent")return state.recent.filter(tabMatch);
    return state.items.filter(tabMatch);
  }
  async function searchPublicGifs(query){
    const sequence=++gifSearchSequence,typed=state.query,category=state.mediaCategory;
    state.webGifs=[];state.webGifLoading=Boolean(query);state.gifSearchUnavailable=false;drawItems();
    if(!query){state.webGifLoading=false;return}
    try{
      const response=await fetch("/api/cmd-gifs/search?q="+encodeURIComponent(query),{credentials:"same-origin",cache:"no-store"});
      const data=await response.json();if(!response.ok)throw Error(data.error||"Recherche indisponible");
      if(sequence!==gifSearchSequence||state.tab!=="gif"||state.selected!=="all"||state.query!==typed||state.mediaCategory!==category)return;
      state.gifSearchUnavailable=Boolean(data.temporarilyUnavailable);
      state.webGifs=(data.items||[]).filter(e=>/^https:\/\/upload\.wikimedia\.org\//.test(e.url||"")).map(e=>({kind:"webgif",id:e.url,name:e.name||"GIF public",packName:"Wikimedia Commons",image:e.url,value:e.url,sourceUrl:e.sourceUrl||"",animated:true}));
    }catch(error){if(sequence===gifSearchSequence)console.warn("[CMD GIF public]",error?.message||error)}
    finally{if(sequence===gifSearchSequence){state.webGifLoading=false;drawItems()}}
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
    if(state.loading){root.innerHTML='<p class="cmd-emoji-hint">Chargement des emojis du serveur…</p>';return}
    const query=state.query.toLocaleLowerCase("fr").trim();
    const all=listFor();
    const filtered=query?all.filter(i=>i.kind==="webgif"||(i.name+" "+(i.packName||"")).toLocaleLowerCase("fr").includes(query)):all;
    const heading=$("#cmdEmojiHeading");if(heading){heading.title=filtered.length+" emojis disponibles";heading.dataset.count=String(filtered.length)}
    if(!filtered.length){root.innerHTML='<p class="cmd-emoji-hint">'+(state.tab==="gif"?(state.webGifLoading?"Recherche de GIF animés…":state.gifSearchUnavailable?"Le catalogue public est momentanément indisponible. Tes GIF personnels restent accessibles.":"Aucun GIF trouvé. Essaie un autre mot ou importe un GIF animé avec « ＋ Créer »."):state.tab==="sticker"?"Aucun autocollant ici. Utilise « ＋ Créer » pour en importer un, fixe ou animé.":"Aucun emoji dans cette catégorie.")+'</p>';return}
    let displayed=0,filling=false;
    const grid=document.createElement("div");grid.className="cmd-emoji-grid-v2"+(state.tab!=="emoji"?" cmd-media-grid":"");root.appendChild(grid);
    if("IntersectionObserver" in window){photoPreviewObserver=new IntersectionObserver(entries=>{for(const item of entries)item.target.classList.toggle("cmd-photo-visible",item.isIntersecting)},{root,rootMargin:"70px"})}
    root.scrollTop=oldTop;
    function more(){
      if(generation!==drawGeneration||filling||displayed>=filtered.length||!root.isConnected)return;
      filling=true;const end=Math.min(filtered.length,displayed+126),fragment=document.createDocumentFragment();
      for(let i=displayed;i<end;i++){
        const e=filtered[i],btn=document.createElement("button");btn.type="button";btn.className="cmd-emoji-icon-v2";
        btn.title=(e.packName?e.packName+" · ":"")+e.name;btn.setAttribute("aria-label",e.name);
        if(state.tab!=="emoji")btn.classList.add("cmd-media-tile");
        if(e.kind==="unicode")btn.textContent=e.value;
        else{const img=document.createElement("img");img.src=e.image;img.alt=e.name;img.loading="lazy";img.decoding="async";img.onerror=()=>btn.remove();if(e.kind==="cmd"&&!e.animated){img.classList.add("cmd-photo-motion");photoPreviewObserver?.observe(img)}btn.appendChild(img)}
        btn.addEventListener("click",()=>insert(e));
        if(state.tab!=="emoji"){
          const wrapper=document.createElement("div");wrapper.className="cmd-media-card";wrapper.appendChild(btn);
          const fave=document.createElement("button");fave.type="button";fave.className="cmd-media-fav";fave.textContent=isFavorite(e)?"♥":"♡";fave.title=isFavorite(e)?"Retirer des favoris":"Ajouter aux favoris";fave.setAttribute("aria-label",fave.title);fave.setAttribute("aria-pressed",String(isFavorite(e)));fave.onclick=()=>toggleFavorite(e);wrapper.appendChild(fave);
          if(e.kind==="webgif"&&/^https:\/\/commons\.wikimedia\.org\//.test(e.sourceUrl||"")){
            const credit=document.createElement("a");credit.className="cmd-media-credit";credit.href=e.sourceUrl;credit.target="_blank";credit.rel="noopener noreferrer";credit.textContent="Source / licence";wrapper.appendChild(credit);
          }
          fragment.appendChild(wrapper);
        }else fragment.appendChild(btn);
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
      box.innerHTML='<div class="cmd-emoji-top"><input id="cmdEmojiSearch" type="search" placeholder="Rechercher un emoji" autocomplete="off" aria-label="Rechercher un emoji, GIF ou autocollant"><button type="button" id="cmdEmojiCreate" onclick="window.cmdEmojiOpenCreator?.()">＋ Créer</button></div><div id="cmdMediaCategories" aria-label="Choisir une catégorie de GIF"></div><div id="cmdEmojiHeading"></div><div id="cmdEmojiResults"></div><div id="cmdEmojiServerRail" aria-label="Bibliothèques et serveurs"></div>';
      $("#cmdEmojiSearch").addEventListener("input",e=>{state.query=e.target.value;drawItems();queuePublicGifs()});
    }
    const query=$("#cmdEmojiSearch");if(query?.value!==state.query)query.value=state.query;
    const heading=$("#cmdEmojiHeading"),rail=$("#cmdEmojiServerRail"),categoriesBar=$("#cmdMediaCategories");
    categoriesBar.hidden=state.tab!=="gif"||state.selected!=="all";
    categoriesBar.replaceChildren();
    if(!categoriesBar.hidden)for(const cat of categories){
      const btn=document.createElement("button");btn.type="button";btn.textContent=cat.name;btn.className="cmd-media-category"+(state.mediaCategory===cat.id&&!state.query.trim()?" active":"");btn.setAttribute("aria-pressed",String(state.mediaCategory===cat.id&&!state.query.trim()));
      btn.onclick=()=>{state.mediaCategory=cat.id;state.query="";state.webGifs=[];draw();queuePublicGifs()};categoriesBar.appendChild(btn);
    }
    const pack=state.packs.find(p=>p.id===state.selected);
    heading.textContent=state.selected==="all"?(state.tab==="gif"?"GIF animés · Ma bibliothèque et recherche publique":state.tab==="sticker"?"Tous les autocollants":"Tous les emojis disponibles"):state.selected==="mine"?"Mes créations":state.selected==="community"?"Partagés avec tous":state.selected==="server"?"Créations du serveur":state.selected==="unicode"?"Emojis Unicode":state.selected==="recent"?"Récemment utilisés":(pack?.name||"Bibliothèque du serveur");
    rail.innerHTML="";
    const entries=[{id:"all",name:"Tous",glyph:"🌐"},{id:"recent",name:"Récents",glyph:"🕘"},...(state.tab!=="emoji"?[{id:"favorites",name:"Favoris",glyph:"♥"}]:[]),...(state.tab==="emoji"?[{id:"unicode",name:"Standard",glyph:"😀"}]:[]),{id:"mine",name:"Mes créations",glyph:"👤"},{id:"community",name:"Partagés",glyph:"🌍"},...(state.libraryGuild?[{id:"server",name:"Ce serveur",glyph:"🏠"}]:[]),...state.packs];
    for(const entry of entries){
      const btn=document.createElement("button");btn.type="button";btn.title=entry.name;btn.className="cmd-emoji-server-pill"+(state.selected===entry.id?" active":"");
      if(entry.icon){const img=document.createElement("img");img.src=entry.icon;img.alt="";img.loading="lazy";btn.append(img)}
      else btn.textContent=entry.glyph||entry.name.slice(0,2);
      btn.onclick=()=>{allPacksGeneration++;gifSearchSequence++;clearTimeout(gifSearchTimer);state.webGifs=[];state.selected=entry.id;state.query="";state.items=[];if(entry.id==="all"){draw();loadAllPacks();queuePublicGifs()}else if(["recent","favorites","unicode","mine","community","server"].includes(entry.id)){draw()}else loadPack(entry)};
      rail.append(btn);
    }
    drawItems();
  }
  function open(tab="emoji",toggle=false){
    const sheet=$("#channelEmojiSheet");if(!sheet)return;
    if(toggle&&sheet.classList.contains("on")){sheet.classList.remove("on");$("#channelInput")?.focus();return}
    sheet.classList.add("on");$("#channelToolSheet")?.classList.remove("on");
    const nextTab=tab==="sticker"?"sticker":tab==="gif"?"gif":"emoji";
    if(state.tab!==nextTab)state.query="";
    state.tab=nextTab;
    gifSearchSequence++;clearTimeout(gifSearchTimer);state.webGifs=[];state.webGifLoading=false;
    if(state.tab!=="emoji"&&state.selected==="unicode")state.selected="all";
    document.querySelectorAll("[data-emoji-tab]").forEach(b=>b.classList.toggle("active",b.dataset.emojiTab===state.tab));
    const activePack=state.packs.find(p=>p.id===state.selected);
    if(state.selected==="all"){draw();if(state.packs.length)loadAllPacks();queuePublicGifs()}
    else if(activePack)loadPack(activePack);
    else draw();
    if(!state.packs.length)fetchPacks();
    window.cmdEmojiRefreshLibrary?.();
    const query=$("#cmdEmojiSearch");if(query)query.placeholder=state.tab==="gif"?"Rechercher des GIF animés…":state.tab==="sticker"?"Rechercher un autocollant…":"Rechercher un emoji…";
  }
  window.__cmdEmojiPickerBridge={state,draw,insert};
  document.addEventListener("click",e=>{
    const target=e.target.closest?.("#channelEmoji,[data-emoji-tab]");
    if(!target)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(target.id==="channelEmoji")open("emoji",true);else open(target.dataset.emojiTab);
  },true);
})();

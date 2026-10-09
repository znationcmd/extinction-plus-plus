/* CMD Sphere — emoji picker: individual Unicode and accessible Discord custom emojis.
   Uses authorized backend extras only; does not scrape private Discord servers. */
(() => {
  "use strict";
  if (window.__cmdEmojiPickerV2) return;
  window.__cmdEmojiPickerV2 = true;
  const $ = s => document.querySelector(s);
  const state = {tab:"emoji",packs:[],selected:"unicode",items:[],query:"",loading:false,cache:new Map(),recent:[],library:[],libraryGuild:"",libraryRole:null};
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
    if(["mine","community","server"].includes(state.selected))return state.library.filter(e=>e.scope===(state.selected==="mine"?"personal":state.selected));
    if(state.selected==="unicode")return glyphs;
    if(state.selected==="recent")return state.recent.filter(e=>state.tab==="emoji"?e.kind!=="sticker":e.kind==="sticker");
    return state.items;
  }
  let stopInfiniteScroll=null;
  function drawItems(){
    if(stopInfiniteScroll){stopInfiniteScroll();stopInfiniteScroll=null}
    const root=$("#cmdEmojiResults");if(!root)return;
    root.replaceChildren();
    if(state.tab==="gif"&&!["mine","community","server"].includes(state.selected)){
      root.innerHTML='<div class="cmd-emoji-hint">Les GIF peuvent être envoyés en collant leur lien dans le message. La recherche GIF en ligne nécessite un fournisseur connecté.</div>';return;
    }
    if(state.loading){root.innerHTML='<p class="cmd-emoji-hint">Chargement des emojis…</p>';return}
    const query=state.query.toLocaleLowerCase("fr").trim();
    const all=state.tab==="gif"?listFor().filter(e=>e.animated):listFor();
    const filtered=query?all.filter(e=>(e.name+" "+(e.packName||"")).toLocaleLowerCase("fr").includes(query)):all;
    if(!filtered.length){root.innerHTML='<p class="cmd-emoji-hint">Aucun emoji pour cette sélection.</p>';return}
    let displayed=0,appending=false;
    const grid=document.createElement("div");grid.className="cmd-emoji-grid-v2";
    const sentinel=document.createElement("div");sentinel.className="cmd-emoji-infinite-sentinel";sentinel.setAttribute("aria-hidden","true");
    root.append(grid,sentinel);
    function appendChunk(){
      if(appending||displayed>=filtered.length)return;
      appending=true;
      const end=Math.min(filtered.length,displayed+112);
      const frag=document.createDocumentFragment();
      for(let i=displayed;i<end;i++){
        const e=filtered[i],button=document.createElement("button");
        button.type="button";button.className="cmd-emoji-icon-v2";
        button.title=(e.packName?e.packName+" · ":"")+e.name;
        button.setAttribute("aria-label",e.name);
        if(e.kind==="unicode")button.textContent=e.value;
        else{
          const pic=document.createElement("img");pic.src=e.image;pic.alt=e.name;
          pic.loading="lazy";pic.decoding="async";pic.onerror=()=>button.remove();button.append(pic);
        }
        button.addEventListener("click",()=>insert(e));frag.append(button);
      }
      grid.append(frag);displayed=end;appending=false;
      sentinel.hidden=displayed>=filtered.length && !["mine","community","server"].includes(state.selected);
    }
    const maybeAppend=()=>{
      if(root.scrollTop+root.clientHeight<root.scrollHeight-380)return;
      if(displayed<filtered.length){appendChunk();return}
      if(["mine","community","server"].includes(state.selected))window.cmdEmojiFetchNext?.();
    };
    const onScroll=()=>maybeAppend();
    root.addEventListener("scroll",onScroll,{passive:true});
    let observer=null;
    if(typeof IntersectionObserver==="function"){
      observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){if(displayed<filtered.length)appendChunk();else if(["mine","community","server"].includes(state.selected))window.cmdEmojiFetchNext?.();}},
        {root,rootMargin:"400px 0px",threshold:0});
      observer.observe(sentinel);
    }
    stopInfiniteScroll=()=>{root.removeEventListener("scroll",onScroll);observer?.disconnect()};
    appendChunk();
    // If the initial results don't fill the screen, append until scrolling becomes possible.
    for(let tries=0;tries<5&&displayed<filtered.length&&root.scrollHeight<=root.clientHeight+120;tries++)appendChunk();
    maybeAppend();
  }
  async function fetchPacks(){
    try{
      const res=await fetch("/api/dashboard/guilds",{credentials:"same-origin",cache:"no-store"});
      if(!res.ok)return;
      const data=await res.json();
      const found=(data.guilds||[]).filter(g=>g.installed&&(g.availableBots||[]).length&&digits(g.id));
      state.packs=found.map(g=>({id:String(g.id),name:String(g.name||"Serveur"),icon:icon(g),bot:String(g.availableBots[0].id||"")}));
      const active=$("#workspace")?.dataset.nativeGuildId||"";
      const current=(window.__nativeGuilds||[]).find(g=>String(g.id)===String(active));
      const first=state.packs.find(g=>g.id===String(current?.source_discord_id||""))||state.packs[0];
      if(first&&state.selected==="unicode"){state.selected=first.id;await loadPack(first)}
      else draw();
    }catch{draw()}
  }
  function icon(g){
    const value=String(g?.icon||"");if(/^https:\/\//.test(value))return value;
    return digits(g?.id)&&/^[\w-]{12,100}$/.test(value)?"https://cdn.discordapp.com/icons/"+g.id+"/"+value+".webp?size=64":"";
  }
  async function loadPack(pack){
    if(!pack)return;
    const key=pack.id+":"+state.tab;
    if(state.cache.has(key)){state.items=state.cache.get(key);draw();return}
    state.loading=true;draw();
    try{
      const path="/api/dashboard/extras?guildId="+encodeURIComponent(pack.id)+(pack.bot?"&bot="+encodeURIComponent(pack.bot):"");
      const response=await fetch(path,{cache:"no-store",credentials:"same-origin"});
      if(!response.ok)throw new Error("Ce pack est inaccessible");
      const data=await response.json();
      state.items=parsePack(data,pack,state.tab==="sticker"?"sticker":"emoji");
      state.cache.set(key,state.items);
    }catch{state.items=[]}
    state.loading=false;draw();
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
    heading.textContent=state.selected==="mine"?"Mes emojis":state.selected==="community"?"Partagés avec tous":state.selected==="server"?"Emojis du serveur":state.tab==="gif"?"GIF":state.selected==="unicode"?"Emojis Unicode":state.selected==="recent"?"Récemment utilisés":(pack?.name||"Emojis du serveur");
    rail.innerHTML="";
    const entries=[{id:"recent",name:"Récents",glyph:"🕘"},{id:"unicode",name:"Standard",glyph:"😀"},{id:"mine",name:"Mes emojis",glyph:"👤"},{id:"community",name:"Partagés",glyph:"🌍"},...(state.libraryGuild?[{id:"server",name:"Ce serveur",glyph:"🏠"}]:[]),...state.packs];
    for(const entry of entries){
      const btn=document.createElement("button");btn.type="button";btn.title=entry.name;btn.className="cmd-emoji-server-pill"+(state.selected===entry.id?" active":"");
      if(entry.icon){const img=document.createElement("img");img.src=entry.icon;img.alt="";img.loading="lazy";btn.append(img)}
      else btn.textContent=entry.glyph||entry.name.slice(0,2);
      btn.onclick=()=>{state.selected=entry.id;state.query="";state.items=[];if(["recent","unicode","mine","community","server"].includes(entry.id)){draw()}else loadPack(entry)};
      rail.append(btn);
    }
    drawItems();
  }
  function open(tab="emoji",toggle=false){
    const sheet=$("#channelEmojiSheet");if(!sheet)return;
    if(toggle&&sheet.classList.contains("on")){sheet.classList.remove("on");return}
    sheet.classList.add("on");$("#channelToolSheet")?.classList.remove("on");
    state.tab=tab==="sticker"?"sticker":tab==="gif"?"gif":"emoji";
    document.querySelectorAll("[data-emoji-tab]").forEach(b=>b.classList.toggle("active",b.dataset.emojiTab===state.tab));
    const activePack=state.packs.find(p=>p.id===state.selected);
    if(activePack&&state.tab!=="gif")loadPack(activePack);
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

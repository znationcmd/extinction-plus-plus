// CMD Sphere original decorative SVG assets. These designs are independent of Discord collectibles.
export const CMD_ART_FRAMES={
  amethystspire:{label:"Cathédrale d’améthyste",icon:"💜",hue:"#bc6dff",family:"crystal"},
  glacialcrown:{label:"Couronne glaciaire",icon:"🧊",hue:"#52ddff",family:"crystal"},
  rubysurge:{label:"Éclats de rubis",icon:"❤️",hue:"#ff445c",family:"crystal"},
  emeraldgeode:{label:"Géode d’émeraude",icon:"💚",hue:"#18df98",family:"crystal"},
  sapphirearcane:{label:"Saphir arcanique",icon:"💙",hue:"#4f7eff",family:"rune"},
  celestialgold:{label:"Astre doré",icon:"🌟",hue:"#ffd074",family:"celestial"},
  obsidianflame:{label:"Couronne d’obsidienne",icon:"🔥",hue:"#ff652c",family:"fire"},
  midnightrose:{label:"Roses de minuit",icon:"🌹",hue:"#fa76bd",family:"garden"},
  moonstone:{label:"Pierre de lune",icon:"🌙",hue:"#cfb3ff",family:"celestial"},
  prismaticglow:{label:"Prisme iridescent",icon:"🌈",hue:"#fb7dff",family:"rune"},
  autumnember:{label:"Feuilles d’automne",icon:"🍁",hue:"#ed8f35",family:"garden"},
  starforged:{label:"Forgé dans les étoiles",icon:"✨",hue:"#b7d0ff",family:"celestial"}
};
export const CMD_ART_AVATARS={
  amethystorbit:{label:"Orbite d’améthyste",icon:"💎",hue:"#ba75ff",family:"crystal"},
  frosthalo:{label:"Halo de givre",icon:"❄️",hue:"#65d8ff",family:"crystal"},
  rubyhalo:{label:"Anneau rubis",icon:"♦️",hue:"#fb4a64",family:"crystal"},
  emeraldaura:{label:"Aura d’émeraude",icon:"💚",hue:"#33edaf",family:"rune"},
  runicorbit:{label:"Cercle runique",icon:"🌀",hue:"#ab94ff",family:"rune"},
  solareclipse:{label:"Éclipse dorée",icon:"☀️",hue:"#ffcb63",family:"celestial"},
  emberwreath:{label:"Couronne de braises",icon:"🔥",hue:"#ff803f",family:"fire"},
  sakuraring:{label:"Fleurs de cerisier",icon:"🌸",hue:"#ffa3d6",family:"garden"},
  stardust:{label:"Poussière d’étoiles",icon:"✨",hue:"#8cb9ff",family:"celestial"},
  moonpetals:{label:"Pétales lunaires",icon:"🌙",hue:"#dec3ff",family:"garden"},
  magmaring:{label:"Volcan incandescent",icon:"🌋",hue:"#ff5633",family:"fire"},
  nebulabloom:{label:"Floraison cosmique",icon:"🌌",hue:"#75e9ff",family:"garden"}
};
const aliases={
 frame:{amethyst:["#c279ff","crystal"],cyanfire:["#43e4ff","fire"],pinkfire:["#fc7bb7","fire"],solar:["#fcd271","celestial"],floral:["#f5a9cc","garden"],royal:["#f3c769","rune"],sunflower:["#ffcc55","garden"],pearls:["#c5dfff","celestial"],darkvine:["#7fc79a","garden"],moonstars:["#c5aeff","celestial"],frost:["#a7e7fc","crystal"],leopard:["#f0c37a","garden"],flame:["#ff7755","fire"]},
 avatar:{colosseum:["#cfab69","rune"],crystal:["#af75fa","crystal"],fire:["#ff7755","fire"],halo:["#f4d87c","celestial"],flowers:["#f4abc6","garden"],neon:["#8e7bff","rune"],viking:["#e1ad63","rune"],skull:["#d3dfed","rune"],radioactive:["#c3fc43","rune"],crown:["#ffe18d","celestial"],diamond:["#a1b8ff","crystal"],stars:["#f4cb7b","celestial"],dino:["#91eb9b","garden"]}
};
function seedFor(key){let seed=1234567;for(const c of key)seed=(Math.imul(seed,31)+c.charCodeAt(0))|0;return seed>>>0}
function rand(seed){let v=seed;return()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296}}
const f=n=>Number(n).toFixed(1);
function crystal(x,y,w,h,color,rotation=0){
  // Resolution-independent, sharp multi-facet gemstone with individually edged planes.
  return '<g transform="translate('+f(x)+' '+f(y)+') rotate('+f(rotation)+')">'+
   '<path d="M0 '+f(-h)+' L'+f(-w*.63)+' '+f(-h*.24)+' L'+f(-w*.46)+' '+f(h*.50)+' L0 '+f(h*.66)+' L'+f(w*.48)+' '+f(h*.41)+' L'+f(w*.64)+' '+f(-h*.27)+' Z" fill="url(#gem)" stroke="'+color+'" stroke-width="1.9" stroke-linejoin="round"/>'+
   '<path d="M0 '+f(-h)+' L'+f(-w*.63)+' '+f(-h*.24)+' L'+f(-w*.17)+' '+f(-h*.08)+' Z" fill="#fff" opacity=".58"/>'+
   '<path d="M0 '+f(-h)+' L'+f(w*.64)+' '+f(-h*.27)+' L'+f(w*.20)+' '+f(-h*.11)+' Z" fill="#fff" opacity=".23"/>'+
   '<path d="M'+f(-w*.63)+' '+f(-h*.24)+' L'+f(-w*.46)+' '+f(h*.50)+' L0 '+f(h*.66)+' L'+f(-w*.17)+' '+f(-h*.08)+' Z" fill="#090421" opacity=".40"/>'+
   '<path d="M'+f(w*.64)+' '+f(-h*.27)+' L'+f(w*.48)+' '+f(h*.41)+' L0 '+f(h*.66)+' L'+f(w*.20)+' '+f(-h*.11)+' Z" fill="#0c0929" opacity=".38"/>'+
   '<path d="M'+f(-w*.17)+' '+f(-h*.08)+' L0 '+f(h*.66)+' L'+f(w*.20)+' '+f(-h*.11)+' L0 '+f(-h)+' Z" fill="#fff" opacity=".22"/>'+
   '<path d="M0 '+f(-h)+' L'+f(-w*.17)+' '+f(-h*.08)+' L0 '+f(h*.66)+' L'+f(w*.20)+' '+f(-h*.11)+' Z" fill="none" stroke="#fff" stroke-opacity=".56" stroke-width=".9"/>'+
   '<path d="M'+f(-w*.49)+' '+f(-h*.24)+' L'+f(-w*.24)+' '+f(-h*.41)+'" stroke="#fff" stroke-opacity=".85" stroke-width="2.6" stroke-linecap="round"/>'+
   '<circle cx="'+f(-w*.25)+'" cy="'+f(-h*.43)+'" r="2.3" fill="#fff" opacity=".91"/></g>';
}
function flower(x,y,s,rng){
  const petals=Array.from({length:5},(_,i)=>'<ellipse cx="0" cy="'+f(-s*.46)+'" rx="'+f(s*.32)+'" ry="'+f(s*.52)+'" fill="url(#gem)" stroke="#fff" stroke-opacity=".28" transform="rotate('+(i*72)+')"/>').join('');
  return '<g transform="translate('+f(x)+' '+f(y)+') rotate('+f(rng()*360)+') scale('+f(.7+rng()*.6)+')" filter="url(#shine)">'+petals+'<circle r="'+f(s*.2)+'" fill="#ffe9a7" /></g>';
}
function star(x,y,s){return '<path d="M'+f(x)+' '+f(y-s)+' Q'+f(x+s*.22)+' '+f(y-s*.22)+' '+f(x+s)+' '+f(y)+' Q'+f(x+s*.22)+' '+f(y+s*.22)+' '+f(x)+' '+f(y+s)+' Q'+f(x-s*.22)+' '+f(y+s*.22)+' '+f(x-s)+' '+f(y)+' Q'+f(x-s*.22)+' '+f(y-s*.22)+' '+f(x)+' '+f(y-s)+' Z" fill="#fff8d8" filter="url(#glow)" opacity=".9"/>'}
function fire(x,y,s,r){return '<path d="M'+f(x)+' '+f(y+s*.6)+' Q'+f(x-s*.6)+' '+f(y-s*.2)+' '+f(x+s*(r-.5))+' '+f(y-s)+' Q'+f(x+s*.7)+' '+f(y-s*.3)+' '+f(x+s*.2)+' '+f(y+s*.45)+' Z" fill="url(#gem)" filter="url(#shine)" stroke="#ffd4a0" stroke-opacity=".55"/>'}
function piece(family,x,y,size,rng,color,rot=0){
if(family==="garden")return flower(x,y,size*.48,rng);
if(family==="fire")return fire(x,y,size,rng(),rot);
if(family==="celestial")return star(x,y,size*.45);
if(family==="rune")return '<g transform="translate('+f(x)+' '+f(y)+') rotate('+f(rot)+')" filter="url(#shine)"><path d="M0 '+f(-size*.5)+' L'+f(size*.42)+' 0 L0 '+f(size*.5)+' L'+f(-size*.42)+' 0Z" fill="url(#gem)" stroke="#fff9" stroke-width="1.5"/><circle r="'+f(size*.17)+'" fill="#fff7"/></g>';
return crystal(x,y,size*.5,size*.86,color,rot);
}
function frameArt(key,meta){
  const rng=rand(seedFor(key)),family=meta.family,hue=meta.hue,shapes=[];
  // Three clean metal-and-crystal rails remain visible even on Retina mobile cards.
  shapes.push('<rect x="42" y="48" width="556" height="344" rx="44" fill="none" stroke="'+hue+'" stroke-opacity=".22" stroke-width="15" filter="url(#glow)"/>');
  shapes.push('<rect x="45" y="51" width="550" height="338" rx="40" fill="none" stroke="url(#gold)" stroke-width="5.4" opacity=".98"/>');
  shapes.push('<rect x="55" y="61" width="530" height="318" rx="34" fill="none" stroke="#fff" stroke-opacity=".52" stroke-width="1.6"/>');
  shapes.push('<rect x="66" y="72" width="508" height="296" rx="25" fill="none" stroke="'+hue+'" stroke-opacity=".57" stroke-width="2.0"/>');
  shapes.push('<path d="M116 57 H521 M116 383 H521" fill="none" stroke="#fff" stroke-opacity=".58" stroke-width="1.3"/>');
  for(let i=0;i<46;i++){
    const group=i%4;
    let x,y,ang;
    if(group===0){x=55+rng()*530;y=52+rng()*17;ang=-25+rng()*50}
    else if(group===1){x=55+rng()*530;y=381+rng()*8;ang=150+rng()*60}
    else if(group===2){x=50+rng()*13;y=75+rng()*290;ang=-100+rng()*45}
    else{x=586+rng()*10;y=75+rng()*290;ang=55+rng()*50}
    const size=(family==="crystal"?29:22)+rng()*46;
    shapes.push(piece(family,x,y,size,rng,hue,ang));
  }
  for(let i=0;i<52;i++){let x=15+rng()*610,y=22+rng()*390;if(x>90&&x<555&&y>108&&y<345)continue;shapes.push(star(x,y,1+rng()*3))}
  for(const [x,y] of [[46,55],[595,56],[44,386],[596,384]])shapes.push(star(x,y,11));
  return shapes.join("");
}
function avatarArt(key,meta){
 const rng=rand(seedFor(key)),family=meta.family,hue=meta.hue,o=[];
 o.push('<circle cx="200" cy="200" r="163" fill="none" stroke="'+hue+'" stroke-width="13" stroke-opacity=".28" filter="url(#glow)"/>');
 o.push('<circle cx="200" cy="200" r="160" fill="none" stroke="url(#gold)" stroke-width="5.2" opacity=".98"/>');
 o.push('<circle cx="200" cy="200" r="152" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="1.6"/>');
 o.push('<circle cx="200" cy="200" r="146" fill="none" stroke="url(#gem)" stroke-width="2.7" opacity=".82"/>');
 const n=family==="crystal"?30:family==="celestial"?23:family==="garden"?27:family==="fire"?40:32;
 for(let i=0;i<n;i++){const angle=Math.PI*2*i/n+rng()*.17;const radius=159+(rng()-.5)*14;const x=200+Math.cos(angle)*radius,y=200+Math.sin(angle)*radius;
 o.push(piece(family,x,y,22+rng()*30,rng,hue,angle*180/Math.PI+90));
 }
 for(let i=0;i<29;i++){const angle=rng()*Math.PI*2,rr=175+rng()*21;o.push(star(200+Math.cos(angle)*rr,200+Math.sin(angle)*rr,1.5+rng()*3.5))}
 return o.join("");
}
export function renderCmdPremiumSvg(type,key){
 if(!/^[a-z0-9]{2,28}$/.test(key))return null;
 const own=type==="frame"?CMD_ART_FRAMES[key]:type==="avatar"?CMD_ART_AVATARS[key]:null;
 const fallback=(aliases[type]||{})[key];const meta=own||(fallback?{hue:fallback[0],family:fallback[1]}:null);
 if(!meta)return null;
 const isFrame=type==="frame",view=isFrame?"0 0 640 440":"0 0 400 400",content=isFrame?frameArt(key,meta):avatarArt(key,meta);
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+view+'" fill="none" aria-hidden="true"><defs>'+
 '<linearGradient id="gem" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff6" offset="0"/><stop stop-color="'+meta.hue+'" offset=".4"/><stop stop-color="'+meta.hue+'" offset=".7"/><stop stop-color="#130824" offset="1"/></linearGradient>'+
 '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+meta.hue+'" offset="0"/><stop stop-color="#fff" offset=".4"/><stop stop-color="'+meta.hue+'" offset="1"/></linearGradient>'+
 '<filter id="shine" x="-35%" y="-35%" width="170%" height="170%"><feDropShadow dx="0" dy="1" stdDeviation=".35" flood-color="#110623" flood-opacity=".28"/></filter>'+
 '<filter id="glow" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="2"/></filter>'+
 '</defs>'+content+'</svg>';
}
export const CMD_PREMIUM_ART_CSS=`
.cmd-empty-art{display:grid;place-items:center;width:100%;height:100%;font-size:32px;color:#b1abc2}

.cmd-premium-art{position:relative;display:block;pointer-events:none;user-select:none;object-fit:contain;z-index:4}
.art.cmd-gem-art{height:190px;background:radial-gradient(ellipse at 50% 15%,#75409d55,#141320 72%);overflow:hidden;border-radius:16px}
.cmd-gem-art .cmd-gem-mock{position:absolute;inset:18% 15% 12%;border-radius:13px;background:linear-gradient(130deg,#2b203b,#171823);border:1px solid #ffffff2b;box-shadow:inset 0 1px #ffffff28}
.cmd-gem-art .cmd-gem-mock .cmd-gem-avatar{position:absolute;left:14%;top:17%;width:52px;height:52px;border-radius:50%;background:linear-gradient(120deg,#7564ba,#30426e);border:2px solid #d7cbff55}
.cmd-gem-art .cmd-gem-mock .cmd-gem-avatar:before{content:"";position:absolute;left:17px;top:10px;width:16px;height:16px;border-radius:50%;background:#d8d5e6}
.cmd-gem-art .cmd-gem-mock .cmd-gem-avatar:after{content:"";position:absolute;left:11px;top:31px;width:28px;height:13px;border-radius:50% 50% 30% 30%;background:#d8d5e6}
.cmd-gem-art .cmd-gem-mock i{position:absolute;left:70px;right:10%;height:6px;top:37%;border-radius:3px;background:#a5a0bd55}
.cmd-gem-art .cmd-gem-mock i:last-child{top:55%;right:29%;background:#a5a0bd33}
.cmd-gem-art>img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 7px #af7ff777)}
.cmd-gem-art.cmd-avatar-art{height:190px}
.cmd-avatar-art .cmd-gem-mock{inset:21% 30%;aspect-ratio:1;border-radius:50%;background:#271d39}
.cmd-avatar-art>img{inset:5%;width:90%;height:90%;object-fit:contain}
.diamondCard .cmd-gem-art{height:285px}
.diamondCard .cmd-gem-art>img{filter:drop-shadow(0 0 12px #ac9cff99)}
.diamondCard .cmd-gem-mock{inset:22% 20% 15%}
.diamondCard .cmd-avatar-art .cmd-gem-mock{inset:22% 33%}
.cmd-profile-art-frame{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:5;filter:drop-shadow(0 0 9px #ad79e877)}
.cmd-profile-art-avatar{position:absolute;left:9px;top:-89px;width:180px;height:180px;object-fit:contain;pointer-events:none;z-index:7}
.frameThumb img.cmd-frame-thumb{width:100%;height:100%;object-fit:contain;position:absolute;inset:0;filter:drop-shadow(0 0 6px #9c7bfc88)}
.avatarThumb img.cmd-avatar-thumb{width:100%;height:100%;object-fit:contain;position:absolute;inset:0}
.frameThumb:has(img),.avatarThumb:has(img){position:relative}
.cmd-shop-row-note{color:#a5b9d8;font-size:12px}
.cmd-showcase-intro{padding:12px 14px;background:linear-gradient(135deg,#221732,#18283d);border:1px solid #865fe16b;border-radius:16px;margin:14px 0}
.cmd-showcase-intro strong{font-size:17px;color:#f0dbff}
.cmd-showcase-intro p{font-size:13px;color:#c8b6dd;margin:5px 0}
.cmd-shop-invite-link{display:block;padding:8px 10px;border:1px solid #8166a5;border-radius:8px;color:#e0c6ff;text-decoration:none}
@media(prefers-reduced-motion:no-preference){.cmd-gem-art>img{animation:cmdGemShimmer 4.8s ease-in-out infinite}@keyframes cmdGemShimmer{50%{filter:brightness(1.24) drop-shadow(0 0 13px #c18affdd)}}}
@media(max-width:600px){.art.cmd-gem-art{height:160px}.cmd-premium-art{max-width:100%}.cmd-profile-art-avatar{width:180px;height:180px}}
`;

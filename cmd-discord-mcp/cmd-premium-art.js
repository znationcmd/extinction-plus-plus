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

/* Original CMD Sphere effect illustrations: vectors designed for Retina previews,
   accessible without copyrighted thumbnails and independent of emoji fonts. */
const CMD_EFFECT_ART={
 zombie:{hue:"#92d6a8"},ghostship:{hue:"#88c1f2"},purplelightning:{hue:"#b785ff"},
 moonmist:{hue:"#d2c9ff"},shadow:{hue:"#7987bd"},apocalypse:{hue:"#f27a7a"},
 stars:{hue:"#f0d58e"},pulse:{hue:"#ec8df5"},aurora:{hue:"#82f2c9"},sparkle:{hue:"#8ddfff"}
};
function effectArt(key,meta){
 const r=rand(seedFor(key)),h=meta.hue;
 let base='<rect width="640" height="360" fill="#0a0b19"/>'+
 '<rect width="640" height="360" fill="url(#sceneGlow)" opacity=".62"/>'+
 '<path d="M0 305 Q165 255 320 296 T640 278 L640 360 H0Z" fill="#101325" opacity=".74"/>';
 for(let i=0;i<64;i++){
  const x=f(r()*640),y=f(14+r()*315),z=f(.55+r()*1.8);
  base+='<circle cx="'+x+'" cy="'+y+'" r="'+z+'" fill="'+(i%3===0?h:'#d9d4f1')+'" opacity="'+f(.16+r()*.58)+'"/>';
 }
 const moon='<circle cx="494" cy="83" r="48" fill="url(#moon)" filter="url(#softAura)"/><circle cx="494" cy="83" r="45" fill="#f7f5fa" opacity=".85"/><circle cx="484" cy="68" r="8" fill="#adabd6" opacity=".24"/><circle cx="512" cy="99" r="11" fill="#b5b4d7" opacity=".22"/>';
 const mist='<path d="M-25 275 Q100 227 205 271 T438 265 T665 265" stroke="#d7dfff" stroke-width="38" opacity=".13" fill="none" filter="url(#aura)"/><path d="M-10 309 Q165 281 325 309 T655 298" stroke="#f3ecff" stroke-width="18" opacity=".15" fill="none" filter="url(#aura)"/>';
 const flash=(x,y,s)=>'<path transform="translate('+x+' '+y+') scale('+s+')" d="M-15 -36 L19 -36 L1 -6 L24 -6 L-24 43 L-7 6 L-30 6Z" fill="url(#gem)" stroke="#fff6" stroke-width="2"/>';
 const sparkle=(x,y,s)=>'<path d="M'+x+' '+(y-s)+' L'+(x+s*.18)+' '+(y-s*.17)+' L'+(x+s)+' '+y+' L'+(x+s*.18)+' '+(y+s*.17)+' L'+x+' '+(y+s)+' L'+(x-s*.18)+' '+(y+s*.17)+' L'+(x-s)+' '+y+' L'+(x-s*.18)+' '+(y-s*.17)+'Z" fill="#fff" stroke="'+h+'" stroke-width="2"/>';
 let main='';
 if(key==='zombie'){
  main=mist+'<path d="M235 323 Q230 250 254 215 Q263 192 286 188 L287 169 Q274 152 277 122 Q281 90 319 84 Q354 85 367 113 Q375 139 353 162 L352 191 Q379 205 392 245 L406 330Z" fill="#172f32" stroke="#98d9b6" stroke-width="3"/>'+
   '<path d="M283 124 L308 112 L320 131 L341 112 L365 124" fill="none" stroke="#9dcab8" stroke-width="3"/>'+
   '<ellipse cx="303" cy="142" rx="11" ry="7" fill="#e7ff95"/><ellipse cx="346" cy="142" rx="11" ry="7" fill="#e7ff95"/>'+
   '<path d="M315 168 L328 170 L334 166 M310 179 L337 180" stroke="#83bba0" stroke-width="2"/>'+
   '<path d="M226 318 Q183 251 177 242 L164 221 M401 311 Q452 262 460 239 L472 221" stroke="#7ba999" stroke-width="17" fill="none" stroke-linecap="round"/>';
 }else if(key==='ghostship'){
  main=moon+mist+'<path d="M100 280 Q320 298 534 272 L489 328 Q320 356 154 319Z" fill="#101523" stroke="#add8ff" stroke-width="3"/>'+
   '<path d="M319 95 L319 285 M206 148 L206 282 M435 174 L435 286" stroke="#abc5ed" stroke-width="5"/>'+
   '<path d="M313 100 L313 244 L227 243 Q256 152 313 100Z" fill="#90b8de" opacity=".66"/>'+
   '<path d="M324 110 L409 241 L324 240Z" fill="#d2e6ff" opacity=".47"/>'+
   '<path d="M203 153 L203 246 L147 248 Q163 189 203 153Z" fill="#b9d6ff" opacity=".4"/>'+
   '<path d="M431 182 L483 248 L431 248Z" fill="#95c6ea" opacity=".4"/>'+
   '<path d="M184 286 H470" stroke="#7cb7d4" stroke-width="5" opacity=".4"/>';
 }else if(key==='purplelightning'){
  main='<path d="M340 -20 L245 124 L326 122 L221 318 L402 98 L317 104 L384 -20Z" fill="#be85ff" stroke="#fff" stroke-width="4" filter="url(#softAura)"/>'+
   '<path d="M336 -12 L263 128 L330 132 L256 261 L376 86 L312 93Z" fill="#faf1ff"/>'+
   '<path d="M246 126 L170 177 L134 250 M371 111 L460 165 L504 120 M260 245 L192 297" fill="none" stroke="#c291ff" stroke-width="5" opacity=".8"/>'+
   '<circle cx="328" cy="165" r="109" fill="none" stroke="#a670ff" stroke-width="2" opacity=".22"/>';
 }else if(key==='moonmist'){
  main=moon+mist+'<path d="M0 260 Q110 172 225 261 T460 260 T640 255 L640 360 H0Z" fill="#1a1c35"/>'+
   '<path d="M-10 285 Q155 250 305 280 T650 278" stroke="#b9c5fb" stroke-opacity=".36" stroke-width="12" fill="none" filter="url(#softAura)"/>';
 }else if(key==='shadow'){
  for(let i=0;i<11;i++){const xx=f(i*71-40),yy=f(175+r()*65),bend=f((r()-.5)*60);
   main+='<path d="M'+xx+' 360 Q'+f(xx-30)+' '+yy+' '+f(Number(xx)+Number(bend))+' 107" stroke="#555e9b" stroke-width="'+f(8+r()*26)+'" stroke-opacity=".5" fill="none" filter="url(#aura)"/>';
  }
  main+='<circle cx="321" cy="163" r="67" fill="#101021" stroke="#6e74bd" stroke-width="2"/>'+
   '<path d="M282 174 Q303 154 322 179 Q345 151 366 174" stroke="#deccff" stroke-width="7" opacity=".8" fill="none"/>';
 }else if(key==='apocalypse'){
  main='<circle cx="318" cy="163" r="97" fill="#ed684d" opacity=".25" filter="url(#aura)"/>'+
   '<circle cx="318" cy="159" r="72" fill="url(#sun)" stroke="#ffc19a" stroke-width="4"/>'+
   '<path d="M0 286 L55 286 L55 231 L83 231 L83 268 L144 268 L144 187 L181 187 L181 255 L241 255 L241 221 L278 221 L278 267 L333 267 L333 197 L378 197 L378 245 L417 245 L417 218 L466 218 L466 271 L520 271 L520 227 L580 227 L580 286 L640 286 L640 360 H0Z" fill="#10101c" stroke="#f86d5b" stroke-opacity=".5" stroke-width="2"/>'+
   '<path d="M85 280 L107 232 L130 280 M260 279 L294 217 L325 280 M445 276 L480 206 L514 276" stroke="#ffad6b" stroke-width="2" opacity=".6"/>';
 }else if(key==='stars'){
  main=moon+'<path d="M55 74 Q220 165 547 231" stroke="#f8ebae" stroke-opacity=".24" stroke-width="80" fill="none" filter="url(#aura)"/>';
  for(let i=0;i<18;i++)main+=sparkle(f(r()*620),f(r()*320),5+r()*14);
 }else if(key==='pulse'){
  main='<circle cx="320" cy="175" r="38" fill="url(#gem)" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>';
  for(const rad of [64,105,148]){
   main+='<circle cx="320" cy="175" r="'+rad+'" stroke="'+h+'" stroke-opacity="'+(rad===64?'.92':rad===105?'.63':'.33')+'" stroke-width="'+(rad===64?'6':'3')+'" fill="none"/>';
  }
  main+='<path d="M22 174 H174 L211 120 L256 238 L291 175 H355 L387 125 L418 216 L446 175 H620" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>';
 }else if(key==='aurora'){
  for(let i=0;i<7;i++){const x=i*34,opacity=f(.23+i*.05);
   main+='<path d="M'+(x-100)+' -32 Q'+(130+x)+' 70 '+(160+x)+' 200 T'+(500+x)+' 330" stroke="'+(i%2?'#8cf8df':'#bda5ff')+'" stroke-width="'+(21+i*7)+'" stroke-opacity="'+opacity+'" fill="none" filter="url(#aura)"/>';
  }
  main+=mist;
 }else if(key==='sparkle'){
  for(let i=0;i<10;i++){const x=f(92+r()*455),y=f(38+r()*250),size=9+r()*18;main+=sparkle(Number(x),Number(y),size);}
  main+='<path d="M320 35 L407 139 L320 296 L231 139Z" fill="url(#gem)" stroke="#dcfbff" stroke-width="5"/>'+
   '<path d="M231 139 H407 L320 296Z" fill="#7acaff" opacity=".42"/>'+
   '<path d="M320 35 L272 139 H366Z" fill="#fff" opacity=".46"/>'+
   '<path d="M231 139 L320 35 L272 139 M407 139 L320 35 L366 139" stroke="#fff" stroke-opacity=".8" stroke-width="3" fill="none"/>';
 }
 return base+main+'<rect x="2" y="2" width="636" height="356" rx="26" fill="none" stroke="'+h+'" stroke-opacity=".22" stroke-width="4"/>';
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
 const own=type==="frame"?CMD_ART_FRAMES[key]:type==="avatar"?CMD_ART_AVATARS[key]:type==="effect"?CMD_EFFECT_ART[key]:null;
 const fallback=(aliases[type]||{})[key];const meta=own||(fallback?{hue:fallback[0],family:fallback[1]}:null);
 if(!meta)return null;
 const isFrame=type==="frame",isEffect=type==="effect",view=isFrame?"0 0 640 440":isEffect?"0 0 640 360":"0 0 400 400",content=isFrame?frameArt(key,meta):isEffect?effectArt(key,meta):avatarArt(key,meta);
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+view+'" fill="none" aria-hidden="true"><defs>'+
 '<linearGradient id="gem" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff6" offset="0"/><stop stop-color="'+meta.hue+'" offset=".4"/><stop stop-color="'+meta.hue+'" offset=".7"/><stop stop-color="#130824" offset="1"/></linearGradient>'+
 '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+meta.hue+'" offset="0"/><stop stop-color="#fff" offset=".4"/><stop stop-color="'+meta.hue+'" offset="1"/></linearGradient>'+
 '<filter id="shine" x="-35%" y="-35%" width="170%" height="170%"><feDropShadow dx="0" dy="1" stdDeviation=".35" flood-color="#110623" flood-opacity=".28"/></filter>'+
 '<filter id="glow" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="2"/></filter>'+'<filter id="aura" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="11"/></filter>'+'<filter id="softAura" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="1.5"/></filter>'+'<radialGradient id="sceneGlow"><stop stop-color="'+meta.hue+'" stop-opacity=".8"/><stop offset="1" stop-color="#12132b" stop-opacity="0"/></radialGradient>'+'<radialGradient id="moon"><stop stop-color="#fff"/><stop offset="1" stop-color="#cbd5fb"/></radialGradient>'+'<radialGradient id="sun"><stop stop-color="#ffe2a1"/><stop offset=".6" stop-color="#ec7642"/><stop offset="1" stop-color="#7f2536"/></radialGradient>'+
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
.cmd-effect-preview{display:block;overflow:hidden;background:#080817!important}
.cmd-effect-preview img{width:100%;height:100%;object-fit:cover;image-rendering:auto;filter:none}
.cmd-effect-preview[data-active="true"] img{filter:brightness(1.09)}
@media(prefers-reduced-motion:no-preference){.effectTile:hover .cmd-effect-preview img,.effectTile.selected .cmd-effect-preview img{animation:cmdEffectSceneBreathe 5s ease-in-out infinite alternate}@keyframes cmdEffectSceneBreathe{from{filter:brightness(.9) saturate(.85)}to{filter:brightness(1.23) saturate(1.12)}}}
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

import { readFileSync } from "node:fs";
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
  sakuraring:{label:"Couronne de roses",icon:"🌸",hue:"#ffa3d6",family:"garden"},
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
function star(x,y,s){return '<path d="M'+f(x)+' '+f(y-s)+' Q'+f(x+s*.22)+' '+f(y-s*.22)+' '+f(x+s)+' '+f(y)+' Q'+f(x+s*.22)+' '+f(y+s*.22)+' '+f(x)+' '+f(y+s)+' Q'+f(x-s*.22)+' '+f(y+s*.22)+' '+f(x-s)+' '+f(y)+' Q'+f(x-s*.22)+' '+f(y-s*.22)+' '+f(x)+' '+f(y-s)+' Z" fill="#fff8d8" opacity=".9"/>'}
function fire(x,y,s,r){return '<path d="M'+f(x)+' '+f(y+s*.6)+' Q'+f(x-s*.6)+' '+f(y-s*.2)+' '+f(x+s*(r-.5))+' '+f(y-s)+' Q'+f(x+s*.7)+' '+f(y-s*.3)+' '+f(x+s*.2)+' '+f(y+s*.45)+' Z" fill="url(#gem)" filter="url(#shine)" stroke="#ffd4a0" stroke-opacity=".55"/>'}
function piece(family,x,y,size,rng,color,rot=0){
if(family==='frost')return '<g transform="translate('+f(x)+' '+f(y)+') rotate('+f(rot)+')" stroke="#d9f7ff" stroke-width="1.5" stroke-linecap="round">'+Array.from({length:6},(_,i)=>'<path transform="rotate('+(i*60)+')" d="M0 0V-'+f(size*.7)+' M0 -'+f(size*.42)+'l-'+f(size*.19)+' -'+f(size*.15)+' M0 -'+f(size*.42)+'l'+f(size*.19)+' -'+f(size*.15)+'"/>').join('')+'<circle r="3" fill="'+color+'"/></g>';
if(family==='leaf')return '<g transform="translate('+f(x)+' '+f(y)+') rotate('+f(rot)+')"><path d="M0 22C-38 2-22-29 0-34C22-13 35 8 0 22Z" fill="url(#gem)" stroke="'+color+'"/><path d="M0 23V-29M0-14L-12-20M0-3L15-13M0 8L-16-3" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/></g>';
if(family==='rose')return '<g transform="translate('+f(x)+' '+f(y)+') scale('+f(size/28)+')"><path d="M-5 8Q-34-15-33 18Q-18 30-5 8M5 8Q34-15 33 18Q18 30 5 8" fill="#245f51" stroke="#75b99d"/>'+[0,60,120,180,240,300].map(a=>'<path transform="rotate('+a+')" d="M0 0C-26-7-20-34-3-27C15-40 31-16 10 2Z" fill="url(#gem)" stroke="#ffbadb" stroke-width="1"/>').join('')+'<path d="M-8 6C-19-16 15-22 15-4C15 12-8 17-8-1C-8-10 6-10 6-3" stroke="#ffe3ee" stroke-width="1.5" fill="none"/></g>';
if(family==='pearl')return '<g transform="translate('+f(x)+' '+f(y)+')"><circle r="'+f(size*.45)+'" fill="url(#pearl)" stroke="#f8e9ff"/><ellipse cx="'+f(-size*.14)+'" cy="'+f(-size*.16)+'" rx="'+f(size*.16)+'" ry="'+f(size*.09)+'" fill="white" opacity=".85"/></g>';
if(family==='moon')return '<g transform="translate('+f(x)+' '+f(y)+') rotate('+f(rot)+')"><path d="M9-24A25 25 0 1 0 9 24A24 24 0 0 1 9-24Z" fill="url(#gold)" stroke="#eee5ff"/>'+star(20,-10,5)+'</g>';
if(family==='sunflower')return '<g transform="translate('+f(x)+' '+f(y)+') scale('+f(size/25)+')">'+Array.from({length:14},(_,i)=>'<ellipse cy="-17" rx="5" ry="12" transform="rotate('+(i*360/14)+')" fill="#f5c346" stroke="#ffe9a0" stroke-width=".6"/>').join('')+'<circle r="10" fill="#4b2c23" stroke="#b98a49"/><circle r="6" fill="none" stroke="#d0a767" stroke-dasharray="1 2"/></g>';
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
  // Branched discharge with a white core, instead of an emoji-shaped bolt.
  for(let k=0;k<4;k++){
   let x=130+k*135,y=-10,points=[[x,y]];
   for(let j=0;j<13;j++){x+=(r()-.5)*65;y+=23+r()*14;points.push([x,y]);}
   const d=points.map(([px,py],i)=>(i?'L':'M')+f(px)+' '+f(py)).join(' ');
   main+='<path d="'+d+'" stroke="#ad68ff" stroke-width="12" opacity=".35" filter="url(#aura)"/><path d="'+d+'" stroke="#bd8aff" stroke-width="4"/><path d="'+d+'" stroke="#fff7ff" stroke-width="1.3"/>';
   for(let j=3;j<11;j+=3){const [bx,by]=points[j],sign=j%2?1:-1;main+='<path d="M'+f(bx)+' '+f(by)+'l'+f(sign*35)+' 18 '+f(sign*8)+' 26 '+f(sign*31)+' 12 '+f(sign*18)+' 32" stroke="#d9b5ff" stroke-width="1.2"/>';}
  }
  main+='<path d="M0 325L64 294L115 309L178 276L247 306L341 285L402 317L483 288L560 307L640 278V360H0Z" fill="#090917"/>';
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
  for(let i=0;i<85;i++){
   const x=i*9-60,yy=45+Math.sin(i*.10)*25;
   main+='<path d="M'+x+' -15Q'+(x-45)+' '+yy+' '+(x+20)+' '+(yy+75)+'T'+(x+110)+' '+(yy+145)+'" stroke="'+(i%3?'#75ebc4':'#ba8cff')+'" stroke-width="'+(i%4===0?'6':'2')+'" stroke-opacity="'+(.08+(Math.sin(i*.17)+1)*.11).toFixed(2)+'" fill="none"/>';
  }
  main+='<path d="M0 314L83 249L140 286L218 206L301 284L363 234L468 305L543 240L640 302V360H0Z" fill="#090e1c" stroke="#466578" stroke-width="1"/><path d="M191 238L218 206L248 235L223 224L211 230Z M522 262L543 240L567 260L546 252Z" fill="#b4d4df" opacity=".5"/>';
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
 const rng=rand(seedFor(key)),{family,hue}=meta,o=[];
 const botanical=['garden','rose','leaf','sunflower'].includes(family);
 const fireFamily=family==='fire';
 // Carved metal rails and individual motifs keep the centre transparent.
 o.push('<rect x="39" y="39" width="562" height="362" rx="29" stroke="#090711" stroke-width="14"/><rect x="39" y="39" width="562" height="362" rx="29" stroke="url(#metal)" stroke-width="7"/><rect x="45" y="45" width="550" height="350" rx="25" stroke="'+hue+'" stroke-opacity=".7" stroke-width="1"/>');
 if(botanical){
  for(const [x,sign] of [[40,1],[600,-1]]){
   o.push('<path d="M'+x+' 355C'+(x+sign*43)+' 296 '+(x-sign*23)+' 245 '+x+' 199S'+(x+sign*39)+' 106 '+x+' 70" stroke="#497f64" stroke-width="5" fill="none"/>');
   for(let i=0;i<7;i++)o.push('<g transform="translate('+(x+sign*(i%2?12:-4))+' '+(90+i*40)+') scale(.44)">'+piece('leaf',0,0,25,rng,'#72af8b',i%2?55:-55)+'</g>');
  }
 }
 if(fireFamily){
  for(let i=0;i<17;i++)for(const y of [40,397])o.push('<g transform="translate('+(75+i*30)+' '+y+') rotate('+(y===40?180:0)+')">'+fire(0,0,18+rng()*20,rng())+'</g>');
 }
 if(family==='frost'){
  for(let i=0;i<12;i++)for(const y of [40,398])o.push(crystal(78+i*44,y,7,15+rng()*14,hue,y===40?180:0));
 }
 if(key==='leopard'){
  o.push('<rect x="40" y="40" width="560" height="360" rx="28" stroke="#d79743" stroke-width="12"/>');
  for(let i=0;i<28;i++){const x=65+i*19;for(const y of [41,398])o.push('<ellipse cx="'+x+'" cy="'+y+'" rx="6" ry="4" stroke="#251614" stroke-width="3" fill="#976338" transform="rotate('+(i%2?20:-20)+' '+x+' '+y+')"/>')}
 }
 o.push('<rect x="38" y="38" width="564" height="364" rx="32" stroke="'+hue+'" stroke-opacity=".15" stroke-width="12"/>');
 o.push('<rect x="42" y="42" width="556" height="356" rx="28" stroke="url(#gold)" stroke-width="3"/><rect x="50" y="50" width="540" height="340" rx="22" stroke="'+hue+'" stroke-opacity=".5" stroke-width="1"/>');
 // Material-native SVG detail: luminous rails and fixed, prominent ornaments for every shop frame.
 o.push('<rect x="39" y="39" width="562" height="362" rx="29" fill="none" stroke="'+hue+'" stroke-opacity=".30" stroke-width="16" filter="url(#cmdOrnamentGlow)"/>');
 for(const [cx,cy] of [[54,54],[586,54],[586,386],[54,386]]){
  o.push('<circle cx="'+cx+'" cy="'+cy+'" r="38" fill="'+hue+'" fill-opacity=".13" filter="url(#cmdOrnamentGlow)"/>');
  o.push('<circle cx="'+cx+'" cy="'+cy+'" r="25" fill="none" stroke="'+hue+'" stroke-opacity=".62" stroke-width="2"/>');
 }
 // Symmetric corner jewellery: the central profile and its text remain unobstructed.
 for(const [x,y,angle] of [[54,54,-45],[586,54,45],[586,386,135],[54,386,225]]){
  o.push('<g transform="translate('+x+' '+y+') rotate('+angle+') scale(1.35)"><path d="M-27 40 Q-42 0 0 -32 Q42 0 27 40 M-18 27 Q-27 0 0 -22 Q27 0 18 27" stroke="url(#gold)" stroke-width="2"/>');
  o.push(piece(family,0,0,33,rng,hue,0));
  o.push(piece(family,-20,21,18,rng,hue,-28),piece(family,20,21,18,rng,hue,28));
  o.push('</g>');
 }
 for(const y of [43,397]){
  o.push('<path d="M235 '+y+' L285 '+y+' L300 '+(y-5)+' H340 L355 '+y+' H405" stroke="url(#gold)" stroke-width="2"/>');
  o.push(piece(family,320,y,20,rng,hue,90));
 }
 for(const x of [43,597])o.push('<path d="M'+x+' 186 l6 34 -6 34 -6 -34Z" fill="url(#gem)" stroke="'+hue+'"/>');
 return o.join('');
}
function avatarArt(key,meta){
 const rng=rand(seedFor(key)),{family,hue}=meta,o=[];
 o.push('<circle cx="200" cy="200" r="155" stroke="#08060c" stroke-width="13"/><circle cx="200" cy="200" r="155" stroke="url(#metal)" stroke-width="7"/>');
 if(['garden','rose','leaf','sunflower'].includes(family)){
  o.push('<path d="M200 46C105 32 28 132 45 217S122 364 211 355S367 282 355 185S283 40 200 46" stroke="#508e77" stroke-width="4"/>');
  for(let i=0;i<16;i++){const a=i*Math.PI/8;o.push('<g transform="translate('+f(200+Math.cos(a)*155)+' '+f(200+Math.sin(a)*155)+') scale(.4)">'+piece('leaf',0,0,25,rng,'#71b393',a*180/Math.PI)+'</g>')}
 }
 if(key==='colosseum'){
  for(let i=0;i<20;i++)o.push('<g transform="rotate('+(i*18)+' 200 200)"><path d="M186 65V43Q200 22 214 43V65" stroke="url(#gold)" stroke-width="6"/><path d="M184 67H216M185 37H215" stroke="#ead5a5" stroke-width="2"/></g>');
 }
 if(key==='neon'||key==='runicorbit'){
  for(let i=0;i<12;i++)o.push('<g transform="rotate('+(i*30)+' 200 200)"><path d="M196 30V59M203 35L213 43L203 51" stroke="'+(i%2?'#86eeff':'#d5afff')+'" stroke-width="2.5" stroke-linecap="round"/></g>');
 }
 o.push('<circle cx="200" cy="200" r="155" stroke="'+hue+'" stroke-width="10" stroke-opacity=".12"/><circle cx="200" cy="200" r="155" stroke="url(#gold)" stroke-width="3"/><circle cx="200" cy="200" r="148" stroke="'+hue+'" stroke-width="1" stroke-opacity=".65"/>');
 const n=key==='colosseum'||key==='neon'||key==='runicorbit'?0:family==='garden'?10:family==='fire'?24:family==='rose'?7:family==='pearl'?32:8;
 for(let i=0;i<n;i++){
  const angle=Math.PI*2*i/n-Math.PI/2,x=200+Math.cos(angle)*156,y=200+Math.sin(angle)*156;
  const size=family==='rose'?29:family==='pearl'?15:i%2===0?27:17;
  o.push(piece(family,x,y,size,rng,hue,angle*180/Math.PI+90));
 }
 for(let i=0;i<32;i++){
  const a=Math.PI*2*i/32;
  o.push('<circle cx="'+f(200+Math.cos(a)*143)+'" cy="'+f(200+Math.sin(a)*143)+'" r="1.3" fill="'+hue+'"/>');
 }
 // Recognisable insignias for legacy designs, instead of the same generic diamond.
 if(key==='skull')o.push('<g transform="translate(200 347)"><path d="M-20 0 Q-26 -30 0 -30 Q26 -30 20 0 L13 7 V17 H-13 V7Z" fill="#e2e8f0" stroke="#8896ad" stroke-width="2"/><ellipse cx="-9" cy="-7" rx="6" ry="7" fill="#131323"/><ellipse cx="9" cy="-7" rx="6" ry="7" fill="#131323"/><path d="M0 -2 l-4 8 h8Z M-6 9 v8 M0 9 v8 M6 9 v8" stroke="#131323"/></g>');
 if(key==='viking')o.push('<g transform="translate(200 48)"><path d="M-24 10 Q-27 -20 0 -25 Q27 -20 24 10Z" fill="url(#gold)" stroke="#f3dcac" stroke-width="2"/><path d="M-22 -8 Q-49 -5 -45 -34 Q-38 -20 -24 -23 M22 -8 Q49 -5 45 -34 Q38 -20 24 -23" fill="#eee0bd"/><path d="M0 -25 V13" stroke="#30263a" stroke-width="5"/></g>');
 if(key==='radioactive')o.push('<g transform="translate(200 350)"><circle r="23" fill="#c3fc43"/><circle r="5" fill="#14220f"/>'+[0,120,240].map(a=>'<path d="M-5 -8 L-11 -18 A21 21 0 0 1 11 -18 L5 -8Z" fill="#14220f" transform="rotate('+a+')"/>').join('')+'</g>');
 return o.join('');
}
export function renderCmdPremiumSvg(type,key){
 // First replacement artwork: genuine standalone scalable ornament, shared by shop and profile.
 if(type==="avatar"&&key==="amethystorbit")return readFileSync(new URL("./public/shop-4k/decorations/orbite-amethyste.svg",import.meta.url),"utf8");
 if(!/^[a-z0-9]{2,28}$/.test(key))return null;
 const own=type==="frame"?CMD_ART_FRAMES[key]:type==="avatar"?CMD_ART_AVATARS[key]:type==="effect"?CMD_EFFECT_ART[key]:null;
 const fallback=(aliases[type]||{})[key];let meta=own||(fallback?{hue:fallback[0],family:fallback[1]}:null);
 if(!meta)return null;
 // Recognisable materials and silhouettes; IDs stay stable for saved profiles.
 const families={glacialcrown:'frost',frosthalo:'frost',frost:'frost',cyanfire:'fire',pinkfire:'fire',midnightrose:'rose',autumnember:'leaf',darkvine:'leaf',moonstone:'moon',moonstars:'moon',moonpetals:'moon',pearls:'pearl',sunflower:'sunflower'};
 meta={...meta,family:families[key]||meta.family};
 const isFrame=type==="frame",isEffect=type==="effect",view=isFrame?"0 0 640 440":isEffect?"0 0 640 360":"0 0 400 400",content=isFrame?frameArt(key,meta):isEffect?effectArt(key,meta):avatarArt(key,meta);
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+view+'" width="'+(isFrame?3840:isEffect?3840:4096)+'" height="'+(isFrame?2640:isEffect?2160:4096)+'" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true"><defs>'+
 '<filter id="cmdOrnamentGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter><linearGradient id="gem" x1="0" y1="0" x2="100%" y2="100%"><stop stop-color="#fff6" offset="0"/><stop stop-color="'+meta.hue+'" offset=".4"/><stop stop-color="'+meta.hue+'" offset=".7"/><stop stop-color="#130824" offset="1"/></linearGradient>'+
 '<linearGradient id="metal" x1="0" y1="0" x2="100%" y2="100%"><stop stop-color="#30233d"/><stop offset=".18" stop-color="'+meta.hue+'"/><stop offset=".3" stop-color="#fff2e8"/><stop offset=".34" stop-color="#706276"/><stop offset=".65" stop-color="'+meta.hue+'"/><stop offset=".8" stop-color="#211526"/><stop offset=".93" stop-color="#e9daff"/><stop offset="1" stop-color="'+meta.hue+'"/></linearGradient>'+
 '<linearGradient id="gold" x1="0" y1="0" x2="100%" y2="100%"><stop stop-color="'+meta.hue+'" offset="0"/><stop stop-color="#fff" offset=".4"/><stop stop-color="'+meta.hue+'" offset="1"/></linearGradient><radialGradient id="pearl" cx="30%" cy="25%"><stop stop-color="#fff"/><stop offset=".35" stop-color="#e9e6f5"/><stop offset=".7" stop-color="#b5a5cb"/><stop offset="1" stop-color="#57516f"/></radialGradient>'+
 '<filter id="materialTexture" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".085" numOctaves="4" seed="8" result="grain"/><feColorMatrix in="grain" type="saturate" values="0" result="mono"/><feComponentTransfer in="mono"><feFuncA type="linear" slope=".12"/></feComponentTransfer></filter>'+ 
 '<filter id="shine" x="-35%" y="-35%" width="170%" height="170%"><feDropShadow dx="0" dy="1" stdDeviation=".35" flood-color="#110623" flood-opacity=".28"/></filter>'+
 '<filter id="glow" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="2"/></filter>'+'<filter id="aura" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="11"/></filter>'+'<filter id="softAura" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="1.5"/></filter>'+'<radialGradient id="sceneGlow"><stop stop-color="'+meta.hue+'" stop-opacity=".8"/><stop offset="1" stop-color="#12132b" stop-opacity="0"/></radialGradient>'+'<radialGradient id="moon"><stop stop-color="#fff"/><stop offset="1" stop-color="#cbd5fb"/></radialGradient>'+'<radialGradient id="sun"><stop stop-color="#ffe2a1"/><stop offset=".6" stop-color="#ec7642"/><stop offset="1" stop-color="#7f2536"/></radialGradient>'+
 '</defs>'+content+'</svg>';
}
export const CMD_PREMIUM_ART_CSS=`
/* The same artwork is used in the shop, editor and saved profile. */
.hero:has(.cmd-profile-effect-art):after{content:none!important}
.hero .cmd-profile-effect-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;opacity:.6;z-index:2}
.hero:has(.cmd-profile-effect-art)>.banner{position:relative;z-index:1;opacity:1}
.hero:has(.cmd-profile-effect-art)>.avatarWrap,.hero:has(.cmd-profile-effect-art)>.body{position:relative;z-index:3}
.hero:has(.cmd-profile-art-avatar) .avatarDeco,.hero:has(.cmd-profile-art-avatar) .avatarRing{display:none!important}
.hero .cmd-profile-art-frame{object-fit:fill;filter:none}.hero:has(.cmd-profile-art-frame) .profileFrame{display:none}

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
.cmd-effect-live-image{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;opacity:.78;pointer-events:none;filter:none}
.cmd-effect-live-image[hidden]{display:none!important}
#effectPicker .pickerPreview:has(.cmd-effect-live-image:not([hidden])) .mockCard{z-index:2;position:relative;background:#150f2ad9;border-color:#c4b3ee66;box-shadow:0 0 28px #0008}
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

/* 2026-10-14: crisp jewellery, full silhouettes, correctly centred avatar samples. */
.art.cmd-gem-art{position:relative;display:block;height:auto;aspect-ratio:16/11;background:radial-gradient(ellipse at 50% 20%,#302540,#101018 75%);isolation:isolate}
.cmd-gem-art>img,.diamondCard .cmd-gem-art>img,.frameThumb img.cmd-frame-thumb,.cmd-profile-art-frame{filter:none;animation:none}
.cmd-gem-art .cmd-gem-mock{inset:15% 12%;background:linear-gradient(150deg,#292332,#15151e);box-shadow:0 12px 28px #0005;border-color:#ffffff13}
.cmd-gem-art.cmd-avatar-art{height:auto;aspect-ratio:1}
.cmd-avatar-art .cmd-gem-mock,.diamondCard .cmd-avatar-art .cmd-gem-mock{inset:24%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 30% 20%,#796393,#29233d)}
.cmd-avatar-art .cmd-gem-mock .cmd-gem-avatar{inset:0;width:100%;height:100%;border:0;background:none}
.cmd-avatar-art .cmd-gem-avatar:before{left:35%;top:22%;width:30%;height:30%;background:#e0d8ed}
.cmd-avatar-art .cmd-gem-avatar:after{left:22%;top:57%;width:56%;height:29%;background:#e0d8ed}
.cmd-avatar-art>img{inset:5%;width:90%;height:90%}
.diamondCard .art.cmd-gem-art{height:auto;min-height:260px}
.cmd-effect-preview img{object-fit:contain}
`;

export const CMD_SHOP_REFINEMENT_CSS=`
body{background:#0c0b11;font-family:Inter,system-ui,-apple-system,sans-serif}
.wrap{max-width:1240px}.top{flex-wrap:wrap;backdrop-filter:blur(16px);background:#14111beF;gap:12px}.top a{font-size:14px}.hero{padding:32px;background:radial-gradient(ellipse at top right,#68448755,transparent 65%),#191320;border:1px solid #b99cdb30}.hero h1,.hero h2{letter-spacing:-.035em}.hero:after{content:none}
.grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.item{background:#19161f;border-color:#ffffff12;padding:12px;border-radius:20px;gap:12px;min-width:0;align-content:start}.itemLine{align-items:start}.itemLine b{font-size:16px;line-height:1.4}.item small{font-size:12px}.item button,.diamondCard>button:not(:disabled){background:#8b5cce;cursor:pointer}.item button:focus-visible,button.previewItem:focus-visible{outline:3px solid #dcc3ff;outline-offset:3px}.art{height:220px}.item .art.cmd-gem-art{height:auto;aspect-ratio:1.35}.item .art.cmd-avatar-art{aspect-ratio:1.35}.item .cmd-avatar-art>img{inset:5%;width:90%;height:90%}.item .cmd-avatar-art .cmd-gem-mock{height:48%;width:auto;inset:26% auto auto 50%;transform:translateX(-50%)}
.art.cmd-effect-preview{height:auto;aspect-ratio:16/10;padding:12px}.shopGrid{gap:22px}.diamondCard{background:#19161f;border-color:#ffffff16}.cardBody h3{font-size:22px}.cardBody p{font-size:14px;color:#bcb2c9}.exclusive{font-size:9px;letter-spacing:.08em;background:#2c2439;color:#e0c9ff}.diamondCard .art.cmd-gem-art{padding-top:36px}.diamondCard .cmd-gem-art>img{inset:10% 5% 0;width:90%;height:90%}.diamondCard .cmd-gem-mock{inset:25% 20% 16%}.diamondCard .cmd-avatar-art .cmd-gem-mock{inset:29% 29% 19%}.diamondCard .cmd-effect-preview{padding:60px 12px 12px}.diamondPreviewBody .previewArt .art{height:auto;min-height:240px}.diamondPreviewBody .previewArt{padding:22px;background:#100e17}.diamondPreviewBody .previewArt .cmd-gem-art{aspect-ratio:1.35}.diamondPreviewBody .previewArt .cmd-avatar-art{aspect-ratio:1}
@media(min-width:1100px){.shopGrid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:760px){.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.item{padding:8px;border-radius:14px}.itemLine{flex-wrap:wrap}.itemLine b{font-size:14px}.item .art{height:160px}.item .art.cmd-gem-art{height:auto;aspect-ratio:1}.item .cmd-avatar-art .cmd-gem-mock{height:48%}.top{position:relative;padding:12px}.hero{padding:22px}.shopGrid{grid-template-columns:1fr}.diamondCard .art.cmd-gem-art{min-height:280px}.tabs{top:0}.wrap{padding-inline:12px}}
@media(max-width:350px){.grid{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.art *{animation:none!important}}
.shop-nameplate-urban{background:linear-gradient(90deg,#26104c,#8b1a98,#2b0b60)}
.shop-nameplate-nebula{background:radial-gradient(circle at 25% 40%,#a855f7,#312e81 45%,#09090b)}
.shop-nameplate-emerald{background:linear-gradient(120deg,#064e3b,#10b981,#052e16)}
.shop-nameplate-moon{background:linear-gradient(120deg,#0f172a,#1d4ed8,#111827)}
.shop-nameplate-heart{background:linear-gradient(120deg,#111,#3f3f46)}
.shop-nameplate-leopard{background:repeating-linear-gradient(45deg,#c87516 0 9px,#111 9px 15px)}
.shop-nameplate-cosmic{background:linear-gradient(90deg,#7c3aed,#ec4899,#2563eb)}
.shop-nameplate-flowers{background:linear-gradient(90deg,#14532d,#fde68a,#166534)}
.shop-nameplate-midnight{background:linear-gradient(90deg,#020617,#312e81,#0f172a)}
.shop-nameplate-halloween{background:linear-gradient(90deg,#451a03,#f97316,#1c1917)}
.shop-nameplate-aurora{background:linear-gradient(90deg,#14b8a6,#8b5cf6,#ec4899)}
/* Mobile profile frame containment: never cover biography, buttons or unsaved preview. */
.hero{isolation:isolate}
.hero > img.cmd-profile-art-frame{position:absolute;inset:0 auto auto 0;width:100%;height:clamp(115px,30vw,205px);max-height:38%;object-fit:fill;pointer-events:none;z-index:2;opacity:.88}
.hero > .banner,.hero > .avatarWrap,.hero > .body{position:relative;z-index:3}
.hero > .banner{z-index:1}
.hero .avatarWrap{isolation:isolate}
@media(max-width:600px){.hero > img.cmd-profile-art-frame{height:clamp(100px,32vw,155px);max-height:32%;opacity:.82}}

/* 2026-10-16: keep the full profile frame on all four edges, without obstructing controls. */
.hero{position:relative;isolation:isolate}
.hero > img.cmd-profile-art-frame{
 position:absolute;inset:0;width:100%;height:100%;max-height:none;
 object-fit:fill;pointer-events:none;z-index:5;opacity:1;
}
.hero > .banner{position:relative;z-index:1}
.hero > .avatarWrap,.hero > .body{position:relative;z-index:3}
.hero > .avatarWrap{isolation:isolate}
.hero > .avatarWrap > img.cmd-profile-art-avatar{
 position:absolute;inset:-12% auto auto -12%;
 width:124%;height:124%;max-width:none;object-fit:contain;z-index:8;pointer-events:none
}
@media(max-width:600px){
 .hero > img.cmd-profile-art-frame{height:100%;max-height:none;opacity:1}
 .hero > .avatarWrap > img.cmd-profile-art-avatar{width:124%;height:124%}
}

/* PROFILE_PERIMETER_20261016 — slice photographic edges, never cover biography */
.hero{position:relative;isolation:isolate;overflow:visible}
.hero > img.cmd-profile-art-frame{display:none!important}
.hero > .profileFrame{position:absolute!important;inset:0!important;z-index:7!important;pointer-events:none!important;border:26px solid transparent!important;border-radius:20px!important;box-shadow:none!important;opacity:1!important}
.hero:has(>img.cmd-profile-art-frame) > .profileFrame{border-image-source:var(--cmd-profile-frame-image)!important;border-image-slice:28% 20% 28% 20%!important;border-image-width:26px!important;border-image-repeat:stretch!important}
.hero > .banner,.hero > .avatarWrap,.hero > .body{position:relative;z-index:2}
.hero > .avatarWrap{isolation:isolate}
.hero > .avatarWrap > img.cmd-profile-art-avatar{position:absolute!important;left:12px!important;top:-86px!important;width:174px!important;height:174px!important;max-width:none!important;object-fit:contain!important;z-index:8!important;pointer-events:none!important}
@media(max-width:600px){
 .hero > .profileFrame{border-width:17px!important}
 .hero:has(>img.cmd-profile-art-frame) > .profileFrame{border-image-width:17px!important}
 .hero > .avatarWrap > img.cmd-profile-art-avatar{left:16px!important;top:-82px!important;width:166px!important;height:166px!important}
}

/* PROFILE_FRAME_PERIMETER_V2: show actual photographic corners, not hairline slices */
.page .hero{position:relative!important;isolation:isolate!important;overflow:visible!important}
.page .hero>.profileFrame{position:absolute!important;inset:0!important;display:block!important;pointer-events:none!important;z-index:6!important;border:clamp(34px,9vw,66px) solid transparent!important;border-radius:20px!important;box-shadow:none!important;background:none!important;box-sizing:border-box!important}
.page .hero:has(>img.cmd-profile-art-frame)>.profileFrame{border-image-source:var(--cmd-profile-frame-image)!important;border-image-slice:29% 24% 29% 24% fill!important;border-image-width:clamp(34px,9vw,66px)!important;border-image-outset:0!important;border-image-repeat:stretch!important}
.page .hero>.profileFrame::before{content:none!important}
.page .hero>img.cmd-profile-art-frame{display:none!important}
.page .hero>.banner,.page .hero>.avatarWrap,.page .hero>.body{position:relative!important;z-index:2!important}
.page .hero>.avatarWrap>img.cmd-profile-art-avatar{z-index:8!important}


/* Single CMD avatar decoration alignment: the personal photo is 106px,
   so frame width 126px must be centred at the same point (70, 0). */
.page.cmd-premium-profile .hero.cmd-pm-hero .avatarWrap > img.cmd-profile-art-avatar{
 position:absolute!important;
 left:7px!important;
 top:-63px!important;
 width:126px!important;
 height:126px!important;
 max-width:none!important;
 max-height:none!important;
 object-fit:contain!important;
 pointer-events:none!important;
 z-index:8!important;
}

`;

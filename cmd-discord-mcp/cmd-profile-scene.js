/* CMD Sphere — custom illustration scene INSIDE existing /profile banner (not a separate profile).
   Original profile avatar, banner upload, name, status and badges remain unchanged. */
(()=>{"use strict";
if(window.__cmdProfileScene)return;window.__cmdProfileScene=true;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const scenes=[["none","Bannière d'origine","🎨"],["beach","Plage","🏖️"],["seaside","Bord de mer","🌊"],["forest","Forêt","🌲"],["neonforest","Forêt néon","✨"],["waterfall","Cascade","💧"],["city","Ville","🏙️"],["night","Nuit","🌙"],["space","Espace","🌌"],["mountains","Montagnes","🏔️"],["chalet","Chalet","🏡"],["crystal","Cristaux violets","💎"]];
const clothes=[["hoodie","Sweat à capuche"],["tshirt","T-shirt"],["jacket","Veste"],["shirt","Chemise"],["dress","Robe"],["sport","Sport"],["suit","Costume"],["armor","Armure"]];
const pants=[["jeans","Jean"],["dark","Pantalon noir"],["shorts","Short"],["skirt","Jupe"],["cargo","Cargo"],["formal","Habillé"]];
const footwear=[["sneakers","Baskets"],["boots","Bottes"],["sandals","Sandales"],["formal","Chaussures de ville"]];
const vehicles=[["none","À pied","🚶"],["compact","Citadine","🚙"],["sportscar","Sportive","🏎️"],["convertible","Cabriolet","🚗"],["scooter","Scooter","🛵"],["motorcycle","Moto","🏍️"],["bike","Vélo","🚲"],["van","Van","🚐"],["truck","Pick-up","🛻"],["kart","Kart","🏎️"],["boat","Bateau","⛵"],["plane","Avion","✈️"],["rocket","Fusée","🚀"]];
const homes=[["none","Aucun domicile","✕"],["cottage","Petite maison","🏡"],["house","Maison familiale","🏠"],["villa","Villa","🏘️"],["apartment","Appartement","🏢"],["castle","Château","🏰"],["cabin","Chalet","🛖"],["beach","Maison de plage","🏖️"],["snow","Maison enneigée","❄️"],["tree","Cabane perchée","🌳"],["crystal","Maison de cristal","💎"]];
let universeCategory="pet";
function universePicker(){const groups=[["pet","Animaux","🐾"],["vehicle","Véhicules","🚘"],["home","Maisons","🏠"]];const active=groups.some(x=>x[0]===universeCategory)?universeCategory:"pet";const nav='<nav class="cmd-universe-nav" aria-label="Personnalisation de mon univers">'+groups.map(([id,label,icon])=>'<button type="button" data-universe-tab="'+id+'" class="'+(id===active?'selected':'')+'" aria-pressed="'+(id===active)+'"><span>'+icon+'</span><small>'+label+'</small></button>').join("")+'</nav>';const opts=active==="pet"?pets:active==="vehicle"?vehicles:homes;const key=active==="pet"?"pet":active;const title=active==="pet"?"Choisir un compagnon":active==="vehicle"?"Choisir mon véhicule":"Choisir ma maison";return '<h2>Mon univers</h2><p class="cmd-scene-section-intro">Personnalise ton profil avec un animal, un véhicule et une maison. La maison est décorative : aucune adresse réelle n’est publiée.</p>'+nav+picker(title,key,opts,active==="pet"?"pet":"action")+(active==="pet"?'<label class="cmd-scene-select-field"><span>Nom de mon animal</span><input type="text" data-universe-name="petName" maxlength="40" placeholder="Donne-lui un nom" value="'+escape(state.petName||"")+'"></label>':'')+(active==="home"?'<label class="cmd-universe-privacy"><input type="checkbox" data-universe-privacy '+(state.hideHome!==false?'checked':'')+'> Masquer ma maison aux autres utilisateurs</label>':'')+'<p class="cmd-scene-section-intro">Les véhicules et maisons sont pour le moment des éléments décoratifs du profil, pas des objets 3D sur une carte.</p>'}
const skins=["#f7cb9e","#e8ad7e","#c68a60","#905a3d","#573b30","#2f2728"];
const haircolors=["#201b27","#58372a","#a65d32","#dcc071","#9b9ba9","#d76884","#f7f0e1"];
const outfits=["#ffffff","#212331","#7549b9","#237a9b","#d24e79","#e6a53a","#317f67","#b23b3b"];
const pets=[["none","Aucun",""],["cat","Chat 3D",""],["fox","Renard 3D",""],["horse","Cheval 3D",""],["bird","Perroquet 3D",""],["duck","Canard 3D",""],["flamingo","Flamant rose 3D",""],["stork","Cigogne 3D",""],["dog","Chien",""],["rabbit","Lapin",""],["wolf","Loup",""],["turtle","Tortue",""]];
const petImages={cat:"https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=300&fit=crop",fox:"https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=300&fit=crop",horse:"https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=300&fit=crop",bird:"https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=300&fit=crop",duck:"https://images.unsplash.com/photo-1555852095-64e7428df0fa?w=300&fit=crop",flamingo:"https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=300&fit=crop",stork:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&fit=crop",dog:"https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&fit=crop",rabbit:"https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=300&fit=crop",wolf:"",turtle:"https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=300&fit=crop"};
const true3DPets=new Set(["cat","fox","horse","bird","duck","flamingo","stork"]);
function petArt(value){if(value==='wolf')return '<span class="cmd-clothing-icon" aria-label="Loup">🐺</span>';return petImages[value]?'<img src="'+petImages[value]+'" loading="lazy" alt="" class="cmd-scene-pet-photo-card">':'<span class="cmd-scene-none">∅</span>'}
const defaults={scene:"none",avatarPreset:"guardian",gender:"neutral",skin:"#f7cb9e",hair:"short",hairColor:"#201b27",top:"hoodie",topColor:"#7549b9",bottom:"jeans",shoes:"sneakers",pet:"none",pose:"stand",accessory:"none",avatarStyle:"3d",petStyle:"3d",avatarModel:"soldier",petModel:"fox",vehicle:"none",home:"none",hideHome:true,petName:"",label:""};
let state={...defaults},savedState={...defaults},custom=null,savedCustom=null,customDirty=false,characterPhoto=null,savedCharacterPhoto=null,animalPhoto=null,savedAnimalPhoto=null,characterDirty=false,animalDirty=false,slot=null,scenery=null,sheet=null,figure=null,preview=null,busy=false;
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const options=(a,selected)=>a.map(([value,label])=>'<option value="'+escape(value)+'"'+(value===selected?' selected':'')+'>'+escape(label)+'</option>').join("");
function hex(value,fallback){return /^#[0-9a-f]{6}$/i.test(String(value))?value:fallback}
function drawPerson(s){
 const skin=hex(s.skin,defaults.skin),hair=hex(s.hairColor,defaults.hairColor),top=hex(s.topColor,defaults.topColor);
 const pantColor=s.bottom==="dark"||s.bottom==="formal"?"#222636":s.bottom==="cargo"?"#626a4c":s.bottom==="shorts"?"#a8aec8":s.bottom==="skirt"?"#403851":"#405b82";
 const footwearColor=s.shoes==="boots"?"#2a2225":s.shoes==="sandals"?"#ba8d61":s.shoes==="formal"?"#20232d":"#e4e8ef";
 const width=s.gender==="female"?62:74,torsoX=110-width/2;
 const hand=skin,angle=s.pose==="wave"||s.pose==="peace";
 const arms=angle?
  '<path d="M'+(torsoX+9)+' 132 L54 170 L46 157" stroke="'+hand+'" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M'+(torsoX+width-9)+' 133 L172 80 L181 47" stroke="'+hand+'" stroke-width="18" fill="none" stroke-linecap="round"/>':
  s.pose==="crossed"?
  '<path d="M75 135 L164 191 M145 135 L61 192" stroke="'+hand+'" stroke-width="18" fill="none" stroke-linecap="round"/>':
  '<path d="M'+(torsoX+9)+' 134 L60 191 L56 225" stroke="'+hand+'" stroke-width="19" fill="none" stroke-linecap="round"/><path d="M'+(torsoX+width-9)+' 134 L161 191 L164 225" stroke="'+hand+'" stroke-width="19" fill="none" stroke-linecap="round"/>';
 const lower=s.bottom==="skirt"||s.top==="dress"?
  '<path d="M68 210 L150 210 L173 256 L51 256Z" fill="'+(s.top==="dress"?top:pantColor)+'"/><path d="M83 250 L83 311 M136 250 L136 311" stroke="'+skin+'" stroke-width="21" stroke-linecap="round"/>':
  '<path d="M77 214 L76 308 Q86 319 100 308 L112 245 L122 308 Q136 319 146 306 L143 215Z" fill="'+pantColor+'"/>';
 const outfit=s.top==="dress"?'<path d="M77 131 Q110 119 143 131 L159 240 L62 240Z" fill="'+top+'"/>':
  '<path d="M'+torsoX+' 132 Q110 113 '+(torsoX+width)+' 132 L148 220 Q108 230 71 220Z" fill="'+top+'"/>';
 const collar=s.top==="hoodie"?'<path d="M86 136 Q109 161 136 136" stroke="#ffffff7b" stroke-width="7" fill="none"/><path d="M106 148 L104 181 M115 147 L119 179" stroke="#ffffffa6" stroke-width="2"/>':s.top==="shirt"||s.top==="suit"?'<path d="M85 133 L110 163 L136 133" fill="#e2e2eb"/>':"";
 const jacket=s.top==="jacket"||s.top==="suit"?'<path d="M108 146 L110 217" stroke="#ede6ff" stroke-width="4"/><path d="M90 145 L108 164 L110 145 M130 145 L114 164 L110 145" fill="none" stroke="#dfd4ed" stroke-width="3"/>':"";
 const hairPieces=s.hair==="shaved"?'<ellipse cx="110" cy="64" rx="39" ry="25" fill="'+hair+'"/>':
 s.hair==="long"?'<path d="M72 80 Q60 31 101 25 Q154 16 151 86 L158 143 L132 141 L133 76Z" fill="'+hair+'"/><path d="M76 78 L65 148 L89 145 L90 79Z" fill="'+hair+'"/>':
 s.hair==="curly"?'<g fill="'+hair+'"><circle cx="77" cy="58" r="20"/><circle cx="94" cy="37" r="21"/><circle cx="119" cy="34" r="23"/><circle cx="142" cy="52" r="22"/><circle cx="151" cy="72" r="18"/></g>':
 s.hair==="ponytail"?'<path d="M82 55 Q69 23 112 23 Q158 21 149 68 L158 129 Q181 137 168 154 L136 139 L137 66Z" fill="'+hair+'"/>':
 s.hair==="bob"?'<path d="M77 53 Q79 20 111 22 Q148 20 151 61 L154 102 L132 104 L134 65 L89 65 L86 103 L68 99Z" fill="'+hair+'"/>':
 '<path d="M73 63 Q73 22 113 24 Q153 20 150 66 Q119 55 100 62 Q86 65 77 75Z" fill="'+hair+'"/>';
 const accessory=s.accessory==="glasses"||s.accessory==="sunglasses"?'<g fill="'+(s.accessory==="sunglasses"?"#181b24bb":"#ffffff12")+'" stroke="#2d2732" stroke-width="4"><rect x="81" y="78" width="24" height="19" rx="7"/><rect x="116" y="78" width="24" height="19" rx="7"/><path d="M105 85 H116"/></g>':s.accessory==="hat"||s.accessory==="cap"?'<path d="M76 48 Q112 7 150 46 L150 61 L72 61Z" fill="#eeeeef"/><path d="M72 62 H172" stroke="#f5f5f5" stroke-width="9" stroke-linecap="round"/>':s.accessory==="crown"?'<path d="M77 44 L79 7 L98 24 L112 3 L129 24 L146 7 L145 44Z" fill="#f6c855" stroke="#bd8942" stroke-width="4"/>':s.accessory==="headphones"?'<path d="M68 79 Q65 20 110 22 Q154 20 153 79" stroke="#29273b" stroke-width="10" fill="none"/><rect x="65" y="77" width="16" height="34" rx="6" fill="#3d3d4d"/><rect x="140" y="77" width="16" height="34" rx="6" fill="#3d3d4d"/>':"";
 const shoes='<path d="M76 301 Q67 319 52 321 Q43 334 75 334 L104 333 Q105 323 96 304Z" fill="'+footwearColor+'"/><path d="M124 304 Q113 328 123 333 L157 334 Q184 332 168 321 L143 300Z" fill="'+footwearColor+'"/>';
 return '<svg class="cmd-scene-person-svg" viewBox="0 0 220 350" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Personnage illustré personnalisable"><defs><filter id="cmdSceneShadow"><feDropShadow dx="1" dy="4" stdDeviation="4" flood-opacity=".3"/></filter></defs><g filter="url(#cmdSceneShadow)">'+
 lower+arms+outfit+collar+jacket+'<rect x="98" y="113" width="24" height="24" rx="10" fill="'+skin+'"/><ellipse cx="110" cy="77" rx="40" ry="53" fill="'+skin+'"/>'+hairPieces+
 '<path d="M91 88 Q95 84 99 88 M122 88 Q127 84 131 88" fill="none" stroke="#2a2328" stroke-width="3.5" stroke-linecap="round"/><path d="M108 89 L104 107 Q109 112 115 108" fill="none" stroke="#a36c60" stroke-width="2.8" stroke-linecap="round"/><path d="M99 116 Q110 126 122 115" stroke="#883f46" stroke-width="3" fill="none" stroke-linecap="round"/>'+
 accessory+shoes+'</g></svg>';
}
function decorateScene(scene){
 const patterns={beach:"☀️　　　　🌴",seaside:"☀️　 🐚　⛵",forest:"🌲　　　🌲　🌿",neonforest:"",waterfall:"🌳　　　💦　🌿",city:"🏙️　　　🌇",night:"✨　🌙　　　 ⭐",space:"🪐　✨　　 ⭐",mountains:"🏔️　　　　🌲",custom:"",none:""};
 return patterns[scene]||"";
}
function present(s=state,img=custom){
 if(!slot)return;
 if(s.scene==="none"){slot.classList.remove("cmd-scene-active");if(scenery)scenery.replaceChildren();return}
 slot.classList.add("cmd-scene-active");slot.dataset.scene=scenes.some(a=>a[0]===s.scene)?s.scene:"forest";
 scenery.replaceChildren();
 if(s.scene==="custom"&&img){const photo=document.createElement("div");photo.className="cmd-scene-personal-image";photo.style.backgroundImage='url("'+img.replace(/["\\]/g,"")+'")';scenery.append(photo)}
 const light=document.createElement("div");light.className="cmd-scene-scenery";light.textContent=decorateScene(s.scene);scenery.append(light);
 const person=document.createElement("div");person.className="cmd-scene-person";
 if(s.avatarStyle==="photo"&&characterPhoto){const img=new Image();img.src=characterPhoto;img.alt="Personnage personnalisé";person.append(img);person.classList.add("cmd-scene-photo-person")}else {const photo=s.gender==="female"?"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=420&fit=crop&q=80":"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=420&fit=crop&q=80";person.innerHTML='<img class="cmd-avatar-fallback-photo" src="'+photo+'" alt="Portrait de remplacement en cas d’indisponibilité du modèle 3D">';}
 scenery.append(person);
 if(s.pet!=="none"){const animal=document.createElement("div");animal.className="cmd-scene-pet";if(s.petStyle==="photo"){const img=new Image();img.src=animalPhoto||petImages[s.pet]||"";img.alt="Animal réaliste";animal.append(img);animal.classList.add("cmd-scene-photo-pet")}scenery.append(animal)}
 if(s.label){const label=document.createElement("div");label.className="cmd-scene-brand";label.textContent=s.label;scenery.append(label)}
}
function mountBanner(){
 const banner=$("#bannerTap");if(!banner||$("#cmdSceneWrap"))return;
 const wrap=document.createElement("div");wrap.id="cmdSceneWrap";wrap.className="cmd-scene-wrap";
 banner.before(wrap);wrap.append(banner);
 scenery=document.createElement("span");scenery.id="cmdSceneBackdrop";scenery.className="cmd-scene-backdrop";scenery.setAttribute("aria-hidden","true");banner.prepend(scenery);
 const btn=document.createElement("button");btn.id="cmdSceneEdit";btn.type="button";btn.textContent="🎭 Avatar & décor";btn.setAttribute("aria-label","Personnaliser mon avatar, mon animal et mon décor de profil");btn.onclick=e=>{e.preventDefault();e.stopPropagation();openSheet()};wrap.append(btn);
 slot=wrap;
 const edit=$("#profileForm"),section=document.createElement("div");
 if(edit){section.className="cmd-scene-form-entry";section.innerHTML='<h3>🎭 Mon décor et mon personnage</h3><p>Apparaît dans la bannière de ce profil, sans remplacer ta photo, ton pseudo ni tes autres informations.</p><button type="button" id="cmdSceneFromProfile">Personnaliser mon décor</button>';edit.querySelector("h2")?.after(section);$("#cmdSceneFromProfile").onclick=()=>{document.querySelector("#modal")?.classList.remove("on");openSheet()}}
}
/* Self-contained illustrated pets instead of emoji heads in the actual scene. */
function drawPet(kind){
 if(kind==="none")return "";
 const palettes={dog:["#b78555","#e6c5a3","#6b4135"],cat:["#d4a66b","#f4d7b9","#634c44"],rabbit:["#c9c7ca","#f5eef0","#9a8a99"],fox:["#ce7437","#ffe0bd","#743a22"],wolf:["#8995a2","#dde1e5","#536173"],horse:["#9c7655","#e6bda1","#4b3429"],bird:["#5ab7a7","#b6e5c9","#336982"],turtle:["#74a66a","#b1d89b","#456e53"]};
 const colors=palettes[kind]||palettes.dog,[main,light,dark]=colors,ear=kind==="rabbit"?"long":kind==="cat"||kind==="fox"||kind==="wolf"?"triangle":"flop";
 if(kind==="bird")return '<svg viewBox="0 0 180 190" class="cmd-illustrated-pet" role="img" aria-label="Oiseau"><defs><linearGradient id="bird-feather" x2=".4" y2="1"><stop stop-color="'+light+'"/><stop offset="1" stop-color="'+main+'"/></linearGradient></defs><ellipse cx="98" cy="164" rx="61" ry="10" fill="#0003"/><path d="M55 121 Q35 35 103 39 Q152 44 145 112 Q137 153 88 151 Q52 144 55 121Z" fill="url(#bird-feather)" stroke="'+dark+'" stroke-width="3"/><path d="M62 101 Q16 85 22 54 Q42 80 61 70Z" fill="'+dark+'"/><path d="M89 114 Q135 78 128 132 Q116 150 89 135Z" fill="'+main+'"/><circle cx="117" cy="75" r="7" fill="#172e34"/><circle cx="119" cy="73" r="2" fill="#fff"/><path d="M142 91 L173 103 L145 111Z" fill="#ffb73d"/><path d="M89 146 L85 168 M112 146 L115 168" stroke="'+dark+'" stroke-width="5"/><path d="M78 169 L94 169 M108 169 L124 169" stroke="'+dark+'" stroke-width="4"/></svg>';
 if(kind==="turtle")return '<svg viewBox="0 0 180 190" class="cmd-illustrated-pet" role="img" aria-label="Tortue"><defs><linearGradient id="turtle-shell" x2="1" y2="1"><stop stop-color="#9dbd76"/><stop offset="1" stop-color="#2a6c60"/></linearGradient></defs><ellipse cx="92" cy="165" rx="70" ry="11" fill="#0004"/><path d="M32 140 Q24 93 76 73 Q122 67 143 126 L139 144Z" fill="url(#turtle-shell)" stroke="#2c5a4b" stroke-width="6"/><path d="M79 79 L65 112 L89 143 L120 114 L104 76 M31 124 L65 112 M120 114 L143 121" fill="none" stroke="#2b5949" stroke-width="4"/><ellipse cx="141" cy="125" rx="34" ry="25" fill="'+main+'"/><circle cx="155" cy="115" r="5" fill="#12281f"/><circle cx="157" cy="113" r="2" fill="#fff"/><path d="M144 135 Q155 144 165 133" fill="none" stroke="#446d4b" stroke-width="3"/><ellipse cx="49" cy="148" rx="16" ry="10" fill="'+main+'"/><ellipse cx="113" cy="150" rx="16" ry="10" fill="'+main+'"/></svg>';
 const ears=ear==="long"?'<ellipse cx="56" cy="41" rx="17" ry="40" transform="rotate(-12 56 41)" fill="'+main+'"/><ellipse cx="56" cy="40" rx="8" ry="28" transform="rotate(-12 56 40)" fill="#e7aeba"/><ellipse cx="116" cy="38" rx="17" ry="42" transform="rotate(13 116 38)" fill="'+main+'"/><ellipse cx="116" cy="39" rx="8" ry="30" transform="rotate(13 116 39)" fill="#e7aeba"/>':ear==="triangle"?'<path d="M35 79 L35 16 L78 46 L112 47 L144 16 L145 81Z" fill="'+main+'" stroke="'+dark+'" stroke-width="4"/><path d="M44 35 L46 62 L70 48 M131 35 L130 62 L108 48" fill="#e9afb0"/>':'<path d="M37 74 Q-7 46 22 31 Q46 22 57 64 M117 65 Q140 20 161 34 Q180 54 138 81" fill="'+dark+'" stroke="'+main+'" stroke-width="7"/>';
 const body=kind==="horse"?'<path d="M58 102 Q36 126 49 158 L121 163 Q136 147 125 112Z" fill="'+main+'"/><path d="M128 110 Q153 84 157 58 L135 56 L116 90Z" fill="'+main+'"/><path d="M134 47 L148 31 L159 67 L136 74Z" fill="'+dark+'"/>':'<ellipse cx="93" cy="131" rx="56" ry="42" fill="'+main+'"/><ellipse cx="96" cy="137" rx="33" ry="25" fill="'+light+'"/>';
 const tail=kind==="fox"||kind==="wolf"?'<path d="M39 128 Q4 106 12 77 Q25 91 60 99" fill="'+main+'" stroke="'+dark+'" stroke-width="3"/>':kind==="dog"?'<path d="M46 133 Q11 139 15 108" fill="none" stroke="'+dark+'" stroke-width="14" stroke-linecap="round"/>':'';
 const muzzle=kind==="horse"?'<path d="M55 84 Q64 71 100 75 L126 112 Q111 137 83 130Z" fill="'+light+'"/>':'<ellipse cx="89" cy="95" rx="30" ry="22" fill="'+light+'"/><path d="M86 91 L95 91 L91 100Z" fill="'+dark+'"/>';
 const head=kind==="horse"?'<path d="M59 51 Q47 60 54 98 Q67 124 116 111 L127 86 Q121 45 84 41Z" fill="'+main+'" stroke="'+dark+'" stroke-width="4"/>':'<ellipse cx="90" cy="77" rx="56" ry="51" fill="'+main+'" stroke="'+dark+'" stroke-width="3"/>';
 return '<svg viewBox="0 0 180 190" class="cmd-illustrated-pet" role="img" aria-label="'+(pets.find(p=>p[0]===kind)?.[1]||"Animal")+'"><defs><linearGradient id="pet-coat-'+kind+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+light+'"/><stop offset="1" stop-color="'+main+'"/></linearGradient></defs><ellipse cx="91" cy="174" rx="65" ry="10" fill="#0003"/>'+tail+body+'<ellipse cx="51" cy="162" rx="22" ry="15" fill="'+main+'"/><ellipse cx="135" cy="162" rx="22" ry="15" fill="'+main+'"/>'+ears+head+muzzle+'<ellipse cx="66" cy="80" rx="7" ry="9" fill="#20232b"/><ellipse cx="117" cy="80" rx="7" ry="9" fill="#20232b"/><circle cx="68" cy="76" r="2.5" fill="#fff"/><circle cx="119" cy="76" r="2.5" fill="#fff"/><path d="M79 105 Q92 117 107 104" stroke="'+dark+'" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="68" cy="95" rx="9" ry="5" fill="#efaa9c" opacity=".65"/><ellipse cx="121" cy="95" rx="9" ry="5" fill="#efaa9c" opacity=".65"/></svg>';
}
const looks=[
 {name:"Street",style:"street",top:"hoodie",bottom:"jeans",shoes:"sneakers",topColor:"#7549b9",accessory:"cap"},
 {name:"Sport",style:"sport",top:"sport",bottom:"shorts",shoes:"sneakers",topColor:"#ffffff",accessory:"none"},
 {name:"Chic",style:"chic",top:"suit",bottom:"formal",shoes:"formal",topColor:"#212331",accessory:"sunglasses"},
 {name:"Été",style:"summer",top:"tshirt",bottom:"shorts",shoes:"sandals",topColor:"#e6a53a",accessory:"none"},
 {name:"Ville",style:"street",top:"jacket",bottom:"dark",shoes:"boots",topColor:"#237a9b",accessory:"glasses"},
 {name:"Soirée",style:"chic",top:"dress",bottom:"skirt",shoes:"formal",topColor:"#d24e79",accessory:"none"},
 {name:"MilSim",style:"rp",top:"armor",bottom:"cargo",shoes:"boots",topColor:"#317f67",accessory:"cap"},
 {name:"Décontracté",style:"street",top:"shirt",bottom:"jeans",shoes:"sneakers",topColor:"#ffffff",accessory:"none"},
 {name:"Nocturne",style:"chic",top:"jacket",bottom:"cargo",shoes:"boots",topColor:"#212331",accessory:"headphones"}
];
window.cmdSphereLookList=looks;
const avatarPresets=[
 {id:"guardian",name:"Gardien",model:"soldier",gender:"male",top:"armor",bottom:"cargo",topColor:"#317f67",hair:"short",hairColor:"#201b27",skin:"#e8ad7e"},
 {id:"nocturne",name:"Nocturne",model:"soldier",gender:"male",top:"jacket",bottom:"dark",topColor:"#212331",hair:"shaved",hairColor:"#201b27",skin:"#c68a60"},
 {id:"azur",name:"Azur",model:"soldier",gender:"male",top:"shirt",bottom:"jeans",topColor:"#237a9b",hair:"short",hairColor:"#58372a",skin:"#905a3d"},
 {id:"luna",name:"Luna",model:"michelle",gender:"female",top:"jacket",bottom:"jeans",topColor:"#7549b9",hair:"long",hairColor:"#201b27",skin:"#f7cb9e"},
 {id:"nova",name:"Nova",model:"michelle",gender:"female",top:"sport",bottom:"dark",topColor:"#d24e79",hair:"ponytail",hairColor:"#9b9ba9",skin:"#c68a60"},
 {id:"iris",name:"Iris",model:"michelle",gender:"female",top:"suit",bottom:"formal",topColor:"#ffffff",hair:"bob",hairColor:"#58372a",skin:"#905a3d"}
];
window.cmdSphereAvatarPresets=avatarPresets;
const portraitPhotos={
 guardian:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=360&h=440&fit=crop&q=80",
 nocturne:"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=360&h=440&fit=crop&q=80",
 azur:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=360&h=440&fit=crop&q=80",
 luna:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=360&h=440&fit=crop&q=80",
 nova:"https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=360&h=440&fit=crop&q=80",
 iris:"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=360&h=440&fit=crop&q=80"
};

const poses=[["stand","Debout","🧍"],["walk","Marche","🚶"],["run","Course","🏃"],["dance","Danse","💃"],["wave","Salut","👋"],["peace","Peace","✌️"],["crossed","Bras croisés","💪"]];
const accessories=[["none","Sans",""],["glasses","Lunettes","👓"],["sunglasses","Soleil","🕶️"],["hat","Chapeau","🎩"],["cap","Casquette","🧢"],["headphones","Casque","🎧"],["crown","Couronne","👑"]];
const genders=[["male","Homme",""],["female","Femme",""],["neutral","Personnalisé",""]];
const hairOptions=[["short","Courts"],["long","Longs"],["curly","Bouclés"],["bob","Carré"],["shaved","Très courts"],["ponytail","Queue de cheval"]];
const tabs=[["mode","Mode","♧"],["selfie","Selfie","◉"],["pet","Animal de compagnie","♧"],["scene","Scène","▧"],["avatar","Avatar","◉"]];
function field(title,id,array){return '<label class="cmd-scene-select-field"><span>'+title+'</span><select data-scene-field="'+id+'">'+options(array,state[id])+'</select></label>'}
const clothingIcons={"hoodie":"🧥","tshirt":"👕","jacket":"🧥","shirt":"👔","dress":"👗","sport":"🎽","suit":"🤵","armor":"🛡️","jeans":"👖","dark":"👖","shorts":"🩳","skirt":"👗","cargo":"👖","formal":"👞","sneakers":"👟","boots":"🥾","sandals":"🩴","glasses":"🕶️","cap":"🧢","hat":"👒","none":"✕"};
function garmentArt(value){
 const upper=new Set(["hoodie","tshirt","jacket","shirt","dress","sport","suit","armor"]);
 const lower=new Set(["jeans","dark","shorts","skirt","cargo"]);
 const colors={hoodie:"#b895e4",tshirt:"#d8efff",jacket:"#bba185",shirt:"#eae5db",dress:"#d28bbd",sport:"#83b9d7",suit:"#5b6381",armor:"#868c9c",jeans:"#668bb5",dark:"#444c60",shorts:"#92b1d5",skirt:"#b98abb",cargo:"#8e997b",formal:"#3e4555",sneakers:"#f0e7dd",boots:"#8c6b5d",sandals:"#c9a581",glasses:"#9baed2",sunglasses:"#34384b",hat:"#c9b3a1",cap:"#8d83c7",headphones:"#a9a1b8",crown:"#e6c875",none:"#a7a1b5"};
 const fill=colors[value]||"#b5a6ca";
 let path;
 if(upper.has(value))path=value==="dress"?"M35 23 49 15 71 15 85 23 97 48 83 56 77 43 92 100 28 100 43 43 29 56 15 48Z":"M35 23 49 15 71 15 85 23 104 47 88 59 79 45 79 103 41 103 41 45 32 59 16 47Z";
 else if(lower.has(value))path=value==="skirt"?"M41 16 79 16 95 101 25 101Z":value==="shorts"?"M34 16 86 16 91 68 65 68 60 53 55 68 29 68Z":"M34 16 86 16 89 104 65 104 60 51 55 104 31 104Z";
 else if(["sneakers","boots","sandals","formal"].includes(value))path="M22 60 40 52 56 74 78 77 97 88 98 99 18 99 17 84Z";
 else if(value==="none")return '<span class="cmd-garment-empty">Sans accessoire</span>';
 else path=value==="cap"||value==="hat"?"M27 64 Q28 26 60 26 Q92 26 93 64 L110 72 110 79 12 79 12 72Z":value==="crown"?"M21 90 16 34 38 53 60 19 82 53 104 34 99 90Z":value==="headphones"?"M25 73 25 48 Q25 15 60 15 Q95 15 95 48 L95 73 83 73 83 46 Q83 28 60 28 Q37 28 37 46 L37 73Z":"M13 51 Q33 36 54 51 L66 51 Q87 36 107 51 L99 73 Q80 82 65 64 L55 64 Q40 82 21 73Z";
 return '<svg class="cmd-garment-art" viewBox="0 0 120 120" role="img" aria-label="Aperçu illustré du vêtement"><defs><linearGradient id="cmd-garment-grad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs><path d="'+path+'" fill="'+fill+'" stroke="#ffffff" stroke-opacity=".38" stroke-width="1.8" stroke-linejoin="round"/><path d="'+path+'" fill="url(#cmd-garment-grad)"/><path d="M49 16 Q60 32 71 16" fill="none" stroke="#16121e" stroke-opacity=".35" stroke-width="2"/></svg>';
}
function picker(label,key,opts,visual){
 return '<section class="cmd-scene-catalog-group"><h3>'+label+'</h3><div class="cmd-scene-card-carousel">'+opts.map(([value,name,icon])=>{
   const visualMarkup=visual==="clothing"?garmentArt(value):visual==="pet"?petArt(value):visual==="person"?'<span class="cmd-real-portrait-loader">3D</span>':visual==="scene"?'<div class="cmd-scene-landscape cmd-scenery-'+value+'"><span>'+ (icon||'✦') +'</span></div>':'<span class="cmd-scene-choice-symbol">'+(icon||"✦")+'</span>';
   return '<button type="button" class="cmd-scene-catalog-card '+(state[key]===value?"selected":"")+'" data-scene-choice="'+key+'" data-value="'+escape(value)+'" aria-pressed="'+(state[key]===value)+'"><div class="cmd-scene-card-art">'+visualMarkup+'</div><span class="cmd-scene-card-title">'+escape(name)+'</span></button>';
  }).join("")+'</div></section>';
}
function swatches(label,key,values){return '<div class="cmd-scene-fieldset"><strong>'+label+'</strong><div class="cmd-scene-swatches">'+values.map(c=>'<button type="button" aria-label="'+c+'" data-scene-color="'+key+'" data-value="'+c+'" class="'+(state[key]===c?"selected":"")+'" style="background:'+c+'"></button>').join("")+'</div></div>'}
let lookCategory="all";
function lookGrid(){
 const groups=[
 ["all","Tout"],["top","Hauts"],["bottom","Pantalons"],["shoes","Chaussures"],["accessory","Accessoires"]
 ];
 const navigation='<nav class="cmd-dressing-categories" aria-label="Catégories du dressing">'+groups.map(([key,label])=>'<button type="button" data-look-category="'+key+'" class="'+(lookCategory===key?"selected":"")+'" aria-pressed="'+(lookCategory===key)+'">'+label+'</button>').join("")+'</nav>';
 const sections=[
 ["top","Hauts","T-shirts, chemises, vestes",clothes],
 ["bottom","Pantalons","Jeans, cargos, shorts",pants],
 ["shoes","Chaussures","Baskets, bottes et autres",footwear],
 ["accessory","Accessoires","Lunettes, casquettes et plus",accessories]
 ];
 return '<div class="cmd-clothing-sections">'+navigation+
 sections.filter(([key])=>lookCategory==="all"||lookCategory===key).map(([key,title,subtitle,values])=>picker(title+" · "+subtitle,key,values,"clothing")).join("")+'</div>';
}
function contents(tab){
 if(tab==="mode")return '<h2>Mon dressing</h2><p class="cmd-scene-section-intro">Dressing CMD Sphere · catégories faciles à parcourir. Les vêtements interchangeables en 3D sont encore en préparation.</p>'+lookGrid()+swatches("Couleur","topColor",outfits);
 if(tab==="selfie")return '<h2>Poses & animations</h2>'+picker("Choisir une pose","pose",poses,"action");
 if(tab==="pet")return universePicker();
 if(tab==="scene")return '<h2>Mon univers</h2><p class="cmd-scene-section-intro">Choisis un paysage fourni par CMD Sphere, sans importation.</p>'+picker("Paysages","scene",scenes,"scene");
 return '<h2>Avatars 3D CMD Sphere</h2><p class="cmd-scene-section-intro">Choisis ton personnage, puis personnalise son apparence.</p>'+
 '<div class="cmd-scene-model-actions cmd-avatar-premium-grid">'+avatarPresets.map(p=>'<button type="button" data-avatar-preset="'+p.id+'" data-person-model="'+p.model+'" class="cmd-scene-built-in '+(state.avatarPreset===p.id?'selected':'')+'" aria-pressed="'+(state.avatarPreset===p.id)+'"><span class="cmd-scene-model-photo"><img loading="lazy" src="'+portraitPhotos[p.id]+'" alt="Illustration de secours, remplacée par l’aperçu 3D"></span><b>'+p.name+'</b><small>'+(p.gender==="male"?"Masculin":"Féminin")+' · 3D</small></button>').join("")+'</div>'+
 swatches("Teint de peau","skin",skins)+field("Coiffure","hair",hairOptions)+swatches("Couleur des cheveux","hairColor",haircolors)+picker("Accessoires","accessory",accessories,"action");
}
function renderSheet(tab){
 const area=$("#cmdSceneOptions");if(!area)return;
 const previousScroll=area.scrollTop;
 const previousScroller=area.closest(".cmd-scene-options-scroll");
 const outerScroll=previousScroller?.scrollTop;
 area.innerHTML=contents(tab);
 area.scrollTop=previousScroll;
 if(previousScroller&&outerScroll!=null)previousScroller.scrollTop=outerScroll;
 if(tab==="mode")window.requestAnimationFrame(()=>window.cmdProfile3D?.renderLookCards?.());
 if(tab==="avatar")window.requestAnimationFrame(()=>window.cmdProfile3D?.renderAvatarCards?.());
 $$("[data-universe-tab]",area).forEach(e=>e.addEventListener("click",()=>{universeCategory=e.dataset.universeTab;renderSheet(tab)}));
 $$("[data-universe-name]",area).forEach(e=>e.addEventListener("input",()=>{state.petName=e.value.slice(0,40)}));
 $$("[data-universe-privacy]",area).forEach(e=>e.addEventListener("change",()=>{state.hideHome=e.checked}));
 $$("[data-scene-field]",area).forEach(e=>e.addEventListener("input",()=>{state[e.dataset.sceneField]=e.value;refreshEditor()}));
 $$("[data-scene-choice]",area).forEach(e=>e.addEventListener("click",()=>{state[e.dataset.sceneChoice]=e.dataset.value;if(e.dataset.sceneChoice==="pet"){state.petStyle=true3DPets.has(state.pet)?"3d":"photo";state.petModel=state.pet==="bird"?"parrot":state.pet}if(e.dataset.sceneChoice==="gender"||e.dataset.sceneChoice==="hair"){state.avatarStyle="3d";state.avatarModel=state.gender==="female"?"michelle":"soldier"}renderSheet(tab);refreshEditor()}));
 $$("[data-scene-color]",area).forEach(e=>e.addEventListener("click",()=>{state[e.dataset.sceneColor]=e.dataset.value;renderSheet(tab);refreshEditor()}));
 $$("[data-look-category]",area).forEach(e=>e.addEventListener("click",()=>{lookCategory=e.dataset.lookCategory;renderSheet(tab)}));
 $$("[data-look]",area).forEach(e=>e.addEventListener("click",()=>{const look=looks[Number(e.dataset.look)];if(!look)return;for(const key of ["top","topColor","bottom","shoes","accessory"])state[key]=look[key];renderSheet(tab);refreshEditor()}));
 $$("[data-avatar-preset]",area).forEach(button=>button.addEventListener("click",()=>{
  const p=avatarPresets.find(p=>p.id===button.dataset.avatarPreset);if(!p)return;
  Object.assign(state,{avatarPreset:p.id,avatarModel:p.model,gender:p.gender,avatarStyle:"3d",top:p.top,bottom:p.bottom,topColor:p.topColor,skin:p.skin,hair:p.hair,hairColor:p.hairColor,accessory:"none"});
  renderSheet("avatar");refreshEditor();
 }));
}
function refreshEditor(){
 present();
 if(!preview)return;
 if(state.avatarStyle==="photo"&&characterPhoto){const img=new Image();img.src=characterPhoto;img.alt="Mon personnage";img.className="cmd-scene-photo-preview";if(!preview.querySelector(".cmd-scene-photo-preview")||preview.querySelector(".cmd-scene-photo-preview").src!==img.src)preview.replaceChildren(img)}else{preview.querySelectorAll(".cmd-scene-photo-preview,.cmd-real-avatar-loading").forEach(el=>el.remove());}
 const animal=$("#cmdScenePreviewPet");
 if(animal){if(state.petStyle==="photo"){const img=new Image();img.src=animalPhoto||petImages[state.pet]||"";img.alt="Mon animal";img.className="cmd-scene-photo-preview";animal.replaceChildren(img)}else animal.replaceChildren();animal.hidden=state.pet==="none"||state.petStyle==="3d"}
 const sceneName=scenes.find(x=>x[0]===state.scene)?.[1]||"Décor";
 $("#cmdSceneLabel").textContent=sceneName+" · "+(pets.find(x=>x[0]===state.pet)?.[1]||"Aucun animal");
 const hero=$("#cmdSceneHero");if(hero){hero.dataset.scene=state.scene;hero.style.setProperty("--cmd-personal-scene-image",state.scene==="custom"&&custom?'url("'+custom.replace(/["\\]/g,"")+'")':"none")}
 document.dispatchEvent(new CustomEvent("cmd-avatar-3d:update"));
}
async function compressPhoto(file,preserveTransparency=false){
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>25*1024*1024)throw Error("Choisis une image PNG, JPG ou WebP de moins de 25 Mo.");
 const bitmap=await createImageBitmap(file).catch(()=>null);
 const image=bitmap||await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error("Image impossible à ouvrir"));i.src=URL.createObjectURL(file)});
 const w=image.width,h=image.height;if(!w||!h)throw Error("Image vide.");
 const ratio=preserveTransparency?Math.min(1,800/w,1000/h):Math.min(1,1400/w,900/h);
 const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
 canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
 if(image.close)image.close();else if(image.src?.startsWith("blob:"))URL.revokeObjectURL(image.src);
 let data=canvas.toDataURL("image/webp",preserveTransparency?.76:.8);
 if(!data.startsWith("data:image/webp"))data=canvas.toDataURL(preserveTransparency?"image/png":"image/jpeg",.78);
 if(data.length>2.75*1024*1024)throw Error("Image encore trop lourde. Choisis une photo plus petite.");
 return data;
}
const navIcons={
 mode:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5a3 3 0 0 1 6 0c0 2-2 2.5-3 3v2"/><path d="m12 10-9 8c-.9.7-.3 2 1 2h16c1.3 0 1.9-1.3 1-2Z"/></svg>',
 selfie:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="15" rx="3"/><path d="M8 6 9.5 3h5L16 6"/><circle cx="12" cy="13.5" r="4"/></svg>',
 pet:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="9" r="2"/><circle cx="10" cy="5" r="2"/><circle cx="16" cy="5" r="2"/><circle cx="20" cy="9" r="2"/><path d="M12 11c-2.7 0-3.6 3.3-5 4.7-1.5 1.4-2 4.4 1 5.3 3.6 1.1 4.5-1.2 4-1.2 2.4 0 3.2 2.3 5 1.2 3.7-1.2 2.4-3.3.6-5C15.6 14.1 14.7 11 12 11Z"/></svg>',
 scene:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="3"/><circle cx="16" cy="8" r="2"/><path d="m3 19 6-7 4 4 3-3 5 5"/></svg>',
 avatar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="8" r="4"/><path d="M2 21c0-5 3-8 8-8s8 3 8 8"/><path d="m19 6 2 2-2 2"/></svg>'
};
function closeSheet(){
 if(!sheet)return;
 state={...savedState};custom=savedCustom;characterPhoto=savedCharacterPhoto;animalPhoto=savedAnimalPhoto;customDirty=false;characterDirty=false;animalDirty=false;present();sheet.hidden=true;document.dispatchEvent(new CustomEvent("cmd-avatar-3d:update"));
}
function openSheet(){
 if(!slot)return;
 if(state.scene==="none")state.scene="neonforest";
 if(sheet){sheet.hidden=false;refreshEditor();showTab("mode");return}
 sheet=document.createElement("div");sheet.id="cmdSceneSheet";
 sheet.setAttribute("role","dialog");sheet.setAttribute("aria-modal","true");
 sheet.setAttribute("aria-label","Personnaliser le décor du profil CMD Sphere");
 sheet.innerHTML='<div class="cmd-scene-sheet">'+
 '<div class="cmd-scene-hero" id="cmdSceneHero" data-scene="neonforest">'+
 '<div class="cmd-scene-hero-landscape"></div><div class="cmd-scene-hero-lights" aria-hidden="true"></div>'+
 '<header class="cmd-scene-float-header"><button type="button" id="cmdSceneClose" aria-label="Fermer sans enregistrer">✕</button><span>CMD SPHERE · MON UNIVERS</span><button type="button" id="cmdScenePreviewSave" aria-label="Enregistrer le décor">Enregistrer</button></header>'+
 '<div class="cmd-scene-preview" aria-label="Aperçu de mon avatar avec mon animal">'+
 '<div id="cmdScenePreviewPerson"></div><div id="cmdScenePreviewPet"></div>'+
 '</div><div class="cmd-scene-scene-tag" id="cmdSceneLabel">Aperçu en direct</div>'+
 '</div>'+
 '<nav class="cmd-scene-tabs" aria-label="Choisir les personnalisations">'+tabs.map(([k,v])=>'<button type="button" data-scene-tab="'+k+'" aria-pressed="false">'+navIcons[k]+'<small>'+v+'</small></button>').join("")+'</nav>'+
 '<section id="cmdSceneOptions" class="cmd-scene-market" aria-live="polite"></section>'+
 '<div class="cmd-scene-footer"><span id="cmdSceneNotice" role="status" aria-live="polite"></span><div class="cmd-scene-footer-actions"><button type="button" id="cmdSceneReset">Fond d’origine</button><button type="button" id="cmdSceneSave">Enregistrer sur mon profil</button></div></div>'+
 '</div>';
 document.body.append(sheet);
 preview=$("#cmdScenePreviewPerson");
 $("#cmdSceneClose").onclick=closeSheet;
 $("#cmdSceneReset").onclick=()=>{state.scene="none";renderSheet("scene");refreshEditor();$("#cmdSceneNotice").textContent="Le fond d'origine sera retrouvé après enregistrement."};
 $("#cmdSceneSave").onclick=save;$("#cmdScenePreviewSave").onclick=save;
 $$("[data-scene-tab]",sheet).forEach(b=>b.onclick=()=>showTab(b.dataset.sceneTab));
 sheet.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();closeSheet()}});
 showTab("mode");
}
function showTab(tab){
 if(tab==="mode")lookCategory="all";
 $$("[data-scene-tab]",sheet).forEach(b=>{const on=b.dataset.sceneTab===tab;b.classList.toggle("selected",on);b.setAttribute("aria-pressed",String(on))});
 renderSheet(tab);refreshEditor();
 const area=$("#cmdSceneOptions");if(area)area.scrollTop=0;
}
async function save(){
 if(busy)return;busy=true;
 const btn=$("#cmdSceneSave");btn.disabled=true;
 $("#cmdSceneNotice").textContent="Enregistrement sur ton compte CMD Sphere…";
 try{
  const data={scene:state};if(customDirty)data.customBackground=custom;if(characterDirty)data.characterImage=characterPhoto;if(animalDirty)data.animalImage=animalPhoto;
  const r=await fetch("/api/profile/scene",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  const output=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(output.error||"Sauvegarde refusée");
  $("#cmdSceneNotice").textContent="Ton décor est enregistré sur ton profil !";customDirty=false;characterDirty=false;animalDirty=false;savedState={...state};savedCustom=custom;savedCharacterPhoto=characterPhoto;savedAnimalPhoto=animalPhoto;
  setTimeout(()=>{if(sheet)sheet.hidden=true},550);
 }catch(e){$("#cmdSceneNotice").textContent=e.message||"Erreur de sauvegarde"}
 finally{busy=false;btn.disabled=false}
}
async function initialize(){
 mountBanner();
 if(!slot){
  let attempts=0;
  const retry=setInterval(()=>{mountBanner();if(slot){clearInterval(retry);initialize()}else if(++attempts>=30)clearInterval(retry)},500);
  return;
 }
 // The banner already provides the avatar editor entry; no floating duplicate.

 try{
  const r=await fetch("/api/profile/scene",{credentials:"same-origin",cache:"no-store"});if(!r.ok)return;
  const data=await r.json();
  if(data.scene&&typeof data.scene==="object")state={...defaults,...data.scene};
  if(state.avatarStyle==="illustrated")state.avatarStyle="3d";
  if(state.petStyle==="illustrated")state.petStyle="3d";
  custom=typeof data.customBackground==="string"?data.customBackground:null;
  characterPhoto=typeof data.characterImage==="string"?data.characterImage:null;
  animalPhoto=typeof data.animalImage==="string"?data.animalImage:null;
  savedState={...state};savedCustom=custom;savedCharacterPhoto=characterPhoto;savedAnimalPhoto=animalPhoto;
  present();document.dispatchEvent(new CustomEvent("cmd-avatar-3d:update"));
 }catch(e){console.warn("[CMD profil décor]",e)}
}
window.cmdSphereSceneState=()=>({...state});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize);else initialize();
})();
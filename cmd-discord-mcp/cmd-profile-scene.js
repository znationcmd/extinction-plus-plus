/* CMD Sphere — custom illustration scene INSIDE existing /profile banner (not a separate profile).
   Original profile avatar, banner upload, name, status and badges remain unchanged. */
(()=>{"use strict";
if(window.__cmdProfileScene)return;window.__cmdProfileScene=true;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const scenes=[["none","Bannière d'origine","🎨"],["beach","Plage","🏖️"],["seaside","Bord de mer","🌊"],["forest","Forêt","🌲"],["waterfall","Cascade","💧"],["city","Ville","🏙️"],["night","Nuit","🌙"],["space","Espace","🌌"],["mountains","Montagnes","🏔️"],["custom","Ma photo","📷"]];
const clothes=[["hoodie","Sweat à capuche"],["tshirt","T-shirt"],["jacket","Veste"],["shirt","Chemise"],["dress","Robe"],["sport","Sport"],["suit","Costume"],["armor","Armure"]];
const pants=[["jeans","Jean"],["dark","Pantalon noir"],["shorts","Short"],["skirt","Jupe"],["cargo","Cargo"],["formal","Habillé"]];
const footwear=[["sneakers","Baskets"],["boots","Bottes"],["sandals","Sandales"],["formal","Chaussures de ville"]];
const skins=["#f7cb9e","#e8ad7e","#c68a60","#905a3d","#573b30","#2f2728"];
const haircolors=["#201b27","#58372a","#a65d32","#dcc071","#9b9ba9","#d76884","#f7f0e1"];
const outfits=["#ffffff","#212331","#7549b9","#237a9b","#d24e79","#e6a53a","#317f67","#b23b3b"];
const pets=[["none","Aucun","🚫"],["dog","Chien","🐶"],["cat","Chat","🐱"],["rabbit","Lapin","🐰"],["fox","Renard","🦊"],["bird","Oiseau","🦜"],["horse","Cheval","🐴"],["wolf","Loup","🐺"],["turtle","Tortue","🐢"]];
const defaults={scene:"none",gender:"neutral",skin:"#f7cb9e",hair:"short",hairColor:"#201b27",top:"hoodie",topColor:"#7549b9",bottom:"jeans",shoes:"sneakers",pet:"none",pose:"stand",accessory:"none",label:""};
let state={...defaults},savedState={...defaults},custom=null,savedCustom=null,customDirty=false,slot=null,scenery=null,sheet=null,figure=null,preview=null,busy=false;
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
 const patterns={beach:"☀️　　　　🌴",seaside:"☀️　 🐚　⛵",forest:"🌲　　　🌲　🌿",waterfall:"🌳　　　💦　🌿",city:"🏙️　　　🌇",night:"✨　🌙　　　 ⭐",space:"🪐　✨　　 ⭐",mountains:"🏔️　　　　🌲",custom:"",none:""};
 return patterns[scene]||"";
}
function present(s=state,img=custom){
 if(!slot)return;
 if(s.scene==="none"){slot.classList.remove("cmd-scene-active");if(scenery)scenery.replaceChildren();return}
 slot.classList.add("cmd-scene-active");slot.dataset.scene=scenes.some(a=>a[0]===s.scene)?s.scene:"forest";
 scenery.replaceChildren();
 if(s.scene==="custom"&&img){const photo=document.createElement("div");photo.className="cmd-scene-personal-image";photo.style.backgroundImage='url("'+img.replace(/["\\]/g,"")+'")';scenery.append(photo)}
 const light=document.createElement("div");light.className="cmd-scene-scenery";light.textContent=decorateScene(s.scene);scenery.append(light);
 const person=document.createElement("div");person.className="cmd-scene-person";person.innerHTML=drawPerson(s);scenery.append(person);
 if(s.pet!=="none"){const animal=document.createElement("div");animal.className="cmd-scene-pet";animal.textContent=(pets.find(p=>p[0]===s.pet)||pets[1])[2];scenery.append(animal)}
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
function field(title,id,array){return '<label>'+title+'<select data-scene-field="'+id+'">'+options(array,state[id])+'</select></label>'}
function picker(label,key,opts){
 return '<div class="cmd-scene-fieldset"><strong>'+label+'</strong><div class="cmd-scene-choice-grid">'+opts.map(([value,name,emoji])=>'<button type="button" data-scene-choice="'+key+'" data-value="'+escape(value)+'" class="'+(state[key]===value?"selected":"")+'">'+(emoji?'<span>'+emoji+'</span>':"")+'<small>'+escape(name)+'</small></button>').join("")+'</div></div>';
}
function swatches(label,key,values){return '<div class="cmd-scene-fieldset"><strong>'+label+'</strong><div class="cmd-scene-swatches">'+values.map(c=>'<button type="button" aria-label="'+c+'" data-scene-color="'+key+'" data-value="'+c+'" class="'+(state[key]===c?"selected":"")+'" style="background:'+c+'"></button>').join("")+'</div></div>'}
const tabs=[["mode","Mode","👗"],["selfie","Selfie","📸"],["pet","Animal","🐾"],["scene","Scène","🏖️"],["avatar","Avatar","🧑"]];
function contents(tab){
 if(tab==="mode")return field("Haut / tenue","top",clothes)+swatches("Couleur des vêtements","topColor",outfits)+field("Bas","bottom",pants)+field("Chaussures","shoes",footwear)+'<label>Marque ou collection (texte libre, non officiel)<input data-scene-field="label" maxlength="42" placeholder="Ex. collection sportive"></label>';
 if(tab==="selfie")return picker("Pose","pose",[["stand","Debout","🧍"],["wave","Salut","👋"],["peace","Peace","✌️"],["crossed","Bras croisés","💪"]])+picker("Accessoires","accessory",[["none","Sans","—"],["glasses","Lunettes","👓"],["sunglasses","Soleil","🕶️"],["hat","Chapeau","🎩"],["cap","Casquette","🧢"],["headphones","Casque","🎧"],["crown","Couronne","👑"]]);
 if(tab==="pet")return picker("Mon animal de compagnie","pet",pets);
 if(tab==="scene")return picker("Mon fond de profil","scene",scenes)+'<label class="cmd-scene-file">📷 Importer ma propre image<input id="cmdSceneUpload" type="file" accept="image/jpeg,image/png,image/webp"></label><small>Ta photo est optimisée sur cet appareil, puis enregistrée sur ton compte.</small>';
 return picker("Personnage","gender",[["male","Homme","🧑"],["female","Femme","👩"],["neutral","Personnalisé","🧑‍🎨"]])+swatches("Carnation","skin",skins)+field("Cheveux","hair",[["short","Courts"],["long","Longs"],["curly","Bouclés"],["bob","Carré"],["shaved","Très courts"],["ponytail","Queue de cheval"]])+swatches("Couleur des cheveux","hairColor",haircolors);
}
function renderSheet(tab){
 const root=$("#cmdSceneOptions");if(!root)return;
 root.innerHTML=contents(tab);
 $$("[data-scene-field]",root).forEach(e=>e.addEventListener("input",()=>{state[e.dataset.sceneField]=e.value;refreshEditor()}));
 $$("[data-scene-choice]",root).forEach(e=>e.addEventListener("click",()=>{state[e.dataset.sceneChoice]=e.dataset.value;renderSheet(tab);refreshEditor()}));
 $$("[data-scene-color]",root).forEach(e=>e.addEventListener("click",()=>{state[e.dataset.sceneColor]=e.dataset.value;renderSheet(tab);refreshEditor()}));
 $("#cmdSceneUpload")?.addEventListener("change",async e=>{const f=e.target.files?.[0];if(!f)return;$("#cmdSceneNotice").textContent="Préparation de ton image…";try{custom=await compressPhoto(f);customDirty=true;state.scene="custom";renderSheet(tab);refreshEditor();$("#cmdSceneNotice").textContent="Image personnelle ajoutée. Appuie sur Enregistrer."}catch(error){$("#cmdSceneNotice").textContent=error.message}finally{e.target.value=""}});
}
function refreshEditor(){present();if(preview){preview.innerHTML=drawPerson(state);const sceneName=scenes.find(x=>x[0]===state.scene)?.[1]||"Décor";$("#cmdSceneLabel").textContent=sceneName+" · "+(pets.find(x=>x[0]===state.pet)?.[1]||"Aucun")}}
async function compressPhoto(file){
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>25*1024*1024)throw Error("Choisis une image PNG, JPG ou WebP de moins de 25 Mo.");
 const bitmap=await createImageBitmap(file).catch(()=>null);
 const image=bitmap||await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error("Image impossible à ouvrir"));i.src=URL.createObjectURL(file)});
 const w=image.width,h=image.height;if(!w||!h)throw Error("Image vide.");
 const ratio=Math.min(1,1400/w,900/h);
 const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
 canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
 if(image.close)image.close();else if(image.src?.startsWith("blob:"))URL.revokeObjectURL(image.src);
 let data=canvas.toDataURL("image/webp",.8);
 if(!data.startsWith("data:image/webp"))data=canvas.toDataURL("image/jpeg",.78);
 if(data.length>2.75*1024*1024)throw Error("Image encore trop lourde. Choisis une photo plus petite.");
 return data;
}
function openSheet(){
 if(!slot)return;
 if(sheet){sheet.hidden=false;showTab("mode");return}
 sheet=document.createElement("div");sheet.id="cmdSceneSheet";sheet.setAttribute("role","dialog");sheet.setAttribute("aria-modal","true");sheet.setAttribute("aria-label","Personnaliser le fond de mon profil CMD Sphere");
 sheet.innerHTML='<div class="cmd-scene-sheet"><header><strong>🎭 Mon avatar & décor du profil</strong><button type="button" id="cmdSceneClose" aria-label="Fermer">✕</button></header>'+
 '<div class="cmd-scene-header-note">Tout se place dans la bannière de ton profil actuel, comme un décor personnalisé.</div>'+
 '<div class="cmd-scene-preview"><div id="cmdScenePreviewPerson"></div><small id="cmdSceneLabel">Aperçu du personnage</small></div>'+
 '<div class="cmd-scene-tabs">'+tabs.map(([k,v,ic])=>'<button type="button" data-scene-tab="'+k+'">'+ic+'<small>'+v+'</small></button>').join("")+'</div>'+
 '<div id="cmdSceneOptions"></div><p id="cmdSceneNotice" role="status"></p><footer><button type="button" id="cmdSceneReset">Fond d’origine</button><button type="button" id="cmdSceneSave">Enregistrer sur mon profil</button></footer></div>';
 document.body.append(sheet);
 preview=$("#cmdScenePreviewPerson");
 $("#cmdSceneClose").onclick=()=>{state={...savedState};custom=savedCustom;customDirty=false;present();sheet.hidden=true};
 $("#cmdSceneReset").onclick=()=>{state.scene="none";present();renderSheet("scene");$("#cmdSceneNotice").textContent="Le fond d’origine sera rétabli après enregistrement."};
 $("#cmdSceneSave").onclick=save;
 $$("[data-scene-tab]",sheet).forEach(b=>b.onclick=()=>showTab(b.dataset.sceneTab));
 showTab("mode");
}
function showTab(tab){
 $$("[data-scene-tab]",sheet).forEach(b=>b.classList.toggle("selected",b.dataset.sceneTab===tab));
 renderSheet(tab);refreshEditor();
}
async function save(){
 if(busy)return;busy=true;
 const btn=$("#cmdSceneSave");btn.disabled=true;
 $("#cmdSceneNotice").textContent="Enregistrement sur ton compte CMD Sphere…";
 try{
  const data={scene:state};if(customDirty)data.customBackground=custom;
  const r=await fetch("/api/profile/scene",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  const output=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(output.error||"Sauvegarde refusée");
  $("#cmdSceneNotice").textContent="Ton décor est enregistré sur ton profil !";customDirty=false;savedState={...state};savedCustom=custom;
  setTimeout(()=>{if(sheet)sheet.hidden=true},550);
 }catch(e){$("#cmdSceneNotice").textContent=e.message||"Erreur de sauvegarde"}
 finally{busy=false;btn.disabled=false}
}
async function initialize(){
 mountBanner();if(!slot)return;
 try{
  const r=await fetch("/api/profile/scene",{credentials:"same-origin",cache:"no-store"});if(!r.ok)return;
  const data=await r.json();
  if(data.scene&&typeof data.scene==="object")state={...defaults,...data.scene};
  custom=typeof data.customBackground==="string"?data.customBackground:null;
  savedState={...state};savedCustom=custom;
  present();
 }catch(e){console.warn("[CMD profil décor]",e)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize);else initialize();
})();
/* CMD Sphere — live preview of unsaved form changes without overwriting the saved profile. */
(()=>{
"use strict";
if(window.__cmdLiveProfilePreview)return;window.__cmdLiveProfilePreview=true;
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
let avatarUrl=null,bannerUrl=null,queued=false,preview=null,form=null;
function init(){
 form=$("#profileForm");const hero=$(".hero");
 if(!form||!hero||$("#cmdProfileEditPreview"))return;
 const css=document.createElement("style");
 css.textContent=
 '#profileForm #cmdProfileEditPreview{position:relative;top:auto;z-index:1;isolation:isolate;margin:8px 0 18px;border:1px solid #b489d2a3;border-radius:15px;background:#24132f;overflow:hidden;box-shadow:0 8px 28px #0008;color:#fff}'+
 '#cmdProfileEditPreview .cmd-live-profile-head{padding:7px 11px;background:#33213e;display:flex;align-items:center;justify-content:space-between;font:bold 12px/1.4 system-ui}'+
 '#cmdProfileEditPreview .cmd-live-profile-hint{font:500 10px/1.2 system-ui;color:#e9ccec}'+
 '#cmdProfileEditPreview .cmd-live-cover{height:64px;background:#4d2c63 center / cover no-repeat;position:relative}'+
 '#cmdProfileEditPreview .cmd-live-card{min-height:82px;display:flex;align-items:center;gap:11px;padding:9px 13px}'+
 '#cmdProfileEditPreview .cmd-live-avatar-box{position:relative;flex:none;width:67px;height:67px}'+
 '#cmdProfileEditPreview .cmd-live-avatar{width:67px;height:67px;object-fit:cover;border-radius:50%;display:block;background:#2c2030;border:3px solid var(--cmd-live-accent,#a855f7)}'+
 '#cmdProfileEditPreview .cmd-live-decoration,#cmdProfileEditPreview .cmd-live-avatar-frame{position:absolute;inset:-7px;width:81px;height:81px;pointer-events:none;object-fit:contain}'+
 '#cmdProfileEditPreview .cmd-live-info{min-width:0;flex:1;display:grid;gap:3px}'+
 '#cmdProfileEditPreview .cmd-live-name{font-size:16px;font-weight:850;overflow-wrap:anywhere;line-height:1.2}'+
 '#cmdProfileEditPreview .cmd-live-detail{font-size:12px;color:#ddd0e7;overflow-wrap:anywhere}'+
 '#cmdProfileEditPreview .cmd-live-bio{max-height:150px;overflow-y:auto;padding:8px 12px 11px;white-space:pre-wrap;overflow-wrap:anywhere;font:500 12px/1.35 system-ui;color:#f2e9f4;background:#201526;border-top:1px solid #ffffff23;max-height:85px;overflow:auto}'+
 '#cmdProfileEditPreview .cmd-live-badges{font-size:11px;line-height:1.3;max-height:35px;overflow:auto}'+
 '#cmdProfileEditPreview .cmd-live-name[data-style=glow]{text-shadow:0 0 11px var(--cmd-live-accent)}'+
 '#cmdProfileEditPreview .cmd-live-name[data-style=prism]{background:linear-gradient(110deg,#c390ff,#fff,#e397fc);-webkit-background-clip:text;background-clip:text;color:transparent}'+
 '@media(max-width:430px){#cmdProfileEditPreview .cmd-live-cover{height:54px}#cmdProfileEditPreview .cmd-live-avatar,#cmdProfileEditPreview .cmd-live-avatar-box{width:56px;height:56px}#cmdProfileEditPreview .cmd-live-decoration,#cmdProfileEditPreview .cmd-live-avatar-frame{width:70px;height:70px;inset:-7px}#cmdProfileEditPreview .cmd-live-card{min-height:71px}}';
 document.head.append(css);
 preview=document.createElement("section");preview.id="cmdProfileEditPreview";preview.setAttribute("aria-label","Aperçu du profil avant enregistrement");
 preview.innerHTML='<div class="cmd-live-profile-head"><span>👁 Aperçu en direct</span><span class="cmd-live-profile-hint">Non enregistré</span></div>'+
 '<div class="cmd-live-cover"></div><div class="cmd-live-card"><div class="cmd-live-avatar-box"><img class="cmd-live-avatar" alt="Aperçu de mon avatar"><img class="cmd-live-avatar-frame" alt="" hidden><img class="cmd-live-decoration" alt="" hidden></div>'+
 '<div class="cmd-live-info"><div class="cmd-live-name"></div><div class="cmd-live-detail"></div><div class="cmd-live-badges"></div></div></div><div class="cmd-live-bio"></div>';
 const title=$("h2",form);if(title)title.insertAdjacentElement("afterend",preview);else form.prepend(preview);
 const fileChange=(id,type)=>{
  const file=$("#"+id)?.files?.[0];
  if(type==="avatar"){if(avatarUrl)URL.revokeObjectURL(avatarUrl);avatarUrl=file?URL.createObjectURL(file):null}
  else{if(bannerUrl)URL.revokeObjectURL(bannerUrl);bannerUrl=file?URL.createObjectURL(file):null}
  schedule();
 };
 $("#avatarFile")?.addEventListener("change",()=>fileChange("avatarFile","avatar"));
 $("#bannerFile")?.addEventListener("change",()=>fileChange("bannerFile","banner"));
 form.addEventListener("input",schedule,true);
 form.addEventListener("change",schedule,true);
 document.addEventListener("click",event=>{
  if(event.target?.closest?.(".decoTile,.effectTile,.frameTile,.nameplateTile,.tagPick"))setTimeout(schedule,0);
 },true);
 $("#editBtn")?.addEventListener("click",schedule);
 $("#cancelBtn")?.addEventListener("click",()=>{if(avatarUrl){URL.revokeObjectURL(avatarUrl);avatarUrl=null}if(bannerUrl){URL.revokeObjectURL(bannerUrl);bannerUrl=null}});
 window.addEventListener("pagehide",()=>{if(avatarUrl)URL.revokeObjectURL(avatarUrl);if(bannerUrl)URL.revokeObjectURL(bannerUrl)});
 draw();
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;draw()})}
function draw(){
 if(!preview||!form)return;
 const hero=$(".hero");if(!hero)return;
 const get=name=>String(form.elements.namedItem(name)?.value??"");
 const name=get("displayName")||"Mon profil",pronouns=get("pronouns"),bio=get("bio"),status=get("status"),
 style=get("nameStyle"),decoration=get("avatarDecoration"),frame=get("profileFrame"),accent=get("accentColor");
 preview.style.setProperty("--cmd-live-accent",/^#[0-9a-f]{6}$/i.test(accent)?accent:"#9f63c6");
 const banner=$(".cmd-live-cover",preview),original=$("#bannerTap"),bg=original?getComputedStyle(original).backgroundImage:"";
 banner.style.backgroundImage=bannerUrl?'url("'+bannerUrl+'")':bg;
 const avatar=$(".cmd-live-avatar",preview),source=avatarUrl||$(".hero .avatar")?.getAttribute("src")||"/app-icon.webp?v=5";
 if(avatar.getAttribute("src")!==source)avatar.setAttribute("src",source);
 const deco=$(".cmd-live-decoration",preview),decoPresent=Boolean(decoration&&decoration!=="none");
 deco.hidden=!decoPresent;if(decoPresent)deco.src="/cmd-art/avatar/"+encodeURIComponent(decoration)+".svg?v=20261010hd3";
 const frameImage=$(".cmd-live-avatar-frame",preview),framePresent=Boolean(frame&&frame!=="none");
 frameImage.hidden=!framePresent;if(framePresent)frameImage.src="/cmd-art/frame/"+encodeURIComponent(frame)+".svg?v=20261010hd3";
 const line=$(".cmd-live-name",preview);line.textContent=name;line.dataset.style=style;
 $(".cmd-live-detail",preview).textContent=[pronouns,status].filter(Boolean).join(" · ")||"Mon profil CMD Sphere";
 $(".cmd-live-bio",preview).textContent=bio||"Ta bio apparaîtra ici.";
 const badges=$$(".badgeChoice input[data-badge]:checked",form).map(b=>b.closest("label")?.textContent?.trim()).filter(Boolean);
 $(".cmd-live-badges",preview).textContent=badges.join(" · ");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
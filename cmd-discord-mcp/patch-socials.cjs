const fs=require("fs");
const p="server.js";
let s=fs.readFileSync(p,"utf8");
let n=0;
function rep(a,b,label){
  if(s.includes(a)){s=s.replace(a,b);n++;console.log("[socials] "+label)}
  else console.log("[socials] skip "+label);
}

rep(
  "  await pool.query(\"ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS profile_theme TEXT NOT NULL DEFAULT 'purple'\");",
  "  await pool.query(\"ALTER TABLE cmd_native_members ADD COLUMN IF NOT EXISTS profile_theme TEXT NOT NULL DEFAULT 'purple'\");\\n  await pool.query(\"ALTER TABLE cmd_global_profiles ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb\");",
  "database"
);

if(!s.includes("function safeSocialLinks(input){")){
  const helper = 'function safeSocialLinks(input){\\n'+
    '  const out={};\\n'+
    '  for(const key of [\"facebook\",\"playstation\",\"xbox\",\"tiktok\",\"instagram\",\"x\",\"nintendo\"]){\\n'+
    '    const v=String(input?.[key]??input?.socialLinks?.[key]??\"\").trim().slice(0,300);\\n'+
    '    if(v)out[key]=v;\\n'+
    '  }\\n'+
    '  return out;\\n'+
    '}\\n';
  const anchor="async function getGlobalProfile(auth){";
  if(s.includes(anchor)){s=s.replace(anchor,helper+anchor);n++;console.log("[socials] helper")}
}

rep(
  '    accentColor:saved.accent_color||((auth.user.accentColor!=null)?("#"+Number(auth.user.accentColor).toString(16).padStart(6,"0")):"#9b4dff"),\\n    theme:saved.theme||"purple"\\n  };',
  '    accentColor:saved.accent_color||((auth.user.accentColor!=null)?("#"+Number(auth.user.accentColor).toString(16).padStart(6,"0")):"#9b4dff"),\\n    theme:saved.theme||"purple",\\n    socialLinks:(saved.social_links&&typeof saved.social_links==="object")?saved.social_links:{}\\n  };',
  "profile read"
);

rep(
  '  return getGlobalProfile(auth);\\n}\\nfunction escHtml',
  '  const socialLinks=safeSocialLinks(input);\\n  await pool.query("UPDATE cmd_global_profiles SET social_links=$2::jsonb,updated_at=NOW() WHERE user_id=$1",[String(auth.user.id),JSON.stringify(socialLinks)]);\\n  return getGlobalProfile(auth);\\n}\\nfunction escHtml',
  "profile save"
);

if(!s.includes("const socialDefs=[['facebook'")){
  rep(
    '  const status=escHtml(profile.status||"En ligne");\\n  const bg=',
    '  const status=escHtml(profile.status||"En ligne");\\n  const socialLinks=profile.socialLinks||{};\\n  const socialDefs=[[\"facebook\",\"📘 Facebook\"],[\"playstation\",\"🎮 PlayStation\"],[\"xbox\",\"🟩 Xbox\"],[\"tiktok\",\"🎵 TikTok\"],[\"instagram\",\"📸 Instagram\"],[\"x\",\"𝕏 X\"],[\"nintendo\",\"🔴 Nintendo\"]];\\n  const socialHtml=\\'<div class="section"><h3>Comptes associés</h3><div class="connections">\\'+socialDefs.map(([k,label])=>{const v=escHtml(socialLinks[k]||"");if(!v)return \\'<div class="connection"><b>\\'+label+\\'</b><span>Non associé</span></div>\\';const linked=/^https?:\\\\/\\\\//i.test(String(socialLinks[k]||""));return \\'<div class="connection"><b>\\'+label+\\'</b>\\'+(linked?\\'<a href="\\'+v+\\'" target="_blank" rel="noopener">\\'+v+\\'</a>\\':\\'<span>\\'+v+\\'</span>\\')+\\'</div>\\'}).join("")+\\'</div></div>\\';\\n  const socialInputs=\\'<h3 style="margin-top:22px">Comptes associés</h3>\\'+socialDefs.map(([k,label])=>\\'<label>\\'+label+\\'<input name="\\'+k+\\'" maxlength="300" placeholder="Identifiant ou lien public" value="\\'+escHtml(socialLinks[k]||"")+\\'"></label>\\').join("");\\n  const bg=',
    "profile variables"
  );
}

rep(
  '.bio{font-size:17px;line-height:1.55;white-space:pre-wrap;color:#f2eef4}.status{',
  '.bio{font-size:17px;line-height:1.55;white-space:pre-wrap;color:#f2eef4}.connections{display:grid;grid-template-columns:1fr 1fr;gap:9px}.connection{min-width:0;padding:11px 12px;border:1px solid #ffffff12;background:#ffffff09;border-radius:12px}.connection b,.connection span,.connection a{display:block}.connection span,.connection a{margin-top:4px;color:#d5c7da;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.connection a{text-decoration:none}.status{',
  "profile styles"
);
rep(
  '@media(max-width:560px){.shell{',
  '@media(max-width:560px){.connections{grid-template-columns:1fr}.shell{',
  "mobile styles"
);

rep(
  '<div class="section"><h3>Bio</h3><div class="bio">\'+bio+\'</div></div></div></div></div></div>\'+',
  '<div class="section"><h3>Bio</h3><div class="bio">\'+bio+\'</div></div>\'+socialHtml+\'</div></div></div></div>\'+',
  "connections display"
);

rep(
  '<label>Bannière<input id="bannerFile" type="file" accept="image/png,image/jpeg,image/webp"></label><button class="save">Enregistrer</button>',
  '<label>Bannière<input id="bannerFile" type="file" accept="image/png,image/jpeg,image/webp"></label>\'+socialInputs+\'<button class="save">Enregistrer</button>',
  "connections editor"
);

fs.writeFileSync(p,s);
console.log("[socials] total changes="+n);

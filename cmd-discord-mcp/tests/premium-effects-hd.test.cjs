"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const art=fs.readFileSync(path.join(__dirname,"..","cmd-premium-art.js"),"utf8");
const server=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
const clean=art.replace(/^export /gm,"");
const {renderCmdPremiumSvg,CMD_EFFECT_ART,CMD_ART_FRAMES,CMD_ART_AVATARS,CMD_PREMIUM_ART_CSS}=
 vm.runInNewContext(clean+"\n({renderCmdPremiumSvg,CMD_EFFECT_ART,CMD_ART_FRAMES,CMD_ART_AVATARS,CMD_PREMIUM_ART_CSS});",{});
test("10 effect IDs are preserved and mapped to original Retina SVG illustrations",()=>{
 const required=["zombie","ghostship","purplelightning","moonmist","shadow","apocalypse","stars","pulse","aurora","sparkle"];
 assert.equal(Object.keys(CMD_EFFECT_ART).length,required.length);
 for(const key of required){
  assert.ok(CMD_EFFECT_ART[key]);
  const svg=renderCmdPremiumSvg("effect",key);
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 640 360"/);
  assert.match(svg,/<\/svg>$/);
  assert.doesNotMatch(svg,/NaN|undefined|<script|snapchat/i);
  assert.match(svg,/<(?:path|circle|ellipse|rect)/);
  assert.match(svg,/id="sceneGlow"/);
 }
});
test("Existing premium frame/avatar IDs keep valid independent vector artwork",()=>{
 assert.equal(Object.keys(CMD_ART_FRAMES).length,12);
 assert.equal(Object.keys(CMD_ART_AVATARS).length,12);
 for(const [kind,entries] of [["frame",CMD_ART_FRAMES],["avatar",CMD_ART_AVATARS]]){
  for(const key of Object.keys(entries)){
   const output=renderCmdPremiumSvg(kind,key);
   assert.ok(output?.startsWith("<svg"));
   assert.ok(output.endsWith("</svg>"));
  }
 }
});
test("No new effect path enables arbitrary source or unregistered artwork",()=>{
 for(const value of ["../../secrets","none","evil.svg","A<script>","unknown"])
  assert.equal(renderCmdPremiumSvg("effect",value),null);
});
test("Effect catalog uses vector art, not emoji-only thumbnails",()=>{
 assert.match(server,/cmd-art\/effect\//);
 assert.match(server,/cmd-effect-preview/);
 assert.match(CMD_PREMIUM_ART_CSS,/cmd-effect-preview img/);
 assert.match(server,/cmd-premium-art\.css\?v=20261010effect1/);
});

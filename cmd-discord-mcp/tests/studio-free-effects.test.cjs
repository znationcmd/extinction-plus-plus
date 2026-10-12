"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const s=fs.readFileSync(path.join(__dirname,"..","cmd-promo-studio.js"),"utf8");
test("free effects render in preview and export via one canvas",()=>{
 for(const x of ["bokeh","fireflies","confetti","bubbles","hearts","petals","fog","scanlines","sunburst","vignette","ripples"])assert.ok(s.includes('["'+x+'",'));
 for(const x of ["sepia","pastel","cyberpunk","tealorange","lavender","golden","matte","filmic","ice","sunny","deepblue"])assert.ok(s.includes(x+':"'));
 assert.match(s,/drawVisualEffect\(ctx,w,h,t,state.effect\)/);
 assert.match(s,/drawVisualEffect\(c,w,h,.7,value\)/);
 assert.doesNotThrow(()=>new vm.Script(s));
});
test("free transitions are selectable and painted into frames",()=>{
 for(const x of ["wipe","iris","flashwhite","zoomfade"]){assert.ok(s.includes('value="'+x+'"'));assert.ok(s.includes('state.transition==="'+x+'"'))}
});

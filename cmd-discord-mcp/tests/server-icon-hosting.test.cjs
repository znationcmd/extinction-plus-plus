"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const manager=fs.readFileSync(path.join(__dirname,"..","cmd-server-manager.js"),"utf8");
const dashboard=fs.readFileSync(path.join(__dirname,"..","server.js"),"utf8");
const hosting=fs.readFileSync(path.join(__dirname,"..","cmd-hosting-panel.js"),"utf8");

test("iPhone HEIC photo becomes JPEG, preserving full image aspect",async()=>{
 const start=manager.indexOf("async function prepareServerIcon(file){");
 const end=manager.indexOf("window.cmdPrepareServerIcon=prepareServerIcon;",start);
 assert.ok(start>=0&&end>start,"image compressor available");
 const samples=[];
 const URL={createObjectURL:()=> "blob:test",revokeObjectURL:()=>{}};
 class ImageMock {
  naturalWidth=2000;naturalHeight=1000;
  set src(v){this.onload();}
 }
 const document={createElement:()=>{
  const canvas={width:0,height:0,toDataURL:(type)=>"data:image/jpeg;base64,QUJD",getContext:()=>({
   fillStyle:null,fillRect(){},
   drawImage:(img,x,y,w,h)=>samples.push({x,y,w,h}),
   imageSmoothingEnabled:false,imageSmoothingQuality:""
  })};
  return canvas;
 }};
 const factory=new Function("URL","Image","document",manager.slice(start,end)+";return prepareServerIcon;");
 const convert=factory(URL,ImageMock,document);
 const data=await convert({name:"IMG_1001.HEIC",type:"image/heic",size:9000000});
 assert.match(data,/^data:image\/jpeg;base64,/);
 assert.deepEqual(samples,[{x:0,y:128,w:512,h:256}]);
 await assert.rejects(convert({name:"huge.jpg",type:"image/jpeg",size:35000000}),/30 Mo/);
});

test("both image pickers accept modern iPhone photos",()=>{
 assert.ok(manager.includes('accept="image/*,.heic,.heif"'));
 assert.ok(dashboard.includes('id="cmdWFile" type="file" accept="image/*,.heic,.heif"'));
 assert.ok(dashboard.includes("window.cmdPrepareServerIcon(file)"));
 assert.ok(dashboard.includes("cmdSphereIconError"));
 assert.ok(dashboard.includes("/api/native/server-identity"));
});

test("Hosting panel has an independent direct URL and explicit account-link errors",()=>{
 assert.ok(hosting.includes('https://cmd-hosting-web-production.up.railway.app/d/cmd'));
 assert.ok(hosting.includes('target="_blank"'));
 assert.ok(hosting.includes("la connexion des comptes reste à vérifier"));
 assert.ok(dashboard.includes("/cmd-hosting-panel.js?v=20261010hostingfix1"));
 assert.ok(dashboard.includes("/cmd-server-manager.js?v=20261010iconfix1"));
});

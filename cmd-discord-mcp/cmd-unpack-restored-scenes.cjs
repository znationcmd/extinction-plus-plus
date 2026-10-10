/* CMD Sphere — unpack supplemental scenes, without changing any existing images. */
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const AdmZip=require("adm-zip");
const source=path.join(__dirname,"profile-assets-extra");
const parts=fs.readdirSync(source).filter(name=>/^scenes62\.part-\d{3}$/.test(name)).sort();
if(parts.length!==13)throw Error("The supplemental wallpaper archive is incomplete: "+parts.length+"/13");
const archive=Buffer.concat(parts.map(name=>fs.readFileSync(path.join(source,name))));
const checksum=crypto.createHash("sha256").update(archive).digest("hex");
if(checksum!=="03a50e854fed5bd8d404b48b1b3ddf110e477e316a4a9de17cc0b54e8255e179")throw Error("Supplemental wallpaper archive integrity mismatch");
const zip=new AdmZip(archive);
const target=path.join(__dirname,"public","cmd-restored-fonds");
fs.mkdirSync(target,{recursive:true});
let count=0,manifest=null;
for(const entry of zip.getEntries()){
 const name=entry.entryName;
 if(name==="manifest.json"){
  manifest=JSON.parse(entry.getData().toString("utf8"));continue;
 }
 if(!/^fonds\/[a-z0-9_]+\.webp$/.test(name))throw Error("Invalid wallpaper path "+name);
 const output=path.join(target,path.basename(name));
 fs.writeFileSync(output,entry.getData(),{flag:"w"});
 count++;
}
if(count!==62||!Array.isArray(manifest)||manifest.length!==62)throw Error("Incomplete scene catalogue: "+count);
for(const s of manifest){
 if(!/^cmd-restored-[a-z0-9-]+$/.test(s.id)||!/^\/cmd-restored-fonds\/[a-z0-9_]+\.webp$/.test(s.src)||s.width!==1920||s.height!==1080)throw Error("Invalid scene metadata");
 if(!fs.existsSync(path.join(target,path.basename(s.src))))throw Error("Missing wallpaper "+s.src);
}
fs.writeFileSync(path.join(target,"manifest.json"),JSON.stringify(manifest));
console.info("[CMD Sphere] Added "+count+" supplemental landscape scenes; saved IDs and originals unchanged.");

const sharp=require("sharp");
sharp.cache(false);
sharp.concurrency(1);
(async()=>{
 const directory=target;
 fs.mkdirSync(directory,{recursive:true});
 for(const item of manifest){
  const input=path.join(target,path.basename(item.src));
  const metadata=await sharp(input).metadata();
  if(metadata.width!==1920||metadata.height!==1080)throw Error("Unexpected full wallpaper dimensions: "+item.id);
  await sharp(input).resize(640,360,{fit:"inside",withoutEnlargement:true})
   .webp({quality:76,effort:2}).toFile(path.join(directory,"thumb_"+path.basename(item.src)));
 }
 console.info("[CMD Sphere] Generated "+manifest.length+" lightweight 640x360 wallpaper thumbnails; originals retained.");
})().catch(error=>{console.error("[CMD Sphere thumbnails]",error);process.exitCode=1});

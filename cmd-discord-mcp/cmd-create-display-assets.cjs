/* CMD Sphere display-quality catalogue. The originals in v1/v3 are NEVER changed.
 * This improves browser rendering dimensions and edge clarity; it cannot invent
 * authentic photographic detail missing from the tiny source thumbnails. */
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const sharp=require("sharp");
sharp.cache(false);
sharp.concurrency(1);
const root=__dirname;
const originalUniverse=path.join(root,"public","universe","v1");
const displayUniverse=path.join(root,"public","universe","v2");
const originalAvatars=path.join(root,"public","avatars","v3");
const displayAvatars=path.join(root,"public","avatars","v4");
fs.mkdirSync(displayUniverse,{recursive:true});
fs.mkdirSync(displayAvatars,{recursive:true});
const fileNamePattern=/^(scene|pet|vehicle|home)-([0-9]{3})\.(png|webp)$/;
const avatarPattern=/^avatar-(0[1-9]|[1-5][0-9]|6[0-8])\.png$/;
const report={version:3,generatedAt:new Date().toISOString(),files:[],errors:[],originalsRetained:true,realDetailRestoration:false};
async function processImage(directory,filename,destDirectory,type){
 const input=path.join(directory,filename);
 const outputName=filename.replace(/\.(png|webp)$/i,".webp");
 const output=path.join(destDirectory,outputName);
 try {
   const meta=await sharp(input).metadata();
   if(!meta.width||!meta.height)throw Error("Unknown source dimensions");
   const scene=type==="scene",avatar=type==="avatar";
   // Maintain every limb and every edge; use FIT INSIDE rather than COVER.
   const options=avatar?{width:1080,height:3072,fit:"inside",kernel:"lanczos3"}:
        scene?{width:3840,height:2160,fit:"inside",kernel:"lanczos3"}:
        {width:2048,height:2048,fit:"inside",kernel:"lanczos3"};
   const result=await sharp(input,{failOn:"error"})
      .resize(options)
      .sharpen({sigma:1.05,m1:1,m2:2})
      .webp({quality:94,effort:4,alphaQuality:100})
      .toFile(output);
   // Lightweight catalogue thumbnail. The selected profile preview keeps the full display image.
   // Files are written only into v2/v4; original v1/v3 assets remain untouched.
   const thumbDir=path.join(destDirectory,"thumbs");
   fs.mkdirSync(thumbDir,{recursive:true});
   const thumbSize=scene?{width:640,height:360}:avatar?{width:240,height:680}:{width:480,height:480};
   const thumbResult=await sharp(input,{failOn:"error"})
      .resize({...thumbSize,fit:"inside",kernel:"lanczos3"})
      .sharpen({sigma:0.8,m1:1,m2:2})
      .webp({quality:78,effort:3,alphaQuality:95})
      .toFile(path.join(thumbDir,outputName));
   report.files.push({
     kind:type,source:filename,output:outputName,
     thumbnailWidth:thumbResult.width,thumbnailHeight:thumbResult.height,
     sourceWidth:meta.width,sourceHeight:meta.height,
     displayWidth:result.width,displayHeight:result.height,
     sourceLowResolution:meta.width<700||meta.height<700
   });
 }catch(error){
   report.errors.push({name:filename,error:String(error.message||error)});
 }
}
(async()=>{
 if(fs.existsSync(originalUniverse)){
   for(const filename of fs.readdirSync(originalUniverse).sort()){
     const match=fileNamePattern.exec(filename);
     if(match)await processImage(originalUniverse,filename,displayUniverse,match[1]);
   }
 }
 if(fs.existsSync(originalAvatars)){
   for(const filename of fs.readdirSync(originalAvatars).sort()){
     if(avatarPattern.test(filename))await processImage(originalAvatars,filename,displayAvatars,"avatar");
   }
 }
 const reportPath=path.join(root,"public","cmd-display-quality-report.json");
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
 const counts=report.files.reduce((a,x)=>(a[x.kind]=(a[x.kind]||0)+1,a),{});
 console.info("[CMD Sphere display assets] Non-destructive enhanced catalogue",JSON.stringify(counts),"errors",report.errors.length);
 if(!report.files.length)throw Error("No original image assets were found: refusing to deploy an empty catalogue");
 if(report.errors.length){
  // Never fail the *entire CMD Sphere deployment* because a handful of optional
  // enhanced thumbnails failed. Original v1/v3 assets remain untouched and
  // every failure is explicitly recorded in the quality report for repair.
  console.warn("[CMD Sphere display assets] Enhanced variants unavailable; originals retained:",
    report.errors.slice(0,20).map(x=>x.name+": "+x.error).join("; "));
 }
})().catch(error=>{console.error("[CMD Sphere display assets]",error);process.exitCode=1;});

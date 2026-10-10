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
const report={version:2,generatedAt:new Date().toISOString(),files:[],errors:[],originalsRetained:true,realDetailRestoration:false};
async function processImage(directory,filename,destDirectory,type){
 const input=path.join(directory,filename);
 const outputName=filename.replace(/\.(png|webp)$/i,".webp");
 const output=path.join(destDirectory,outputName);
 try {
   const meta=await sharp(input).metadata();
   if(!meta.width||!meta.height)throw Error("Unknown source dimensions");
   const scene=type==="scene",avatar=type==="avatar";
   // Maintain every limb and every edge; use FIT INSIDE rather than COVER.
   const options=avatar?{width:540,height:1536,fit:"inside",kernel:"lanczos3"}:
        scene?{width:1920,height:1080,fit:"inside",kernel:"lanczos3"}:
        {width:1024,height:1024,fit:"inside",kernel:"lanczos3"};
   const result=await sharp(input,{failOn:"error"})
      .resize(options)
      .sharpen({sigma:1.05,m1:1,m2:2})
      .webp({quality:86,effort:4,alphaQuality:100})
      .toFile(output);
   report.files.push({
     kind:type,source:filename,output:outputName,
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
 if(report.errors.length)throw Error("Some display images could not be generated: "+report.errors.slice(0,5).map(x=>x.name).join(", "));
})().catch(error=>{console.error("[CMD Sphere display assets]",error);process.exitCode=1;});

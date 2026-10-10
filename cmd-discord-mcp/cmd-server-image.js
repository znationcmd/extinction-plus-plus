/* CMD Sphere: prepare a real server icon from an iPhone/Android/Desktop photo.
   Client-side conversion only; nothing is uploaded before the user saves. */
(()=>{
"use strict";
if(window.cmdSpherePrepareServerImage)return;
function err(reason){throw new Error(reason)}
async function decode(file){
  if(typeof createImageBitmap==="function"){
    try{
      const bmp=await createImageBitmap(file,{imageOrientation:"from-image"});
      return {width:bmp.width,height:bmp.height,paint:(ctx,x,y,w,h)=>ctx.drawImage(bmp,x,y,w,h),close:()=>bmp.close?.()};
    }catch{}
  }
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();
    img.decoding="async";
    img.src=url;
    if(typeof img.decode==="function")await img.decode();
    else await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});
    if(!img.naturalWidth||!img.naturalHeight)err("Cette image ne peut pas être décodée.");
    return {width:img.naturalWidth,height:img.naturalHeight,paint:(ctx,x,y,w,h)=>ctx.drawImage(img,x,y,w,h),close:()=>URL.revokeObjectURL(url)};
  }catch(e){URL.revokeObjectURL(url);throw e}
}
window.cmdSpherePrepareServerImage=async file=>{
 if(!file)err("Choisis une photo de serveur.");
 const valid=/^image\/(png|jpeg|webp|gif|heic|heif)$/i.test(file.type||"")||/\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file.name||"");
 if(!valid)err("Sélectionne une image PNG, JPEG, WebP ou une photo iPhone HEIC.");
 if(file.size>20*1024*1024)err("Image de plus de 20 Mo : réduis sa taille avant de l’ajouter.");
 let decoded;
 try{decoded=await decode(file)}catch{
  err("Impossible de lire cette photo HEIC ou ce fichier sur cet appareil. Dans Photos, partage une version JPEG puis réessaie.");
 }
 try{
  if(!decoded.width||!decoded.height||decoded.width*decoded.height>120000000)err("Dimensions de l’image trop grandes.");
  const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{alpha:true});
  if(!ctx)err("Impossible de préparer l’icône sur cet appareil.");
  const tries=[{size:640,quality:.86},{size:512,quality:.82},{size:384,quality:.78},{size:320,quality:.70},{size:256,quality:.65}];
  for(const {size,quality} of tries){
   canvas.width=size;canvas.height=size;ctx.clearRect(0,0,size,size);
   const ratio=Math.min(size/decoded.width,size/decoded.height);
   const width=decoded.width*ratio,height=decoded.height*ratio;
   decoded.paint(ctx,(size-width)/2,(size-height)/2,width,height);
   let data=canvas.toDataURL("image/webp",quality);
   if(!data.startsWith("data:image/webp;"))data=canvas.toDataURL("image/png");
   if(data.length<=2500000)return data;
  }
  err("Photo trop complexe pour être enregistrée. Choisis une autre image.");
 }finally{decoded.close()}
};
})();

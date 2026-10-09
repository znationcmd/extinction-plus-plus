/* CMD Sphere: self-contained, no-dependency 256-color animated GIF encoder (no audio). */
(()=>{"use strict";
function push16(a,n){a.push(n&255,(n>>8)&255)}
function compressed(indices){
 const output=[];let bits=0,bitCount=0;
 let codeWidth=9,next=258,map=new Map();
 function emit(code){bits|=(code<<bitCount);bitCount+=codeWidth;while(bitCount>=8){output.push(bits&255);bits>>>=8;bitCount-=8}}
 emit(256);
 if(!indices.length){emit(257);if(bitCount)output.push(bits&255);return output}
 let prefix=indices[0];
 for(let i=1;i<indices.length;i++){
  const pixel=indices[i],key=prefix*256+pixel;
  if(map.has(key)){prefix=map.get(key);continue}
  emit(prefix);
  if(next<4096){
   map.set(key,next++);
   if(next>(1<<codeWidth)&&codeWidth<12)codeWidth++;
  }else{emit(256);map=new Map();next=258;codeWidth=9}
  prefix=pixel;
 }
 emit(prefix);emit(257);if(bitCount)output.push(bits&255);return output;
}
function pixelsToIndices(image){
 const src=image.data,count=image.width*image.height,idx=new Uint8Array(count);
 for(let i=0,j=0;i<count;i++,j+=4){
  const r=src[j]>>5,g=src[j+1]>>5,b=src[j+2]>>6;
  idx[i]=(r<<5)|(g<<2)|b;
 }
 return idx;
}
async function encodeGif({source,draw,duration=6,fps=7,width=320,height=568,onProgress}){
 const off=document.createElement("canvas");off.width=width;off.height=height;const ctx=off.getContext("2d",{willReadFrequently:true});
 if(!ctx)throw new Error("Création GIF impossible sur cet appareil.");
 const frames=Math.min(120,Math.ceil(duration*fps)),delay=Math.round(100/fps);
 const output=[71,73,70,56,57,97];push16(output,width);push16(output,height);output.push(0xF7,0,0);
 for(let i=0;i<256;i++)output.push(Math.round(((i>>5)&7)*255/7),Math.round(((i>>2)&7)*255/7),(i&3)*85);
 output.push(0x21,0xFF,11,...Array.from("NETSCAPE2.0",x=>x.charCodeAt(0)),3,1,0,0,0);
 for(let i=0;i<frames;i++){
  const t=(i/frames)*duration;await draw(t);
  ctx.drawImage(source,0,0,width,height);const pixels=pixelsToIndices(ctx.getImageData(0,0,width,height));
  output.push(0x21,0xF9,4,0);push16(output,delay);output.push(0,0);
  output.push(0x2C,0,0,0,0);push16(output,width);push16(output,height);output.push(0,8);
  const chunk=compressed(pixels);for(let k=0;k<chunk.length;k+=255){const end=Math.min(k+255,chunk.length);output.push(end-k);for(let j=k;j<end;j++)output.push(chunk[j])}
  output.push(0);
  onProgress?.(i+1,frames);
  if(i%4===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 output.push(0x3B);
 return new Blob([new Uint8Array(output)],{type:"image/gif"});
}
window.CMDEncodeAnimatedGif=encodeGif;
})();
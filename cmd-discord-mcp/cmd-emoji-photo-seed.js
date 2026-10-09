/* CMD Sphere: automatic, resumable import of individually extracted emojis.
   The PNG/WebP crops are photo-derived static images, not restored original GIFs. */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
const DIRECTORY=path.join(path.dirname(fileURLToPath(import.meta.url)),"seed-photo-emojis");
const PART_COUNT=10;
let running=false;
export async function seedCmdPhotoEmojis(pool){
 if(running)return;
 running=true;
 try {
   const userName=String(process.env.CMD_FOUNDER_USERNAME||"cmd").trim().toLowerCase();
   const {rows:users}=await pool.query("SELECT id FROM cmd_accounts WHERE username_key=$1 LIMIT 1",[userName]);
   const owner=String(users[0]?.id||process.env.CMD_OWNER_USER_ID||"");
   if(!owner){console.warn("[cmd-photo-emojis] Owner account unavailable; will retry next restart.");return}
   // Missing items are resumed automatically after restarts, never reinserted.
   const q=await pool.query("SELECT name FROM cmd_sphere_emojis WHERE creator_user_id=$1 AND scope='community' AND name LIKE 'photo_%'",[owner]);
   const existing=new Set(q.rows.map(row=>String(row.name)));
   if(existing.size>=7526){console.log("[cmd-photo-emojis] already imported "+existing.size);return}
   const fragments=[];
   for(let i=0;i<PART_COUNT;i++)fragments.push(await readFile(path.join(DIRECTORY,"part-"+String(i).padStart(2,"0")+".jsonfrag"),"utf8"));
   const pack=JSON.parse(fragments.join(""));
   if(pack.format!=="cmd-emoji-pack-v1"||!Array.isArray(pack.items)||pack.items.length!==7526)throw Error("photo pack count/format incorrect");
   let imported=0,skipped=0;
   for(let offset=0;offset<pack.items.length;offset+=35){
     const batch=pack.items.slice(offset,offset+35),values=[],holders=[];
     for(const emoji of batch){
       const name=String(emoji.name||"");
       if(!/^photo_\d{5}$/.test(name)||existing.has(name)){skipped++;continue}
       const match=/^data:image\/(webp|png|gif|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(emoji.dataUrl||""));
       if(!match)throw Error("Bad image: "+name);
       const bytes=Buffer.from(match[2],"base64");
       if(bytes.length===0||bytes.length>1024*1024)throw Error("Bad image size: "+name);
       const ix=values.length;
       values.push(crypto.randomUUID(),owner,name,"image/"+match[1],match[1]==="gif",bytes,bytes.length,"community");
       holders.push("("+Array.from({length:8},(_,k)=>"$"+(ix+k+1)).join(",")+")");
       existing.add(name);
     }
     if(holders.length){
       await pool.query("INSERT INTO cmd_sphere_emojis(id,creator_user_id,name,mime_type,animated,bytes,size_bytes,scope) VALUES "+holders.join(","),values);
       imported+=holders.length;
     }
     if((offset+batch.length)%700<35)console.log("[cmd-photo-emojis] "+Math.min(pack.items.length,offset+batch.length)+"/"+pack.items.length+" processed; new="+imported);
     // Yield between batches to keep messages and health checks responsive.
     await new Promise(resolve=>setTimeout(resolve,0));
   }
   console.log("[cmd-photo-emojis] Finished: "+imported+" imported, "+skipped+" already present.");
 }catch(error){console.error("[cmd-photo-emojis] Import interrupted; will resume next restart:",error?.message||error)}
 finally{running=false}
}

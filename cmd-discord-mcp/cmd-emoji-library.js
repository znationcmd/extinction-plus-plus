/* CMD Sphere emoji library: private, server and community; PNG/GIF/WebP/JPG. */
import crypto from "node:crypto";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES=1024*1024;
function fail(message,status=400){const e=new Error(message);e.status=status;return e}
function reply(res,status,body){res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(body))}
async function readUpload(req){
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)throw fail("Image trop volumineuse.",413);chunks.push(chunk)}
 try{return JSON.parse(Buffer.concat(chunks).toString("utf8")||"{}")}catch{throw fail("Données incorrectes.")}
}
function sniff(b){
 if(b.length<12)throw fail("Image invalide.");
 if(b.subarray(0,8).equals(Buffer.from("89504e470d0a1a0a","hex")))return {mime:"image/png",animated:b.includes(Buffer.from("acTL"))};
 if(b.subarray(0,3).toString()==="GIF"&&["87a","89a"].includes(b.subarray(3,6).toString()))return {mime:"image/gif",animated:true};
 if(b.subarray(0,4).toString()==="RIFF"&&b.subarray(8,12).toString()==="WEBP")return {mime:"image/webp",animated:b.includes(Buffer.from("ANIM"))};
 if(b.subarray(0,3).toString("hex")==="ffd8ff")return {mime:"image/jpeg",animated:false};
 throw fail("Format non accepté : PNG, JPG, GIF ou WebP uniquement.");
}
function bounds(b,mime){
 if(mime==="image/png"&&b.length>=24)return [b.readUInt32BE(16),b.readUInt32BE(20)];
 if(mime==="image/gif")return [b.readUInt16LE(6),b.readUInt16LE(8)];
 if(mime==="image/webp"){
  const variant=b.subarray(12,16).toString("ascii");
  if(variant==="VP8X"&&b.length>=30)return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
  if(variant==="VP8 "&&b.length>=30)return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
  if(variant==="VP8L"&&b.length>=25)return [1+(((b[21]&0x3f)<<8)|b[22]),1+(((b[23]&0x0f)<<10)|(b[22]>>6)|((b[21]&0xc0)<<2))];
  throw fail("Fichier WebP incorrect.");
 }
 return [0,0];
}
async function role(pool,user,gid){
 if(!UUID.test(String(gid||"")))throw fail("Serveur incorrect");
 const q=await pool.query("SELECT membership_role FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2 LIMIT 1",[gid,String(user)]);
 return q.rows[0]?.membership_role||null;
}
function item(r,uid,memberRole){
 return {id:r.id,name:r.name,scope:r.scope,guildId:r.guild_id,mime:r.mime_type,animated:r.animated,
 url:"/api/cmd-emojis/file/"+r.id,size:r.size_bytes,serverName:r.server_name||null,mine:String(r.creator_user_id)===String(uid),
 canDelete:String(r.creator_user_id)===String(uid)||(r.scope==="server"&&["owner","admin"].includes(memberRole))};
}
export async function initCmdEmojiLibrary(pool){
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_emojis (id UUID PRIMARY KEY, creator_user_id TEXT NOT NULL, scope TEXT NOT NULL CHECK(scope IN ('personal','server','community')), guild_id UUID REFERENCES cmd_native_guilds(id) ON DELETE CASCADE, name VARCHAR(48) NOT NULL, mime_type VARCHAR(30) NOT NULL, animated BOOLEAN NOT NULL DEFAULT FALSE, bytes BYTEA NOT NULL, size_bytes INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_sphere_emojis_scope_idx ON cmd_sphere_emojis(scope,guild_id,created_at DESC)");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_sphere_emojis_owner_idx ON cmd_sphere_emojis(creator_user_id,created_at DESC)");
}
export async function handleCmdEmojiLibrary(req,res,url,{pool,auth,founder=false}){
 if(!url.pathname.startsWith("/api/cmd-emojis"))return false;
 const uid=String(auth?.user?.id||"");
 if(!uid){reply(res,401,{error:"Connexion CMD Sphere requise."});return true}
 try{
  if(req.method==="GET"&&url.pathname.startsWith("/api/cmd-emojis/file/")){
   const id=url.pathname.slice(21);if(!UUID.test(id))throw fail("Emoji incorrect");
   const q=await pool.query("SELECT * FROM cmd_sphere_emojis WHERE id=$1 LIMIT 1",[id]);const row=q.rows[0];if(!row)throw fail("Emoji introuvable",404);
   const m=row.scope==="server"?await role(pool,uid,row.guild_id):null;
   if(row.scope==="personal"&&String(row.creator_user_id)!==uid)throw fail("Emoji privé : accès refusé",403);
   if(row.scope==="server"&&!m&&!founder)throw fail("Accès refusé",403);
   res.writeHead(200,{"content-type":row.mime_type,"content-length":row.bytes.length,"cache-control":"private, max-age=300","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'; sandbox","cross-origin-resource-policy":"same-origin"});res.end(row.bytes);return true;
  }
  if(req.method==="GET"&&url.pathname==="/api/cmd-emojis/servers"){
   if(!founder)throw fail("Accès réservé au fondateur.",403);
   const q=await pool.query("SELECT g.id,g.name,g.icon,COUNT(e.id)::int AS emoji_count FROM cmd_native_guilds g INNER JOIN cmd_sphere_emojis e ON e.guild_id=g.id AND e.scope='server' GROUP BY g.id,g.name,g.icon ORDER BY g.name LIMIT 500");
   reply(res,200,{servers:q.rows,founder:true});return true;
  }
  if(req.method==="GET"&&url.pathname==="/api/cmd-emojis"){
   const gid=String(url.searchParams.get("guildId")||""),m=gid?await role(pool,uid,gid):null;
   if(gid&&!m&&!founder)throw fail("Tu n'es pas membre de ce serveur.",403);
   const all=founder&&url.searchParams.get("all")==="1";
   const page=Math.max(0,Math.min(100000,Number.parseInt(url.searchParams.get("offset")||"0",10)||0));
   const q=await pool.query("SELECT e.id,e.creator_user_id,e.scope,e.guild_id,e.name,e.mime_type,e.animated,e.size_bytes,g.name AS server_name FROM cmd_sphere_emojis e LEFT JOIN cmd_native_guilds g ON g.id=e.guild_id WHERE e.scope='community' OR (e.scope='personal' AND e.creator_user_id=$1) OR (e.scope='server' AND ($3::boolean OR e.guild_id=$2)) ORDER BY e.created_at DESC LIMIT 500 OFFSET $4",[uid,gid||null,all,page]);
   reply(res,200,{emojis:q.rows.map(r=>item(r,uid,m)),role:m,founder,hasMore:q.rows.length===500,nextOffset:page+q.rows.length});return true;
  }
  if(req.method==="POST"&&url.pathname==="/api/cmd-emojis/bulk"){
   if(!founder)throw fail("Importation groupée réservée au fondateur.",403);
   const chunks=[];let total=0;
   for await(const chunk of req){total+=chunk.length;if(total>12*1024*1024)throw fail("Lot trop volumineux.",413);chunks.push(chunk)}
   let payload;try{payload=JSON.parse(Buffer.concat(chunks).toString("utf8"))}catch{throw fail("Pack JSON incorrect.")}
   const entries=payload.items;
   if(!Array.isArray(entries)||!entries.length||entries.length>60)throw fail("Envoie de 1 à 60 emojis par lot.");
   const names=new Set(),rows=[];
   for(const entry of entries){
    const name=String(entry.name||"").trim();
    if(!/^[\p{L}\p{N}_-]{2,32}$/u.test(name))throw fail("Nom d'emoji invalide: "+name.slice(0,40));
    if(names.has(name))throw fail("Deux emojis ont le même nom dans le lot.");names.add(name);
    const match=/^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(entry.dataUrl||""));
    if(!match)throw fail("Image incorrecte pour "+name);
    const bytes=Buffer.from(match[2],"base64");
    if(!bytes.length||bytes.length>MAX_BYTES)throw fail("Emoji trop volumineux: "+name);
    const type=sniff(bytes);if(type.mime!=="image/"+match[1])throw fail("Mauvais format: "+name);
    const [w,h]=bounds(bytes,type.mime);if(w>1024||h>1024)throw fail("Dimensions trop grandes: "+name);
    rows.push({name,bytes,mime:type.mime,animated:type.animated});
   }
   const values=[],segments=[];
   for(let i=0;i<rows.length;i++){
    const r=rows[i],ix=values.length;
    values.push(crypto.randomUUID(),uid,r.name,r.mime,r.animated,r.bytes,r.bytes.length);
    segments.push("($"+(ix+1)+",$"+(ix+2)+",$"+(ix+3)+",$"+(ix+4)+",$"+(ix+5)+",$"+(ix+6)+",$"+(ix+7)+")");
   }
   const query="INSERT INTO cmd_sphere_emojis(id,creator_user_id,name,mime_type,animated,bytes,size_bytes,scope,guild_id) SELECT v.id::uuid,v.creator_user_id,v.name,v.mime_type,v.animated::boolean,v.bytes::bytea,v.size_bytes::integer,'community',NULL FROM (VALUES "+
     segments.join(",")+
     ") AS v(id,creator_user_id,name,mime_type,animated,bytes,size_bytes) WHERE NOT EXISTS (SELECT 1 FROM cmd_sphere_emojis prior WHERE prior.creator_user_id=v.creator_user_id AND prior.scope='community' AND prior.name=v.name) RETURNING id";
   const result=await pool.query(query,values);
   reply(res,201,{ok:true,created:result.rowCount,skipped:rows.length-result.rowCount,total:rows.length});return true;
  }
  if(req.method==="POST"&&url.pathname==="/api/cmd-emojis/bulk"){
   if(!founder)throw fail("Importation complète réservée au fondateur.",403);
   const body=await readUpload(req),items=body?.items;
   if(!Array.isArray(items)||items.length<1||items.length>100)throw fail("Envoie des lots de 1 à 100 emojis.");
   const names=items.map(x=>String(x?.name||"").trim());
   if(names.some(n=>!/^[\p{L}\p{N}_-]{2,32}$/u.test(n)))throw fail("Nom d'emoji incorrect.");
   const existing=await pool.query("SELECT name FROM cmd_sphere_emojis WHERE scope='community' AND creator_user_id=$1 AND name=ANY($2::text[])",[uid,names]);
   const seen=new Set(existing.rows.map(r=>r.name));
   const values=[],params=[];let skipped=0;
   for(const item of items){
     const name=String(item.name).trim();
     if(seen.has(name)){skipped++;continue}
     const parsed=/^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(item.dataUrl||""));
     if(!parsed)throw fail("Fichier incorrect pour "+name);
     const bytes=Buffer.from(parsed[2],"base64");
     if(!bytes.length||bytes.length>MAX_BYTES)throw fail("Taille incorrecte pour "+name);
     const type=sniff(bytes);
     if(type.mime!=="image/"+parsed[1])throw fail("Format incorrect pour "+name);
     const [w,h]=bounds(bytes,type.mime);
     if(w>1024||h>1024)throw fail("Dimensions incorrectes pour "+name);
     const offset=params.length,cols=Array.from({length:8},(_,i)=>"$"+(offset+i+1));
     values.push("("+cols.join(",")+")");
     params.push(crypto.randomUUID(),uid,name,type.mime,type.animated,bytes,bytes.length,"community");
     seen.add(name);
   }
   if(values.length){
     const statement="INSERT INTO cmd_sphere_emojis(id,creator_user_id,name,mime_type,animated,bytes,size_bytes,scope) VALUES "+values.join(",");
     await pool.query(statement,params);
   }
   reply(res,200,{inserted:values.length,skipped,total:items.length});return true;
  }
  if(req.method==="POST"&&url.pathname==="/api/cmd-emojis"){
   const data=await readUpload(req),scope=String(data.scope||"personal"),gid=scope==="server"?String(data.guildId||""):null;
   if(!["personal","server","community"].includes(scope))throw fail("Visibilité incorrecte");
   const m=scope==="server"?await role(pool,uid,gid):null;
   if(scope==="server"&&!["owner","admin"].includes(m))throw fail("Seul un administrateur peut ajouter des emojis au serveur.",403);
   const name=String(data.name||"").trim();if(!/^[\p{L}\p{N}_-]{2,32}$/u.test(name))throw fail("Nom : 2 à 32 caractères, lettres, chiffres, tiret ou _.");
   const parsed=/^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(data.dataUrl||""));
   if(!parsed)throw fail("Sélectionne un fichier PNG, JPG, GIF ou WebP.");
   const bytes=Buffer.from(parsed[2],"base64");if(!bytes.length||bytes.length>MAX_BYTES)throw fail("1 Mo maximum par emoji.");
   const type=sniff(bytes);if(type.mime!=="image/"+parsed[1])throw fail("Le contenu et le format ne correspondent pas.");
   const [w,h]=bounds(bytes,type.mime);if(w>1024||h>1024)throw fail("Dimensions maximales : 1024 × 1024 pixels.");
   const q=await pool.query("SELECT COUNT(*)::int AS n FROM cmd_sphere_emojis WHERE scope=$1 AND (($1='server' AND guild_id=$2) OR ($1<>'server' AND creator_user_id=$3))",[scope,gid,uid]);
   const limit=scope==="server"?250:100;if(Number(q.rows[0]?.n||0)>=limit)throw fail("Collection pleine ("+limit+").");
   const ins=await pool.query("INSERT INTO cmd_sphere_emojis(id,creator_user_id,scope,guild_id,name,mime_type,animated,bytes,size_bytes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,creator_user_id,scope,guild_id,name,mime_type,animated,size_bytes",[crypto.randomUUID(),uid,scope,gid,name,type.mime,type.animated,bytes,bytes.length]);
   reply(res,201,{emoji:item(ins.rows[0],uid,m)});return true;
  }
  if(req.method==="DELETE"&&url.pathname.startsWith("/api/cmd-emojis/")){
   const id=url.pathname.slice(16);if(!UUID.test(id))throw fail("Emoji incorrect");
   const q=await pool.query("SELECT creator_user_id,scope,guild_id FROM cmd_sphere_emojis WHERE id=$1 LIMIT 1",[id]);if(!q.rows.length)throw fail("Emoji introuvable.",404);
   const r=q.rows[0],m=r.scope==="server"?await role(pool,uid,r.guild_id):null;
   if(r.creator_user_id!==uid&&!(r.scope==="server"&&["owner","admin"].includes(m)))throw fail("Suppression non autorisée.",403);
   await pool.query("DELETE FROM cmd_sphere_emojis WHERE id=$1",[id]);reply(res,200,{ok:true});return true;
  }
  reply(res,405,{error:"Méthode non autorisée"});return true;
 }catch(e){reply(res,e.status||400,{error:e.message||"Erreur emojis"});return true}
}

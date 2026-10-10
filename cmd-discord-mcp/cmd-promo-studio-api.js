/* CMD Sphere Promo Studio: publish a server video, not a Discord API operation. */
import crypto from "node:crypto";
const MAX_MEDIA=60*1024*1024;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIME=new Set(["video/webm","video/mp4","image/png","image/jpeg","image/webp","image/gif"]);
const txt=(v,n=100)=>String(v||"").trim().slice(0,n);
function send(res,status,data){res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(data))}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function fileValid(data,mime){
 if(data.length<12)return false;
 if(mime==="video/webm")return data.subarray(0,4).toString("hex")==="1a45dfa3";
 if(mime==="video/mp4")return data.subarray(4,8).toString("ascii")==="ftyp";
 if(mime==="image/png")return data.subarray(0,8).toString("hex")==="89504e470d0a1a0a";
 if(mime==="image/gif")return ["GIF87a","GIF89a"].includes(data.subarray(0,6).toString());
 if(mime==="image/webp")return data.subarray(0,4).toString()==="RIFF"&&data.subarray(8,12).toString()==="WEBP";
 if(mime==="image/jpeg")return data.subarray(0,3).toString("hex")==="ffd8ff";
 return false;
}
export async function initCmdPromos(pool){
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_promos(id UUID PRIMARY KEY, guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE, owner_user_id TEXT NOT NULL, title VARCHAR(100) NOT NULL, format VARCHAR(30) NOT NULL, kind VARCHAR(20) NOT NULL DEFAULT 'video', media BYTEA NOT NULL, bytes INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
 await pool.query("ALTER TABLE cmd_sphere_promos ADD COLUMN IF NOT EXISTS music_credit JSONB NOT NULL DEFAULT '{}'::jsonb");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_sphere_promos_guild_idx ON cmd_sphere_promos(guild_id,created_at DESC)");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_profile_videos(id UUID PRIMARY KEY, user_id TEXT NOT NULL, profile_guild TEXT NOT NULL DEFAULT '', title VARCHAR(100) NOT NULL, format VARCHAR(30) NOT NULL, kind VARCHAR(20) NOT NULL DEFAULT 'story', media BYTEA NOT NULL, bytes INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_sphere_profile_videos_idx ON cmd_sphere_profile_videos(user_id,profile_guild,created_at DESC)");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_studio_authors(user_id TEXT PRIMARY KEY, name VARCHAR(100) NOT NULL)");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_studio_likes(video_id UUID NOT NULL REFERENCES cmd_sphere_profile_videos(id) ON DELETE CASCADE, user_id TEXT NOT NULL, PRIMARY KEY(video_id,user_id))");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_studio_follows(follower_id TEXT NOT NULL, followed_id TEXT NOT NULL, PRIMARY KEY(follower_id,followed_id))");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_sphere_studio_comments(id UUID PRIMARY KEY, video_id UUID NOT NULL REFERENCES cmd_sphere_profile_videos(id) ON DELETE CASCADE, user_id TEXT NOT NULL, author_name VARCHAR(100) NOT NULL, body VARCHAR(300) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_sphere_studio_comments_video_idx ON cmd_sphere_studio_comments(video_id,created_at DESC)");

}
export async function handleCmdPromos(req,res,url,{pool,auth,baseUrl}){
 const path=url.pathname;
 if(path.startsWith("/api/cmd-profile-videos")){
   const media=/^\/api\/cmd-profile-videos\/media\/([0-9a-f-]{36})$/i.exec(path);
   if(media&&req.method==="GET"){
     if(!UUID.test(media[1])){send(res,400,{error:"Vidéo incorrecte"});return true}
     const q=await pool.query("SELECT media,format FROM cmd_sphere_profile_videos WHERE id=$1 LIMIT 1",[media[1]]);
     if(!q.rows.length){send(res,404,{error:"Vidéo introuvable"});return true}
     const bytes=q.rows[0].media,total=bytes.length,range=String(req.headers.range||"");
     if(range){
       const parts=/^bytes=(\d*)-(\d*)$/.exec(range);
       if(!parts||(!parts[1]&&!parts[2])){res.writeHead(416,{"content-range":"bytes */"+total});res.end();return true}
       let start=parts[1]?Number(parts[1]):Math.max(0,total-Number(parts[2])),end=parts[2]&&parts[1]?Number(parts[2]):total-1;
       if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=total||end<start){res.writeHead(416,{"content-range":"bytes */"+total});res.end();return true}
       end=Math.min(end,total-1);res.writeHead(206,{"content-type":q.rows[0].format,"content-length":end-start+1,"content-range":"bytes "+start+"-"+end+"/"+total,"accept-ranges":"bytes","cache-control":"public, max-age=3600","x-content-type-options":"nosniff"});res.end(bytes.subarray(start,end+1));return true;
     }
     res.writeHead(200,{"content-type":q.rows[0].format,"content-length":total,"accept-ranges":"bytes","cache-control":"public, max-age=3600","x-content-type-options":"nosniff"});res.end(bytes);return true;
   }
   if(!auth?.user?.id){send(res,401,{error:"Connecte-toi à CMD Sphere"});return true}
   const user=String(auth.user.id),scoped=txt(url.searchParams.get("server"),64),scope=/^(?:[0-9]{8,24}|[0-9a-f-]{36})$/i.test(scoped)?scoped:"";

   // Studio feed: public personal videos only. Videos scoped to a private server never enter this feed.
   if(req.method==="GET"&&path==="/api/cmd-profile-videos/feed"){
     const mode=url.searchParams.get("mode")==="following"?"following":"all";
     const offset=Math.min(500,Math.max(0,parseInt(url.searchParams.get("offset")||"0",10)||0));
     const focus=txt(url.searchParams.get("video"),50);
     if(focus&&!UUID.test(focus)){send(res,400,{error:"Vidéo incorrecte"});return true}
     const q=await pool.query(
       "SELECT p.id,p.user_id,p.title,p.format,p.created_at,COALESCE(a.name,'Créateur CMD Sphere') AS author_name,"+
       "(SELECT COUNT(*)::int FROM cmd_sphere_studio_likes l WHERE l.video_id=p.id) AS likes,"+
       "(SELECT COUNT(*)::int FROM cmd_sphere_studio_comments c WHERE c.video_id=p.id) AS comments,"+
       "EXISTS(SELECT 1 FROM cmd_sphere_studio_likes l WHERE l.video_id=p.id AND l.user_id=$2) AS liked,"+
       "EXISTS(SELECT 1 FROM cmd_sphere_studio_follows f WHERE f.followed_id=p.user_id AND f.follower_id=$2) AS following "+
       "FROM cmd_sphere_profile_videos p LEFT JOIN cmd_sphere_studio_authors a ON a.user_id=p.user_id "+
       "WHERE p.profile_guild='' AND p.format LIKE 'video/%' AND ($1='all' OR EXISTS (SELECT 1 FROM cmd_sphere_studio_follows f WHERE f.follower_id=$2 AND f.followed_id=p.user_id)) "+
       "AND ($5::uuid IS NULL OR p.id=$5) ORDER BY p.created_at DESC LIMIT $3 OFFSET $4",
       [mode,user,12,offset,focus||null]
     );
     send(res,200,{items:q.rows.map(v=>({...v,mediaUrl:"/api/cmd-profile-videos/media/"+v.id,own:v.user_id===user})),nextOffset:offset+q.rows.length,hasMore:q.rows.length===12});return true;
   }
   const action=/^\/api\/cmd-profile-videos\/([0-9a-f-]{36})\/(like|follow|comments)$/i.exec(path);
   if(action){
     const id=action[1],what=action[2];
     if(!UUID.test(id)){send(res,400,{error:"Vidéo incorrecte"});return true}
     const item=await pool.query("SELECT user_id FROM cmd_sphere_profile_videos WHERE id=$1 AND profile_guild='' AND format LIKE 'video/%' LIMIT 1",[id]);
     if(!item.rows.length){send(res,404,{error:"Vidéo introuvable"});return true}
     const author=item.rows[0].user_id;
     if(what==="like"&&req.method==="POST"){
       const added=await pool.query("INSERT INTO cmd_sphere_studio_likes(video_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING video_id",[id,user]);
       if(!added.rowCount)await pool.query("DELETE FROM cmd_sphere_studio_likes WHERE video_id=$1 AND user_id=$2",[id,user]);
       const total=await pool.query("SELECT COUNT(*)::int AS total FROM cmd_sphere_studio_likes WHERE video_id=$1",[id]);
       send(res,200,{liked:!!added.rowCount,likes:total.rows[0].total});return true;
     }
     if(what==="follow"&&req.method==="POST"){
       if(author===user){send(res,400,{error:"Impossible de s'abonner à soi-même"});return true}
       const added=await pool.query("INSERT INTO cmd_sphere_studio_follows(follower_id,followed_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING follower_id",[user,author]);
       if(!added.rowCount)await pool.query("DELETE FROM cmd_sphere_studio_follows WHERE follower_id=$1 AND followed_id=$2",[user,author]);
       send(res,200,{following:!!added.rowCount});return true;
     }
     if(what==="comments"&&req.method==="GET"){
       const q=await pool.query("SELECT id,author_name,body,created_at,user_id=$2 AS own FROM cmd_sphere_studio_comments WHERE video_id=$1 ORDER BY created_at DESC LIMIT 80",[id,user]);
       send(res,200,{items:q.rows});return true;
     }
     if(what==="comments"&&req.method==="POST"){
       const chunks=[];let bytes=0;
       for await(const chunk of req){bytes+=chunk.length;if(bytes>2048){send(res,413,{error:"Commentaire trop long"});return true}chunks.push(chunk)}
       let body;try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"))}catch{send(res,400,{error:"JSON incorrect"});return true}
       const message=txt(body.text,300);
       if(!message){send(res,400,{error:"Écris un commentaire"});return true}
       const name=txt(auth.user.displayName||auth.user.name||"Membre CMD Sphere",100);
       const commentId=crypto.randomUUID();
       await pool.query("INSERT INTO cmd_sphere_studio_comments(id,video_id,user_id,author_name,body) VALUES($1,$2,$3,$4,$5)",[commentId,id,user,name,message]);
       send(res,201,{ok:true,id:commentId});return true;
     }
     send(res,405,{error:"Méthode non autorisée"});return true;
   }
   if(req.method==="GET"&&path==="/api/cmd-profile-videos"){
     const q=await pool.query("SELECT id,title,format,kind,bytes,created_at FROM cmd_sphere_profile_videos WHERE user_id=$1 AND profile_guild=$2 ORDER BY created_at DESC LIMIT 24",[user,scope]);
     send(res,200,{items:q.rows.map(v=>({...v,mediaUrl:"/api/cmd-profile-videos/media/"+v.id}))});return true;
   }
   if(req.method==="POST"&&path==="/api/cmd-profile-videos"){
     const rawGuild=txt(req.headers["x-cmd-profile-guild"],64),guild=/^(?:[0-9]{8,24}|[0-9a-f-]{36})$/i.test(rawGuild)?rawGuild:"";
     const mime=txt(String(req.headers["content-type"]||"").split(";")[0],40),title=txt(req.headers["x-cmd-title"],100)||"Ma vidéo",kind=txt(req.headers["x-cmd-kind"],20)||"story";
     if(rawGuild&&!guild){send(res,400,{error:"Profil de serveur invalide"});return true}
     if(guild){const memberNative=UUID.test(guild)?await pool.query("SELECT 1 FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2 LIMIT 1",[guild,user]):{rows:[]};const memberDiscord=Array.isArray(auth.guildIds)&&auth.guildIds.some(id=>String(id)===guild);if(!memberNative.rows.length&&!memberDiscord){send(res,403,{error:"Tu dois appartenir à ce serveur"});return true}}
     if(!MIME.has(mime)){send(res,415,{error:"Format de vidéo/image non accepté"});return true}
     const count=await pool.query("SELECT COUNT(*)::int AS total FROM cmd_sphere_profile_videos WHERE user_id=$1 AND profile_guild=$2",[user,guild]);
     if(Number(count.rows[0]?.total||0)>=24){send(res,409,{error:"24 vidéos maximum par profil. Supprime une ancienne vidéo."});return true}
     const chunks=[];let size=0,overflow=false;
     for await(const chunk of req){size+=chunk.length;if(size>MAX_MEDIA){overflow=true;break}chunks.push(chunk)}
     if(overflow){req.resume();send(res,413,{error:"Fichier supérieur à 60 Mo"});return true}
     const bytes=Buffer.concat(chunks);
     if(!fileValid(bytes,mime)){send(res,400,{error:"Fichier invalide"});return true}
     const id=crypto.randomUUID();
     await pool.query("INSERT INTO cmd_sphere_profile_videos(id,user_id,profile_guild,title,format,kind,media,bytes) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[id,user,guild,title,mime,kind,bytes,bytes.length]);
     await pool.query("INSERT INTO cmd_sphere_studio_authors(user_id,name) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET name=EXCLUDED.name",[user,txt(auth.user.displayName||auth.user.name||"Membre CMD Sphere",100)]);
     send(res,201,{id,ok:true,mediaUrl:"/api/cmd-profile-videos/media/"+id});return true;
   }
   const del=/^\/api\/cmd-profile-videos\/([0-9a-f-]{36})$/i.exec(path);
   if(req.method==="DELETE"&&del){
     if(!UUID.test(del[1])){send(res,400,{error:"Vidéo invalide"});return true}
     const q=await pool.query("DELETE FROM cmd_sphere_profile_videos WHERE id=$1 AND user_id=$2 RETURNING id",[del[1],user]);
     send(res,q.rows.length?200:404,q.rows.length?{ok:true}:{error:"Vidéo introuvable"});return true;
   }
   send(res,405,{error:"Méthode non autorisée"});return true;
 }
 if(!path.startsWith("/api/cmd-promos")&&!path.startsWith("/pub/"))return false;
 const match=/^\/(?:api\/cmd-promos\/file|pub)\/([0-9a-f-]{36})$/i.exec(path);
 if(match){
  if(!UUID.test(match[1])){send(res,400,{error:"Publication incorrecte"});return true}
  const q=await pool.query("SELECT p.id,p.title,p.format,p.media,p.bytes,p.music_credit,p.created_at,g.name,g.invite_code FROM cmd_sphere_promos p JOIN cmd_native_guilds g ON g.id=p.guild_id WHERE p.id=$1 LIMIT 1",[match[1]]);
  if(!q.rows.length){send(res,404,{error:"Publication introuvable"});return true}
  const p=q.rows[0];
  if(path.startsWith("/api/")){
   res.writeHead(200,{"content-type":p.format,"content-length":p.media.length,"cache-control":"public, max-age=86400","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'; sandbox","accept-ranges":"none"});res.end(p.media);return true
  }
  const link=String(baseUrl||"").replace(/\/$/,"")+"/pub/"+p.id,media=String(baseUrl||"").replace(/\/$/,"")+"/api/cmd-promos/file/"+p.id;
  const video=p.format.startsWith("video/"),image=p.format.startsWith("image/");
  const credit=p.music_credit||{},creditUrl=x=>/^https:\/\/(?:commons\.wikimedia\.org|creativecommons\.org|wiki\.creativecommons\.org)\//i.test(String(x||""))?String(x):"";
  const musicCredits=credit.title?'<p>🎵 Musique : <b>'+esc(credit.title)+'</b> · '+esc(credit.artist||"Artiste non renseigné")+' · '+esc(credit.license||"Licence libre")+''+(creditUrl(credit.sourceUrl)?' · <a href="'+esc(credit.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Source et attribution</a>':"")+(creditUrl(credit.licenseUrl)?' · <a href="'+esc(credit.licenseUrl)+'" target="_blank" rel="noopener noreferrer">Licence</a>':"")+'</p>':"";
  const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta property="og:title" content="'+esc(p.title)+'"><meta property="og:description" content="Publicité CMD Sphere · '+esc(p.name)+'"><title>'+esc(p.title)+' · CMD Sphere</title><style>body{background:#10111b;color:white;font:16px system-ui;margin:0;padding:22px}.wrap{max-width:680px;margin:auto}video,img{width:100%;max-height:78vh;object-fit:contain;border-radius:18px;background:black}a{color:#e1b9ff}h1{overflow-wrap:anywhere}</style></head><body><main class="wrap"><h1>'+esc(p.title)+'</h1><p>Publicité pour '+esc(p.name)+'</p>'+(video?'<video src="'+esc(media)+'" controls autoplay loop playsinline></video>':image?'<img src="'+esc(media)+'" alt="Publicité CMD Sphere">':'') +musicCredits+'<p><a href="'+esc(link)+'">Lien de la publication</a> · <a href="'+esc(String(baseUrl||"").replace(/\/$/,"")+'/cmd-sphere')+'">Ouvrir CMD Sphere</a></p></main></body></html>';
  res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","x-frame-options":"DENY"});res.end(html);return true;
 }
 if(!auth?.user?.id){send(res,401,{error:"Connecte-toi à CMD Sphere."});return true}
 if(req.method==="GET"&&path==="/api/cmd-promos"){
  const gid=txt(url.searchParams.get("guildId"),64);
  if(!UUID.test(gid)){send(res,400,{error:"Choisis un serveur."});return true}
  const member=await pool.query("SELECT 1 FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2 LIMIT 1",[gid,String(auth.user.id)]);
  if(!member.rows.length){send(res,403,{error:"Tu dois rejoindre le serveur."});return true}
  const q=await pool.query("SELECT id,title,format,kind,bytes,created_at FROM cmd_sphere_promos WHERE guild_id=$1 ORDER BY created_at DESC LIMIT 100",[gid]);
  send(res,200,{items:q.rows.map(p=>({...p,url:"/pub/"+p.id,mediaUrl:"/api/cmd-promos/file/"+p.id}))});return true;
 }
 if(req.method==="POST"&&path==="/api/cmd-promos"){
  const gid=txt(req.headers["x-cmd-guild-id"],64),rawTitle=txt(req.headers["x-cmd-title"],300),title=txt((()=>{try{return decodeURIComponent(rawTitle)}catch{return rawTitle}})(),100)||"Publicité de serveur",kind=txt(req.headers["x-cmd-kind"],20)||"video",mime=txt(String(req.headers["content-type"]||"").split(";")[0],40);
  if(!UUID.test(gid)){send(res,400,{error:"Choisis un serveur CMD Sphere."});return true}
  if(!MIME.has(mime)){send(res,415,{error:"Format non accepté. Utilise MP4, WebM, PNG, JPEG, WebP ou GIF."});return true}
  const role=await pool.query("SELECT membership_role FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2 LIMIT 1",[gid,String(auth.user.id)]);
  if(!["owner","admin"].includes(String(role.rows[0]?.membership_role||""))){send(res,403,{error:"Seuls les propriétaires et administrateurs peuvent publier une publicité pour ce serveur."});return true}
  const count=await pool.query("SELECT COUNT(*)::int AS total FROM cmd_sphere_promos WHERE guild_id=$1",[gid]);
  if(Number(count.rows[0]?.total||0)>=100){send(res,409,{error:"Ce serveur a atteint la limite de 100 publicités. Supprime une ancienne publication."});return true}
  const chunks=[];let size=0,overflow=false;
  for await(const chunk of req){size+=chunk.length;if(size>MAX_MEDIA){overflow=true;break}chunks.push(chunk)}
  if(overflow){req.resume();send(res,413,{error:"La publicité exportée dépasse 60 Mo. Réduis la durée ou la résolution."});return true}
  const bytes=Buffer.concat(chunks);
  if(!fileValid(bytes,mime)){send(res,400,{error:"Fichier multimédia invalide."});return true}
  let credit={};
  const creditText=String(req.headers["x-cmd-music-credit"]||"").slice(0,1600);
  if(creditText)try{
    const c=JSON.parse(decodeURIComponent(creditText));
    const sourceUrl=/^https:\/\/commons\.wikimedia\.org\//i.test(String(c.sourceUrl||""))?String(c.sourceUrl).slice(0,500):"";
    const licenseUrl=/^https:\/\/(?:creativecommons\.org|wiki\.creativecommons\.org)\//i.test(String(c.licenseUrl||""))?String(c.licenseUrl).slice(0,500):"";
    credit={title:txt(c.title,100),artist:txt(c.artist,140),license:txt(c.license,50),sourceUrl,licenseUrl};
  }catch{}
  const id=crypto.randomUUID();
  await pool.query("INSERT INTO cmd_sphere_promos(id,guild_id,owner_user_id,title,format,kind,media,bytes,music_credit) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)",[id,gid,String(auth.user.id),title,mime,kind,bytes,bytes.length,JSON.stringify(credit)]);
  send(res,201,{id,url:"/pub/"+id,mediaUrl:"/api/cmd-promos/file/"+id});return true;
 }
 if(req.method==="DELETE"&&/^\/api\/cmd-promos\/[0-9a-f-]{36}$/i.test(path)){
  const id=path.split("/").pop();if(!UUID.test(id)){send(res,400,{error:"Identifiant incorrect"});return true}
  const q=await pool.query("SELECT p.owner_user_id,p.guild_id,m.membership_role FROM cmd_sphere_promos p LEFT JOIN cmd_native_members m ON m.guild_id=p.guild_id AND m.user_id=$2 WHERE p.id=$1",[id,String(auth.user.id)]);
  const p=q.rows[0];if(!p){send(res,404,{error:"Publicité introuvable"});return true}
  if(p.owner_user_id!==String(auth.user.id)&&!["owner","admin"].includes(p.membership_role)){send(res,403,{error:"Suppression interdite"});return true}
  await pool.query("DELETE FROM cmd_sphere_promos WHERE id=$1",[id]);send(res,200,{ok:true});return true;
 }
 send(res,405,{error:"Méthode non autorisée"});return true;
}

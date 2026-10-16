/* CMD Sphere: authenticated, read-only native message history search.
 * Searches the PostgreSQL archive already used by CMD Sphere.
 * Channel permission overwrites: fail closed for non-admins until full
 * effective channel permission inheritance has been independently verified.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHANNEL=/^[a-z0-9_-]{4,80}$/i;
const lastSearch=new Map();
const error=(status,message)=>Object.assign(new Error(message),{status});
export function cmdHistoryParameters(url){
 const p=url.searchParams;
 const scope=String(p.get('scope')||'').toLowerCase();
 if(!['server','dm','group'].includes(scope))throw error(400,'Type de conversation inconnu.');
 const q=String(p.get('q')||'').trim();
 if(q.length<2||q.length>120)throw error(400,'Recherche de 2 à 120 caractères requise.');
 const guildId=String(p.get('guildId')||'');
 const channelId=String(p.get('channelId')||'');
 const threadId=String(p.get('threadId')||'');
 const groupId=String(p.get('groupId')||'');
 if(scope==='server'&&(!UUID.test(guildId)||!CHANNEL.test(channelId)))throw error(400,'Serveur ou salon invalide.');
 if(scope==='dm'&&!UUID.test(threadId))throw error(400,'Conversation privée invalide.');
 if(scope==='group'&&!UUID.test(groupId))throw error(400,'Groupe invalide.');
 function date(name){
  const value=p.get(name);
  if(!value)return null;
  if(!/^\d{4}-\d\d-\d\d(?:T\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)?)?$/.test(value))throw error(400,'Filtre de date invalide.');
  const ms=Date.parse(value);
  if(!Number.isFinite(ms))throw error(400,'Filtre de date invalide.');
  return new Date(ms).toISOString();
 }
 const after=date('after'),before=date('before');
 if(after&&before&&after>before)throw error(400,'Plage de dates inversée.');
 const authorId=String(p.get('authorId')||'').trim();
 if(authorId.length>90||/[\x00-\x1f]/.test(authorId))throw error(400,'Auteur invalide.');
 const limit=Math.min(50,Math.max(1,Number.parseInt(p.get('limit')||'30',10)||30));
 return {scope,q,guildId,channelId,threadId,groupId,after,before,authorId:authorId||null,limit};
}
const commonFilter=[
 'AND strpos(lower(m.body),lower($2::text))>0',
 'AND ($4::timestamptz IS NULL OR m.created_at >= $4::timestamptz)',
 'AND ($5::timestamptz IS NULL OR m.created_at < $5::timestamptz)',
 'AND ($6::text IS NULL OR m.sender_user_id=$6::text)',
 'ORDER BY m.created_at DESC LIMIT $7'
].join(' ');
export async function searchCmdHistory(pool,auth,params,{checkGuildPermissions}={}){
 if(!pool)throw error(503,'Base de données indisponible.');
 const uid=String(auth?.user?.id||'');
 if(!uid)throw error(401,'Connexion requise.');
 const id=params.scope==='server'?params.channelId:params.scope==='dm'?params.threadId:params.groupId;
 const args=[uid,params.q,id,params.after,params.before,params.authorId,params.limit,params.guildId||null];
 let rows;
 if(params.scope==='server'){
  const member=await pool.query('SELECT membership_role FROM cmd_native_members WHERE guild_id=$1::uuid AND user_id=$2 LIMIT 1',[params.guildId,uid]);
  if(!member.rows.length)throw error(403,'Accès au serveur refusé.');
  const ch=await pool.query([
   'SELECT c.id::text AS id,c.name,c.type,c.permission_overwrites,',
   'p.permission_overwrites AS parent_overwrites',
   'FROM cmd_native_channels c LEFT JOIN cmd_native_channels p ON p.guild_id=c.guild_id',
   'AND (p.id::text=c.source_parent_id OR p.source_channel_id=c.source_parent_id)',
   'WHERE c.guild_id=$1::uuid AND (c.id::text=$2 OR c.source_channel_id=$2) LIMIT 1'
  ].join(' '),[params.guildId,params.channelId]);
  if(!ch.rows.length||!['text','forum','announcement'].includes(ch.rows[0].type))throw error(404,'Salon introuvable.');
  const role=member.rows[0].membership_role;
  const admin=role==='owner'||role==='admin';
  const overwritten=value=>value!=null&&(Array.isArray(value)?value.length>0:typeof value==='object'?Object.keys(value).length>0:true);
  if(!admin){
   if(typeof checkGuildPermissions!=='function')throw error(403,'Permissions du serveur indisponibles.');
   const perms=await checkGuildPermissions(uid,params.guildId);
   if(!perms||!perms.viewChannels||!(perms.readHistory||perms.readMessageHistory))throw error(403,'Lecture de ce salon non autorisée.');
   if(overwritten(ch.rows[0].permission_overwrites)||overwritten(ch.rows[0].parent_overwrites))throw error(403,'Visibilité du salon non vérifiée.');
  }
  args[2]=ch.rows[0].id;
  const sql=[
   'SELECT m.id::text AS id,m.channel_id::text AS "channelId",c.name AS "channelName",',
   'm.sender_user_id AS "authorId",m.body AS content,m.created_at AS "createdAt"',
   'FROM cmd_native_channel_messages m JOIN cmd_native_channels c ON c.id=m.channel_id',
   'WHERE m.guild_id=$8::uuid AND m.channel_id=$3::uuid',commonFilter
  ].join(' ');
  rows=(await pool.query(sql,args)).rows;
 }else if(params.scope==='dm'){
  const sql=[
   'SELECT m.id::text AS id,m.thread_id::text AS "threadId",',
   'm.sender_user_id AS "authorId",m.body AS content,m.created_at AS "createdAt"',
   'FROM cmd_dm_messages m JOIN cmd_dm_threads t ON t.id=m.thread_id',
   'WHERE m.thread_id=$3::uuid AND (t.user_low=$1 OR t.user_high=$1)',commonFilter
  ].join(' ');
  rows=(await pool.query(sql,args.slice(0,7))).rows;
 }else{
  const sql=[
   'SELECT m.id::text AS id,m.group_id::text AS "groupId",',
   'm.sender_user_id AS "authorId",m.body AS content,m.created_at AS "createdAt"',
   'FROM cmd_group_dm_messages m',
   'WHERE m.group_id=$3::uuid AND EXISTS (SELECT 1 FROM cmd_group_dm_members gm',
   'WHERE gm.group_id=m.group_id AND gm.user_id=$1)',commonFilter
  ].join(' ');
  rows=(await pool.query(sql,args.slice(0,7))).rows;
 }
 return {scope:params.scope,results:rows.map(r=>({...r,scope:params.scope})),limit:params.limit,search:'full_stored_history',morePossible:rows.length>=params.limit};
}
export async function handleCmdHistorySearch(req,res,url,{pool,auth,sendJson,checkGuildPermissions}){
 if(url.pathname!=='/api/cmd/messages/history-search')return false;
 if(req.method!=='GET'){sendJson(res,405,{error:'Méthode non autorisée.'});return true}
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true}
 try{
  const params=cmdHistoryParameters(url);
  const uid=String(auth.user.id);
  const now=Date.now(),previous=lastSearch.get(uid)||0;
  if(now-previous<750){sendJson(res,429,{error:'Patiente un instant avant une autre recherche.'});return true}
  lastSearch.set(uid,now);
  if(lastSearch.size>5000)lastSearch.clear();
  sendJson(res,200,await searchCmdHistory(pool,auth,params,{checkGuildPermissions}));
 }catch(e){sendJson(res,e.status||500,{error:e.status?e.message:'Recherche indisponible.'})}
 return true;
}

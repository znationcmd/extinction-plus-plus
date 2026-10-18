/* CMD Sphere — additive audit history for authorized native server changes.
 * Server-side actor identity only; never record message bodies, access tokens or request JSON.
 * Hash linkage is a tamper-evidence aid, not a substitute for off-site audit backups.
 */
import {createHash} from 'node:crypto';

const error=(status,message)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const AUDIT_ACTIONS=Object.freeze([
 'create_category','create_channel','update_channel','reorder_channels',
 'delete_channel','create_role','update_role','delete_role','set_channel_permissions'
]);
const ALLOWED=new Set(AUDIT_ACTIONS);
const ID=/^[a-zA-Z0-9:_-]{1,100}$/;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function initCmdNativeAudit(pool){
 await pool.query([
  'CREATE TABLE IF NOT EXISTS cmd_native_audit_log(',
  'seq BIGSERIAL PRIMARY KEY,',
  'guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,',
  'actor_user_id TEXT NOT NULL,action TEXT NOT NULL,target_id TEXT,',
  'occurred_at TIMESTAMPTZ NOT NULL,prev_hash TEXT NOT NULL,entry_hash TEXT NOT NULL)'
 ].join(' '));
 await pool.query('CREATE INDEX IF NOT EXISTS cmd_native_audit_log_guild_seq_idx ON cmd_native_audit_log(guild_id,seq DESC)');
}

export function nativeAuditTarget(action,input={}){
 if(!ALLOWED.has(action))return null;
 const value=action.includes('role')?input.roleId:
  action==='reorder_channels'?'channel-order':
  action.includes('category')?input.categoryId:
  input.channelId;
 const target=String(value??'').trim();
 return target&&ID.test(target)?target:null;
}

export async function appendCmdNativeAudit(pool,auth,{guildId,action,targetId=null},options={}){
 const uid=String(auth?.user?.id||'');
 if(!uid)throw error(401,'Connexion requise.');
 if(!UUID.test(String(guildId))||!ALLOWED.has(action))throw error(400,'Action de journal invalide.');
 if(targetId!==null&&!ID.test(String(targetId)))throw error(400,'Cible invalide.');
 if(!pool?.connect)throw error(503,'Base indisponible.');
 const client=await pool.connect();
 let transaction=false;
 try{
  await client.query('BEGIN');transaction=true;
  // Serialize entries per server to keep the sequence of hashes connected.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text))',[guildId]);
  const previous=await client.query('SELECT entry_hash FROM cmd_native_audit_log WHERE guild_id=$1::uuid ORDER BY seq DESC LIMIT 1',[guildId]);
  const prevHash=String(previous.rows[0]?.entry_hash||'');
  const time=options.now instanceof Date?options.now:new Date();
  if(!Number.isFinite(time.getTime()))throw error(400,'Date de journal invalide.');
  const occurredAt=time.toISOString();
  const entryHash=hash([String(guildId),uid,action,targetId,occurredAt,prevHash]);
  const saved=await client.query([
   'INSERT INTO cmd_native_audit_log(guild_id,actor_user_id,action,target_id,occurred_at,prev_hash,entry_hash)',
   'VALUES($1::uuid,$2,$3,$4,$5::timestamptz,$6,$7) RETURNING seq'
  ].join(' '),[guildId,uid,action,targetId,occurredAt,prevHash,entryHash]);
  await client.query('COMMIT');transaction=false;
  return {recorded:true,seq:Number(saved.rows[0]?.seq||0)};
 }catch(cause){
  if(transaction)try{await client.query('ROLLBACK')}catch{}
  throw cause;
 }finally{client.release()}
}

export function nativeAuditQuery(url){
 const guildId=String(url.searchParams.get('guildId')||'');
 if(!UUID.test(guildId))throw error(400,'Serveur invalide.');
 const rawLimit=String(url.searchParams.get('limit')||'30');
 if(!/^\d{1,2}$/.test(rawLimit))throw error(400,'Limite invalide.');
 const limit=Number(rawLimit);
 if(limit<1||limit>50)throw error(400,'Limite invalide.');
 const rawCursor=url.searchParams.get('before');
 if(rawCursor!==null&&!/^[1-9]\d{0,14}$/.test(rawCursor))throw error(400,'Curseur invalide.');
 return {guildId,limit,before:rawCursor||null};
}

export async function readCmdNativeAudit(pool,auth,{guildId,limit=30,before=null},{requireNativeAdmin}={}){
 if(!auth?.user?.id)throw error(401,'Connexion requise.');
 if(!UUID.test(String(guildId))||!Number.isInteger(limit)||limit<1||limit>50)throw error(400,'Paramètres invalides.');
 if(!pool||typeof requireNativeAdmin!=='function')throw error(503,'Service indisponible.');
 try{await requireNativeAdmin(auth,guildId)}
 catch{throw error(403,'Journal réservé aux administrateurs.')}
 const rows=await pool.query([
  'SELECT seq,actor_user_id AS "actorId",action,target_id AS "targetId",occurred_at AS "occurredAt"',
  'FROM cmd_native_audit_log WHERE guild_id=$1::uuid AND ($2::bigint IS NULL OR seq<$2::bigint)',
  'ORDER BY seq DESC LIMIT $3'
 ].join(' '),[guildId,before,limit]);
 const entries=rows.rows.map(x=>({
  seq:Number(x.seq),actorId:String(x.actorId),action:String(x.action),
  targetId:x.targetId===null?null:String(x.targetId),occurredAt:x.occurredAt
 }));
 return {guildId,entries,morePossible:entries.length>=limit,nextCursor:entries.length>=limit?String(entries.at(-1).seq):null};
}

export async function handleCmdNativeAudit(req,res,url,{pool,auth,sendJson,requireNativeAdmin}){
 if(url.pathname!=='/api/native/audit-log')return false;
 if(req.method!=='GET'){sendJson(res,405,{error:'Méthode non autorisée.'});return true}
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true}
 try{
  const input=nativeAuditQuery(url);
  const result=await readCmdNativeAudit(pool,auth,input,{requireNativeAdmin});
  res.setHeader?.('Cache-Control','private, no-store');
  sendJson(res,200,result);
 }catch(cause){sendJson(res,cause.status||500,{error:cause.status?cause.message:'Journal indisponible.'})}
 return true;
}

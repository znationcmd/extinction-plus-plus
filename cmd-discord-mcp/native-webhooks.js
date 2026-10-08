import crypto from 'node:crypto';
const initialized=new WeakMap(),rates=new Map();
const hash=token=>crypto.createHash('sha256').update(String(token)).digest('hex');
const fault=(message,status=400)=>Object.assign(new Error(message),{status});
async function ensure(pool){
 if(!pool)throw fault('Stockage CMD Sphere indisponible.',503);
 if(!initialized.has(pool))initialized.set(pool,pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_webhooks(
  id UUID PRIMARY KEY,guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES cmd_native_channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,token_hash TEXT NOT NULL,created_by TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`).catch(e=>{initialized.delete(pool);throw e}));
 await initialized.get(pool);
}
export async function listNativeWebhooks(pool,guildId){
 await ensure(pool);
 const r=await pool.query('SELECT w.id,w.channel_id AS "channelId",w.name,c.name AS "channelName",w.created_at AS "createdAt" FROM cmd_native_webhooks w JOIN cmd_native_channels c ON c.id=w.channel_id WHERE w.guild_id=$1 ORDER BY w.created_at DESC',[guildId]);
 return {webhooks:r.rows};
}
export async function createNativeWebhook(pool,{guildId,channelId,name,userId,baseUrl}){
 await ensure(pool);name=String(name||'').trim();
 if(!name||name.length>80)throw fault('Nom du webhook requis (80 caractères maximum).');
 const ch=await pool.query("SELECT id FROM cmd_native_channels WHERE guild_id=$1 AND (id::text=$2 OR source_channel_id=$2) AND type IN ('text','announcement','forum') LIMIT 1",[guildId,channelId]);
 if(!ch.rows[0])throw fault('Salon texte CMD Sphere introuvable.');
 const id=crypto.randomUUID(),token=crypto.randomBytes(32).toString('base64url');
 await pool.query('INSERT INTO cmd_native_webhooks(id,guild_id,channel_id,name,token_hash,created_by) VALUES($1,$2,$3,$4,$5,$6)',[id,guildId,ch.rows[0].id,name,hash(token),userId]);
 return {ok:true,webhook:{id,name,channelId:String(ch.rows[0].id),url:baseUrl+'/api/webhooks/'+id+'/'+token}};
}
const text=(value,max)=>String(value??'').slice(0,max);
const https=value=>{try{const u=new URL(String(value));return u.protocol==='https:'?u.href:undefined}catch{return undefined}};
export function webhookPayload(body){
 const content=String(body?.content||'');if(content.length>2000)throw fault('Message limité à 2000 caractères.');
 if((body?.embeds||[]).length>10)throw fault('10 embeds maximum.');
 const embeds=(Array.isArray(body?.embeds)?body.embeds:[]).map(e=>({title:text(e.title,256),description:text(e.description,4096),url:https(e.url),color:Number.isInteger(e.color)?Math.max(0,Math.min(16777215,e.color)):undefined,fields:(Array.isArray(e.fields)?e.fields:[]).slice(0,25).map(f=>({name:text(f.name,256),value:text(f.value,1024),inline:Boolean(f.inline)})),image:e.image&&https(e.image.url)?{url:https(e.image.url)}:undefined,thumbnail:e.thumbnail&&https(e.thumbnail.url)?{url:https(e.thumbnail.url)}:undefined,footer:e.footer?{text:text(e.footer.text,2048)}:undefined}));
 if(!content.trim()&&!embeds.length)throw fault('Message vide. Les webhooks CMD Sphere acceptent content et embeds en JSON.');
 return {content,embeds,username:text(body?.username,80).trim(),avatar:https(body?.avatar_url)||null};
}
export async function receiveNativeWebhook(pool,id,token,body){
 await ensure(pool);
 if(!/^[0-9a-f-]{36}$/i.test(id)||!/^[A-Za-z0-9_-]{43}$/.test(token))throw fault('Webhook introuvable.',404);
 const r=await pool.query('SELECT * FROM cmd_native_webhooks WHERE id=$1 AND token_hash=$2 LIMIT 1',[id,hash(token)]),w=r.rows[0];
 if(!w)throw fault('Webhook introuvable.',404);
 const now=Date.now(),rate=rates.get(id);
 if(rate&&rate.until>now&&rate.count>=30)throw fault('Trop de messages webhook. Réessaie dans une minute.',429);
 rates.set(id,rate&&rate.until>now?{...rate,count:rate.count+1}:{until:now+60000,count:1});
 if(rates.size>10000)for(const [key,value]of rates)if(value.until<now)rates.delete(key);
 const payload=webhookPayload(body),messageId=crypto.randomUUID(),metadata={webhook:{id,name:payload.username||w.name,avatar:payload.avatar},embeds:payload.embeds};
 const inserted=await pool.query('INSERT INTO cmd_native_channel_messages(id,guild_id,channel_id,sender_user_id,body,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING created_at',[messageId,w.guild_id,w.channel_id,'webhook:'+id,payload.content,JSON.stringify(metadata)]);
 return {id:messageId,channel_id:String(w.channel_id),content:payload.content,embeds:payload.embeds,author:{username:metadata.webhook.name,bot:true},timestamp:inserted.rows[0]?.created_at};
}
export async function deleteNativeWebhook(pool,guildId,id){
 await ensure(pool);
 if(!/^[0-9a-f-]{36}$/i.test(String(id)))throw fault('Webhook introuvable.',404);
 const r=await pool.query('DELETE FROM cmd_native_webhooks WHERE guild_id=$1 AND id=$2 RETURNING id',[guildId,id]);
 if(!r.rows[0])throw fault('Webhook introuvable.',404);
 return {ok:true};
}

const {Pool}=require('pg');
const crypto=require('node:crypto');
let pool,ready;
function db(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL requis');if(!pool){pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});pool.on('error',e=>console.error('Activity logs DB :',e.code||e.name));}return pool;}
async function init(){if(ready)return ready;ready=db().query(String.raw`
CREATE TABLE IF NOT EXISTS network_player_activity(
 id TEXT PRIMARY KEY,
 guild_id TEXT NOT NULL,
 server_id TEXT NOT NULL DEFAULT '',
 game TEXT NOT NULL,
 map TEXT NOT NULL DEFAULT '',
 event_type TEXT NOT NULL,
 player_name TEXT NOT NULL DEFAULT '',
 player_id TEXT NOT NULL DEFAULT '',
 killer_name TEXT NOT NULL DEFAULT '',
 killer_id TEXT NOT NULL DEFAULT '',
 cause TEXT NOT NULL DEFAULT '',
 weapon TEXT NOT NULL DEFAULT '',
 distance DOUBLE PRECISION,
 x DOUBLE PRECISION,
 y DOUBLE PRECISION,
 z DOUBLE PRECISION,
 occurred_at TIMESTAMPTZ NOT NULL,
 source_bot TEXT NOT NULL DEFAULT '',
 source TEXT NOT NULL DEFAULT '',
 raw TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_network_activity_guild_time ON network_player_activity(guild_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_activity_server_time ON network_player_activity(server_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_activity_type ON network_player_activity(event_type,occurred_at DESC);
`).then(()=>true);return ready;}
const clean=(v,n=500)=>String(v??'').trim().slice(0,n),num=v=>Number.isFinite(Number(v))?Number(v):null;
function auth(req){const expected=process.env.TOP_SERVERS_API_KEY||'';const got=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!expected||!got)return false;const a=crypto.createHash('sha256').update(got).digest(),b=crypto.createHash('sha256').update(expected).digest();return crypto.timingSafeEqual(a,b);}
async function parseBody(req,limit=65536){return new Promise((resolve,reject)=>{let size=0,chunks=[];req.on('data',c=>{size+=c.length;if(size>limit){reject(Object.assign(new Error('too_large'),{status:413}));req.destroy();return}chunks.push(c)});req.on('end',()=>{try{resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{})}catch{reject(Object.assign(new Error('bad_json'),{status:400}))}});req.on('error',reject);});}
async function ingest(input){await init();const e={id:clean(input.id,100)||crypto.randomUUID(),guildId:clean(input.guildId,40),serverId:clean(input.serverId,100),game:clean(input.game,40).toLowerCase(),map:clean(input.map,100),eventType:clean(input.eventType,30).toLowerCase(),playerName:clean(input.playerName,120),playerId:clean(input.playerId,120),killerName:clean(input.killerName,120),killerId:clean(input.killerId,120),cause:clean(input.cause,180),weapon:clean(input.weapon,180),distance:num(input.distance),x:num(input.x),y:num(input.y),z:num(input.z),occurredAt:new Date(input.occurredAt||Date.now()),sourceBot:clean(input.sourceBot,60),source:clean(input.source,120),raw:clean(input.raw,4000)};if(!e.guildId||!e.game||!['connect','disconnect','death','kill','suicide'].includes(e.eventType)||Number.isNaN(e.occurredAt.getTime()))throw Object.assign(new Error('missing_fields'),{status:400});const q=await db().query('INSERT INTO network_player_activity(id,guild_id,server_id,game,map,event_type,player_name,player_id,killer_name,killer_id,cause,weapon,distance,x,y,z,occurred_at,source_bot,source,raw) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) ON CONFLICT(id) DO NOTHING RETURNING *',[e.id,e.guildId,e.serverId,e.game,e.map,e.eventType,e.playerName,e.playerId,e.killerName,e.killerId,e.cause,e.weapon,e.distance,e.x,e.y,e.z,e.occurredAt,e.sourceBot,e.source,e.raw]);return q.rows[0]||{duplicate:true,id:e.id};}
async function list({guildId='',serverId='',game='',eventType='',limit=100}={}){await init();limit=Math.max(1,Math.min(500,Number(limit)||100));const w=[],a=[];for(const [col,val,max] of [['guild_id',guildId,40],['server_id',serverId,100],['game',game,40],['event_type',eventType,30]])if(val){a.push(clean(val,max).toLowerCase());w.push((['game','event_type'].includes(col)?'LOWER('+col+')':col)+'=$'+a.length);}a.push(limit);const q=await db().query('SELECT * FROM network_player_activity'+(w.length?' WHERE '+w.join(' AND '):'')+' ORDER BY occurred_at DESC LIMIT $'+a.length,a);return q.rows;}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
async function http(req,res){const u=new URL(req.url,'http://internal');if(!u.pathname.startsWith('/api/player-activity'))return false;if(!auth(req)){json(res,401,{error:'unauthorized'});return true}try{if(req.method==='POST'&&u.pathname==='/api/player-activity'){json(res,200,{event:await ingest(await parseBody(req))});return true}if(req.method==='GET'&&u.pathname==='/api/player-activity'){json(res,200,{events:await list({guildId:u.searchParams.get('guildId')||'',serverId:u.searchParams.get('serverId')||'',game:u.searchParams.get('game')||'',eventType:u.searchParams.get('eventType')||'',limit:u.searchParams.get('limit')||100})});return true}json(res,404,{error:'not_found'});return true}catch(e){json(res,e.status||500,{error:e.message||'error'});return true}}
module.exports={init,ingest,list,http};
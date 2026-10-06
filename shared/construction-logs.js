const {Pool}=require('pg');
const crypto=require('node:crypto');
let pool,ready;
function db(){if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL requis');if(!pool){pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});pool.on('error',e=>console.error('Construction logs DB :',e.code||e.name));}return pool;}
async function init(){if(ready)return ready;ready=db().query(String.raw\`
CREATE TABLE IF NOT EXISTS network_construction_logs(
 id TEXT PRIMARY KEY,
 guild_id TEXT NOT NULL,
 server_id TEXT NOT NULL DEFAULT '',
 game TEXT NOT NULL,
 map TEXT NOT NULL DEFAULT '',
 player_name TEXT NOT NULL DEFAULT '',
 player_id TEXT NOT NULL DEFAULT '',
 object_name TEXT NOT NULL DEFAULT '',
 x DOUBLE PRECISION,
 y DOUBLE PRECISION,
 z DOUBLE PRECISION,
 occurred_at TIMESTAMPTZ NOT NULL,
 source_bot TEXT NOT NULL DEFAULT '',
 source TEXT NOT NULL DEFAULT '',
 raw TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_network_build_guild_time ON network_construction_logs(guild_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_build_server_time ON network_construction_logs(server_id,occurred_at DESC);
\`).then(()=>true);return ready;}
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
function auth(req){const expected=process.env.TOP_SERVERS_API_KEY||'';const got=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!expected||!got)return false;const a=crypto.createHash('sha256').update(got).digest(),b=crypto.createHash('sha256').update(expected).digest();return crypto.timingSafeEqual(a,b);}
async function parseBody(req,limit=65536){return new Promise((resolve,reject)=>{let size=0,chunks=[];req.on('data',c=>{size+=c.length;if(size>limit){reject(Object.assign(new Error('too_large'),{status:413}));req.destroy();return}chunks.push(c)});req.on('end',()=>{try{resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{})}catch{reject(Object.assign(new Error('bad_json'),{status:400}))}});req.on('error',reject);});}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
async function ingest(input){await init();const e={id:clean(input.id,100)||crypto.randomUUID(),guildId:clean(input.guildId,40),serverId:clean(input.serverId,100),game:clean(input.game,40).toLowerCase(),map:clean(input.map,100),playerName:clean(input.playerName,120),playerId:clean(input.playerId,120),objectName:clean(input.objectName,180),x:num(input.x),y:num(input.y),z:num(input.z),occurredAt:new Date(input.occurredAt||Date.now()),sourceBot:clean(input.sourceBot,60),source:clean(input.source,120),raw:clean(input.raw,4000)};if(!e.guildId||!e.game||!e.objectName||Number.isNaN(e.occurredAt.getTime()))throw Object.assign(new Error('missing_fields'),{status:400});const q=await db().query('INSERT INTO network_construction_logs(id,guild_id,server_id,game,map,player_name,player_id,object_name,x,y,z,occurred_at,source_bot,source,raw) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT(id) DO NOTHING RETURNING *',[e.id,e.guildId,e.serverId,e.game,e.map,e.playerName,e.playerId,e.objectName,e.x,e.y,e.z,e.occurredAt,e.sourceBot,e.source,e.raw]);return q.rows[0]||{duplicate:true,id:e.id};}
async function list({guildId='',serverId='',game='',limit=100}={}){await init();limit=Math.max(1,Math.min(500,Number(limit)||100));const w=[],a=[];for(const [col,val,max] of [['guild_id',guildId,40],['server_id',serverId,100],['game',game,40]])if(val){a.push(clean(val,max).toLowerCase());w.push((col==='game'?'LOWER(game)':col)+'=$'+a.length);}a.push(limit);const q=await db().query('SELECT * FROM network_construction_logs'+(w.length?' WHERE '+w.join(' AND '):'')+' ORDER BY occurred_at DESC LIMIT $'+a.length,a);return q.rows;}
function parseLine(line,{game='',guildId='',serverId='',map='',sourceBot='',source='log'}={}){const raw=String(line||'');if(!/(built|build|constructed|placed|deploy(?:ed)?|construction|structure|foundation|wall|door|floor|ceiling|fence|barricade|watchtower|basebuilding|spawned building)/i.test(raw))return null;const pos=raw.match(/(?:pos(?:ition)?\s*[=:]?\s*[<(]?|location\s*[=:]?\s*[<(]?)(-?\d+(?:\.\d+)?)\s*[,; ]+\s*(-?\d+(?:\.\d+)?)\s*[,; ]+\s*(-?\d+(?:\.\d+)?)/i)||raw.match(/\bX\s*[=:]\s*(-?\d+(?:\.\d+)?).*?\bY\s*[=:]\s*(-?\d+(?:\.\d+)?).*?\bZ\s*[=:]\s*(-?\d+(?:\.\d+)?)/i);const player=raw.match(/(?:player|survivor|builder|owner|character)\s*[=:]?\s*["']?([^"',|()[\]]{2,80})/i);const pid=raw.match(/(?:steamid|playerid|uid|xuid|eos(?:id)?)\s*[=:]\s*([A-Za-z0-9_+\/=-]{4,120})/i);const obj=raw.match(/(?:built|constructed|placed|deployed|structure|object|item)\s*(?:[:=]|an?\s+)?\s*["']?([A-Za-z0-9 _./:'-]{2,120})/i);if(!obj)return null;return {guildId,serverId,game,map,playerName:player?.[1]?.trim()||'',playerId:pid?.[1]||'',objectName:obj[1].trim(),x:pos?Number(pos[1]):null,y:pos?Number(pos[2]):null,z:pos?Number(pos[3]):null,occurredAt:new Date().toISOString(),sourceBot,source,raw:raw.slice(0,4000)};}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
async function http(req,res){const u=new URL(req.url,'http://internal');if(!u.pathname.startsWith('/api/construction-events'))return false;if(!auth(req)){json(res,401,{error:'unauthorized'});return true}try{if(req.method==='POST'&&u.pathname==='/api/construction-events'){json(res,200,{event:await ingest(await parseBody(req))});return true}if(req.method==='GET'&&u.pathname==='/api/construction-events'){json(res,200,{events:await list({guildId:u.searchParams.get('guildId')||'',serverId:u.searchParams.get('serverId')||'',game:u.searchParams.get('game')||'',limit:u.searchParams.get('limit')||100})});return true}json(res,404,{error:'not_found'});return true}catch(e){json(res,e.status||500,{error:e.message||'error'});return true}}
module.exports={init,ingest,list,parseLine,http};
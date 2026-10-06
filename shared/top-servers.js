const {Pool}=require('pg');
const crypto=require('node:crypto');
let pool,ready;
function db(){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL requis pour Top Serveurs');
  if(!pool){pool=new Pool({connectionString:process.env.DATABASE_URL,max:4,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});pool.on('error',e=>console.error('Top Serveurs DB :',e.code||e.name));}
  return pool;
}
async function init(){
  if(ready)return ready;
  ready=db().query(String.raw`
CREATE TABLE IF NOT EXISTS network_top_servers(
 id TEXT PRIMARY KEY,
 guild_id TEXT NOT NULL,
 owner_user_id TEXT NOT NULL,
 name TEXT NOT NULL,
 game TEXT NOT NULL,
 map TEXT NOT NULL DEFAULT '',
 platform TEXT NOT NULL DEFAULT '',
 description TEXT NOT NULL DEFAULT '',
 address TEXT NOT NULL DEFAULT '',
 invite_url TEXT NOT NULL DEFAULT '',
 website_url TEXT NOT NULL DEFAULT '',
 source_bot TEXT NOT NULL DEFAULT 'extinction-rss',
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_network_top_servers_game ON network_top_servers(game,enabled);
CREATE TABLE IF NOT EXISTS network_top_server_votes(
 server_id TEXT NOT NULL REFERENCES network_top_servers(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL,
 vote_day DATE NOT NULL DEFAULT CURRENT_DATE,
 source_bot TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(server_id,user_id,vote_day)
);
CREATE INDEX IF NOT EXISTS idx_network_top_votes_created ON network_top_server_votes(created_at);
`).then(()=>true);
  return ready;
}
const clean=(v,n=300)=>String(v??'').trim().slice(0,n);
function authorized(req){const expected=process.env.TOP_SERVERS_API_KEY||'';const got=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');return Boolean(expected&&got&&crypto.timingSafeEqual(Buffer.from(crypto.createHash('sha256').update(got).digest('hex')),Buffer.from(crypto.createHash('sha256').update(expected).digest('hex'))));}
async function list({game='',limit=25}={}){
  await init();limit=Math.max(1,Math.min(100,Number(limit)||25));
  const args=[];let where='s.enabled=TRUE';if(game){args.push(clean(game,40).toLowerCase());where+=' AND LOWER(s.game)=$1';}
  args.push(limit);const li='$'+args.length;
  const q=await db().query(`
SELECT s.*,
 COUNT(v.*)::int AS votes_total,
 COUNT(v.*) FILTER (WHERE v.created_at>=date_trunc('month',NOW()))::int AS votes_month,
 COUNT(v.*) FILTER (WHERE v.created_at>=NOW()-INTERVAL '24 hours')::int AS votes_24h
FROM network_top_servers s
LEFT JOIN network_top_server_votes v ON v.server_id=s.id
WHERE \${where}
GROUP BY s.id
ORDER BY votes_month DESC,votes_total DESC,s.updated_at DESC
LIMIT \${li}`,args);
  return q.rows;
}
async function register(input){
  await init();
  const row={
    id:clean(input.id,80)||crypto.randomUUID(),
    guildId:clean(input.guildId,40),ownerUserId:clean(input.ownerUserId,40),
    name:clean(input.name,100),game:clean(input.game,40).toLowerCase(),
    map:clean(input.map,100),platform:clean(input.platform,80),description:clean(input.description,500),
    address:clean(input.address,180),inviteUrl:clean(input.inviteUrl,300),websiteUrl:clean(input.websiteUrl,300),
    sourceBot:clean(input.sourceBot,60)||'unknown'
  };
  if(!row.guildId||!row.ownerUserId||!row.name||!row.game)throw Object.assign(new Error('missing_fields'),{status:400});
  const q=await db().query(`
INSERT INTO network_top_servers(id,guild_id,owner_user_id,name,game,map,platform,description,address,invite_url,website_url,source_bot)
VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
ON CONFLICT(id) DO UPDATE SET
 guild_id=EXCLUDED.guild_id,owner_user_id=EXCLUDED.owner_user_id,name=EXCLUDED.name,game=EXCLUDED.game,map=EXCLUDED.map,
 platform=EXCLUDED.platform,description=EXCLUDED.description,address=EXCLUDED.address,invite_url=EXCLUDED.invite_url,
 website_url=EXCLUDED.website_url,source_bot=EXCLUDED.source_bot,enabled=TRUE,updated_at=NOW()
RETURNING *`,[row.id,row.guildId,row.ownerUserId,row.name,row.game,row.map,row.platform,row.description,row.address,row.inviteUrl,row.websiteUrl,row.sourceBot]);
  return q.rows[0];
}
async function vote(id,userId,sourceBot){
  await init();id=clean(id,80);userId=clean(userId,40);sourceBot=clean(sourceBot,60);
  if(!id||!userId)throw Object.assign(new Error('missing_fields'),{status:400});
  const exists=await db().query('SELECT id FROM network_top_servers WHERE id=$1 AND enabled=TRUE',[id]);if(!exists.rowCount)throw Object.assign(new Error('not_found'),{status:404});
  const q=await db().query('INSERT INTO network_top_server_votes(server_id,user_id,source_bot) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING server_id',[id,userId,sourceBot]);
  if(!q.rowCount)throw Object.assign(new Error('already_voted_today'),{status:409});
  return {ok:true};
}
async function parseBody(req,limit=32768){
  return await new Promise((resolve,reject)=>{let size=0,chunks=[];req.on('data',c=>{size+=c.length;if(size>limit){reject(Object.assign(new Error('too_large'),{status:413}));req.destroy();return}chunks.push(c)});req.on('end',()=>{try{resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{})}catch{reject(Object.assign(new Error('bad_json'),{status:400}))}});req.on('error',reject);});
}
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
async function http(req,res){
  const u=new URL(req.url,'http://internal');
  if(req.method==='GET'&&u.pathname==='/api/top-servers'){try{return json(res,200,{servers:await list({game:u.searchParams.get('game')||'',limit:u.searchParams.get('limit')||25})})}catch(e){return json(res,500,{error:'top_servers_unavailable'})}}
  if(!u.pathname.startsWith('/api/top-servers'))return false;
  if(!authorized(req)){json(res,401,{error:'unauthorized'});return true}
  try{
    if(req.method==='POST'&&u.pathname==='/api/top-servers/register'){json(res,200,{server:await register(await parseBody(req))});return true}
    const m=u.pathname.match(/^\/api\/top-servers\/([^/]+)\/vote$/);
    if(req.method==='POST'&&m){const b=await parseBody(req);await vote(decodeURIComponent(m[1]),b.userId,b.sourceBot);json(res,200,{ok:true});return true}
    json(res,404,{error:'not_found'});return true;
  }catch(e){json(res,e.status||500,{error:e.message||'error'});return true}
}
module.exports={init,list,register,vote,http,authorized};
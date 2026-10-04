import {activeGuild,guarded} from '../../../lib/dashboard-auth';
import {readDb,writeDb} from '../../../lib/db';
import battlepass from '../../../lib/battlepass.cjs';
import economy from '../../../lib/economy.cjs';
import {allServers} from '../../../lib/servers';
export const GET=guarded(async req=>{const bp=(await readDb()).battlepass||{levels:[]};const q=new URL(req.url).searchParams;
 if(q.get('collection')==='premium'){const season=bp.seasons?.find(s=>s.id===q.get('seasonId'));return Response.json(((season||bp).premiumUsers||[]).map(userId=>({id:userId,userId})));}
 if(q.get('collection')==='seasons')return Response.json(bp.seasons||[]);
 const season=q.get('seasonId');if(season&&!bp.seasons?.some(s=>s.id===season))throw new Error('Saison introuvable.');
 return Response.json(season?bp.seasons.find(s=>s.id===season).levels:bp.levels||[]);
});
const mutate=guarded(async req=>{const body=await req.json(),db=await readDb();body.collection??=new URL(req.url).searchParams.get('collection')||undefined;body.seasonId??=new URL(req.url).searchParams.get("seasonId")||undefined;db.battlepass||={levels:[]};const gid=await activeGuild();if(body.serverId&&!allServers(db,gid).some(s=>s.id===body.serverId&&(!body.game||s.game===body.game)))throw new Error('Serveur du jeu sélectionné introuvable.');battlepass.mutate(db.battlepass,body,req.method);if(body.collection==='premium'&&req.method!=='DELETE'){db.guilds[gid]||={id:gid};db.guilds[gid].progress||={};db.guilds[gid].progress[body.userId]||={xp:0,claimed:[]};db.battlepasses||={};db.battlepasses[gid]=db.battlepass;const selected=body.seasonId?db.battlepass.seasons.find(s=>s.id===body.seasonId):null;if(!selected||battlepass.active(db.battlepass)?.id===selected.id)battlepass.earn(db,gid,body.userId,0,{createdAt:new Date().toISOString()},economy.credit);}await writeDb(db);return Response.json({ok:true});});
export const POST=mutate,PATCH=mutate,DELETE=mutate;

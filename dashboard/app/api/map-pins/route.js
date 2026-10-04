import crypto from 'crypto';
import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {session} from '../../../lib/mod-auth';
import {readDb,writeDb} from '../../../lib/db';
import model from '../../../lib/map-model.cjs';
export const GET=guarded(async req=>{const db=await readDb(),mapId=new URL(req.url).searchParams.get('mapId');return Response.json((db.mapPins||[]).filter(p=>!mapId||p.mapId===mapId));});
async function mutate(req){const b=await req.json(),db=await readDb(),map=(db.maps||[]).find(m=>m.id===b.mapId);if(!map)throw new Error('Carte introuvable.');db.mapPins||=[];const idx=db.mapPins.findIndex(p=>p.id===b.id&&p.mapId===map.id);if(req.method!=='POST'&&idx<0)throw Object.assign(new Error('Marqueur introuvable.'),{status:404});if(req.method==='DELETE')db.mapPins.splice(idx,1);else{const value={id:idx>=0?db.mapPins[idx].id:crypto.randomUUID(),guildId:await activeGuild(),mapId:map.id,...model.validPin(map,b),actorId:(await session()).userId,updatedAt:new Date().toISOString()};if(idx>=0)db.mapPins[idx]=value;else db.mapPins.push(value);}await writeDb(db);return Response.json({ok:true});}
export const POST=guarded(mutate),PATCH=guarded(mutate),DELETE=guarded(mutate);

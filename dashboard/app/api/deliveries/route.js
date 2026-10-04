import crypto from 'crypto';
import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {session} from '../../../lib/mod-auth';
import {readDb,writeDb} from '../../../lib/db';
import {allServers} from '../../../lib/servers';
import delivery from '../../../lib/delivery-review.cjs';
export const GET=guarded(async()=>Response.json((await readDb()).deliveries||[]));
export const POST=guarded(async req=>{const b=await req.json(),gid=await activeGuild(),db=await readDb(),s=allServers(db,gid).find(s=>[s.id,s.name].includes(b.serverId));if(!s||!/^\d{15,22}$/.test(b.userId||'')||typeof b.itemName!=='string'||!b.itemName.trim()||b.itemName.length>200)throw new Error('Serveur du Discord, ID joueur et objet requis.');(db.deliveries||=[]).push({id:crypto.randomUUID(),guildId:gid,serverId:s.id,userId:b.userId,itemName:b.itemName.trim(),status:'awaiting_staff',source:'staff',createdAt:new Date().toISOString()});await writeDb(db);return Response.json({ok:true});});
export const PATCH=guarded(async req=>{const b=await req.json(),gid=await activeGuild(),db=await readDb();const row=delivery.review(db,gid,b.id,b.status,b.reviewNote,(await session()).userId);await writeDb(db);return Response.json({ok:true,row,message:row.status==='cancelled'?'Annulation enregistrée ; commande payée remboursée une seule fois.':'Livraison confirmée par le staff.'});});

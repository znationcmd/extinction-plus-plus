import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {readDb} from '../../../lib/db';
import {session} from '../../../lib/mod-auth';
import jobs from '../../../lib/bot-jobs.cjs';
export const GET=guarded(async()=>Response.json((await readDb()).tickets||[]));
export const POST=guarded(async req=>{const body=await req.json(),gid=await activeGuild(),db=await readDb(),row=db.tickets?.find(t=>t.id===body.ticketId&&t.guildId===gid);if(!row?.channelId)throw new Error('Ticket Discord introuvable.');if(!['reply','close','reopen'].includes(body.action))throw new Error('Action ticket inconnue.');if(body.action==='reply'&&(typeof body.message!=='string'||!body.message.trim()||body.message.length>1500))throw new Error('Réponse de 1 à 1500 caractères requise.');const jobId=await jobs.enqueue(gid,(await session()).userId,'ticket',{ticketId:row.id,action:body.action,message:body.action==='reply'?body.message:undefined});return Response.json({ok:true,jobId,message:'Action en attente du bot.'},{status:202});});

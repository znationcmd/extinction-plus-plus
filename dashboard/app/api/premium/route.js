import {readDb,writeDb} from '../../../lib/db';
import {activeGuild,guarded} from '../../../lib/dashboard-auth';
import {session} from '../../../lib/mod-auth';
import premium from '../../../lib/premium.cjs';

export const GET=guarded(async req=>{
 const db=await readDb(),guildId=await activeGuild(),s=await session(),q=new URL(req.url).searchParams;
 if(q.get('admin')==='1'){premium.operator(s.userId);return Response.json(premium.admin(db));}
 return Response.json({...premium.status(db,guildId,s.userId),isOperator:String(process.env.PREMIUM_ADMIN_DISCORD_IDS||'').split(',').map(x=>x.trim()).includes(String(s.userId))});
});
export const POST=guarded(async req=>{
 const body=await req.json(),db=await readDb(),guildId=await activeGuild(),s=await session();let result;
 if(body.action==='request')result=premium.requestPayment(db,guildId,s.userId,String(body.product||''),String(body.billing||''));
 else if(body.action==='redeem')result=premium.redeem(db,guildId,s.userId,String(body.code||''));
 else if(body.action==='generate'){premium.operator(s.userId);result=premium.generateCode(db,s.userId,String(body.product||''),String(body.billing||''));}
 else if(body.action==='approve'){premium.operator(s.userId);result=premium.approvePayment(db,s.userId,String(body.id||''));}
 else throw new Error('Action Premium invalide.');
 await writeDb(db);return Response.json(result);
});
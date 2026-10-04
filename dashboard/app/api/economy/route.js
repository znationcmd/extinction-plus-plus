import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {readDb,writeDb} from '../../../lib/db';
import economy from '../../../lib/economy.cjs';
export const GET=guarded(async()=>{const db=await readDb();return Response.json({accounts:db.bank?.accounts||[],transactions:db.economy?.transactions||[]});});
export const POST=guarded(async req=>{const {userId,amount,reason}=await req.json();if(typeof reason!=='string'||!reason.trim()||reason.length>500)throw new Error('Motif requis (500 caractères maximum).');const db=await readDb(),guildId=await activeGuild();const result=economy.credit(db,guildId,userId,amount,reason);await writeDb(db);return Response.json({ok:true,account:result});});

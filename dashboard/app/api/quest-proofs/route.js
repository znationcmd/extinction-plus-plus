import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {session} from '../../../lib/mod-auth';
import {readDb,writeDb} from '../../../lib/db';
import economy from '../../../lib/economy.cjs';
export const GET=guarded(async()=>Response.json((await readDb()).questProofs||[]));
export const POST=guarded(async req=>{const {proofId,decision}=await req.json(),id=await activeGuild(),db=await readDb();const proof=economy.reviewProof(db,id,proofId,decision,(await session()).userId);await writeDb(db);return Response.json({ok:true,proof});});

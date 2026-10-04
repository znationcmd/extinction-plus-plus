import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {readDb} from '../../../lib/db';
import {allServers} from '../../../lib/servers';
export const GET=guarded(async()=>{const db=await readDb();return Response.json({servers:allServers(db,await activeGuild()).length,kills:(db.events||[]).filter(e=>e.type==='kill').length,orders:(db.shopPurchases||[]).length,deliveries:(db.deliveries||[]).length,whitelist:(db.pendingWhitelist||[]).length,quests:(db.quests||[]).length});});

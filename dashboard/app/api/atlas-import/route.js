import {readDb,writeDb} from '../../../lib/db';
import {activeGuild,guarded} from '../../../lib/dashboard-auth';
import atlas from '../../../lib/atlas.cjs';
export const POST=guarded(async req=>{const b=await req.json(),gid=await activeGuild(),db=await readDb();let count=0;if(b.action==='publish'){const map=atlas.terrain(db,b.mapId,gid);if(!map)throw new Error('Carte introuvable.');for(const e of db.atlasEntries||[])if(e.guildId===gid&&e.mapId===map.id){atlas.validate({...e,public:true},db,gid);e.public=true;count++;}}else count=atlas.bulk(db,gid,b.mapId,b.rows);await writeDb(db);return Response.json({ok:true,count});});

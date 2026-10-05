import appStore from '../../../../lib/app-store.cjs';
import {dbPath} from '../../../../lib/db';
import atlas from '../../../../lib/atlas.cjs';
export async function GET(req){const q=new URL(req.url).searchParams,game=q.get('game'),gid=q.get('guildId');if(!atlas.families.includes(game)||gid&&!/^\d{15,22}$/.test(gid))return Response.json({error:'Rubrique ou Discord invalide.'},{status:400});try{return Response.json(atlas.publicView(await appStore.read(dbPath()),game,gid),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Explorateur temporairement indisponible.'},{status:503});}}

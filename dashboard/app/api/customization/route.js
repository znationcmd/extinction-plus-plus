import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {readDb,writeDb} from '../../../lib/db';
import {clean} from '../../../lib/collection-route';
export const GET=guarded(async()=>{const id=await activeGuild(),db=await readDb();return Response.json(db.guilds[id]?.theme||{});});
export const POST=guarded(async req=>{const {theme}=await req.json(),id=await activeGuild(),db=await readDb();const t=clean(theme,{serverName:'string',logoUrl:'string',bannerUrl:'string',primaryColor:'string',secondaryColor:'string',buttonColor:'string',embedColor:'string',backgroundColor:'string'});for(const [key,value] of Object.entries(t)){if(key.endsWith('Color')&&!/^#[a-fA-F0-9]{6}$/.test(value))throw new Error('Couleur hexadécimale requise.');if(key.endsWith('Url')&&value&&!value.startsWith('/')&&!value.startsWith('https://'))throw new Error('Image HTTPS requise.');}db.guilds[id]||={id,servers:[],shop:[]};db.guilds[id].theme=t;await writeDb(db);return Response.json({ok:true});});

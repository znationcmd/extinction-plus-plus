import {playerRoute} from '../../../../../lib/group-auth';
import {withGroup} from '../../../../../lib/group-store';
import appStore from '../../../../../lib/app-store.cjs';
import {dbPath} from '../../../../../lib/db';
import groups from '../../../../../lib/map-groups.cjs';
import publicView from '../../../../../lib/public-maps.cjs';
async function terrain(){return publicView.publicMaps(await appStore.read(dbPath())).maps;}
export const GET=playerRoute(async(req,ctx,user)=>{const {id}=await ctx.params;const maps=await terrain();return Response.json(await withGroup(id,group=>{groups.member(group,user);return {maps,pins:group.pins.filter(p=>maps.some(m=>m.id===p.mapId)),servers:[],groupName:group.name};}));});
async function mutate(req,ctx,user,body){const {id}=await ctx.params;const map=(await terrain()).find(m=>m.id===body.mapId);if(!map)throw Object.assign(new Error('Carte publique introuvable.'),{status:404});return Response.json(await withGroup(id,group=>{groups.pin(group,user,map,body,req.method);return {ok:true};}));}
export const POST=playerRoute(mutate),PATCH=playerRoute(mutate),DELETE=playerRoute(mutate);

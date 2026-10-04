import {playerRoute} from '../../../../lib/group-auth';
import {withGroup} from '../../../../lib/group-store';
import groups from '../../../../lib/map-groups.cjs';
export const PATCH=playerRoute(async(req,ctx,user,body)=>{const {id}=await ctx.params;return Response.json(await withGroup(id,group=>{if(body.action==='invite')return {token:groups.invite(group,user)};groups.change(group,user,body);return {ok:true};}));});

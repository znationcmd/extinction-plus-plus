import {playerRoute} from '../../../lib/group-auth';
import {listGroups,createGroup,withGroup} from '../../../lib/group-store';
import groups from '../../../lib/map-groups.cjs';
export const GET=playerRoute(async(req,ctx,user)=>Response.json({user:{id:user.userId,name:user.name},groups:(await listGroups(user.userId)).map(groups.safe)}));
export const POST=playerRoute(async(req,ctx,user,body)=>{
  if(body.action==='join'){const result=await withGroup(null,group=>{groups.join(group,user,body.token);return groups.safe(group);},groups.hash(body.token));return Response.json(result);}
  return Response.json(groups.safe(await createGroup(groups.create(user,body.name))));
});

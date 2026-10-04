import {collection,common} from '../../../lib/collection-route';
import quests from '../../../lib/quests.cjs';
import multigame from '../../../lib/multigame.cjs';
export const {GET,POST,PATCH,DELETE}=collection('quests',{...common,title:'string',objective:'string',type:'string',eventType:'string',target:'integer',reward:'integer',xp:'integer'},{validate:(q,db,gid)=>{quests.validate(q);multigame.validate(q,db,gid);}});

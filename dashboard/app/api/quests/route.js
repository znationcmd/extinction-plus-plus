import {collection,common} from '../../../lib/collection-route';
export const {GET,POST,PATCH,DELETE}=collection('quests',{...common,title:'string',objective:'string',type:'string',reward:'integer',xp:'integer'});

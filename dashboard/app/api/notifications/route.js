import {collection,common} from '../../../lib/collection-route';
export const {GET,POST,PATCH,DELETE}=collection('notifications',{...common,message:'string',read:'boolean'});

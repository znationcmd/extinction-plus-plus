import {collection,common} from '../../../lib/collection-route';
export const {GET,POST,PATCH,DELETE}=collection('tickets',{...common,userId:'string',subject:'string',message:'string',status:'string'});

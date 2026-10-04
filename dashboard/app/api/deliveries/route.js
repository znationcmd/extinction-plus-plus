import {collection,common} from '../../../lib/collection-route';
export const {GET,POST,PATCH,DELETE}=collection('deliveries',{...common,userId:'string',itemName:'string',status:'string',x:'number',z:'number'});

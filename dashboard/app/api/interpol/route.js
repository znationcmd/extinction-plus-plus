import {collection,common} from '../../../lib/collection-route';
export const {GET,POST,PATCH,DELETE}=collection('interpol',{...common,player:'string',reason:'string',status:'string',reporter:'string'});

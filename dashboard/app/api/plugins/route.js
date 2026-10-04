import {collection,common} from '../../../lib/collection-route';
export const {GET,POST,PATCH,DELETE}=collection('plugins',{...common,url:'string'});

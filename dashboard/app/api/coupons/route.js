import {collection,common} from '../../../lib/collection-route';
export const {GET,POST,PATCH,DELETE}=collection('coupons',{...common,code:'string',discount:'number',expiresAt:'string'});

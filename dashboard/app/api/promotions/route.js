import {collection,common} from '../../../lib/collection-route';
export const {GET,POST,PATCH,DELETE}=collection('promotions',{...common,discount:'number',startsAt:'string',expiresAt:'string'});

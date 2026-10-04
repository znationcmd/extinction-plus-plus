import {collection,common} from '../../../lib/collection-route';
export const {GET,POST,PATCH,DELETE}=collection('alarms',{...common,x:'number',z:'number',radius:'number',allowed:'strings',autoBan:'boolean'});

import {collection,common} from '../../../lib/collection-route';
export const {GET,POST,PATCH,DELETE}=collection('shop',{...common,price:'integer',category:'string',type:'string',blueprint:'string',server:'string',map:'string',hidden:'boolean'},{guildShop:true});

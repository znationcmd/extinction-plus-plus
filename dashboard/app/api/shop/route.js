import {collection,common} from '../../../lib/collection-route';
import multigame from '../../../lib/multigame.cjs';
export const {GET,POST,PATCH,DELETE}=collection('shop',{...common,price:'integer',category:'string',type:'string',blueprint:'string',server:'string',map:'string',hidden:'boolean',deliveryMode:'string',className:'string',quantity:'integer'},{guildShop:true,validate:multigame.shop});

import {collection} from '../../../lib/collection-route';
import atlas from '../../../lib/atlas.cjs';
export const {GET,POST,PATCH,DELETE}=collection('atlasEntries',{element:'string',drops:'string',diet:'string',rarity:'string',name:'string',mapId:'string',kind:'string',category:'string',x:'numberSigned',z:'numberSigned',conditions:'string',notes:'string',sourceUrl:'string',public:'boolean'},{validate:(row,db,gid)=>{Object.assign(row,atlas.validate(row,db,gid));}});

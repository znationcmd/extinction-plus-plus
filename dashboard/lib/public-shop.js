import appStore from './app-store.cjs';
import {dbPath} from './db';
export async function publicShop(guildId){if(!/^\d{15,22}$/.test(guildId||''))return [];const db=await appStore.read(dbPath());return (db.guilds?.[guildId]?.shop||[]).filter(i=>!i.hidden&&i.enabled!==false).map(i=>({id:i.id,name:i.name,price:i.price,game:i.game,map:i.map,server:i.server,category:i.category}));}

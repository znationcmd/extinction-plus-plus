const path=require('node:path');
const crypto=require('node:crypto');
const live=require('../dashboard/lib/live-events.cjs');
const files=require('./game-files');
const appStore=require('../dashboard/lib/app-store.cjs');
const rcon=require('./rcon-tools');
function configKey(s){return live.digest(JSON.stringify([s.logPath,s.logDirectory,s.ftpHost,s.ftpUser,s.nitradoId,s.nitradoServiceId]));}
function locate(db,s){return db.guilds?.[s.guildId]?.servers?.find(x=>x.id===s.id)||db.connectedServers?.find(x=>x.guildId===s.guildId&&x.id===s.id);}
function state(db,s,value){const own=locate(db,s);if(own)own.liveState=value;for(const copy of db.connectedServers||[])if(copy.guildId===s.guildId&&copy.id===s.id)copy.liveState=value;}
async function poll({server,loadDb,saveDb,connect=files.connect,download=files.download}){
 const db=await loadDb();const own=locate(db,server);if(!own||own.enabled===false||!own.liveEnabled)return;
 live.validate({...own,guildId:server.guildId});const key=configKey(own);const previous=own.liveState||{};
 if((db.liveAlerts||[]).filter(a=>!a.sentAt&&a.guildId===server.guildId&&a.serverId===server.id).length>=1000)throw new Error('Trop d’alertes en attente : vérifie les salons Discord.');
 const ftp=await connect(db,{...own,guildId:server.guildId});
 try{let file=own.logPath;
 if(!file){const entries=(await ftp.list(own.logDirectory)).filter(f=>f.isFile&&/\.adm$/i.test(f.name)).sort((a,b)=>(b.modifiedAt?.getTime()||0)-(a.modifiedAt?.getTime()||0)||b.name.localeCompare(a.name));if(!entries.length)throw new Error('Aucun fichier ADM dans le dossier configuré.');file=path.posix.join(own.logDirectory,entries[0].name);}
 const size=await ftp.size(file);if(!Number.isSafeInteger(size)||size<0)throw new Error('Taille du log invalide.');
 const first=!previous.initialized||previous.configKey!==key;
 const rotated=previous.file!==file||size<Number(previous.offset||0);
 const generation=first||rotated?crypto.randomUUID():previous.generation;
 const offset=first?size:rotated?0:Number(previous.offset||0);
 let next={...previous,initialized:true,configKey:key,file,generation,offset,carry:first||rotated?'':previous.carry||'',checkedAt:new Date().toISOString(),status:'connected',failures:0,error:null};
 if(size>offset){const buffer=await download(ftp,file,offset);const split=live.split(buffer,next.carry);let n=0;const entries=split.lines.map(line=>({id:live.digest(`${server.guildId}:${server.id}:${file}:${generation}:${offset}:${n++}:${line}`),event:live.parse(line)})).filter(x=>x.event);live.apply(db,{...own,guildId:server.guildId},entries);next.offset=offset+buffer.length;next.carry=split.carry;next.lastEventAt=entries.length?new Date().toISOString():previous.lastEventAt;next.eventsRead=(previous.eventsRead||0)+entries.length;}
 if(previous.failures>=3&&own.feedChannelId)(db.liveAlerts||=[]).push({id:crypto.randomUUID(),guildId:server.guildId,serverId:server.id,channelId:own.feedChannelId,content:`🟢 Lecture des logs rétablie : ${own.name}`,createdAt:next.checkedAt});
 state(db,server,next);await saveDb(db);return next;
 }finally{ftp.close();}
}
async function failure({server,loadDb,saveDb}){const db=await loadDb(),own=locate(db,server);if(!own||!own.liveEnabled)return;const previous=own.liveState||{},failures=(previous.failures||0)+1;const next={...previous,failures,status:'error',checkedAt:new Date().toISOString(),error:'Lecture indisponible. Vérifie FTP, chemin ADM et permissions des salons. Les événements reprennent à la dernière lecture sauvegardée.'};if(failures===3&&own.feedChannelId)(db.liveAlerts||=[]).push({id:crypto.randomUUID(),guildId:server.guildId,serverId:server.id,channelId:own.feedChannelId,content:`⚠️ Lecture des logs indisponible : ${own.name}. Vérifie la configuration dans Serveurs.`,createdAt:next.checkedAt});state(db,server,next);await saveDb(db);}
async function deliver({client,loadDb,saveDb}){
 let db=await loadDb();const ids=(db.liveAlerts||[]).filter(a=>!a.sentAt&&(!a.retryAt||Date.parse(a.retryAt)<=Date.now())).slice(0,30).map(a=>a.id);
 for(const id of ids){db=await loadDb();const alert=db.liveAlerts?.find(a=>a.id===id&&!a.sentAt);if(!alert)continue;
 try{const channel=await client.channels.fetch(alert.channelId);if(channel?.guildId!==alert.guildId||!channel.isTextBased()||!channel.send)throw new Error('Salon inaccessible.');await channel.send({content:alert.content.slice(0,1900),allowedMentions:{parse:[]},nonce:live.digest(alert.id).slice(0,24),enforceNonce:true});alert.sentAt=new Date().toISOString();delete alert.error;}
 catch(e){alert.attempts=(alert.attempts||0)+1;alert.error='Envoi Discord indisponible. Vérifie le salon et les permissions du bot.';alert.retryAt=new Date(Date.now()+Math.min(300000,15000*2**Math.min(alert.attempts,5))).toISOString();}
 await saveDb(db);
 }
}
function start({client,loadDb,saveDb}){let busy=false;
 async function tick(){if(busy)return;busy=true;let lock;
 try{if(process.env.DATABASE_URL){lock=await(await appStore.ready()).connect();if(!(await lock.query('SELECT pg_try_advisory_lock(221100,1704) AS locked')).rows[0].locked)return;}
 const db=await loadDb();for(const gid of Object.keys(db.guilds||{}))for(const server of rcon.getAllServers(db,gid)){if(server.enabled===false||(!server.liveEnabled&&!server.monitorEnabled))continue;const options={server:{...server,guildId:gid},loadDb,saveDb};if(server.liveEnabled)try{await poll(options);}catch(e){await failure(options).catch(()=>{});}
 if(server.monitorEnabled)await require('./server-monitor').poll(options).catch(()=>{});}
 await require('./operations-worker').tick({loadDb,saveDb});
 await deliver({client,loadDb,saveDb});
 }catch(e){console.error('Événements automatiques : service indisponible.');}finally{if(lock){await lock.query('SELECT pg_advisory_unlock(221100,1704)').catch(()=>{});lock.release();}busy=false;}}
 tick();const timer=setInterval(tick,30000);timer.unref();return timer;
}
module.exports={start,poll,failure,deliver,configKey,locate,state};

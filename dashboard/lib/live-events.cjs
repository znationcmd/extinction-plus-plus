const crypto=require('node:crypto');
const games=require('./games.cjs');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const dayz=s=>games.normalize(s.game,s.platform).startsWith('dayz_');
function remotePath(value){return typeof value==='string'&&value.startsWith('/')&&!/[\r\n\0\\]/.test(value)&&!value.split('/').some(x=>x==='.'||x==='..');}
function validate(server){
 if(server.ftpPort&&(!Number.isInteger(server.ftpPort)||server.ftpPort<1||server.ftpPort>65535))throw new Error('Port FTP de 1 à 65535 requis.');
 for(const key of ['logPath','logDirectory','whitelistPath','banPath'])if(server[key]&&!remotePath(server[key]))throw new Error(`${key} : chemin FTP absolu requis, sans . ni ...`);
 for(const key of ['feedChannelId','alarmChannelId','monitorChannelId'])if(server[key]&&!/^\d{15,22}$/.test(server[key]))throw new Error('ID du salon Discord invalide.');
 if(server.liveEnabled){if(!dayz(server))throw new Error('La lecture ADM automatique est disponible pour DayZ.');if(!server.logPath&&!server.logDirectory)throw new Error('Fichier ADM ou dossier des logs requis.');if(!server.feedChannelId)throw new Error('Salon du killfeed requis.');}
 if(server.whitelistEnabled&&server.whitelistPath&&!dayz(server))throw new Error('La synchronisation de whitelist par fichier est disponible pour DayZ.');
 if(server.banFormat&&!['uid','gamertag'].includes(server.banFormat))throw new Error('Format bans invalide.');
 if(server.whitelistFormat&&!['uid','gamertag'].includes(server.whitelistFormat))throw new Error('Format whitelist invalide.');
 return server;
}
// ADM coordinates are printed as horizontal X,Z followed by altitude, not engine X,Y,Z.
function actors(line){const out=[];const re=/(?:Player\s+)?"([^"\r\n]*)"\s*\(id=([^,\s)]+)(?:,?\s*pos=<(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+)>)?[^)]*\)/g;let m;while((m=re.exec(line)))out.push({name:m[1],uid:m[2],...(m[3]!==undefined?{x:Number(m[3]),z:Number(m[4])}:{})});return out;}
function parse(line){
 const timestamp=line.match(/^(\d{2}:\d{2}:\d{2})\s*\|?\s*/)?.[1];
 const a=actors(line);let type;
 if(/Chat\(/.test(line)&&a.length)return {type:'chat',logTime:timestamp,player:a[0].name,playerUid:a[0].uid,actors:a,message:line.match(/\)\):\s*(.*)$/)?.[1]||''};
 if(/\bkilled by\b/.test(line)&&a.length)type='kill';
 else if(/\bcommitted suicide\b/.test(line)&&a.length)type='suicide';
 else if(/\bhas been disconnected\b/.test(line)&&a.length)type='disconnect';
 else if(/\bis connected\b/.test(line)){type='connect';if(!a.length){const m=line.match(/Player "([^"\r\n]+)" is connected \(id=([^\s)]+)\)/);if(m)a.push({name:m[1],uid:m[2]});}}
 else if(/\bdied\b/.test(line)&&a.length)type='death';
 else if(a.length===1&&a[0].x!==undefined&&/^\d{2}:\d{2}:\d{2}\s*\|?\s*Player "[^"\r\n]*"\s*\(id=[^)]*\)\s*$/.test(line))type='position';
 if(!type||!a.length||a.some(p=>!p.name||!p.uid))return null;
 const distance=line.match(/\bfrom ([\d.]+) meters/),weapon=line.match(/\bwith (.+?)(?: from [\d.]+ meters|$)/);
 return {type,logTime:timestamp,player:a[0].name,playerUid:a[0].uid,actors:a,...(type==='kill'?{victim:a[0].name,killer:a[1]?.name||line.match(/killed by (.+?)(?: with |$)/)?.[1]||'Environnement',killerUid:a[1]?.uid||'',weapon:weapon?.[1]||'',distance:distance?Number(distance[1]):undefined}:{})};
}
function split(buffer,carry=''){const data=Buffer.concat([Buffer.from(carry,'base64'),buffer]);const end=data.lastIndexOf(10);if(end<0){if(data.length>65536)throw new Error('Ligne ADM trop longue.');return {lines:[],carry:data.toString('base64')};}const tail=data.subarray(end+1);if(tail.length>65536)throw new Error('Ligne ADM trop longue.');return {lines:data.subarray(0,end).toString('utf8').split('\n').map(x=>x.replace(/\r$/,'')),carry:tail.toString('base64')};}
function message(event){if(event.type==='chat')return `💬 ${event.player} : ${event.message}`;if(event.type==='kill')return `☠️ ${event.killer} → ${event.victim} • ${event.weapon||'Arme inconnue'}${event.distance!==undefined?` • ${event.distance} m`:''}`;const label={connect:'🟢 Connexion / apparition',disconnect:'🔴 Déconnexion',death:'☠️ Mort',suicide:'☠️ Suicide'};return `${label[event.type]||event.type} : ${event.player}`;}
function apply(db,server,entries,now=new Date().toISOString()){
 db.events||=[];db.livePlayers||=[];db.liveAlerts||=[];
 const seen=new Set(db.events.map(e=>e.id));const gid=server.guildId;let count=0;
 for(const {id,event} of entries){if(seen.has(id))continue;seen.add(id);count++;
 if(event.type==='chat'){const link=(db.playerLinks||[]).find(l=>l.guildId===gid&&l.serverId===server.id&&l.uid===event.playerUid&&!l.verified&&l.challenge===event.message.trim()&&Date.parse(l.challengeExpiresAt)>Date.parse(now));if(link){link.verified=true;link.verifiedBy='game_chat';link.verifiedAt=now;link.name=event.player;delete link.challenge;delete link.challengeExpiresAt;continue;}if(event.message.startsWith('EXT-')||server.relayChat!==true)continue;}
 const saved={...event,id,guildId:gid,serverId:server.id,server:server.name,game:server.game,source:event.source==='game_bridge'?'game_bridge':'dayz_adm',createdAt:now};
 db.events.push(saved);
 if(['disconnect','kill','death','suicide'].includes(event.type))for(const alarm of db.alarms||[])if(alarm.guildId===gid&&[server.id,server.name].includes(alarm.serverId))delete alarm.liveOccupants?.[event.playerUid];
 require('./game-operations.cjs').processEvent(db,server,saved,now);
 require('./quests.cjs').processEvent(db,server,saved,now);
 for(const actor of event.actors){let player=db.livePlayers.find(p=>p.guildId===gid&&p.serverId===server.id&&p.uid===actor.uid);if(!player){player={id:digest(`${gid}:${server.id}:${actor.uid}`),guildId:gid,serverId:server.id,uid:actor.uid,name:actor.name,kills:0,deaths:0};db.livePlayers.push(player);}player.name=actor.name;player.lastSeen=now;if(actor.x!==undefined){player.x=actor.x;player.z=actor.z;}if(['disconnect','kill','death','suicide'].includes(event.type)&&actor.uid===event.playerUid)player.online=false;else player.online=true;
 if(event.type==='kill'&&actor.uid===event.killerUid)player.kills++;
 if(['kill','death','suicide'].includes(event.type)&&actor.uid===event.playerUid)player.deaths++;
 if(['kill','death','suicide','disconnect'].includes(event.type)&&actor.uid===event.playerUid)continue;
 if(!Number.isFinite(actor.x)||!Number.isFinite(actor.z))continue;
 for(const alarm of db.alarms||[]){if(alarm.guildId!==gid||alarm.enabled===false||![server.id,server.name].includes(alarm.serverId))continue;
 if(!Number.isFinite(alarm.x)||!Number.isFinite(alarm.z)||!(alarm.radius>0))continue;
 alarm.liveOccupants||={};const allowed=(alarm.allowed||[]).some(v=>v===actor.uid||v.toLowerCase()===actor.name.toLowerCase());const inside=Math.hypot(actor.x-alarm.x,actor.z-alarm.z)<=alarm.radius&&!allowed;
 if(inside&&!alarm.liveOccupants[actor.uid]){
 if(alarm.autoBan===true&&server.banPath)(db.gameActions||=[]).push({id:digest(`${id}:${alarm.id}:${actor.uid}:ban`),guildId:gid,serverId:server.id,kind:'ban',playerUid:actor.uid,playerName:actor.name,status:'queued',reason:`Zone ${alarm.name}`,createdAt:now});
 db.liveAlerts.push({id:digest(`${id}:${alarm.id}:${actor.uid}`),guildId:gid,serverId:server.id,channelId:server.alarmChannelId||server.feedChannelId,content:`🚨 ${alarm.name} — ${actor.name} détecté à X ${actor.x}, Z ${actor.z} sur ${server.name}.`,createdAt:now});alarm.lastTriggeredAt=now;}
 if(inside)alarm.liveOccupants[actor.uid]=now;else delete alarm.liveOccupants[actor.uid];
 }
 }
 if(event.type!=='position'&&server.feedChannelId)db.liveAlerts.push({id:digest(`${id}:feed`),guildId:gid,serverId:server.id,channelId:server.feedChannelId,content:`${server.name} • ${event.logTime||''}\n${message(event)}`,createdAt:now});
 }
 db.events=db.events.slice(-10000);
 db.liveAlerts=db.liveAlerts.filter(a=>!a.sentAt||Date.parse(a.sentAt)>Date.parse(now)-86400000);
 return count;
}
function whitelistEntry(server,pseudo,players=[]){const format=server.whitelistFormat||(games.normalize(server.game,server.platform)==='dayz_pc'?'uid':'gamertag');let value=String(pseudo||'').trim();if(format==='uid'){if(!/^[A-Za-z0-9_+\/-]{43}=$/.test(value)){const candidates=players.filter(p=>p.guildId===server.guildId&&p.serverId===server.id&&p.name.toLowerCase()===value.toLowerCase());if(candidates.length!==1)throw new Error('UID DayZ de 44 caractères requis, ou pseudo unique déjà observé dans les logs.');value=candidates[0].uid;}if(!/^[A-Za-z0-9_+\/-]{43}=$/.test(value))throw new Error('UID DayZ invalide : copie l’UID de 44 caractères des logs, pas le SteamID.');}else if(!value||value.length>64||/[\r\n\0]/.test(value))throw new Error('Gamertag invalide.');return value;}
module.exports={digest,dayz,validate,remotePath,actors,parse,split,apply,message,whitelistEntry};

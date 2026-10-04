const crypto=require('node:crypto');
const panel=require('../dashboard/lib/panel-api.cjs');
const rcon=require('./rcon-tools');
const logWorker=require('./game-log-worker');
async function check(db,s,deps={}){if(panel.configured(s))return(deps.panelStatus||panel.status)(db,s);const command=s.game==='dayz_pc'||s.rconProtocol==='battleye'?'players':s.game==='ark'?'ListPlayers':s.game==='palworld'?'ShowPlayers':null;if(!command)throw new Error('Connecteur de surveillance indisponible pour ce jeu.');await(deps.rcon||rcon.send)(s,command);return {status:'rcon_reachable',source:'rcon'};}
async function poll({server,loadDb,saveDb,probe=check,now=Date.now()}){const db=await loadDb(),s=logWorker.locate(db,server);if(!s||!s.monitorEnabled||s.enabled===false||Date.parse(s.monitorState?.checkedAt||'1970-01-01')>now-60000)return;const before=s.monitorState||{};let next;try{const result=await probe(db,{...s,guildId:server.guildId});next={...result,checkedAt:new Date(now).toISOString(),failures:0,error:null};}catch(e){next={...before,status:'unreachable',checkedAt:new Date(now).toISOString(),failures:(before.failures||0)+1,error:'La connexion de surveillance ne répond pas. Vérifie les accès API / RCON. Cela ne prouve pas à lui seul une panne du jeu.'};}
 const channel=s.monitorChannelId||s.feedChannelId;const down=next.status==='unreachable'&&next.failures===3||before.status==='started'&&next.status==='stopped'||before.status==='running'&&next.status==='offline';const recovered=before.failures>=3&&next.failures===0;
 if(channel&&(down||recovered))(db.liveAlerts||=[]).push({id:crypto.randomUUID(),guildId:server.guildId,serverId:server.id,channelId:channel,content:`${recovered?'🟢 Surveillance rétablie':'⚠️ État serveur à vérifier'} : ${s.name} — ${next.status}`,createdAt:next.checkedAt});
 s.monitorState=next;for(const copy of db.connectedServers||[])if(copy.guildId===server.guildId&&copy.id===server.id)copy.monitorState=next;await saveDb(db);return next;
}
module.exports={check,poll};

function leaderboard(db){
 const rows=new Map();
 function row(id,name=id){if(!rows.has(id))rows.set(id,{id,player:name,kills:0,deaths:0,bank:0,xp:0,score:0});return rows.get(id);}
 for(const p of db.livePlayers||[]){const link=(db.playerLinks||[]).find(l=>l.guildId===p.guildId&&l.serverId===p.serverId&&l.uid===p.uid&&l.verified);const r=row(link?.userId||`${p.serverId}:${p.uid}`,p.name);r.kills+=p.kills||0;r.deaths+=p.deaths||0;}
 for(const e of db.events||[]){if(e.type!=='kill'||['dayz_adm','game_bridge'].includes(e.source))continue;if(e.killer)row(e.killer).kills++;if(e.victim)row(e.victim).deaths++;}
 for(const a of db.bank?.accounts||[])row(a.userId).bank=a.bank||0;
 for(const g of Object.values(db.guilds||{}))for(const [id,p] of Object.entries(g.progress||{}))row(id).xp=p.xp||0;
 for(const r of rows.values()){r.score=r.kills;r.kd=r.deaths?r.kills/r.deaths:r.kills;}
 return [...rows.values()].sort((a,b)=>b.score-a.score||b.xp-a.xp||b.bank-a.bank);
}
module.exports={leaderboard};

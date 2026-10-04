const jobs=require('../dashboard/lib/bot-jobs.cjs');
const rcon=require('./rcon-tools');
const access=require('../dashboard/lib/dayz-mod-store.cjs');
function start({client,loadDb,saveDb}){
  if(!process.env.DATABASE_URL)return;
  let busy=false;
  async function tick(){if(busy)return;busy=true;let lock;
    try{const p=await jobs.ready();lock=await p.connect();if(!(await lock.query('SELECT pg_try_advisory_lock(221100,1702) AS locked')).rows[0].locked)return;
      await lock.query("UPDATE extinction_bot_jobs SET status='uncertain',result='Bot interrompu. Vérifie le serveur avant une nouvelle commande.',updated_at=NOW() WHERE status='running'");
      const {rows}=await lock.query("UPDATE extinction_bot_jobs SET status='running',updated_at=NOW() WHERE id=(SELECT id FROM extinction_bot_jobs WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *");
      for(const job of rows){try{const db=await loadDb();let result;
        const guild=await client.guilds.fetch(job.guild_id);
        const member=await guild.members.fetch(job.actor_id);
        const roles=(await(await access.ready()).query('SELECT role_ids FROM dayz_mod_access WHERE guild_id=$1',[job.guild_id])).rows[0]?.role_ids||[];
        if(!access.allowed(guild.ownerId===job.actor_id,[...member.roles.cache.keys()],roles))throw new Error('Les droits du demandeur ont été retirés.');
        if(job.kind==='rcon'){const server=rcon.findServer(db,job.guild_id,job.payload.serverId);if(!server)throw new Error('Serveur introuvable.');result=await rcon.send(server,job.payload.command);}
        else if(job.kind==='whitelist'){const row=(db.pendingWhitelist||[]).find(r=>r.id===job.payload.requestId&&r.guildId===job.guild_id);if(!row)throw new Error('Demande introuvable.');if(job.payload.decision==='approve'){const guild=await client.guilds.fetch(job.guild_id),member=await guild.members.fetch(row.userId),role=db.guilds[job.guild_id]?.roles?.whitelist;if(!role)throw new Error('Rôle whitelist absent. Lance /setup.');await member.roles.add(role);row.status='approved_discord';result='Rôle Discord attribué. L’accès en jeu doit être configuré chez l’hébergeur.';}else{row.status='rejected';result='Demande refusée.';}row.reviewedBy=job.actor_id;row.reviewedAt=new Date().toISOString();await saveDb(db);}
        else throw new Error('Action inconnue.');
        await lock.query("UPDATE extinction_bot_jobs SET status='succeeded',result=$2,updated_at=NOW() WHERE id=$1",[job.id,String(result||'Commande acquittée.').slice(0,8000)]);
      }catch(e){await lock.query("UPDATE extinction_bot_jobs SET status=$3,result=$2,updated_at=NOW() WHERE id=$1",[job.id,String(e.message).slice(0,1000),job.kind==='rcon'?'uncertain':'failed']);}}
    }catch(e){console.error('File du bot : opération indisponible.');}finally{if(lock){await lock.query('SELECT pg_advisory_unlock(221100,1702)').catch(()=>{});lock.release();}busy=false;}}
  tick();const timer=setInterval(tick,5000);timer.unref();
}
module.exports={start};

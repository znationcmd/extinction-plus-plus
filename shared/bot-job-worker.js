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
        else if(job.kind==='whitelist'){
          const row=(db.pendingWhitelist||[]).find(r=>r.id===job.payload.requestId&&r.guildId===job.guild_id);
          if(!row)throw new Error('Demande introuvable.');
          if(job.payload.decision==='approve'){
            if(row.status==='rejected')throw new Error('Cette demande a été refusée.');
            const target=await guild.members.fetch(row.userId),role=db.guilds[job.guild_id]?.roles?.whitelist;
            if(!role)throw new Error('Rôle whitelist absent. Lance /setup.');
            await target.roles.add(role);row.discordApprovedAt=new Date().toISOString();
            const server=rcon.findServer(db,job.guild_id,row.serverId||row.server);
            if(server?.whitelistEnabled&&server.whitelistPath){
              try{row.gameEntry=await require('./game-files').whitelist(db,{...server,guildId:job.guild_id},row.pseudo);row.status='approved_file';row.gameSyncedAt=new Date().toISOString();row.syncError=null;result='Rôle Discord attribué et entrée vérifiée dans le fichier whitelist. Active la whitelist du jeu et recharge-la ou redémarre le serveur depuis son panel si nécessaire.';}
              catch(e){row.status='game_sync_failed';row.syncError='Synchronisation du jeu impossible. Vérifie UID/pseudo, chemin whitelist et accès FTP.';await saveDb(db);throw new Error('Rôle Discord attribué, mais synchronisation du jeu échouée. Vérifie la configuration et relance la validation.');}
            }else{row.status='approved_discord';result='Rôle Discord attribué. Configure le chemin FTP de la whitelist dans Serveurs pour ajouter aussi le joueur en jeu.';}
          }else{if(row.discordApprovedAt||row.status?.startsWith('approved'))throw new Error('Validation déjà effectuée. Retire les accès Discord et jeu explicitement pour révoquer ce joueur.');row.status='rejected';result='Demande refusée.';}
          row.reviewedBy=job.actor_id;row.reviewedAt=new Date().toISOString();await saveDb(db);
        }
        else if(job.kind==='cftools'){const server=rcon.findServer(db,job.guild_id,job.payload.serverId);if(!server||server.enabled===false)throw new Error('Serveur introuvable ou désactivé.');result=await require('../dashboard/lib/external-admin.cjs').cfExecute({...server,guildId:job.guild_id},job.payload);}
        else if(job.kind==='restart_recover'){const server=rcon.findServer(db,job.guild_id,job.payload.serverId);if(!server)throw new Error('Serveur introuvable.');result=await require('./restart-shop-worker').recover({db,server:{...server,guildId:job.guild_id},...job.payload,actorId:job.actor_id,saveDb});}
        else if(job.kind==='power'){const server=rcon.findServer(db,job.guild_id,job.payload.serverId);if(!server||server.enabled===false)throw new Error('Serveur introuvable ou désactivé.');result=await require('./restart-shop-worker').power({db,server:{...server,guildId:job.guild_id},action:job.payload.action,actorId:job.actor_id,saveDb});}
        else if(job.kind==='ticket'){
          const row=db.tickets?.find(t=>t.id===job.payload.ticketId&&t.guildId===job.guild_id);
          if(!row?.channelId)throw new Error('Ticket Discord introuvable.');
          const channel=await guild.channels.fetch(row.channelId);if(!channel?.isTextBased())throw new Error('Salon du ticket introuvable.');
          if(job.payload.action==='reply'){
            if(row.status!=='open')throw new Error('Ticket fermé.');
            await channel.send({content:`Staff : ${job.payload.message}`,allowedMentions:{parse:[]},nonce:job.id.replace(/-/g,'').slice(0,24),enforceNonce:true});
            row.messages||=[];row.messages.push({id:job.id,userId:job.actor_id,message:job.payload.message,createdAt:new Date().toISOString()});result='Réponse envoyée au ticket Discord.';
          }else if(job.payload.action==='close'||job.payload.action==='reopen'){
            const open=job.payload.action==='reopen';await channel.permissionOverwrites.edit(row.userId,{SendMessages:open});row.status=open?'open':'closed';row.updatedAt=new Date().toISOString();result=open?'Ticket rouvert.':'Ticket fermé ; historique conservé.';
          }else throw new Error('Action ticket inconnue.');
          await saveDb(db);
        }
        else throw new Error('Action inconnue.');
        await lock.query("UPDATE extinction_bot_jobs SET status='succeeded',result=$2,updated_at=NOW() WHERE id=$1",[job.id,String(result||'Commande acquittée.').slice(0,8000)]);
      }catch(e){await lock.query("UPDATE extinction_bot_jobs SET status=$3,result=$2,updated_at=NOW() WHERE id=$1",[job.id,String(e.message).slice(0,1000),['rcon','power','ticket','cftools','restart_recover'].includes(job.kind)?'uncertain':'failed']);}}
    }catch(e){console.error('File du bot : opération indisponible.');}finally{if(lock){await lock.query('SELECT pg_advisory_unlock(221100,1702)').catch(()=>{});lock.release();}busy=false;}}
  tick();const timer=setInterval(tick,5000);timer.unref();
}
module.exports={start};

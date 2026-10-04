const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const store = require('./dayz-mod-store');
const secure = require('./secure-store');
const nitrado = require('./nitrado-api');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function workshop(mods) {
  if (!mods.length) return [];
  const body = new URLSearchParams({itemcount:String(mods.length)});
  mods.forEach((m,i)=>body.set(`publishedfileids[${i}]`,m.id));
  const res = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {method:'POST',body,signal:AbortSignal.timeout(20000)});
  if (!res.ok) throw new Error('Steam Workshop indisponible.');
  const items = (await res.json()).response?.publishedfiledetails || [];
  return mods.map(mod=> {
    const item = items.find(x=>String(x.publishedfileid)===mod.id);
    if (!item || item.result!==1 || Number(item.consumer_app_id)!==221100 || !item.time_updated) throw new Error(`Mod ${mod.id} inaccessible ou hors DayZ PC.`);
    return {...mod,name:item.title,updated:Number(item.time_updated)};
  });
}
async function files(dir, base=dir) {
  const result = [];
  for (const entry of await fs.readdir(dir,{withFileTypes:true})) {
    const full = path.join(dir,entry.name);
    if (entry.isSymbolicLink()) throw new Error('Lien symbolique interdit dans un mod.');
    if (entry.isDirectory()) result.push(...await files(full,base));
    else if (entry.isFile()) result.push({full,relative:path.relative(base,full).split(path.sep).join('/'),size:(await fs.stat(full)).size});
  }
  if(result.some(f=>/[\\\u0000-\u001f\u007f]/.test(f.relative))) throw new Error('Nom de fichier invalide dans le mod.');
  return result;
}
async function download(mod, dir) {
  const script = path.join(dir,`steam-${mod.id}.txt`);
  const user = process.env.STEAM_USERNAME || '';
  const password = process.env.STEAM_PASSWORD || '';
  if (!/^[A-Za-z0-9_@.-]+$/.test(user) || /[\r\n"]/.test(password)) throw new Error('Compte Steam non configuré ou invalide.');
  // Private runscript keeps credentials out of process arguments and application logs.
  await fs.writeFile(script, `@ShutdownOnFailedCommand 1\n@NoPromptForPassword 1\nforce_install_dir "${dir}"\nlogin "${user}"${password ? ` "${password}"` : ''}\nworkshop_download_item 221100 ${mod.id} validate\nquit\n`,{mode:0o600});
  let output = '';
  try {
    await new Promise((resolve,reject)=>{
      const child=spawn(process.env.STEAMCMD_PATH || 'steamcmd',['+runscript',script],{stdio:['ignore','pipe','pipe']});
      const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Téléchargement Steam expiré (30 minutes).'));},1800000);
      const collect=chunk=>{output=(output+chunk.toString()).slice(-262144);};
      child.stdout.on('data',collect); child.stderr.on('data',collect);
      child.once('error',()=>{clearTimeout(timer);reject(new Error('SteamCMD introuvable.'));});
      child.once('close',code=>{clearTimeout(timer);code===0 ? resolve() : reject(new Error('SteamCMD a échoué. Vérifie le compte, DayZ et Steam Guard.'));});
    });
    const match=output.match(new RegExp(`Success\\. Downloaded item ${mod.id} to "([^"\\r\\n]+)"`));
    if (!match || !path.isAbsolute(match[1])) throw new Error(`Steam n’a pas confirmé le téléchargement du mod ${mod.id}.`);
    const source = match[1];
    const list = await files(source);
    if (!list.some(f=>/^addons\/.+\.pbo$/i.test(f.relative) && f.size>0)) throw new Error(`Le mod ${mod.id} ne contient aucun Addons/*.pbo valide.`);
    const local=path.join(dir,mod.id);
    await fs.cp(source,local,{recursive:true});
    return { ...mod, local, files:await files(local) };
  } finally { await fs.rm(script,{force:true}); }
}
async function waitStatus(api, serviceId, expected) {
  for (let i=0;i<60;i++) {
    const data=await api.getGameServer(serviceId);
    if (data.data?.gameserver?.status===expected) return;
    await sleep(5000);
  }
  throw new Error(`Nitrado n’a pas confirmé l’état ${expected}.`);
}
async function exists(ftp, target) {
  const parent=path.posix.dirname(target), name=path.posix.basename(target);
  return (await ftp.list(parent)).some(f=>f.name===name);
}
// Swaps retain the previous files until all mods and keys have been installed.
async function swap(ftp, staged, target, backup, swaps) {
  const previous = await exists(ftp,target);
  if (previous) await ftp.rename(target,backup);
  const record={target,backup,previous,installed:false}; swaps.push(record);
  await ftp.rename(staged,target); record.installed=true;
}
async function rollback(ftp, swaps) {
  for (const s of [...swaps].reverse()) {
    if (s.installed) await ftp.rename(s.target,`${s.backup}.failed`);
    if (s.previous) await ftp.rename(s.backup,s.target);
  }
}
async function execute(server, job, dependencies = {}) {
  const { Client } = require('basic-ftp');
  const p = dependencies.pool || await store.ready();
  const api = dependencies.api || nitrado.withToken(secure.decrypt(server.token));
  const cfg=store.validateConfig(server.config);
  const report=dependencies.report || (async phase=>{await p.query('UPDATE dayz_mod_jobs SET phase=$1,updated_at=NOW() WHERE id=$2',[phase,job.id]);});
  const notify=dependencies.notify || (async()=>{});
  const getWorkshop=dependencies.workshop || workshop;
  const getDownload=dependencies.download || download;
  const waitForStatus=dependencies.waitStatus || waitStatus;
  const pause=dependencies.sleep || sleep;
  const check=dependencies.check || (()=>{});
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'extinction-mods-'));
  const ftp=dependencies.ftp || new Client(120000);
  const swaps=[];
  let stopped=false, swapsCommitted=false, wasStarted=false;
  const stage=path.posix.join(cfg.root,`.extinction-mods-${job.id}`);
  try {
    check();
    if (!server.active) throw new Error('Serveur déconnecté.');
    if (server.state?.recoveryRequired) throw new Error('Vérification manuelle requise après une opération interrompue.');
    const current=await api.getGameServer(server.service_id);
    const game=current.data?.gameserver;
    if (!game || !['dayz','dayzstandalone'].includes(String(game.game).toLowerCase())) throw new Error('Le service Nitrado n’est pas DayZ PC.');
    if (!['started','stopped'].includes(game.status)) throw new Error('Le serveur Nitrado est déjà en transition.');
    wasStarted=game.status==='started';
    const access=game.credentials?.ftp;
    if (!access?.hostname || !access.username || !access.password) throw new Error('Accès FTP Nitrado indisponible.');
    const ftpOptions={host:access.hostname,port:Number(access.port||21),user:access.username,password:access.password,secure:process.env.NITRADO_FTP_TLS==='true'};
    await report('Téléchargement Steam Workshop');
    const versions=await getWorkshop(cfg.mods);
    const downloads=[];
    for (const mod of versions) downloads.push(await getDownload(mod,temp));
    const after=await getWorkshop(cfg.mods);
    if (after.some(m=>versions.find(v=>v.id===m.id).updated!==m.updated)) throw new Error('Un mod a changé pendant le téléchargement. Relance la mise à jour.');
    await report('Envoi et vérification des mods sur Nitrado');
    await ftp.access(ftpOptions);
    await ftp.cd(cfg.root); // Existing server root only; never create a guessed game root.
    await ftp.ensureDir(stage);
    const keys=new Map();
    for (const mod of downloads) {
      await ftp.uploadFromDir(mod.local,path.posix.join(stage,mod.folder));
      // Verify every staged file length before stopping the game server.
      const directories=new Map();
      for (const f of mod.files) {
        const target=path.posix.join(stage,mod.folder,f.relative);
        const parent=path.posix.dirname(target);
        if (!directories.has(parent)) directories.set(parent,await ftp.list(parent));
        if (directories.get(parent).find(x=>x.name===path.posix.basename(target))?.size!==f.size) throw new Error('Vérification FTP échouée.');
        if (/\.bikey$/i.test(f.relative)) {
          const name=path.posix.basename(f.relative);
          if (keys.has(name) && !(await fs.readFile(keys.get(name))).equals(await fs.readFile(f.full))) throw new Error(`Clés incompatibles : ${name}.`);
          keys.set(name,f.full);
        }
      }
    }
    await ftp.ensureDir(path.posix.join(stage,'new-keys'));
    for (const [name,file] of keys) await ftp.uploadFrom(file,path.posix.join(stage,'new-keys',name));
    if (wasStarted) {
      await notify(`🟠 ${server.name} : mise à jour des mods dans ${cfg.delayMinutes} min. Déconnectez-vous avant l’arrêt.`);
      await report(`Avertissement Discord — arrêt dans ${cfg.delayMinutes} min`);
      for(let remaining=cfg.delayMinutes;remaining>0;remaining--) {
        await pause(60000);
        if ([5,1].includes(remaining-1)) await notify(`🟠 ${server.name} : arrêt dans ${remaining-1} min.`);
      }
      if((await api.getGameServer(server.service_id)).data?.gameserver?.status!=='started') throw new Error('État Nitrado modifié pendant la préparation. Relance la mise à jour.');
      await report('Arrêt du serveur');
      check();
      await api.stop(server.service_id);
      await waitForStatus(api,server.service_id,'stopped'); stopped=true;
    } else if((await api.getGameServer(server.service_id)).data?.gameserver?.status!=='stopped') {
      throw new Error('État Nitrado modifié pendant la préparation. Relance la mise à jour.');
    }
    // Reconnect after the countdown so FTP idle timeouts cannot interrupt the swaps.
    check();
    ftp.close(); await ftp.access(ftpOptions);
    await ftp.ensureDir(path.posix.join(stage,'backup'));
    await ftp.ensureDir(path.posix.join(cfg.root,'keys'));
    await report('Installation des mods et des clés .bikey');
    for(const mod of downloads) {check();await swap(ftp,path.posix.join(stage,mod.folder),path.posix.join(cfg.root,mod.folder),path.posix.join(stage,'backup',mod.folder),swaps);}
    for(const [name] of keys) {check();await swap(ftp,path.posix.join(stage,'new-keys',name),path.posix.join(cfg.root,'keys',name),path.posix.join(stage,'backup',name),swaps);}
    await p.query("UPDATE dayz_mod_servers SET state=state || $1::jsonb WHERE id=$2",[JSON.stringify({installed:Object.fromEntries(versions.map(m=>[m.id,m.updated])),lastInstalledAt:new Date().toISOString()}),server.id]);
    swapsCommitted=true;
    if(wasStarted) {
      check();
      await report('Démarrage du serveur'); await api.restart(server.service_id); await waitForStatus(api,server.service_id,'started');
    }
    await report(wasStarted ? 'Mods mis à jour — serveur démarré' : 'Mods mis à jour — serveur laissé arrêté');
    await notify(`🟢 ${server.name} : mods mis à jour${wasStarted ? ', serveur démarré' : ', serveur laissé arrêté'}.`).catch(()=>{});
    await ftp.removeDir(stage).catch(()=>{});
  } catch(e) {
    if(e.leaseLost) throw e;
    if (!swapsCommitted) {
      try {
        check();
        if(swaps.length) await rollback(ftp,swaps);
        if(stopped && wasStarted) { await api.restart(server.service_id); await waitForStatus(api,server.service_id,'started'); }
      } catch { throw Object.assign(new Error('Échec et restauration incomplète : serveur à vérifier manuellement, sauvegardes FTP conservées.'),{recoveryRequired:true}); }
    }
    // Failed startup preserves the staging backups and never marks the job successful.
    if (swapsCommitted) e.recoveryRequired=true;
    throw e;
  } finally { ftp.close(); await fs.rm(temp,{recursive:true,force:true}); }
}

function startWorker({client,loadDb}) {
  if (!process.env.DATABASE_URL) { console.log('ℹ️ Mods DayZ : DATABASE_URL absent, module désactivé.'); return; }
  let busy=false, workerReady=false;
  let workerIssue='SteamCMD et le compte Steam doivent être configurés sur le bot.';
  async function probe() {
    if (!process.env.STEAM_USERNAME) return;
    const binary=process.env.STEAMCMD_PATH || 'steamcmd';
    const candidates=binary.includes('/') ? [binary] : String(process.env.PATH || '').split(path.delimiter).map(dir=>path.join(dir,binary));
    for(const candidate of candidates) {
      try {await fs.access(candidate,require('fs').constants.X_OK);workerReady=true;workerIssue=null;return; } catch {}
    }
  }
  const notify=async (server,message)=> {
    const channelId=server.config.channelId;
    if (!channelId) return;
    const channel=await client.channels.fetch(channelId);
    if (!channel || channel.guildId!==server.guild_id || !channel.isTextBased()) throw new Error('Salon Discord absent ou extérieur au Discord du serveur.');
    await channel.send({content:message,allowedMentions:{parse:[]}});
  };
  async function tick() {
    if(busy) return; busy=true;
    let lock, leaseLost=false, onLockError;
    try {
      const p=await store.ready();
      await probe();
      lock=await p.connect();
      onLockError=()=>{leaseLost=true;};lock.on('error',onLockError);
      const result=await lock.query('SELECT pg_try_advisory_lock(221100,1701) AS locked');
      if(!result.rows[0].locked) return;
      // One downloader globally: no concurrent SteamCMD sessions on the same account.
      const db=await loadDb();
      const servers=[...(db.connectedServers||[]),...Object.entries(db.guilds||{}).flatMap(([guildId,g])=>(g.servers||[]).map(s=>({...s,guildId})))];
      const seen=new Set();
      for(const s of servers) {
        if(!store.isDayzPC(s) || !s.guildId || s.enabled===false || !s.nitradoId && !s.nitradoServiceId) continue;
        const token=db.nitradoAccounts?.[s.guildId]?.tokenEncrypted;
        if(!token?.startsWith('v1:')) continue;
        const serviceId=String(s.nitradoServiceId||s.nitradoId);
        if(seen.has(serviceId)) continue; seen.add(serviceId);
        const id=`${s.guildId}:${serviceId}`;
        await p.query(`INSERT INTO dayz_mod_servers(id,guild_id,service_id,name,token,heartbeat) VALUES($1,$2,$3,$4,$5,NOW()) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,token=EXCLUDED.token,active=TRUE,heartbeat=NOW()`,[id,s.guildId,serviceId,s.name||serviceId,token]);
      }
      await p.query('UPDATE dayz_mod_servers SET active=FALSE WHERE NOT(service_id=ANY($1::text[]))',[[...seen]]);
      await p.query('UPDATE dayz_mod_servers SET state=state || $1::jsonb WHERE active=TRUE',[JSON.stringify({workerReady,workerIssue})]);
      // Never repeat an interrupted installation: retain files for manual recovery.
      await p.query(`UPDATE dayz_mod_servers SET state=state || '{"recoveryRequired":true}'::jsonb WHERE id IN (SELECT server_id FROM dayz_mod_jobs WHERE status='running')`);
      await p.query("UPDATE dayz_mod_jobs SET status='failed',phase='Bot interrompu : vérifier le serveur et les sauvegardes FTP avant de relancer',updated_at=NOW() WHERE status='running'");
      const {rows:registered}=await p.query('SELECT * FROM dayz_mod_servers WHERE active=TRUE');
      for(const s of registered) {
        if(!s.config.mods?.length) continue;
        if(!s.state.checkRequested && Date.now()-new Date(s.state.checkedAt||0).getTime()<300000) continue;
        try {
          const mods=await workshop(s.config.mods);
          await p.query('UPDATE dayz_mod_servers SET state=state || $1::jsonb WHERE id=$2',[JSON.stringify({mods,checkedAt:new Date().toISOString(),checkRequested:false,error:null}),s.id]);
          const update=mods.some(m=>s.state.installed?.[m.id] && s.state.installed[m.id]<m.updated);
          if(workerReady && !s.state.recoveryRequired && s.config.autoUpdate && update && Date.now()-new Date(s.state.retryAfter||0).getTime()>0) {
            await store.enqueue(s,'automatic').catch(()=>{});
          }
        } catch { await p.query('UPDATE dayz_mod_servers SET state=state || $1::jsonb WHERE id=$2',[JSON.stringify({error:'Vérification Steam indisponible.',checkedAt:new Date().toISOString(),checkRequested:false}),s.id]); }
      }
      const {rows:jobs}=await p.query("UPDATE dayz_mod_jobs SET status='running',updated_at=NOW() WHERE id=(SELECT id FROM dayz_mod_jobs WHERE status='queued' ORDER BY created_at LIMIT 1) RETURNING *");
      if(jobs[0]) {
        const job=jobs[0];
        const s=(await p.query('SELECT * FROM dayz_mod_servers WHERE id=$1',[job.server_id])).rows[0];
        // Heartbeat remains live while one long download is processing.
        const heartbeat=setInterval(()=>{p.query('UPDATE dayz_mod_servers SET heartbeat=NOW() WHERE active=TRUE').catch(()=>{});},30000);
        try {
          await execute(s,job,{pool:p,notify:message=>notify(s,message),check:()=>{
            if(leaseLost)throw Object.assign(new Error('Verrou PostgreSQL perdu : vérifier le serveur avant de reprendre.'),{leaseLost:true,recoveryRequired:true});
          }});
          await p.query("UPDATE dayz_mod_jobs SET status='succeeded',updated_at=NOW() WHERE id=$1",[job.id]);
        } catch(e) {
          // No external API or Steam stdout is persisted: credentials stay out of history.
          const safe=/Nitrado API/.test(e.message) ? 'Erreur Nitrado : vérifier le service et son token.' : e.message.slice(0,250);
          await p.query("UPDATE dayz_mod_jobs SET status='failed',phase=$1,updated_at=NOW() WHERE id=$2",[safe,job.id]);
          await p.query('UPDATE dayz_mod_servers SET state=state || $1::jsonb WHERE id=$2',[JSON.stringify({retryAfter:new Date(Date.now()+3600000).toISOString(),recoveryRequired:e.recoveryRequired===true || s.state.recoveryRequired===true}),s.id]);
          await notify(s,`🔴 ${s.name} : mise à jour échouée. Consulte le Dashboard.`).catch(()=>{});
        } finally { clearInterval(heartbeat); }
      }
    } catch { console.error('Mods DayZ : module indisponible, vérifier PostgreSQL et la configuration.'); }
    finally {
      if(lock) {await lock.query('SELECT pg_advisory_unlock(221100,1701)').catch(()=>{});if(onLockError)lock.removeListener('error',onLockError);lock.release(leaseLost ? new Error('PostgreSQL lock lost') : undefined);}
      busy=false;
    }
  }
  const secret=require('./secure-store').configuredSecrets().find(require('./secure-store').validSecret);
  if(!secret || secret.length<32 || /change[_ -]?me|change-moi|change_this/i.test(secret)) {console.error('Mods DayZ : secret de chiffrement réel requis.');return;}
  tick(); setInterval(tick,15000).unref();
}
module.exports={startWorker,workshop,files,swap,rollback,execute,download};

const {Client}=require('basic-ftp');
const {Writable,Readable}=require('node:stream');
const secure=require('./secure-store');
const nitrado=require('./nitrado-api');
const hosting=require('../dashboard/lib/hosting.cjs');
const live=require('../dashboard/lib/live-events.cjs');
async function connect(db,server,ftp=new Client(30000)){
 let options;
 try{if(server.ftpHost&&server.ftpUser&&server.ftpPassword)options={host:server.ftpHost,port:server.ftpPort||21,user:server.ftpUser,password:secure.decrypt(server.ftpPassword),secure:server.ftpTls===true};
 else if(hosting.isNitrado(server)){const token=secure.getGuildToken(db,server.guildId);if(!token)throw new Error('Compte Nitrado de ce Discord non connecté.');const game=(await nitrado.withToken(token).getGameServer(server.nitradoId||server.nitradoServiceId)).data?.gameserver;const f=game?.credentials?.ftp;if(!f?.hostname||!f?.username||!f?.password)throw new Error('Accès FTP absent chez Nitrado. Renseigne les accès fournis par le panel.');options={host:f.hostname,port:Number(f.port||21),user:f.username,password:f.password,secure:server.ftpTls===true};}
 else throw new Error('Adresse, utilisateur et mot de passe FTP requis. SFTP n’est pas compatible avec ce connecteur.');
 await ftp.access(options);return ftp;
 }catch(e){ftp.close();throw e;}
}
async function download(ftp,file,start=0,max=8*1024*1024){let size=0;const chunks=[];const out=new Writable({write(chunk,encoding,cb){size+=chunk.length;if(size>max)return cb(new Error('Lecture FTP trop volumineuse (8 Mo maximum par passage).'));chunks.push(Buffer.from(chunk));cb();}});await ftp.downloadTo(out,file,start);return Buffer.concat(chunks);}
async function whitelist(db,server,pseudo,ftpFactory){
 if(!server.whitelistEnabled||!server.whitelistPath||!live.dayz(server))throw new Error('Whitelist du jeu non configurée pour ce serveur.');
 const entry=live.whitelistEntry(server,pseudo,db.livePlayers||[]),ftp=await connect(db,server,ftpFactory?.());
 try{const before=await download(ftp,server.whitelistPath,0,1024*1024);const lines=before.toString('utf8').replace(/^\uFEFF/,'').split(/\r?\n/).map(s=>s.trim());if(!lines.includes(entry)){const addition=`${before.length&&!before.toString('utf8').endsWith('\n')?'\n':''}${entry}\n`;await ftp.appendFrom(Readable.from([addition]),server.whitelistPath);}
 const after=await download(ftp,server.whitelistPath,0,1024*1024);if(!after.toString('utf8').split(/\r?\n/).map(s=>s.replace(/^\uFEFF/,'').trim()).includes(entry))throw new Error('Écriture de la whitelist non confirmée.');return entry;
 }finally{ftp.close();}
}
async function ban(db,server,uid,name,ftpFactory){
 if(!server.banPath||!live.dayz(server))throw new Error('Chemin du fichier ban.txt requis pour DayZ.');
 const entryServer={...server,whitelistEnabled:true,whitelistPath:server.banPath,whitelistFormat:server.banFormat||(server.game==='dayz_pc'?'uid':'gamertag')};
 return whitelist(db,entryServer,entryServer.whitelistFormat==='uid'?uid:name,ftpFactory);
}
module.exports={connect,download,whitelist,ban};

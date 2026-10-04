import crypto from 'crypto';
import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {authorize} from '../../../lib/mod-auth';
import {readDb,writeDb} from '../../../lib/db';
export const GET=guarded(async()=>Response.json(((await readDb()).backups||[]).map(({snapshot,...metadata})=>metadata)));
export const POST=guarded(async()=>{const id=await activeGuild();await authorize(id,true);const db=await readDb();const {backups,...snapshot}=structuredClone(db);const backup={id:crypto.randomUUID(),guildId:id,createdAt:new Date().toISOString(),snapshot};(db.backups||=[]).push(backup);db.backups=db.backups.slice(-20);await writeDb(db);return Response.json({ok:true,id:backup.id});});
export const PATCH=guarded(async req=>{const {id:backupId}=await req.json(),id=await activeGuild();await authorize(id,true);const db=await readDb(),backup=db.backups.find(b=>b.id===backupId);if(!backup?.snapshot)throw new Error('Sauvegarde introuvable.');Object.assign(db,structuredClone(backup.snapshot));await writeDb(db);return Response.json({ok:true});});
export const DELETE=guarded(async req=>{const {id:backupId}=await req.json(),id=await activeGuild();await authorize(id,true);const db=await readDb();db.backups=db.backups.filter(b=>b.id!==backupId);await writeDb(db);return Response.json({ok:true});});

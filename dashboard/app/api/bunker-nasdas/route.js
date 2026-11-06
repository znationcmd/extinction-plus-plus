import {guarded,activeGuild} from '../../../lib/dashboard-auth';
import {allServers} from '../../../lib/servers';
import {readDb, writeDb} from '../../../lib/db';
import nasdara from '../../../../shared/nasdara-data';
import crypto from 'node:crypto';

const TTL = 2 * 60 * 60 * 1000;
const MAX_HISTORY = 60;
const sources = new Set(['microphone','screen_audio']);

function recent(list, now=Date.now()) {
  return (Array.isArray(list) ? list : []).filter(x=>Number.isFinite(Date.parse(x.observedAt||'')) && Date.parse(x.observedAt)>now-TTL)
    .sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt)).slice(0, MAX_HISTORY);
}

export const GET=guarded(async req => {
  const db=await readDb();
  const serverId=new URL(req.url).searchParams.get('serverId');
  const available=allServers(db,await activeGuild()).filter(s=>String(s.game||'').startsWith('dayz'));
  if(serverId && !available.some(s=>String(s.id)===serverId))return Response.json({error:'Serveur DayZ introuvable.'},{status:404});
  const signals=recent(db.nasdaraSignals).filter(s=>!serverId||s.serverId===serverId);
  return Response.json({signals,source:nasdara.SOURCE_URL,liveFeedConnected:false});
});

export const POST=guarded(async req => {
  const input=await req.json();
  if(!input||typeof input!=='object'||Array.isArray(input)||!sources.has(input.source)) {
    return Response.json({error:'Source audio invalide.'},{status:400});
  }
  const code=nasdara.decodeTransmission(input.digits);
  if(!code.code||!code.bunker) return Response.json({error:'Une transmission complète de 10 chiffres correspondant à un bunker connu est requise.'},{status:400});
  // Le signal est une déclaration d'un navigateur connecté à un son de jeu.
  // Il n'est PAS une confirmation officielle par l'API DayZ ou Nitrado.
  const db=await readDb();
  const serverId=String(input.serverId||'');
  const server=allServers(db,await activeGuild()).find(s=>String(s.id)===serverId && String(s.game||'').startsWith('dayz'));
  if(!server)return Response.json({error:'Choisis un serveur DayZ enregistré dans ce Discord avant de publier un code.'},{status:400});
  db.nasdaraSignals=recent(db.nasdaraSignals);
  const existing=db.nasdaraSignals.find(x=>x.serverId===serverId&&x.position===code.position&&x.code===code.code);
  const now=new Date().toISOString();
  if(existing){
    existing.observedAt=now;
    existing.count=Math.min(99,Number(existing.count||1)+1);
    existing.source=input.source;
    existing.status=existing.count>=2?'répété':'observé';
  }else{
    db.nasdaraSignals.unshift({
      id:crypto.randomUUID(), serverId, position:code.position,code:code.code,
      observedAt:now,count:1,status:'observé',source:input.source
    });
  }
  db.nasdaraSignals=recent(db.nasdaraSignals);
  await writeDb(db);
  return Response.json({ok:true, signal:db.nasdaraSignals.find(x=>x.serverId===serverId&&x.position===code.position&&x.code===code.code)});
});

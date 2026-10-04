import appStore from '../../../lib/app-store.cjs';
import secure from '../../../lib/secure-store.cjs';
import bridge from '../../../lib/game-bridge.cjs';
import {dbPath} from '../../../lib/db';
export async function POST(req){try{const reader=req.body?.getReader();let size=0;const chunks=[];if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();return Response.json({error:'64 Ko maximum.'},{status:413});}chunks.push(Buffer.from(value));}const raw=Buffer.concat(chunks).toString('utf8'),body=JSON.parse(raw);const db=await appStore.read(dbPath(),{});const s=db.guilds?.[body.guildId]?.servers?.find(s=>s.id===body.serverId);if(!s||!s.bridgeEnabled||!s.bridgeSecret||s.enabled===false||!bridge.verify(secure.decrypt(s.bridgeSecret),req.headers.get('x-extinction-time'),raw,req.headers.get('x-extinction-signature')))return Response.json({error:'Signature serveur refusée.'},{status:401});const server={...s,guildId:body.guildId};let result;
 if(body.action==='events'){const out=bridge.ingest(db,server,body);s.bridgeState=out.state;result={accepted:out.count};}
 else if(body.action==='claim')result={delivery:bridge.claim(db,server)};
 else if(body.action==='ack'){bridge.acknowledge(db,server,body);result={ok:true};}
 else throw new Error('Action du connecteur inconnue.');await appStore.write(dbPath(),db);return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e.status===409?'Modification simultanée : renvoie la requête.':'Requête du connecteur invalide ou stockage indisponible.'},{status:e.status===409?409:400});}}

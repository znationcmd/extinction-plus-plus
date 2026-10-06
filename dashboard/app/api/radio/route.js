import {collection} from '../../../lib/collection-route';

function validateRadio(row){
  if(!row.station?.trim())throw new Error('Nom de station requis.');
  if(!row.message?.trim())throw new Error('Message radio requis.');
  if(row.frequency && !/^[0-9]{2,3}(?:\.[0-9]{1,3})?\s*(?:MHz)?$/i.test(row.frequency.trim()))throw new Error('Fréquence invalide, ex. 87.6 MHz.');
  if(row.channelId && !/^\d{15,22}$/.test(row.channelId))throw new Error('ID du salon Discord invalide.');
  if(row.intervalMinutes!==undefined && row.intervalMinutes!==0 && row.intervalMinutes<1)throw new Error('Répétition minimale : 1 minute.');
  if(row.nextRunAt && !Number.isFinite(Date.parse(row.nextRunAt)))throw new Error('Date de prochaine diffusion invalide.');
}
export const {GET,POST,PATCH,DELETE}=collection('radioMessages',{
  station:'string',
  frequency:'string',
  title:'string',
  message:'string',
  kind:'string',
  game:'string',
  serverId:'string',
  channelId:'string',
  intervalMinutes:'integer',
  nextRunAt:'string',
  enabled:'boolean'
},{validate:validateRadio});

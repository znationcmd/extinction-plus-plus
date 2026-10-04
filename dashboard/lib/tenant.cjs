const scopedArrays=['questProgress','bounties','factions','playerLinks','eventRules','scheduledTasks','gameActions','livePlayers','liveAlerts','maps','mapPins','events','pendingWhitelist','shopPurchases','shop','deliveries','quests','questProofs','interpol','alarms','tickets','leaderboard','coupons','promotions','plugins','nitradoServers','connectedServers','saasAudit','backups','notifications','servers'];
// Earlier bot versions stored empty collections as {} or records keyed by ID.
// Keep explicit guildId isolation; never infer membership from a dictionary key.
function rows(value,key) {
  if(value==null)return [];
  if(Array.isArray(value)){if(value.every(x=>x&&typeof x==='object'&&!Array.isArray(x)))return value;throw new Error(`Format de stockage incompatible pour ${key}.`);}
  if(typeof value==='object') {
    const entries=Object.entries(value);
    if(entries.every(([,record])=>record&&typeof record==='object'&&!Array.isArray(record)))return entries.map(([id,record])=>({...record,id:record.id||id}));
    if(entries.every(([,records])=>Array.isArray(records)))return entries.flatMap(([,records])=>rows(records,key));
  }
  throw new Error(`Format de stockage incompatible pour ${key}.`);
}
function view(raw,id) {
  const result=structuredClone(raw);
  for(const key of ['guilds','ownerConfigs','nitradoAccounts','battlepasses']) result[key]=raw[key]?.[id]?{[id]:structuredClone(raw[key][id])}:{};
  for(const key of scopedArrays) result[key]=rows(raw[key],key).filter(x=>String(x.guildId)===id).map(x=>structuredClone(x));
  for(const [key,fields] of Object.entries({rp:['jobs','licenses','fines','warrants','companies','properties','salaries'],economy:['currencies','transactions'],bank:['accounts']})) {
    result[key]={};for(const field of fields)result[key][field]=rows(raw[key]?.[field],`${key}.${field}`).filter(x=>String(x.guildId)===id).map(x=>structuredClone(x));
  }
  result.battlepass=structuredClone(raw.battlepasses?.[id]||{levels:[]});
  result.users={};result.stats={};result.aiAssistant={};
  return result;
}
function apply(raw,scoped,id) {
  for(const key of ['guilds','ownerConfigs','nitradoAccounts']) {
    raw[key]||={};if(scoped[key]?.[id])raw[key][id]=scoped[key][id];else delete raw[key][id];
  }
  for(const key of scopedArrays) {
    const own=rows(scoped[key],key).map(x=>({...x,guildId:id}));
    raw[key]=[...rows(raw[key],key).filter(x=>String(x.guildId)!==id),...own];
  }
  for(const [key,fields] of Object.entries({rp:['jobs','licenses','fines','warrants','companies','properties','salaries'],economy:['currencies','transactions'],bank:['accounts']})) {
    raw[key]||={};for(const field of fields) raw[key][field]=[...rows(raw[key][field],`${key}.${field}`).filter(x=>String(x.guildId)!==id),...rows(scoped[key]?.[field],`${key}.${field}`).map(x=>({...x,guildId:id}))];
  }
  raw.battlepasses||={};raw.battlepasses[id]=scoped.battlepass||{levels:[]};
  return raw;
}
module.exports={view,apply,rows};

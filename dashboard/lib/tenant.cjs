const scopedArrays=['maps','mapPins','events','pendingWhitelist','shopPurchases','shop','deliveries','quests','questProofs','interpol','alarms','tickets','leaderboard','coupons','promotions','plugins','nitradoServers','connectedServers','saasAudit','backups','notifications','servers'];
function view(raw,id) {
  const result=structuredClone(raw);
  for(const key of ['guilds','ownerConfigs','nitradoAccounts','battlepasses']) result[key]=raw[key]?.[id]?{[id]:structuredClone(raw[key][id])}:{};
  for(const key of scopedArrays) result[key]=(raw[key]||[]).filter(x=>String(x.guildId)===id).map(x=>structuredClone(x));
  for(const [key,fields] of Object.entries({rp:['jobs','licenses','fines','warrants','companies','properties','salaries'],economy:['currencies','transactions'],bank:['accounts']})) {
    result[key]={};for(const field of fields)result[key][field]=(raw[key]?.[field]||[]).filter(x=>String(x.guildId)===id).map(x=>structuredClone(x));
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
    const own=(scoped[key]||[]).map(x=>({...x,guildId:id}));
    raw[key]=[...(raw[key]||[]).filter(x=>String(x.guildId)!==id),...own];
  }
  for(const [key,fields] of Object.entries({rp:['jobs','licenses','fines','warrants','companies','properties','salaries'],economy:['currencies','transactions'],bank:['accounts']})) {
    raw[key]||={};for(const field of fields) raw[key][field]=[...(raw[key][field]||[]).filter(x=>String(x.guildId)!==id),...(scoped[key]?.[field]||[]).map(x=>({...x,guildId:id}))];
  }
  raw.battlepasses||={};raw.battlepasses[id]=scoped.battlepass||{levels:[]};
  return raw;
}
module.exports={view,apply};

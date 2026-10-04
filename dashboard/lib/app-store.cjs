const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const snapshots = new WeakMap();
let pool, initialized;
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const identity = v => v?.id ? String(v.id) : v?.guildId && v?.userId ? `${v.guildId}:${v.userId}` : null;
function merge(base, changed, live) {
  if(equal(base,changed)) return live;
  if(object(base) && object(changed) && object(live)) {
    const result={...live};
    for(const key of new Set([...Object.keys(base),...Object.keys(changed)])) {
      if(['__proto__','constructor','prototype'].includes(key)) throw new Error('Clé interdite.');
      if(!(key in changed)) { if(equal(base[key],live[key])) delete result[key]; else throw new Error('Données modifiées simultanément. Recharge puis recommence.'); }
      else result[key]=merge(base[key],changed[key],live[key]);
    }
    return result;
  }
  if(Array.isArray(base) && Array.isArray(changed) && Array.isArray(live) && [...base,...changed,...live].every(identity)) {
    const toMap=a=>Object.fromEntries(a.map(v=>[identity(v),v]));
    return Object.values(merge(toMap(base),toMap(changed),toMap(live)));
  }
  if(!equal(base,live)) throw Object.assign(new Error('Données modifiées simultanément. Recharge puis recommence.'),{status:409});
  return changed;
}
async function ready() {
  if(!pool) { pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000}); pool.on('error',()=>console.error('Stockage PostgreSQL indisponible.')); }
  if(!initialized) initialized=(async()=>{const c=await pool.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(221100,1703)');await c.query("CREATE TABLE IF NOT EXISTS extinction_app_state (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");await c.query('COMMIT');}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}})().catch(e=>{initialized=null;throw e;});
  await initialized; return pool;
}
async function read(file, defaults={}) {
  if(process.env.NODE_ENV==='production'&&!process.env.DATABASE_URL)throw Object.assign(new Error('DATABASE_URL requis en production pour préserver les données partagées.'),{status:503});
  let data;
  if(process.env.DATABASE_URL) {
    const p=await ready();
    const rows=(await p.query("SELECT data FROM extinction_app_state WHERE id='main'")).rows;
    if(!rows.length) {
      // Only the bot's live file may seed production, never the Dashboard's bundled sample.
      if(process.env.APP_STORE_SEED === 'bot') {
        const seed=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):defaults;
        await p.query("INSERT INTO extinction_app_state(id,data) VALUES('main',$1) ON CONFLICT DO NOTHING",[JSON.stringify(seed)]);
        data=(await p.query("SELECT data FROM extinction_app_state WHERE id='main'")).rows[0].data;
      } else throw Object.assign(new Error('Le bot doit initialiser le stockage partagé.'),{status:503});
    } else data=rows[0].data;
  } else data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):defaults;
  const value={...defaults,...data};snapshots.set(value,structuredClone(value));return value;
}
async function write(file,value) {
  const base=snapshots.get(value);
  if(!base) throw new Error('Lecture du stockage requise avant écriture.');
  if(process.env.DATABASE_URL) {
    const c=await (await ready()).connect();
    try {
      await c.query('BEGIN');
      const live=(await c.query("SELECT data FROM extinction_app_state WHERE id='main' FOR UPDATE")).rows[0]?.data;
      if(!live) throw new Error('Stockage non initialisé.');
      const next=merge(base,value,{...base,...live});
      await c.query("UPDATE extinction_app_state SET data=$1, updated_at=NOW() WHERE id='main'",[JSON.stringify(next)]);
      await c.query('COMMIT'); snapshots.set(value,structuredClone(value));
    } catch(e) {await c.query('ROLLBACK').catch(()=>{});throw e;} finally {c.release();}
  } else {
    const live=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):base;
    const next=merge(base,value,{...base,...live});
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const temp=`${file}.${process.pid}.tmp`;fs.writeFileSync(temp,JSON.stringify(next,null,2));fs.renameSync(temp,file);
    snapshots.set(value,structuredClone(value));
  }
}
module.exports={read,write,merge,identity};

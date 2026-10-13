const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'main.cjs'),'utf8');
const start=source.indexOf('async function vpnReply(){');const end=source.indexOf('\n\nfunction normalize(',start);
assert(start>=0&&end>start,'vpnReply not found');
const block=source.slice(start,end);
async function scenario(name,output,profiles,expectedHandshake){
 const sandbox={vpnProfiles:()=>profiles,run:async()=>{if(output===null)throw Error('wg missing');return {stdout:output}},Date,Set,Math,Number};
 vm.createContext(sandbox);vm.runInContext(block+'\nthis.check=vpnReply;',sandbox);
 const result=await sandbox.check();
 assert.equal(result.connected,false,'Never claim VPN connected without IP and route verification');
 assert.equal(result.handshake,expectedHandshake,name);
 assert.deepEqual(Array.from(result.configured),profiles,name);
 console.log('PASS',name);
}
(async()=>{
 await scenario('wg not installed',null,[],false);
 await scenario('no active peers','',[],false);
 await scenario('inactive peer','wg0 abc 0',[],false);
 const now=Math.floor(Date.now()/1000);
 await scenario('recent handshake','wg0 abc '+now,['France'],true);
 await scenario('old handshake','wg0 abc '+(now-3600),['Canada'],false);
 assert(source.includes("if(!vpnRegions.includes(region))"),'Region whitelist must be enforced');
 assert(source.includes("content.includes('[Interface]')")&&source.includes("content.includes('[Peer]')"),'Profile validation required');
 assert(source.includes("fs.writeFileSync(dest,content,{mode:0o600})"),'Restrict profile file permissions');
 console.log('PASS region and import guards');
})().catch(e=>{console.error('FAIL',e);process.exitCode=1});

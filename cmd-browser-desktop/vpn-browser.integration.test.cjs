const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'main.cjs'),'utf8');
const from=src.indexOf('async function vpnControl('),to=src.indexOf("ipcMain.handle('cmd:vpn'",from);
assert(from>0&&to>from,'Windows VPN controller found');
const section=src.slice(from,to);
let installed=false,profile=false,running=false;const calls=[];
const env={process:{platform:'win32'},vpnRegions:['France','Canada'],wireguardExe:()=>installed?'C:\\WireGuard\\wireguard.exe':null,vpnFile:()=> 'C:\\profiles\\cmdvpn-ca.conf',vpnService:async()=>running,fs:{existsSync:()=>profile},vpnReply:async()=>({connected:false,handshake:false}),run:async(_exe,args)=>{calls.push(args);if(args[0]==='/installtunnelservice')running=true;if(args[0]==='/uninstalltunnelservice')running=false;return {stdout:''}}};
vm.createContext(env);vm.runInContext(section+'\nthis.control=vpnControl;',env);
(async()=>{
 let v=await env.control('connect','Canada');assert.match(v.error,/Installez WireGuard/);console.log('PASS WireGuard absent');
 installed=true;v=await env.control('connect','Canada');assert.match(v.error,/Importez un profil/);console.log('PASS Profil absent');
 profile=true;v=await env.control('connect','Atlantide');assert.match(v.error,/Région non reconnue/);console.log('PASS Région inconnue');
 v=await env.control('connect','Canada');assert.equal(v.serviceRunning,true);assert.equal(v.connected,false);assert(calls.some(x=>x[0]==='/installtunnelservice'));console.log('PASS Commande démarrage simulée, IP non validée');
 v=await env.control('disconnect','Canada');assert.equal(v.serviceRunning,false);assert(calls.some(x=>x[0]==='/uninstalltunnelservice'));console.log('PASS Commande arrêt simulée');
 const start=src.indexOf('function normalize(raw)'),end=src.indexOf('\nfunction emit()',start);const nav={HOME:'https://cmd-browser-web-rzsb-production.up.railway.app',URL};vm.createContext(nav);vm.runInContext(src.slice(start,end)+'\nthis.go=normalize;',nav);assert.equal(nav.go('https://example.org'),'https://example.org');console.log('PASS Navigation HTTPS');
})().catch(e=>{console.error('FAIL',e);process.exitCode=1});

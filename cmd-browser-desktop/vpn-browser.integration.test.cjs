const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'main.cjs'),'utf8');
const section=src.slice(src.indexOf("ipcMain.handle('cmd:vpn'"));
assert(section.startsWith("ipcMain.handle('cmd:vpn'"));
const handlers=new Map();let profiles=[];let currentHandshake=false;
const env={ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},vpnRegions:['France','Allemagne','Pays-Bas','Royaume-Uni','États-Unis','Canada','Japon'],vpnProfiles:()=>profiles,vpnReply:async()=>({connected:false,region:null,configured:profiles,handshake:currentHandshake,message:currentHandshake?'Handshake détecté, IP non vérifiée':'VPN non vérifié'}),dialog:{},fs:{},path:{},app:{},shell:{}};
vm.createContext(env);vm.runInContext(section,env);const vpn=handlers.get('cmd:vpn');assert(vpn);
(async()=>{
 const before=await vpn(null,'status');assert.equal(before.connected,false);console.log('PASS 1 CMD Browser démarre VPN désactivé');
 const regions=await vpn(null,'regions');assert(regions.includes('Canada'));console.log('PASS 2 sélection région Canada');
 let result=await vpn(null,'connect','Canada');assert.equal(result.connected,false);assert.match(result.error,/Aucun serveur/);console.log('PASS 3 activation sans profil refusée');
 profiles=['Canada'];result=await vpn(null,'connect','Canada');assert.equal(result.connected,false);assert.match(result.error,/connexion système non intégrée/);console.log('PASS 4 profil présent mais tunnel non activé');
 currentHandshake=true;result=await vpn(null,'status');assert.equal(result.connected,false);assert.equal(result.handshake,true);console.log('PASS 5 handshake simulé sans fausse validation IP');
 result=await vpn(null,'connect','Atlantide');assert.equal(result.connected,false);assert.match(result.error,/Région non reconnue/);console.log('PASS 6 région inconnue refusée');
 result=await vpn(null,'disconnect');assert.equal(result.connected,false);console.log('PASS 7 désactivation sans fausse confirmation');
 const start=src.indexOf('function normalize(raw)');const end=src.indexOf('\nfunction emit()',start);assert(start>=0&&end>start);const navigation={HOME:'https://cmd-browser-web-rzsb-production.up.railway.app',URL};vm.createContext(navigation);vm.runInContext(src.slice(start,end)+'\nthis.go=normalize;',navigation);assert.equal(navigation.go('https://www.youtube.com/watch?v=abc'),'https://www.youtube.com/watch?v=abc');assert.equal(navigation.go('https://example.org'),'https://example.org');console.log('PASS 8 CMD Browser conserve les URL HTTPS');
})().catch(e=>{console.error('FAIL',e);process.exitCode=1});

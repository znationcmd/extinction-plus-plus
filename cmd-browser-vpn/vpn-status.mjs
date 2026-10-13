// Read-only diagnostic; never claims VPN is active based on a UI toggle.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
try {
  const {stdout}=await run('wg',['show','interfaces'],{timeout:5000});
  const interfaces=stdout.trim().split(/\\s+/).filter(Boolean);
  if (!interfaces.length) {
    console.log(JSON.stringify({status:'no-interface',vpnVerified:false,detail:'Aucune interface WireGuard active détectée'}));
  } else {
    console.log(JSON.stringify({status:'interface-present',interfaces,vpnVerified:false,detail:'Interface détectée ; vérifier handshake, routes, IP publique et DNS'}));
  }
} catch(e) {
  console.log(JSON.stringify({status:'unavailable',vpnVerified:false,detail:'Commande wg indisponible ou non autorisée'}));
}

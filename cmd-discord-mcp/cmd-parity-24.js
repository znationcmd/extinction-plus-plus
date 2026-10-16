/* CMD Sphere — unified 24-gap Discord parity preinstallation manifest.
 * Contract readiness and actual functionality are deliberately separate.
 * Imported contracts have no side effects or server database writes.
 */
import {features as voice} from './cmd-parity-voice.js';
import {features as messaging} from './cmd-parity-messaging.js';
import {features as community} from './cmd-parity-community.js';
import {features as developer} from './cmd-parity-developer.js';
import {features as accounts} from './cmd-parity-accounts.js';
export const CMD_PARITY_MISSING_24=Object.freeze([...voice,...messaging,...community,...developer,...accounts]);
export const CMD_PARITY_FEATURE_COUNT=24;
export const CMD_PARITY_SCOPE='discord_gap_audit_2026_10_16';
export function cmdParityByCategory(category){
 return CMD_PARITY_MISSING_24.filter(f=>f.category===category).map(f=>({...f,fields:[...f.fields]}));
}
export function cmdParityStatus(){
 return {total:CMD_PARITY_MISSING_24.length,preinstalled:CMD_PARITY_MISSING_24.length,contractsOnly:CMD_PARITY_MISSING_24.length,implemented:CMD_PARITY_MISSING_24.filter(f=>f.implemented).length,enabled:CMD_PARITY_MISSING_24.filter(f=>f.enabled).length,verified:CMD_PARITY_MISSING_24.filter(f=>f.verified).length};
}
export function cmdParityReady(id,gates={}){
 const record=CMD_PARITY_MISSING_24.find(f=>f.id===id);
 return Boolean(record&&record.implemented&&record.enabled&&record.verified&&gates.permissions===true&&gates.security===true&&gates.production===true);
}

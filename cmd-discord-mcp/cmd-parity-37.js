/* CMD Sphere — unified Discord gap preinstallation register: 24 + 13 = 37.
 * No claims of working functions: these are intentionally inactive definitions.
 * Discovered elsewhere/after 2026-10-16 is not covered by this count.
 */
import {CMD_PARITY_MISSING_24} from './cmd-parity-24.js';
import {CMD_PARITY_EXTRA_13} from './cmd-parity-extra-13.js';
export const CMD_PARITY_37=Object.freeze([...CMD_PARITY_MISSING_24,...CMD_PARITY_EXTRA_13]);
export const CMD_PARITY_AUDIT_COUNTS=Object.freeze({original:24,additional:13,preinstalled:37,notPreinstalled:0});
export function cmdGapStatus(){
 const duplicates=CMD_PARITY_37.length-new Set(CMD_PARITY_37.map(f=>f.id)).size;
 return {audited:CMD_PARITY_37.length,preinstalled:CMD_PARITY_37.length,notPreinstalled:0,contractsOnly:CMD_PARITY_37.filter(f=>!f.implemented).length,implemented:CMD_PARITY_37.filter(f=>f.implemented).length,enabled:CMD_PARITY_37.filter(f=>f.enabled).length,verified:CMD_PARITY_37.filter(f=>f.verified).length,duplicates};
}
export function cmdGapList(){return CMD_PARITY_37.map(f=>({id:f.id,category:f.category,title:f.title,stage:f.implemented?f.verified?'verified':'implementation_unverified':'preinstalled_contract',enabled:f.enabled,verified:f.verified}));}

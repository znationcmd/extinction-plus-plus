/** CMD Sphere — cumulative Discord feature gap register.
 * 24 first audit + 13 second audit + 22 extended-audit contracts = 59.
 * STAGING ONLY. Never interpret a contract as a working function.
 */
import {CMD_PARITY_37} from './cmd-parity-37.js';
import {features as privacy} from './cmd-parity-expansion-privacy.js';
import {features as servers} from './cmd-parity-expansion-servers.js';
import {features as voice} from './cmd-parity-expansion-voice.js';
import {features as accounts} from './cmd-parity-expansion-accounts.js';
import {features as apps} from './cmd-parity-expansion-apps.js';
import {features as accessibility} from './cmd-parity-expansion-accessibility.js';
import {features as monetization} from './cmd-parity-expansion-monetization.js';
export const CMD_PARITY_59=Object.freeze([...CMD_PARITY_37,...privacy,...servers,...voice,...accounts,...apps,...accessibility,...monetization]);
export const AUDIT_VERSIONS=Object.freeze({first:24,second:13,third:22,expectedTotal:59});
export function parityStatus(){
 const count=CMD_PARITY_59.length, unique=new Set(CMD_PARITY_59.map(f=>f.id)).size;
 return {audited:count,unique,duplicates:count-unique,preinstalled:count,notPreinstalled:0,contractsOnly:CMD_PARITY_59.filter(f=>!f.implemented).length,implemented:CMD_PARITY_59.filter(f=>f.implemented).length,enabled:CMD_PARITY_59.filter(f=>f.enabled).length,verified:CMD_PARITY_59.filter(f=>f.verified).length};
}
export function parityBreakdown(){
 const byCategory={};
 for(const item of CMD_PARITY_59)byCategory[item.category]=(byCategory[item.category]||0)+1;
 return {versions:AUDIT_VERSIONS,categories:byCategory};
}
export function parityAuditRows(){
 return CMD_PARITY_59.map(item=>({id:item.id,category:item.category,title:item.title,stage:item.verified&&item.enabled?'verified':item.implemented?'partially_implemented':'preinstalled_contract',enabled:item.enabled===true,verified:item.verified===true}));
}

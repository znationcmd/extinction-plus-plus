/* CMD Sphere — 13 additional Discord differences from expanded 2026-10-16 audit.
 * Inactive contracts are not working product features.
 */
import {features as security} from './cmd-parity-extra-security.js';
import {features as media} from './cmd-parity-extra-media.js';
import {features as productivity} from './cmd-parity-extra-productivity.js';
import {features as privacy} from './cmd-parity-extra-privacy.js';
export const CMD_PARITY_EXTRA_13=Object.freeze([...security,...media,...productivity,...privacy]);
export const CMD_EXTRA_COUNT=13;
export function extraGap(id){return CMD_PARITY_EXTRA_13.find(f=>f.id===id)||null;}
export function extraStatus(){return {total:CMD_PARITY_EXTRA_13.length,preinstalled:CMD_PARITY_EXTRA_13.length,implemented:CMD_PARITY_EXTRA_13.filter(f=>f.implemented).length,enabled:CMD_PARITY_EXTRA_13.filter(f=>f.enabled).length,verified:CMD_PARITY_EXTRA_13.filter(f=>f.verified).length};}

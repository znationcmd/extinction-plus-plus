/** CMD Sphere — second parity audit contracts (privacy).
 * PREINSTALLED ONLY: no real route, database, UI, account-security or payment actions.
 * Activate only after audited implementation, consent and end-to-end testing.
 */
export const features=Object.freeze([
  {
    "id": "streamer_mode",
    "title": "Mode Streamer protégeant les informations",
    "category": "privacy",
    "permission": "privacy_settings",
    "endpoint": "/api/account/streamer-mode",
    "acceptance": "mask_user_invites_discord_links_private_info_screen_sharing",
    "fields": [
      "enabled",
      "mask_invites",
      "hide_notifications"
    ],
    "installedStage": "contract_only",
    "implemented": false,
    "enabled": false,
    "verified": false
  }
].map(f=>Object.freeze({...f,fields:Object.freeze(f.fields)})));
export function getGap(id){return features.find(f=>f.id===id)||null;}
export function securityGates(id,checks={}){
 const f=getGap(id);
 if(!f)return {canEnable:false,reason:'UNKNOWN_GAP'};
 const missing=['implemented','permissions','security','privacy','integration','production'].filter(k=>checks[k]!==true);
 return {canEnable:false,id:f.id,missing:['STILL_DISABLED',...missing]};
}

/** CMD Sphere — expanded Discord parity audit: accessibility.
 * Safe preinstall ONLY. No routes, tables, payments, credential collection,
 * personal data processing, session changes or privileged behavior.
 */
export const features=Object.freeze([
  {
    "id": "message_text_to_speech",
    "title": "Lecture vocale des messages et commande /tts",
    "category": "accessibility",
    "permission": "tts_messages",
    "apiContract": "POST /api/messages/tts",
    "acceptance": "opt_in_browser_speech_permission_throttle_volume_and_mute",
    "fields": [
      "message_id",
      "language",
      "voice"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "preinstalled_contract",
    "installed": true,
    "implemented": false,
    "enabled": false,
    "verified": false
  }
].map(feature=>Object.freeze({...feature,fields:Object.freeze(feature.fields)})));
export function capability(id){return features.find(f=>f.id===id)||null;}
export function plannedSecurityGate(id,validation={}){
 const found=capability(id);
 if(!found)return {allowed:false,code:'UNKNOWN_FEATURE'};
 const required=['api','database','permissions','security','privacy','mobile','production'];
 return {allowed:false,code:'CONTRACT_ONLY',id,missing:['REAL_IMPLEMENTATION',...required.filter(x=>validation[x]!==true)]};
}

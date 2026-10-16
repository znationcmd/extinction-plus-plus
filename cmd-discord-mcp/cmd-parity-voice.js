/* CMD Sphere / Discord gap pre-install: voice.
 * These are contract definitions, not live routes. Production remains unchanged.
 * New features require explicit security/integration tests before enablement.
 */
export const features=Object.freeze([
  {
    "id": "voice_turn_relay",
    "title": "Serveurs relais TURN",
    "category": "voice",
    "permission": "voice_connect",
    "endpoint": "GET /api/voice/ice-config",
    "acceptance": "turn_secure_configuration_and_mobile_nat_tests",
    "fields": [
      "turn_server",
      "turn_secret",
      "ice_lifetime"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "stage_channels",
    "title": "Salons de conférence Stage",
    "category": "voice",
    "permission": "manage_channels",
    "endpoint": "POST /api/stages/{id}/request-speak",
    "acceptance": "speaker_queue_moderator_permissions_audience_roles",
    "fields": [
      "stage_role",
      "speaker_request",
      "moderator"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "soundboard",
    "title": "Bibliothèque de sons",
    "category": "voice",
    "permission": "soundboard_use",
    "endpoint": "POST /api/voice/sounds/play",
    "acceptance": "copyright_content_limits_voice_mix_mute",
    "fields": [
      "sound_id",
      "duration_ms",
      "mime"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "game_overlay",
    "title": "Overlay natif dans les jeux",
    "category": "voice",
    "permission": "native_overlay",
    "endpoint": "NATIVE IPC overlay/handshake",
    "acceptance": "signed_desktop_client_and_per_game_permissions",
    "fields": [
      "signed_client",
      "game_pid",
      "consent"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "rich_presence",
    "title": "Détection jeux et statut enrichi",
    "category": "voice",
    "permission": "presence_manage",
    "endpoint": "POST /api/presence/activity",
    "acceptance": "opt_in_expiry_private_visibility_multi_device",
    "fields": [
      "application_id",
      "title",
      "expires_at"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  }
].map(f=>Object.freeze({...f,fields:Object.freeze(f.fields)})));
export const category="voice";
export function getContract(id){return features.find(f=>f.id===id)||null}
export function validateProposal(id,input){
 const f=getContract(id);
 if(!f||!input||typeof input!=='object'||Array.isArray(input))return {ok:false,reason:'INVALID_CONTRACT'};
 if(Object.keys(input).length>40)return {ok:false,reason:'TOO_MANY_FIELDS'};
 const missing=f.fields.filter(k=>!Object.hasOwn(input,k));
 return {ok:missing.length===0,missing,enabled:false};
}
export function preflight(id,check={}){
 const f=getContract(id);
 if(!f)return {ready:false,reason:'UNKNOWN_FEATURE'};
 const checks=['implementation','permissions','privacy','security','integration','production'];
 const failures=checks.filter(name=>check[name]!==true);
 return {id:f.id,ready:false,enabled:false,blockers:['FEATURE_NOT_ENABLED',...failures]};
}

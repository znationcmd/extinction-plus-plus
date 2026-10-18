/** CMD Sphere — expanded Discord parity audit: voice.
 * Safe preinstall ONLY. No routes, tables, payments, credential collection,
 * personal data processing, session changes or privileged behavior.
 */
export const features=Object.freeze([
  {
    "id": "voice_afk_lobby",
    "title": "Salon AFK et passage automatique inactif",
    "category": "voice",
    "permission": "manage_voice",
    "apiContract": "PATCH /api/voice/guilds/afk",
    "acceptance": "afk_cannot_leak_open_microphone_and_user_choice",
    "fields": [
      "guild_id",
      "afk_channel_id",
      "timeout_seconds"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "preinstalled_contract",
    "installed": true,
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "voice_priority_speaker",
    "title": "Voix prioritaire accordée par rôle",
    "category": "voice",
    "permission": "priority_speaker",
    "apiContract": "PATCH /api/voice/priority",
    "acceptance": "audio_focus_only_when_authorized_and_device_supported",
    "fields": [
      "guild_id",
      "role_id",
      "enabled"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "preinstalled_contract",
    "installed": true,
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "voice_per_member_volume",
    "title": "Volume individuel des participants en appel",
    "category": "voice",
    "permission": "voice_listen",
    "apiContract": "PATCH /api/voice/user-volume",
    "acceptance": "client_only_gain_dont_modify_senders_for_others",
    "fields": [
      "room_id",
      "peer_id",
      "gain"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "developed_pending_mobile_and_production_validation",
    "installed": true,
    "implemented": true,
    "enabled": false,
    "verified": false
  },
  {
    "id": "voice_bitrate_user_limits",
    "title": "Débit et limite des utilisateurs par salon vocal",
    "category": "voice",
    "permission": "manage_channels",
    "apiContract": "PATCH /api/voice/channels/config",
    "acceptance": "bitrate_quota_rate_control_and_disconnect_safety",
    "fields": [
      "channel_id",
      "bitrate",
      "user_limit"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "preinstalled_contract",
    "installed": true,
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "voice_region_override",
    "title": "Région des appels et latence des relais",
    "category": "voice",
    "permission": "manage_voice",
    "apiContract": "PATCH /api/voice/channels/region",
    "acceptance": "secure_turn_routing_region_consent_latency_no_paid_services",
    "fields": [
      "channel_id",
      "region"
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

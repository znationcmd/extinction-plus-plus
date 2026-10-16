/** CMD Sphere — second parity audit contracts (media).
 * PREINSTALLED ONLY: no real route, database, UI, account-security or payment actions.
 * Activate only after audited implementation, consent and end-to-end testing.
 */
export const features=Object.freeze([
  {
    "id": "stream_clips",
    "title": "Clips des diffusions et streams",
    "category": "media",
    "permission": "record_stream_clips",
    "endpoint": "/api/streams/clips",
    "acceptance": "explicit_consent_retention_storage_and_copyright",
    "fields": [
      "stream_id",
      "offset_seconds",
      "duration_seconds"
    ],
    "installedStage": "contract_only",
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "call_audio_video_effects",
    "title": "Filtres audio et fonds vidéo",
    "category": "media",
    "permission": "call_media_effects",
    "endpoint": "/api/calls/media-effects",
    "acceptance": "permission_microphone_camera_local_processing_and_mobile_fallback",
    "fields": [
      "effect_id",
      "input_device",
      "consent"
    ],
    "installedStage": "contract_only",
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "voice_channel_text",
    "title": "Conversation textuelle dans les salons vocaux",
    "category": "media",
    "permission": "voice_channel_read",
    "endpoint": "/api/voice/channels/messages",
    "acceptance": "effective_channel_permissions_message_retention_and_access",
    "fields": [
      "guild_id",
      "voice_channel_id",
      "content"
    ],
    "installedStage": "contract_only",
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "voice_messages",
    "title": "Messages vocaux en MP et groupes",
    "category": "media",
    "permission": "send_voice_messages",
    "endpoint": "/api/messages/voice",
    "acceptance": "upload_quota_mime_sanitization_recipient_permissions",
    "fields": [
      "thread_id",
      "audio_asset_id",
      "duration_ms"
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

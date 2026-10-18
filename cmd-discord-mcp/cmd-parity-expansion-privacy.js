/** CMD Sphere — expanded Discord parity audit: privacy.
 * Two privacy contracts now have real account-scoped UI and API code. This is
 * not production validation. Remaining contract declarations are preinstall only.
 * No payment activation, data removal, or external service has been added.
 */
export const features=Object.freeze([
  {
    "id": "user_block_controls",
    "title": "Bloquer et débloquer un membre",
    "category": "privacy",
    "permission": "block_members",
    "apiContract": "GET/POST /api/account/blocked",
    "acceptance": "block_enforced_in_dm_mentions_friend_search_notifications",
    "fields": [
      "target_user_id",
      "action",
      "reason"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "developed_pending_production_validation",
    "installed": true,
    "implemented": true,
    "enabled": false,
    "verified": false
  },
  {
    "id": "dm_requests_spam_inbox",
    "title": "Boîte de demandes de MP et spam",
    "category": "privacy",
    "permission": "dm_requests_read",
    "apiContract": "GET /api/dm/requests",
    "acceptance": "unknown_sender_quarantine_opt_in_antispam_and_guardians",
    "fields": [
      "sender_id",
      "request_id",
      "classification"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "preinstalled_contract",
    "installed": true,
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "per_server_dm_privacy",
    "title": "Autoriser ou interdire les MP selon le serveur",
    "category": "privacy",
    "permission": "privacy_update",
    "apiContract": "PATCH /api/account/privacy/dm-guilds",
    "acceptance": "no_bypass_via_groups_friend_restrictions",
    "fields": [
      "guild_id",
      "policy"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "developed_pending_production_validation",
    "installed": true,
    "implemented": true,
    "enabled": false,
    "verified": false
  },
  {
    "id": "friend_request_privacy",
    "title": "Limiter qui peut envoyer une demande d’ami",
    "category": "privacy",
    "permission": "privacy_update",
    "apiContract": "PATCH /api/account/privacy/friend-requests",
    "acceptance": "trusted_social_graph_ratelimit_privacy_defaults",
    "fields": [
      "allow_everyone",
      "allow_shared_servers"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "developed_pending_production_validation",
    "installed": true,
    "implemented": true,
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

/** CMD Sphere — expanded Discord parity audit: servers.
 * Safe preinstall ONLY. No routes, tables, payments, credential collection,
 * personal data processing, session changes or privileged behavior.
 */
export const features=Object.freeze([
  {
    "id": "channel_slowmode",
    "title": "Mode lent par salon avec permissions",
    "category": "servers",
    "permission": "manage_channels",
    "apiContract": "PATCH /api/native/slowmode",
    "acceptance": "server_enforced_user_cooldown_bypass_role_and_race_test",
    "fields": [
      "guild_id",
      "channel_id",
      "cooldown_seconds"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "implemented_pending_deployment",
    "installed": true,
    "implemented": true,
    "enabled": false,
    "verified": false
  },
  {
    "id": "server_verification_levels",
    "title": "Niveaux de vérification du serveur",
    "category": "servers",
    "permission": "manage_guild",
    "apiContract": "PATCH /api/native/security/verification",
    "acceptance": "verified_email_account_age_join_delay_no_lockout",
    "fields": [
      "guild_id",
      "verification_level"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "preinstalled_contract",
    "installed": true,
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "age_restricted_spaces",
    "title": "Salons et serveurs avec accès restreint par âge",
    "category": "servers",
    "permission": "manage_guild",
    "apiContract": "PATCH /api/native/safety/age-restrictions",
    "acceptance": "legal_age_assurance_safe_ios_access_consent_no_inferred_age",
    "fields": [
      "guild_id",
      "channel_id",
      "policy"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "preinstalled_contract",
    "installed": true,
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "server_template_cloning",
    "title": "Modèles de serveur avec salons et rôles",
    "category": "servers",
    "permission": "manage_guild",
    "apiContract": "POST /api/native/templates",
    "acceptance": "clone_with_id_remapping_permissions_sanitized_secrets_and_invites",
    "fields": [
      "guild_id",
      "template_name"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "preinstalled_contract",
    "installed": true,
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "server_media_channels",
    "title": "Salons médias et galerie de publications",
    "category": "servers",
    "permission": "manage_channels",
    "apiContract": "POST /api/native/media-channels",
    "acceptance": "file_safety_private_permissions_tagging_and_storage_quota",
    "fields": [
      "guild_id",
      "name",
      "visibility"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "preinstalled_contract",
    "installed": true,
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "threads_auto_archive_lock",
    "title": "Archivage automatique, verrouillage et restauration des fils",
    "category": "servers",
    "permission": "manage_threads",
    "apiContract": "PATCH /api/native/threads/lifecycle",
    "acceptance": "thread_permissions_retention_job_recovery_and_parent_inheritance",
    "fields": [
      "thread_id",
      "auto_archive_minutes",
      "locked"
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

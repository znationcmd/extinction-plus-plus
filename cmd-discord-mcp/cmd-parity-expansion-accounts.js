/** CMD Sphere — expanded Discord parity audit: accounts.
 * Safe preinstall ONLY. No routes, tables, payments, credential collection,
 * personal data processing, session changes or privileged behavior.
 */
export const features=Object.freeze([
  {
    "id": "account_export_package",
    "title": "Exporter toutes ses données personnelles",
    "category": "accounts",
    "permission": "account_data_export",
    "apiContract": "POST /api/account/export",
    "acceptance": "gdpr_authenticated_async_zip_job_signed_expiry_and_privacy",
    "fields": [
      "account_id",
      "export_scope"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "partial_bounded_self_json_export_pending_full_media_archive_and_production_validation",
    "installed": true,
    "implemented": true,
    "enabled": false,
    "verified": false
  },
  {
    "id": "account_deletion_recovery",
    "title": "Suppression du compte avec période de récupération",
    "category": "accounts",
    "permission": "account_deletion",
    "apiContract": "POST /api/account/deletion",
    "acceptance": "verify_identity_owner_transfer_cancel_period_billing_and_legal_retention",
    "fields": [
      "account_id",
      "confirmation"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "preinstalled_contract",
    "installed": true,
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "device_session_management",
    "title": "Voir et révoquer les sessions des appareils",
    "category": "accounts",
    "permission": "account_security",
    "apiContract": "DELETE /api/account/sessions/{id}",
    "acceptance": "hashed_refresh_session_list_revoke_other_devices_and_notify",
    "fields": [
      "session_id",
      "confirm"
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

/** CMD Sphere — second parity audit contracts (security).
 * PREINSTALLED ONLY: no real route, database, UI, account-security or payment actions.
 * Activate only after audited implementation, consent and end-to-end testing.
 */
export const features=Object.freeze([
  {
    "id": "account_passkeys",
    "title": "Connexion par Passkey",
    "category": "security",
    "permission": "account_security",
    "endpoint": "/api/account/passkeys",
    "acceptance": "web_authn_origin_rp_id_attestation_challenge_and_rollback",
    "fields": [
      "credential_id",
      "challenge",
      "client_data"
    ],
    "installedStage": "contract_only",
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "account_mfa_recovery",
    "title": "Authentification multifacteur et récupération",
    "category": "security",
    "permission": "account_security",
    "endpoint": "/api/account/mfa",
    "acceptance": "totp_backup_codes_rotation_rate_limits_secure_recovery",
    "fields": [
      "method",
      "challenge",
      "proof"
    ],
    "installedStage": "contract_only",
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "sensitive_media_blur",
    "title": "Masquage des médias sensibles",
    "category": "security",
    "permission": "safety_preferences",
    "endpoint": "/api/safety/media/filter",
    "acceptance": "privacy_aware_optin_content_classification_no_media_leak",
    "fields": [
      "media_id",
      "classification",
      "viewer_setting"
    ],
    "installedStage": "contract_only",
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "abuse_reports",
    "title": "Signalement d'abus et de messages",
    "category": "security",
    "permission": "report_content",
    "endpoint": "/api/safety/reports",
    "acceptance": "report_review_moderator_separation_prevent_retaliation_and_spam",
    "fields": [
      "target_type",
      "target_id",
      "reason"
    ],
    "installedStage": "contract_only",
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "e2ee_key_verification",
    "title": "Vérification des clés des appels chiffrés",
    "category": "security",
    "permission": "verify_encryption",
    "endpoint": "/api/calls/key-verification",
    "acceptance": "audited_crypto_protocol_identity_safety_number_key_rotation",
    "fields": [
      "session_id",
      "participant_id",
      "fingerprint"
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

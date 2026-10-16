/** CMD Sphere — expanded Discord parity audit: applications.
 * Safe preinstall ONLY. No routes, tables, payments, credential collection,
 * personal data processing, session changes or privileged behavior.
 */
export const features=Object.freeze([
  {
    "id": "user_installed_applications",
    "title": "Applications installées sur compte utilisateur",
    "category": "applications",
    "permission": "applications_install",
    "apiContract": "POST /api/developer/install/user",
    "acceptance": "oauth_consent_user_scopes_dm_context_and_permissions",
    "fields": [
      "application_id",
      "user_id",
      "scopes"
    ],
    "origin": "discord_feature_review_2026_10_16",
    "stage": "preinstalled_contract",
    "installed": true,
    "implemented": false,
    "enabled": false,
    "verified": false
  },
  {
    "id": "app_command_autocomplete",
    "title": "Suggestions automatiques pour les commandes de bots",
    "category": "applications",
    "permission": "application_commands",
    "apiContract": "POST /api/interactions/autocomplete",
    "acceptance": "signed_interactions_rate_limits_context_scoped_respond",
    "fields": [
      "application_id",
      "command_id",
      "query"
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

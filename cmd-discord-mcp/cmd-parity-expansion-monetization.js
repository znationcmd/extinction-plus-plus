/** CMD Sphere — expanded Discord parity audit: monetization.
 * Safe preinstall ONLY. No routes, tables, payments, credential collection,
 * personal data processing, session changes or privileged behavior.
 */
export const features=Object.freeze([
  {
    "id": "server_subscription_tiers",
    "title": "Abonnements et accès premium par serveur",
    "category": "monetization",
    "permission": "manage_subscriptions",
    "apiContract": "POST /api/native/guilds/subscriptions",
    "acceptance": "explicit_payment_authorization_refunds_cancel_and_tax_compliance",
    "fields": [
      "guild_id",
      "tier_id",
      "price"
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

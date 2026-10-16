/* CMD Sphere / Discord gap pre-install: accounts.
 * These are contract definitions, not live routes. Production remains unchanged.
 * New features require explicit security/integration tests before enablement.
 */
export const features=Object.freeze([
  {
    "id": "family_center",
    "title": "Sécurité familiale et protections jeunes",
    "category": "accounts",
    "permission": "account_family",
    "endpoint": "POST /api/account/family/connect",
    "acceptance": "consent_age_safety_encrypted_access_control",
    "fields": [
      "invite",
      "consent",
      "guardian_role"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "cosmetic_gifts",
    "title": "Cadeaux de décorations entre membres",
    "category": "accounts",
    "permission": "gift_cosmetics",
    "endpoint": "POST /api/shop/gifts",
    "acceptance": "inventory_atomicity_no_duplicates_no_unapproved_payments",
    "fields": [
      "item_id",
      "recipient_id",
      "gift_nonce"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "cloud_backgrounds",
    "title": "Synchronisation des fonds personnalisés",
    "category": "accounts",
    "permission": "account_sync",
    "endpoint": "POST /api/account/backgrounds",
    "acceptance": "private_file_encryption_quota_device_sync",
    "fields": [
      "conversation_id",
      "image_key",
      "asset_hash"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  }
].map(f=>Object.freeze({...f,fields:Object.freeze(f.fields)})));
export const category="accounts";
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

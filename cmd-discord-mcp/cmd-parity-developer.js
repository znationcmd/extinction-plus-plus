/* CMD Sphere / Discord gap pre-install: developer.
 * These are contract definitions, not live routes. Production remains unchanged.
 * New features require explicit security/integration tests before enablement.
 */
export const features=Object.freeze([
  {
    "id": "slash_commands",
    "title": "Commandes slash pour applications",
    "category": "developer",
    "permission": "application_commands",
    "endpoint": "POST /api/apps/{id}/commands",
    "acceptance": "verified_bot_scopes_per_server_rate_limit",
    "fields": [
      "name",
      "description",
      "options"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "context_menus",
    "title": "Commandes contextuelles messages et utilisateurs",
    "category": "developer",
    "permission": "application_commands",
    "endpoint": "POST /api/apps/{id}/context-actions",
    "acceptance": "target_permission_checks_and_audited_actions",
    "fields": [
      "type",
      "target",
      "name"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "app_directory",
    "title": "Répertoire public des applications",
    "category": "developer",
    "permission": "app_publish",
    "endpoint": "GET /api/apps/catalogue",
    "acceptance": "application_review_minimum_scopes_trust",
    "fields": [
      "manifest",
      "categories",
      "approval"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "embedded_activities",
    "title": "Activités et jeux intégrés",
    "category": "developer",
    "permission": "start_activity",
    "endpoint": "POST /api/activities/{id}/session",
    "acceptance": "sandboxed_origins_csp_token_scopes_and_presence",
    "fields": [
      "app_id",
      "session_id",
      "allowed_origin"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "bot_components",
    "title": "Boutons listes et formulaires bots",
    "category": "developer",
    "permission": "interaction_respond",
    "endpoint": "POST /api/interactions/respond",
    "acceptance": "signed_callbacks_csrf_action_scope_and_timeouts",
    "fields": [
      "custom_id",
      "interaction_id",
      "component_type"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "app_monetization",
    "title": "Monétisation des applications",
    "category": "developer",
    "permission": "monetization_manage",
    "endpoint": "POST /api/apps/{id}/billing",
    "acceptance": "merchant_compliance_chargebacks_tax_refunds",
    "fields": [
      "plan",
      "price",
      "currency"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  }
].map(f=>Object.freeze({...f,fields:Object.freeze(f.fields)})));
export const category="developer";
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

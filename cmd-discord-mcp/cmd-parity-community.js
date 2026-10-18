/* CMD Sphere / Discord gap pre-install: community.
 * These are contract definitions, not live routes. Production remains unchanged.
 * New features require explicit security/integration tests before enablement.
 */
export const features=Object.freeze([
  {
    "id": "membership_onboarding",
    "title": "Accueil automatique avec choix de rôles",
    "category": "community",
    "permission": "manage_guild",
    "endpoint": "POST /api/guilds/{id}/onboarding",
    "acceptance": "roles_scoped_to_guild_minimum_permissions_and_abuse",
    "fields": [
      "prompts",
      "role_choices",
      "channel_choices"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "rules_screening",
    "title": "Acceptation du règlement",
    "category": "community",
    "permission": "manage_guild",
    "endpoint": "POST /api/guilds/{id}/rules/accept",
    "acceptance": "versioned_terms_no_chat_access_until_acceptance",
    "fields": [
      "version",
      "accepted_at"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "automod_engine",
    "title": "AutoMod anti-spam et mots interdits",
    "category": "community",
    "permission": "manage_guild",
    "endpoint": "POST /api/guilds/{id}/automod/rules",
    "acceptance": "server_side_enforcement_safe_appeal_moderation",
    "fields": [
      "rules",
      "actions",
      "exempt_roles"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "raid_protection",
    "title": "Protection contre les raids",
    "category": "community",
    "permission": "manage_guild",
    "endpoint": "POST /api/guilds/{id}/security/raid",
    "acceptance": "rate_limit_suspicious_joins_legitimate_user_appeals",
    "fields": [
      "join_rate",
      "flags",
      "actions"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "moderation_audit",
    "title": "Journal des actions d'administration",
    "category": "community",
    "permission": "view_audit_log",
    "endpoint": "GET /api/guilds/{id}/audit",
    "acceptance": "tamper_evident_records_owner_visibility_retention",
    "fields": [
      "actor_id",
      "action",
      "target_id",
      "created_at"
    ],
    "stage": "partially_implemented_native_channel_role_audit_pending_broader_actions_and_live_validation",
    "enabled": false,
    "verified": false,
    "implemented": true
  },
  {
    "id": "followed_announcements",
    "title": "Annonces relayées vers d'autres serveurs",
    "category": "community",
    "permission": "manage_webhooks",
    "endpoint": "POST /api/guilds/{id}/announcements/follow",
    "acceptance": "follow_consent_no_private_data_leaks_revoke",
    "fields": [
      "source_id",
      "destination_id",
      "following"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  },
  {
    "id": "community_discovery",
    "title": "Annuaire public des serveurs",
    "category": "community",
    "permission": "discover_guilds",
    "endpoint": "GET /api/discover",
    "acceptance": "opt_in_moderation_search_privacy_and_age_restrictions",
    "fields": [
      "public_listing",
      "tags",
      "languages"
    ],
    "stage": "partially_implemented_opt_in_directory_pending_moderation_and_live_validation",
    "enabled": false,
    "verified": false,
    "implemented": true
  },
  {
    "id": "community_insights",
    "title": "Statistiques de communauté",
    "category": "community",
    "permission": "view_guild_insights",
    "endpoint": "GET /api/guilds/{id}/insights",
    "acceptance": "privacy_threshold_no_unconsented_tracking",
    "fields": [
      "period",
      "aggregate_counts"
    ],
    "stage": "partially_implemented_admin_aggregates_pending_production_validation",
    "enabled": false,
    "verified": false,
    "implemented": true
  }
].map(f=>Object.freeze({...f,fields:Object.freeze(f.fields)})));
export const category="community";
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

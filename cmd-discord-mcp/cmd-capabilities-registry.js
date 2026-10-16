/**
 * CMD Sphere progressive capabilities registry.
 * Preinstalled declarations are NOT proof of functionality.
 * Do not enable a feature until its acceptance tests and security gates pass.
 * No database writes, external connections, credentials or paid services.
 */
export const CMD_CAPABILITIES_VERSION = '2026-10-16';
export const CMD_CAPABILITIES = Object.freeze([
  {id:'voice_channels',priority:'P0',status:'unverified',gate:'three_users_30m_mobile_reconnect'},
  {id:'group_calls',priority:'P0',status:'partial',gate:'webrtc_ice_turn_multi_device'},
  {id:'screen_share',priority:'P0',status:'partial',gate:'desktop_browser_and_ios_fallback'},
  {id:'rich_messaging',priority:'P0',status:'unverified',gate:'two_account_live_sync_and_edits'},
  {id:'role_permissions',priority:'P0',status:'unverified',gate:'server_side_privilege_escalation_denied'},
  {id:'moderation_security',priority:'P0',status:'partial',gate:'rate_limits_csrf_xss_and_audit'},
  {id:'advanced_channels',priority:'P1',status:'unverified',gate:'forum_announcement_events_permissions'},
  {id:'invitations',priority:'P1',status:'unverified',gate:'expiration_uses_revoke_private_isolation'},
  {id:'notifications',priority:'P1',status:'partial',gate:'push_ios_android_and_deduplication'},
  {id:'accounts_social_profiles',priority:'P1',status:'unverified',gate:'auth_sessions_social_profile_devices'},
  {id:'desktop_mobile_pwa',priority:'P1',status:'unverified',gate:'ios_android_desktop_responsive_accessibility'},
  {id:'performance_reliability',priority:'P1',status:'partial',gate:'railway_restart_load_backup_restore'},
  {id:'cyan_stars',priority:'P1',status:'unverified',gate:'atomic_wallet_transactions'},
  {id:'season_pass',priority:'P1',status:'partial',gate:'9000_stars_claim_once_30_day_rollover'},
  {id:'xp_levels_chests',priority:'P1',status:'partial',gate:'anti_spam_one_chest_per_level'},
  {id:'four_k_shop_dressing',priority:'P1',status:'partial',gate:'owned_items_true_asset_mobile_visual'},
  {id:'video_studio',priority:'P1',status:'unverified',gate:'upload_edit_publish_permissions'},
  {id:'developer_portal_bots',priority:'P2',status:'unverified',gate:'oauth_scopes_webhook_signature_revoke'},
  {id:'embedded_activities',priority:'P2',status:'unverified',gate:'multiplayer_state_and_app_permissions'},
  {id:'global_search',priority:'P2',status:'unverified',gate:'authorized_results_only'},
  {id:'internationalization',priority:'P2',status:'unverified',gate:'all_routes_eleven_languages'},
  {id:'accessibility',priority:'P2',status:'unverified',gate:'keyboard_screen_reader_reduced_motion'},
  {id:'cmd_integrations',priority:'P2',status:'unverified',gate:'non_destructive_contract_checks'}
].map(f=>Object.freeze({...f,enabled:false,preinstalled:true,verified:false})));
export function getCmdCapability(id){return CMD_CAPABILITIES.find(f=>f.id===id)||null}
export function cmdCapabilitySummary(){return CMD_CAPABILITIES.reduce((a,f)=>(a.total++,a[f.status]=(a[f.status]||0)+1,a),{total:0,partial:0,unverified:0})}
export function canActivateCmdCapability(id,checks={}){
 const f=getCmdCapability(id);
 return Boolean(f&&f.enabled&&f.verified&&checks.security===true&&checks.integration===true&&checks.production===true);
}

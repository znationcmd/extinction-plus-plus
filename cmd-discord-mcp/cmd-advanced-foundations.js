/**
 * CMD Sphere advanced features: guarded foundation only.
 * Implementations do not mutate production data or grant permissions.
 * Explicit role deny overrides allow; unknown features fail closed.
 */
export const CMD_ADVANCED_FEATURES=Object.freeze({
 voice:{enabled:false,capacity:25,requires:['voice_connect','voice_speak'],turnConfigured:false},
 video:{enabled:false,requires:['video_call'],turnConfigured:false},
 screen:{enabled:false,requires:['screen_share'],desktopOnly:true},
 forum:{enabled:false,requires:['view_channel','create_thread','send_messages']},
 events:{enabled:false,requires:['manage_events'],reminderEnabled:false},
 activities:{enabled:false,requires:['start_activity'],isolation:'sandbox'},
 developer:{enabled:false,requires:['manage_apps'],oauthEnabled:false},
 search:{enabled:false,requires:['read_message_history'],visibility:'permission_scoped'},
 automod:{enabled:false,requires:['manage_guild'],dryRun:true},
 backups:{enabled:false,requires:['manage_guild'],restoreRequiresConfirmation:true}
});
const POWER=new Set(['administrator','manage_guild','manage_roles','manage_channels','kick_members','ban_members','manage_webhooks','manage_cmd_hosting']);
export function evaluateCmdPermission({owner=false,memberPermissions=[],everyonePermissions=[],channelAllow=[],channelDeny=[]}={},permission){
 if(typeof permission!=='string'||!permission||POWER.has(permission)&&!owner&&!memberPermissions.includes(permission))return false;
 if(owner)return true;
 const allowed=new Set([...everyonePermissions,...memberPermissions]);
 if(channelDeny.includes(permission))return false;
 if(channelAllow.includes(permission))return allowed.has(permission)||!POWER.has(permission);
 return allowed.has(permission);
}
export function cmdFeaturePlan(key){
 const spec=Object.hasOwn(CMD_ADVANCED_FEATURES,key)?CMD_ADVANCED_FEATURES[key]:null;
 return spec?{key,enabled:false,requirements:[...(spec.requires||[])],acceptance:'pending',dependenciesMissing:true}:null;
}
export function cmdGuardFeature(key,context){
 const spec=Object.hasOwn(CMD_ADVANCED_FEATURES,key)?CMD_ADVANCED_FEATURES[key]:null;
 if(!spec?.enabled)return {allowed:false,code:'FEATURE_NOT_VERIFIED'};
 if(!(spec.requires||[]).every(permission=>evaluateCmdPermission(context,permission)))return {allowed:false,code:'PERMISSION_DENIED'};
 return {allowed:true};
}

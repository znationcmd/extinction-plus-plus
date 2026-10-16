/**
 * CMD Sphere — future collaboration feature contracts.
 * These are pure validators/feature specifications; not wired to APIs.
 * Server must independently enforce access and anti-abuse rules.
 */
export const CMD_COLLAB_CONTRACTS=Object.freeze({
 messages:{operations:['send','edit_own','delete_own','reply','react','pin','translate','upload'],maxTextLength:2000,maxUploadBytes:25*1024*1024},
 channels:{kinds:['text','voice','video','forum','announcements','stage'],requiresServerPermission:true},
 threads:{states:['active','archived','locked'],replyRequiresMembership:true},
 permissions:{scope:['server','category','channel','thread'],denyOverridesAllow:true,administratorOnlyForTrustedOwners:true},
 invites:{maximumDurationDays:30,allowNonExpiring:true,limitUses:true,revocationRequired:true},
 notifications:{delivery:['in_app','web_push'],respectMute:true,requiresSubscription:true},
 audit_log:{events:['role_change','kick','ban','channel_change','invite_revoke','ownership_transfer'],retentionPolicy:'pending'},
 emoji_stickers:{types:['emoji','animated_emoji','sticker','gif'],ownershipChecks:true},
 uploads:{mimeTypes:['image/png','image/jpeg','image/webp','image/gif','video/mp4'],scanningRequired:true},
 presence:{modes:['online','idle','dnd','invisible'],clientCanOnlySetOwn:true}
});
const keys=Object.keys(CMD_COLLAB_CONTRACTS);
export function describeCmdContract(key){return Object.hasOwn(CMD_COLLAB_CONTRACTS,key)?{id:key,ready:false,spec:structuredClone(CMD_COLLAB_CONTRACTS[key])}:null}
export function checkCmdMessageDraft(draft){
 if(!draft||typeof draft!=='object'||Array.isArray(draft))return {valid:false,reason:'INVALID_DRAFT'};
 const body=typeof draft.text==='string'?draft.text:'';
 if(!body.trim())return {valid:false,reason:'EMPTY_MESSAGE'};
 if(body.length>CMD_COLLAB_CONTRACTS.messages.maxTextLength)return {valid:false,reason:'MESSAGE_TOO_LONG'};
 return {valid:true};
}
export function cmdCollabInstallationStatus(){return {count:keys.length,registered:keys,apiWired:false,databaseMigrated:false,enabled:false}}

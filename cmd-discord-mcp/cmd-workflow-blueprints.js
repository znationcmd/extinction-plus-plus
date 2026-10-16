/**
 * Future social/product workflows. Pure specifications only:
 * no migrations, monetary debit, unsolicited notifications or user data changes.
 */
export const CMD_WORKFLOW_BLUEPRINTS=Object.freeze({
 friends:{states:['none','pending_outgoing','pending_incoming','friends','blocked'],requiresMutualConsent:true},
 groups:{states:['created','invited','joined','left','archived'],requiresMembership:true},
 notifications:{channels:['in_app','browser_push','mobile_push'],deduplicate:true,requiresOptIn:true},
 invitations:{expiryDays:[3,30,null],uses:[1,5,10,null],enforceServerPermission:true},
 season_pass:{periodDays:30,priceStars:9000,claimKey:['user_id','season','tier','day'],purchaseAtomic:true},
 level_rewards:{cooldownSeconds:30,claimKey:['user_id','level'],preventReplay:true},
 cosmetics:{catalogue:['frames','decorations','avatars','animals','vehicles','houses','scenes','backgrounds','banners','nameplates'],preservePurchases:true},
 localization:{languages:['fr','en','de','es','it','ru','co','ko','ja','zh'],persistPreference:true},
 video_studio:{steps:['import','preview','edit','encode','moderate','publish'],rightsCheckRequired:true},
 integrations:{targets:['cmd_hosting','cmd_neuria','cmd_browser','cmdpad','cmd_top_serveur'],externalMutations:false}
});
export function blueprintFor(name){return Object.hasOwn(CMD_WORKFLOW_BLUEPRINTS,name)?structuredClone(CMD_WORKFLOW_BLUEPRINTS[name]):null}
export function workflowReady(name,validation={}){
 if(!blueprintFor(name))return false;
 return validation.implemented===true&&validation.permissionsTested===true&&validation.multiAccountTested===true&&validation.productionTested===true;
}

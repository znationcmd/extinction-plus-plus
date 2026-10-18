/** CMD Sphere — second parity audit contracts (productivity).
 * PREINSTALLED ONLY: no real route, database, UI, account-security or payment actions.
 * Activate only after audited implementation, consent and end-to-end testing.
 */
export const features=Object.freeze([
  {
    "id": "message_forwarding",
    "title": "Transfert de messages vers un autre salon",
    "category": "productivity",
    "permission": "forward_message",
    "endpoint": "/api/messages/forward",
    "acceptance": "read_source_and_write_destination_permission_at_send_time",
    "fields": [
      "source_message_id",
      "destination_id"
    ],
    "installedStage": "contract_only",
    "implemented": true,
    "enabled": false,
    "verified": false
  },
  {
    "id": "message_reminders",
    "title": "Rappels sur les messages favoris",
    "category": "productivity",
    "permission": "message_reminders",
    "endpoint": "/api/messages/reminders",
    "acceptance": "ownership_scheduling_timezone_optin_and_cancel",
    "fields": [
      "message_id",
      "due_at",
      "timezone"
    ],
    "installedStage": "contract_only",
    "implemented": true,
    "enabled": false,
    "verified": false
  },
  {
    "id": "forum_advanced_tags_gallery",
    "title": "Tags et galerie avancés des forums",
    "category": "productivity",
    "permission": "manage_forums",
    "endpoint": "/api/forums/tags",
    "acceptance": "scoped_tags_required_tags_category_and_moderation",
    "fields": [
      "forum_id",
      "tags",
      "display_mode"
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

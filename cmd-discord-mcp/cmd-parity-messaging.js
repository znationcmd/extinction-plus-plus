/* CMD Sphere / Discord gap pre-install: messaging.
 * These are contract definitions, not live routes. Production remains unchanged.
 * New features require explicit security/integration tests before enablement.
 */
export const features=Object.freeze([
  {
    "id": "history_search_filters",
    "title": "Recherche avancée intégrale",
    "category": "messaging",
    "permission": "read_message_history",
    "endpoint": "GET /api/cmd/messages/history-search",
    "acceptance": "db_authorization_at_channel_thread_dm_group_boundaries",
    "fields": [
      "q",
      "author_id",
      "channel_id",
      "after",
      "before",
      "has_file"
    ],
    "stage": "developed_pending_multidevice_and_production_validation",
    "enabled": false,
    "verified": false,
    "implemented": true
  },
  {
    "id": "large_file_upload",
    "title": "Téléversement volumineux fiable",
    "category": "messaging",
    "permission": "attach_files",
    "endpoint": "POST /api/uploads/multipart/start",
    "acceptance": "storage_quota_antivirus_multipart_resume_retention",
    "fields": [
      "content_length",
      "checksum",
      "mime",
      "part_index"
    ],
    "enabled": false,
    "verified": false,
    "implemented": false
  }
].map(f=>Object.freeze({...f,fields:Object.freeze(f.fields)})));
export const category="messaging";
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

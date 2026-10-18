/* CMD Sphere — self-only bounded JSON portability export.
 * No credentials, access tokens, OAuth identities of other people or account hashes.
 * Partial archive: larger histories and binary media need an audited queued exporter.
 * Do not claim a complete GDPR access package from this bounded first version.
 */
const fail=(status,message)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ACCOUNT_EXPORT_SECTION_LIMIT=500;
const validUserId=id=>typeof id==='string'&&id.length>=1&&id.length<=120&&!/[\u0000-\u001f]/.test(id);

const project=(row,keys)=>Object.fromEntries(keys.map(key=>[key,row?.[key]??null]));
function section(rows,keys){
 const source=Array.isArray(rows)?rows:[];
 return {records:source.slice(0,ACCOUNT_EXPORT_SECTION_LIMIT).map(row=>project(row,keys)),
  truncated:source.length>ACCOUNT_EXPORT_SECTION_LIMIT};
}
async function selectOwnRows(pool,sql,userId,keys){
 const output=await pool.query(sql,[userId]);
 return section(output.rows,keys);
}
export async function collectAccountExport(pool,auth,{now=new Date()}={}){
 const userId=String(auth?.user?.id||'');
 if(!validUserId(userId))throw fail(401,'Connexion requise.');
 if(!pool?.query)throw fail(503,'Base de données indisponible.');
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw fail(400,'Date de création invalide.');
 // Explicit column allowlist protects password hashes, cookie/session material,
 // account identities and other users' data. No SELECT * or dynamic table names.
 const profile=await pool.query(`SELECT user_id,display_name,bio,status,accent_color,theme,updated_at
    FROM cmd_global_profiles WHERE user_id=$1 LIMIT 1`,[userId]);
 const account=UUID.test(userId)?await pool.query(`SELECT id::text AS id,username,display_name,created_at,updated_at
    FROM cmd_accounts WHERE id=$1::uuid LIMIT 1`,[userId]):{rows:[]};
 const membership=await selectOwnRows(pool,`SELECT guild_id::text AS "guildId",membership_role AS "role",joined_at AS "joinedAt",
    profile_display_name AS "displayName",profile_bio AS "bio"
    FROM cmd_native_members WHERE user_id=$1 ORDER BY joined_at DESC LIMIT 501`,userId,["guildId","role","joinedAt","displayName","bio"]);
 const serverMessages=await selectOwnRows(pool,`SELECT id::text AS id,guild_id::text AS "guildId",
    channel_id::text AS "channelId",body,created_at AS "createdAt",edited_at AS "editedAt"
    FROM cmd_native_channel_messages WHERE sender_user_id=$1
    ORDER BY created_at DESC,id DESC LIMIT 501`,userId,["id","guildId","channelId","body","createdAt","editedAt"]);
 const directMessages=await selectOwnRows(pool,`SELECT id::text AS id,thread_id::text AS "threadId",body,
    created_at AS "createdAt" FROM cmd_dm_messages WHERE sender_user_id=$1
    ORDER BY created_at DESC,id DESC LIMIT 501`,userId,["id","threadId","body","createdAt"]);
 const groupMessages=await selectOwnRows(pool,`SELECT id::text AS id,group_id::text AS "groupId",body,
    created_at AS "createdAt" FROM cmd_group_dm_messages WHERE sender_user_id=$1
    ORDER BY created_at DESC,id DESC LIMIT 501`,userId,["id","groupId","body","createdAt"]);
 return {
  format:'cmd-sphere-account-data-v1',generatedAt:now.toISOString(),accountId:userId,
  account:account.rows?.[0]?project(account.rows[0],["id","username","display_name","created_at","updated_at"]):null,
  profile:profile.rows?.[0]?project(profile.rows[0],["user_id","display_name","bio","status","accent_color","theme","updated_at"]):null,
  sections:{memberships:membership,serverMessages,directMessages,groupMessages},
  limits:{maxItemsPerSection:ACCOUNT_EXPORT_SECTION_LIMIT,binaryMediaIncluded:false},
  complete:false,
  note:'Export partiel : seules les dernières 500 entrées de chaque rubrique sont incluses. Les pièces jointes, images, achats, abonnements et données archivées ne sont pas inclus. Aucun mot de passe ni jeton de connexion.'
 };
}
export async function handleCmdAccountExport(req,res,url,{pool,auth,sendJson}){
 if(url.pathname!=='/api/account/export-data')return false;
 if(req.method!=='POST'){sendJson(res,405,{error:'Méthode non autorisée.'});return true;}
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true;}
 try{
  const output=await collectAccountExport(pool,auth);
  res.setHeader?.('Cache-Control','private, no-store');
  res.setHeader?.('Content-Disposition','attachment; filename="cmd-sphere-mes-donnees.json"');
  res.setHeader?.('X-Content-Type-Options','nosniff');
  sendJson(res,200,output);
 }catch(err){sendJson(res,err.status||500,{error:err.status?err.message:'Export indisponible.'})}
 return true;
}

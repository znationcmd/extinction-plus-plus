/* CMD Sphere: real account block and friend-request privacy.
 * Additive SQL only; never remove accounts, friendships, messages or media.
 */
const ACCOUNT_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad=(message,status=400)=>Object.assign(new Error(message),{status});
export function requireAccountId(value){
 const id=String(value||"").trim();if(!ACCOUNT_ID.test(id))throw bad("Identifiant de compte invalide.");
 return id;
}
export async function initCmdSocialPrivacy(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_user_blocks(
  blocker_user_id TEXT NOT NULL,
  blocked_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(blocker_user_id,blocked_user_id),
  CHECK(blocker_user_id<>blocked_user_id)
 )`);
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_user_blocks_blocked_idx ON cmd_user_blocks(blocked_user_id,blocker_user_id)");
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_friend_request_privacy(
  user_id TEXT PRIMARY KEY,
  allow_everyone BOOLEAN NOT NULL DEFAULT TRUE,
  allow_shared_servers BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
}
export async function isBlockedPair(pool,userA,userB){
 const a=requireAccountId(userA),b=requireAccountId(userB);
 if(a===b)return false;
 const found=await pool.query(`SELECT 1 FROM cmd_user_blocks WHERE
  (blocker_user_id=$1 AND blocked_user_id=$2) OR
  (blocker_user_id=$2 AND blocked_user_id=$1) LIMIT 1`,[a,b]);
 return found.rows.length>0;
}
export async function assertNotBlocked(pool,userA,userB){
 if(await isBlockedPair(pool,userA,userB))throw bad("Cette interaction est indisponible pour des raisons de confidentialité.",403);
}
export async function listAccountBlocks(pool,userId){
 const uid=requireAccountId(userId);
 const r=await pool.query(`SELECT b.blocked_user_id AS user_id,b.created_at,
     COALESCE(a.display_name,a.username,'Utilisateur') AS display_name,a.username
   FROM cmd_user_blocks b
   LEFT JOIN cmd_accounts a ON a.id::text=b.blocked_user_id
   WHERE b.blocker_user_id=$1 ORDER BY b.created_at DESC LIMIT 500`,[uid]);
 return r.rows.map(x=>({userId:String(x.user_id),displayName:String(x.display_name||"Utilisateur"),username:x.username||null,createdAt:x.created_at}));
}
export async function setAccountBlock(pool,userId,targetId,action){
 const me=requireAccountId(userId),other=requireAccountId(targetId);
 if(me===other)throw bad("Impossible de te bloquer toi-même.");
 if(!["block","unblock"].includes(action))throw bad("Action de blocage invalide.");
 if(action==="block"){
  const target=await pool.query("SELECT id FROM cmd_accounts WHERE id::text=$1 LIMIT 1",[other]);
  if(!target.rows.length)throw bad("Utilisateur introuvable.",404);
  await pool.query("INSERT INTO cmd_user_blocks(blocker_user_id,blocked_user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[me,other]);
 }else{
  await pool.query("DELETE FROM cmd_user_blocks WHERE blocker_user_id=$1 AND blocked_user_id=$2",[me,other]);
 }
 return {ok:true,targetUserId:other,blocked:action==="block"};
}
export async function getFriendRequestPrivacy(pool,userId){
 const uid=requireAccountId(userId);
 const r=await pool.query("SELECT allow_everyone,allow_shared_servers FROM cmd_friend_request_privacy WHERE user_id=$1",[uid]);
 return {allowEveryone:r.rows[0]?.allow_everyone!==false,allowSharedServers:r.rows[0]?.allow_shared_servers!==false};
}
export async function updateFriendRequestPrivacy(pool,userId,input){
 const uid=requireAccountId(userId);
 if(!input||typeof input!=="object"||typeof input.allowEveryone!=="boolean"||typeof input.allowSharedServers!=="boolean")
  throw bad("Paramètres de confidentialité invalides.");
 const r=await pool.query(`INSERT INTO cmd_friend_request_privacy(user_id,allow_everyone,allow_shared_servers)
   VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET
   allow_everyone=EXCLUDED.allow_everyone,allow_shared_servers=EXCLUDED.allow_shared_servers,
   updated_at=NOW() RETURNING allow_everyone,allow_shared_servers`,[uid,input.allowEveryone,input.allowSharedServers]);
 return {allowEveryone:r.rows[0].allow_everyone,allowSharedServers:r.rows[0].allow_shared_servers};
}
export async function assertFriendRequestPermitted(pool,requesterId,targetId){
 const sender=requireAccountId(requesterId),target=requireAccountId(targetId);
 await assertNotBlocked(pool,sender,target);
 const pref=await getFriendRequestPrivacy(pool,target);
 if(pref.allowEveryone)return true;
 if(pref.allowSharedServers){
  const shared=await pool.query(`SELECT 1 FROM cmd_native_members m
   JOIN cmd_native_members t ON t.guild_id=m.guild_id
   WHERE m.user_id=$1 AND t.user_id=$2 LIMIT 1`,[sender,target]);
  if(shared.rows.length)return true;
 }
 throw bad("Cette personne ne reçoit pas de demandes d'ami de ce compte.",403);
}

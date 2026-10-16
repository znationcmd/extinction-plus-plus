/* Read-only CMD Sphere member cards. Shared guilds only, no external Discord writes. */
export async function publicPersonCard(pool,auth,input={}){
 const viewer=String(auth.user.id),raw=String(input.userId||input.username||"").trim().slice(0,100);
 if(!raw)throw Object.assign(new Error("Compte requis"),{status:400});
 const result=await pool.query(`SELECT a.id,a.username,a.display_name,a.created_at,
     gp.avatar_data_url,gp.banner_data_url,gp.bio,gp.status,gp.accent_color,gp.avatar_decoration,gp.profile_frame,gp.profile_effect
   FROM cmd_accounts a LEFT JOIN cmd_global_profiles gp ON gp.user_id=a.id::text
   WHERE a.id::text=$1 OR a.username_key=$2 LIMIT 1`,[raw,raw.toLowerCase()]);
 const u=result.rows[0];if(!u)throw Object.assign(new Error("Profil introuvable"),{status:404});
 const id=String(u.id);
 const [friends,requests,common]=await Promise.all([
   pool.query("SELECT created_at FROM cmd_friendships WHERE user_low=$1 AND user_high=$2 LIMIT 1",[...[viewer,id].sort()]),
   pool.query("SELECT requester_user_id,id FROM cmd_friend_requests WHERE status='pending' AND ((requester_user_id=$1 AND target_user_id=$2) OR (requester_user_id=$2 AND target_user_id=$1)) LIMIT 1",[viewer,id]),
   pool.query(`SELECT g.id,g.name,m2.joined_at,m2.membership_role
     FROM cmd_native_members m1
     JOIN cmd_native_members m2 ON m1.guild_id=m2.guild_id AND m2.user_id=$2
     JOIN cmd_native_guilds g ON g.id=m1.guild_id
     WHERE m1.user_id=$1 ORDER BY g.name LIMIT 30`,[viewer,id])
 ]);
 let friendStatus=id===viewer?"self":friends.rows.length?"friends":"none";
 if(friendStatus==="none"&&requests.rows.length)friendStatus=String(requests.rows[0].requester_user_id)===viewer?"sent":"received";
 const guildId=String(input.guildId||"");
 const same=common.rows.find(g=>String(g.id)===guildId)||common.rows[0]||null;
 let roles=[],guildProfile=null;
 if(same){
   const [allRoles,member]=await Promise.all([
     pool.query(`SELECT r.name,r.color FROM cmd_native_member_roles mr JOIN cmd_native_roles r ON r.id=mr.role_id
       WHERE mr.guild_id=$1 AND mr.user_id=$2 AND r.name<>'@everyone' ORDER BY r.position DESC LIMIT 15`,[String(same.id),id]),
     pool.query(`SELECT profile_display_name,profile_avatar_data_url,profile_banner_data_url,profile_bio,profile_status
       FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2 LIMIT 1`,[String(same.id),id])
   ]);
   roles=allRoles.rows.map(r=>({name:String(r.name),color:/^#[0-9a-f]{6}$/i.test(r.color||"")?r.color:"#8895b0"}));
   guildProfile=member.rows[0]||null;
   if(same.membership_role==="owner")roles.unshift({name:"Propriétaire",color:"#e5b754"});
 }
 return {id,username:u.username,displayName:guildProfile?.profile_display_name||u.display_name||u.username,
   avatar:guildProfile?.profile_avatar_data_url||u.avatar_data_url||null,
   banner:guildProfile?.profile_banner_data_url||u.banner_data_url||null,
   bio:guildProfile?.profile_bio||u.bio||"",status:guildProfile?.profile_status||u.status||"",
   accentColor:/^#[0-9a-f]{6}$/i.test(u.accent_color||"")?u.accent_color:"#7c3aed",
   avatarDecoration:/^[a-z0-9-]{1,60}$/.test(u.avatar_decoration||'')?u.avatar_decoration:null,profileFrame:/^[a-z0-9-]{1,60}$/.test(u.profile_frame||'')?u.profile_frame:null,profileEffect:/^[a-z0-9-]{1,60}$/.test(u.profile_effect||'')?u.profile_effect:null,
   createdAt:u.created_at,friendStatus,friendRequestId:friendStatus==="received"?requests.rows[0]?.id:null,
   friendshipSince:friends.rows[0]?.created_at||null,commonServerCount:common.rows.length,
   commonServers:common.rows.map(g=>({id:String(g.id),name:String(g.name)})),
   joinedGuildAt:same?.joined_at||null,roles,activeGuildId:same?String(same.id):null};
}

import {readFileSync} from 'node:fs';
/* Read-only CMD Sphere member cards. Shared guilds only, no external Discord writes. */
// Use the exact same installed catalogues as the private profile editor.
let publicCatalogue=null;
function publicAssets(){
 if(publicCatalogue)return publicCatalogue;
 const read=(file)=>{try{return JSON.parse(readFileSync(new URL(file,import.meta.url),"utf8"))}catch{return null}};
 const catalogue=read("./public/universe/v1/manifest.json")||{};
 const hd=read("./cmd-hd-scenes.json")||[];
 const restored=read("./public/cmd-restored-fonds/manifest.json")||[];
 const byKind={scene:[...(catalogue.scenes||[]),...(Array.isArray(hd)?hd:[]),...(Array.isArray(restored)?restored:[])],pet:catalogue.pets||[],vehicle:catalogue.vehicles||[],home:catalogue.homes||[]};
 publicCatalogue=Object.fromEntries(Object.entries(byKind).map(([kind,items])=>[kind,new Map(items.filter(x=>x?.id&&x?.src).map(x=>[String(x.id),String(x.src)]))]));
 return publicCatalogue;
}
function publicAsset(kind,id){
 const src=publicAssets()[kind]?.get(String(id||''))||'';
 return /^\/(?:universe\/|cmd-restored-fonds\/)[a-z0-9_./-]+\.(?:png|webp|svg|jpg|jpeg)$/i.test(src)&&!src.includes('..')?src:null;
}
const LEGACY_PET_IDS={"dog":1,"cat":2,"fox":4,"bird":30,"flamingo":65,"rabbit":19,"wolf":51,"turtle":25,"hamster":18,"panda":5,"lion":68,"penguin":6,"dolphin":27,"shark":31,"butterfly":70,"dragon":9,"dog-spotted":41,"dog-golden":16,"dog-husky":51,"dog-puppy":76,"cat-tabby":59,"cat-blue":47,"cat-ginger":3,"cat-black":42,"cat-siamese":44,"dog-bulldog":75,"dog-terrier":40,"dog-shepherd":54,"dog-pug":138};
const LEGACY_VEHICLE_IDS={"compact":1,"sportscar":2,"convertible":26,"scooter":4,"motorcycle":5,"van":16,"truck":22,"kart":27,"boat":6,"plane":7,"rocket":34,"sedan":83,"suv":3,"jeep":22,"limousine":41,"bus":146,"camper":145,"helicopter":8,"jetski":137,"yacht":46};
const LEGACY_SCENE_PHOTOS={"forest":"photo-1448375240586-882707db888b","neonforest":"photo-1448375240586-882707db888b","beach":"photo-1507525428034-b723cf961d3e","seaside":"photo-1473116763249-2faaef81ccda","waterfall":"photo-1432405972618-c60b0225b8f9","city":"photo-1519501025264-65ba15a82390","night":"photo-1519681393784-d120267933ba","space":"photo-1462331940025-496dfbfc7564","mountains":"photo-1464822759023-fed622ff2c3b","chalet":"photo-1449158743715-0a90ebb6d2d8","desert":"photo-1509316785289-025f5b846b35","garden":"photo-1490750967868-88aa4486c946","sunset":"photo-1472120435266-53107fd0c44a","rain":"photo-1515694346937-94d85e41e6f0","snowfall":"photo-1483664852095-d6cc6870702d","aurora":"photo-1531366936337-7c912a4589a7","underwater":"photo-1546026423-cc4642628d2b","palace":"photo-1590490360182-c33d57733427"};
function publicLegacyAsset(kind,id){
 const name=String(id||'');
 if(kind==='scene'&&LEGACY_SCENE_PHOTOS[name])return 'https://images.unsplash.com/'+LEGACY_SCENE_PHOTOS[name]+'?w=1920&auto=format&fit=crop&q=90';
 const list=kind==='pet'?LEGACY_PET_IDS:kind==='vehicle'?LEGACY_VEHICLE_IDS:null;
 if(list&&Object.prototype.hasOwnProperty.call(list,name))return '/universe/v1/'+kind+'-'+String(list[name]).padStart(3,'0')+'.png';
 return null;
}
export async function publicPersonCard(pool,auth,input={}){
 const viewer=String(auth.user.id),raw=String(input.userId||input.username||"").trim().slice(0,100);
 if(!raw)throw Object.assign(new Error("Compte requis"),{status:400});
 const result=await pool.query(`SELECT a.id,a.username,a.display_name,a.created_at,
     gp.avatar_data_url,gp.banner_data_url,gp.bio,gp.status,gp.accent_color,gp.avatar_decoration,gp.profile_frame,gp.profile_effect,gp.nameplate_style
   FROM cmd_accounts a LEFT JOIN cmd_global_profiles gp ON gp.user_id=a.id::text
   WHERE a.id::text=$1 OR a.username_key=$2 LIMIT 1`,[raw,raw.toLowerCase()]);
 const u=result.rows[0];if(!u)throw Object.assign(new Error("Profil introuvable"),{status:404});
 const id=String(u.id);
 const [friends,requests,common,mutual]=await Promise.all([
   pool.query("SELECT created_at FROM cmd_friendships WHERE user_low=$1 AND user_high=$2 LIMIT 1",[...[viewer,id].sort()]),
   pool.query("SELECT requester_user_id,id FROM cmd_friend_requests WHERE status='pending' AND ((requester_user_id=$1 AND target_user_id=$2) OR (requester_user_id=$2 AND target_user_id=$1)) LIMIT 1",[viewer,id]),
   pool.query(`SELECT g.id,g.name,m2.joined_at,m2.membership_role
     FROM cmd_native_members m1
     JOIN cmd_native_members m2 ON m1.guild_id=m2.guild_id AND m2.user_id=$2
     JOIN cmd_native_guilds g ON g.id=m1.guild_id
     WHERE m1.user_id=$1 ORDER BY g.name LIMIT 30`,[viewer,id]),
   pool.query(`WITH viewer_friends AS (
       SELECT CASE WHEN user_low=$1 THEN user_high ELSE user_low END AS friend_id
       FROM cmd_friendships WHERE user_low=$1 OR user_high=$1
     ), member_friends AS (
       SELECT CASE WHEN user_low=$2 THEN user_high ELSE user_low END AS friend_id
       FROM cmd_friendships WHERE user_low=$2 OR user_high=$2
     )
     SELECT a.id::text AS id,a.username,
       COALESCE(NULLIF(gp.display_name,''),NULLIF(a.display_name,''),a.username) AS display_name,
       gp.avatar_data_url AS avatar,
       COUNT(*) OVER() AS total
     FROM viewer_friends vf JOIN member_friends mf USING(friend_id)
     JOIN cmd_accounts a ON a.id::text=vf.friend_id
     LEFT JOIN cmd_global_profiles gp ON gp.user_id=vf.friend_id
     WHERE NOT EXISTS (
       SELECT 1 FROM cmd_user_blocks b
       WHERE (b.blocker_user_id=$1 AND b.blocked_user_id=vf.friend_id)
          OR (b.blocked_user_id=$1 AND b.blocker_user_id=vf.friend_id)
     )
     ORDER BY display_name ASC LIMIT 24`,[viewer,id])
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
 const card={id,username:u.username,displayName:guildProfile?.profile_display_name||u.display_name||u.username,
   avatar:guildProfile?.profile_avatar_data_url||u.avatar_data_url||null,
   banner:guildProfile?.profile_banner_data_url||u.banner_data_url||null,
   bio:guildProfile?.profile_bio||u.bio||"",status:guildProfile?.profile_status||u.status||"",
   accentColor:/^#[0-9a-f]{6}$/i.test(u.accent_color||"")?u.accent_color:"#7c3aed",
   avatarDecoration:/^[a-z0-9-]{1,60}$/.test(u.avatar_decoration||'')?u.avatar_decoration:null,profileFrame:/^[a-z0-9-]{1,60}$/.test(u.profile_frame||'')?u.profile_frame:null,profileEffect:/^[a-z0-9-]{1,60}$/.test(u.profile_effect||'')?u.profile_effect:null,nameplateStyle:/^[a-z0-9-]{1,60}$/.test(u.nameplate_style||'')?u.nameplate_style:null,
   createdAt:u.created_at,friendStatus,friendRequestId:friendStatus==="received"?requests.rows[0]?.id:null,
   friendshipSince:friends.rows[0]?.created_at||null,commonServerCount:common.rows.length,
   mutualFriendCount:Number(mutual.rows[0]?.total||0),
   mutualFriends:mutual.rows.map(f=>({id:String(f.id),username:f.username,displayName:f.display_name||f.username,avatar:f.avatar||null})),
   commonServers:common.rows.map(g=>({id:String(g.id),name:String(g.name)})),
   joinedGuildAt:same?.joined_at||null,roles,activeGuildId:same?String(same.id):null};
 if(input.includeScene){
   // An authenticated viewer may see the member's saved character, scene and pet.
   // This separate opt-in read keeps large photos out of message-list decoration calls.
   const sceneRow=await pool.query("SELECT cmd_avatar_scene,cmd_avatar_scene_image,cmd_avatar_character_image,cmd_avatar_pet_image FROM cmd_global_profiles WHERE user_id=$1 LIMIT 1",[id]);
   const record=sceneRow.rows[0]||{};
   const state=record.cmd_avatar_scene&&typeof record.cmd_avatar_scene==='object'&&!Array.isArray(record.cmd_avatar_scene)?{...record.cmd_avatar_scene}:{};
   if(state.hideHome!==false)delete state.home;
   const sceneKey=String(state.scene||'none'),petKey=String(state.pet||'none');
   card.avatarScene=state;
   card.sceneBackground=sceneKey==='custom'?(record.cmd_avatar_scene_image||null):(publicAsset('scene',sceneKey)||publicLegacyAsset('scene',sceneKey));
   card.sceneCharacterImage=state.avatarStyle==='photo'?record.cmd_avatar_character_image||null:null;
   card.scenePetImage=state.petStyle==='photo'&&petKey!=='none'?record.cmd_avatar_pet_image||null:null;
   card.scenePetArt=petKey!=='none'?(publicAsset('pet',petKey)||publicLegacyAsset('pet',petKey)):null;
   card.sceneVehicleArt=state.vehicle&&state.vehicle!=='none'?(publicAsset('vehicle',state.vehicle)||publicLegacyAsset('vehicle',state.vehicle)):null;
   card.sceneHomeArt=state.hideHome===false&&state.home&&state.home!=='none'?publicAsset('home',state.home):null;
 }
 return card;
}

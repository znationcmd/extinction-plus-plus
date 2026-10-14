/* CMD Sphere — isolated invites for each native community.
 * Invites grant access to exactly one guild. Expiry and revocation are enforced in PostgreSQL.
 */
import crypto from "node:crypto";
const CODE=/^[a-zA-Z0-9_-]{4,80}$/;
const ID=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
export function normalizeInviteCode(value){
 const raw=String(value??"").trim();
 if(!raw)return "";
 return raw.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
  .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").replace(/-{2,}/g,"-");
}
export const inviteExpiry=(period,now=new Date())=>{
 const durations={"30m":1800000,"1h":3600000,"6h":21600000,"12h":43200000,"1d":86400000,"3d":259200000,"7d":604800000,"30d":2592000000};
 if(period==="never")return null;
 if(!Object.prototype.hasOwnProperty.call(durations,period))throw Object.assign(new Error("Durée d’invitation invalide."),{status:400});
 return new Date(now.getTime()+durations[period]);
};
export async function initCmdNativeInvites(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_invites (
   code TEXT PRIMARY KEY,
   guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
   creator_id TEXT,
   label TEXT NOT NULL DEFAULT '',
   expires_at TIMESTAMPTZ,
   revoked_at TIMESTAMPTZ,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   uses INTEGER NOT NULL DEFAULT 0,
   max_uses INTEGER,
   last_used_at TIMESTAMPTZ
 )`);
 await pool.query("ALTER TABLE cmd_native_invites ADD COLUMN IF NOT EXISTS max_uses INTEGER");
 await pool.query("ALTER TABLE cmd_native_invites ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ");
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_native_invites_guild_idx ON cmd_native_invites(guild_id,created_at DESC)");
 // Convert pre-existing permanent links exactly once. They are now visible to
 // server administrators and can be revoked, rather than bypassing expiry checks.
 await pool.query(`INSERT INTO cmd_native_invites(code,guild_id,creator_id,label)
 SELECT g.invite_code,g.id,g.owner_user_id,'Lien historique'
 FROM cmd_native_guilds g WHERE g.invite_code IS NOT NULL
 ON CONFLICT (code) DO NOTHING`);
}
export async function activeInviteForGuild(pool,guildId){
 const r=await pool.query(`SELECT code FROM cmd_native_invites
 WHERE guild_id=$1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>NOW()) AND (max_uses IS NULL OR uses<max_uses)
 ORDER BY created_at DESC LIMIT 1`,[guildId]);return r.rows[0]?.code||null;
}
export async function previewNativeInvite(pool,raw){
 const code=String(raw||"").trim();
 if(!CODE.test(code))throw Object.assign(new Error("Invitation CMD Sphere invalide."),{status:404});
 const r=await pool.query(`SELECT g.id,g.name,g.icon,
 (SELECT COUNT(*)::int FROM cmd_native_members m WHERE m.guild_id=g.id) AS member_count,
 i.expires_at FROM cmd_native_invites i
 JOIN cmd_native_guilds g ON g.id=i.guild_id
 WHERE i.code=$1 AND i.revoked_at IS NULL
 AND (i.expires_at IS NULL OR i.expires_at>NOW()) AND (i.max_uses IS NULL OR i.uses<i.max_uses) LIMIT 1`,[code]);
 if(!r.rows[0])throw Object.assign(new Error("Ce lien d’invitation est expiré ou désactivé."),{status:410});
 return r.rows[0];
}
export async function joinNativeInvite(pool,auth,raw){
 const code=String(raw||"").trim();
 if(!CODE.test(code))throw Object.assign(new Error("Invitation CMD Sphere invalide."),{status:400});
 const user=String(auth?.user?.id||"");
 if(!user)throw Object.assign(new Error("Connecte-toi pour rejoindre ce serveur."),{status:401});
 // Guard against use after expiry, including concurrent joins and revocations.
 const client=await pool.connect();let started=false;
 try{
  await client.query("BEGIN");started=true;
  const qr=await client.query(`SELECT g.id,g.name FROM cmd_native_invites i
    JOIN cmd_native_guilds g ON g.id=i.guild_id
    WHERE i.code=$1 AND i.revoked_at IS NULL
    AND (i.expires_at IS NULL OR i.expires_at>NOW()) AND (i.max_uses IS NULL OR i.uses<i.max_uses) FOR UPDATE OF i`,[code]);
  const g=qr.rows[0];if(!g)throw Object.assign(new Error("Ce lien d’invitation est expiré ou désactivé."),{status:410});
  const inserted=await client.query(`INSERT INTO cmd_native_members(guild_id,user_id,membership_role,profile_display_name)
    VALUES($1,$2,'member',$3) ON CONFLICT(guild_id,user_id) DO NOTHING RETURNING user_id`,
    [g.id,user,String(auth.user.displayName||auth.user.name||"Membre").slice(0,80)]);
  // A returning member must not consume another limited invite use.
  if(inserted.rowCount)await client.query("UPDATE cmd_native_invites SET uses=uses+1,last_used_at=NOW() WHERE code=$1",[code]);
  await client.query("COMMIT");started=false;
  return g;
 }catch(e){if(started)await client.query("ROLLBACK");throw e}finally{client.release()}
}
export async function handleCmdNativeInvites(req,res,url,ctx){
 const {pool,auth,baseUrl,sendJson,readBody,requireNativeMember,requireNativeAdmin}=ctx;
 const path=url.pathname;
 if(path!=="/api/native/invites"&&path!=="/api/native/invites/revoke")return false;
 if(!auth?.user?.id){sendJson(res,401,{error:"Connecte-toi à CMD Sphere."});return true}
 const fail=e=>sendJson(res,e.status||(/permission|membre/i.test(e.message)?403:400),{error:String(e.message||"Invitation indisponible")});
 try{
  if(path==="/api/native/invites"&&req.method==="GET"){
   const id=String(url.searchParams.get("guildId")||"");
   if(!ID.test(id)){sendJson(res,400,{error:"Identifiant du serveur invalide"});return true}
   const m=await requireNativeMember(auth,id),canManage=["owner","admin"].includes(String(m.membership_role));
   const r=await pool.query(`SELECT i.code,i.label,i.expires_at,i.created_at,i.uses,i.max_uses,i.last_used_at,i.revoked_at FROM cmd_native_invites i
    WHERE i.guild_id=$1 AND ($2::boolean OR (i.revoked_at IS NULL AND (i.expires_at IS NULL OR i.expires_at>NOW()) AND (i.max_uses IS NULL OR i.uses<i.max_uses)))
    ORDER BY i.created_at DESC LIMIT 100`,[id,canManage]);
   const invites=r.rows.map(row=>({
     code:row.code,url:baseUrl+"/invite/"+encodeURIComponent(row.code),
     label:row.label,expiresAt:row.expires_at,createdAt:row.created_at,
     revoked:!!row.revoked_at,expired:!!row.expires_at&&new Date(row.expires_at)<=new Date(),
     uses:row.uses,maxUses:row.max_uses,remainingUses:row.max_uses===null?null:Math.max(0,row.max_uses-row.uses),lastUsedAt:row.last_used_at,exhausted:row.max_uses!==null&&row.uses>=row.max_uses
   }));
   sendJson(res,200,{guildId:id,canManage,invites});return true;
  }
  if(path==="/api/native/invites"&&req.method==="POST"){
   const body=await readBody(req),id=String(body.guildId||"");
   if(!ID.test(id)){sendJson(res,400,{error:"Identifiant du serveur invalide"});return true}
   await requireNativeAdmin(auth,id);
   const period=String(body.expiry??"30d");
   const expiresAt=inviteExpiry(({"3":"3d","30":"30d"})[period]||period);
   const maxUses=body.maxUses==null||body.maxUses===""?null:Number(body.maxUses);
   if(maxUses!==null&&(!Number.isInteger(maxUses)||maxUses<1||maxUses>10000)){sendJson(res,400,{error:"Utilisations maximum : de 1 à 10 000, ou illimité."});return true}
   const requested=String(body.customCode||"").trim();
   const custom=normalizeInviteCode(requested);
   if(requested&&(custom.length<4||custom.length>40)){sendJson(res,400,{error:"Ton lien personnalisé doit contenir entre 4 et 40 lettres ou chiffres. Les espaces sont convertis en tirets."});return true}
   const code=custom||crypto.randomBytes(18).toString("base64url");
   const label=String(body.label||"Invitation").trim().slice(0,70);
   try{
    await pool.query(`INSERT INTO cmd_native_invites(code,guild_id,creator_id,label,expires_at,max_uses)
    VALUES($1,$2,$3,$4,$5,$6)`,[code,id,String(auth.user.id),label,expiresAt,maxUses]);
   }catch(e){if(e.code==="23505"){sendJson(res,409,{error:"Ce lien personnalisé existe déjà. Essaie un autre nom."});return true}throw e}
   sendJson(res,201,{ok:true,guildId:id,code,url:baseUrl+"/invite/"+encodeURIComponent(code),expiresAt,maxUses});return true;
  }
  if(path==="/api/native/invites/revoke"&&req.method==="POST"){
   const body=await readBody(req),id=String(body.guildId||""),code=String(body.code||"");
   if(!ID.test(id)||!CODE.test(code)){sendJson(res,400,{error:"Invitation invalide"});return true}
   await requireNativeAdmin(auth,id);
   const r=await pool.query(`UPDATE cmd_native_invites SET revoked_at=NOW()
      WHERE guild_id=$1 AND code=$2 AND revoked_at IS NULL RETURNING code`,[id,code]);
   sendJson(res,r.rows.length?200:404,r.rows.length?{ok:true}:{error:"Invitation introuvable"});return true;
  }
  sendJson(res,405,{error:"Méthode non autorisée"});return true;
 }catch(e){fail(e);return true}
}

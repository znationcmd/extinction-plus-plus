/* CMD Sphere local forum tags and gallery display preferences.
 * Additive per-forum data; does not alter existing messages, membership or ownership.
 * The caller must verify membership on reads and manageChannels on writes.
 */
const invalid=(message,status=400)=>Object.assign(new Error(message),{status});
const validUuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s||""));
export function normalizeForumTags(input){
 if(!Array.isArray(input)||input.length>20)throw invalid("Choisis au maximum 20 tags.");
 const seen=new Set(),tags=[];
 for(const item of input){
  if(!item||typeof item!=="object"||Array.isArray(item))throw invalid("Tag de forum invalide.");
  const name=String(item.name||"").trim(),color=String(item.color||"#9863d5");
  if(!name||name.length>32||/[<>\u0000-\u001F]/.test(name))throw invalid("Nom de tag invalide.");
  if(!/^#[0-9a-f]{6}$/i.test(color))throw invalid("Couleur du tag invalide.");
  const slug=name.toLocaleLowerCase("fr").normalize("NFKC");
  if(seen.has(slug))throw invalid("Tags en double.");
  seen.add(slug);tags.push({name,color:color.toLowerCase()});
 }
 return tags;
}
export async function initCmdForumTags(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_forum_settings(
    channel_id UUID PRIMARY KEY REFERENCES cmd_native_channels(id) ON DELETE CASCADE,
    guild_id UUID NOT NULL REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    gallery BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
 await pool.query("CREATE INDEX IF NOT EXISTS cmd_native_forum_settings_guild_idx ON cmd_native_forum_settings(guild_id)");
}
export async function getCmdForumSettings(pool,auth,guildId,channelId,lookup,requireMember){
 if(!auth?.user?.id)throw invalid("Connexion requise.",401);
 if(!validUuid(guildId))throw invalid("Serveur invalide.");
 await requireMember(auth,String(guildId));
 const forum=await lookup(String(guildId),String(channelId));
 if(!forum||forum.type!=="forum")throw invalid("Salon forum introuvable.",404);
 const row=await pool.query("SELECT tags,gallery FROM cmd_native_forum_settings WHERE guild_id=$1 AND channel_id=$2",
    [String(guildId),String(forum.id)]);
 return {guildId:String(guildId),channelId:String(forum.id),
  tags:Array.isArray(row.rows[0]?.tags)?row.rows[0].tags:[],
  gallery:row.rows[0]?.gallery===true};
}
export async function setCmdForumSettings(pool,auth,input,lookup,requirePermission){
 if(!auth?.user?.id)throw invalid("Connexion requise.",401);
 if(!input||typeof input!=="object"||Array.isArray(input))throw invalid("Paramètres de forum invalides.");
 const guildId=String(input.guildId||""),channelId=String(input.channelId||"");
 if(!validUuid(guildId))throw invalid("Serveur invalide.");
 await requirePermission(auth,guildId,"manageChannels");
 const forum=await lookup(guildId,channelId);
 if(!forum||forum.type!=="forum")throw invalid("Salon forum introuvable.",404);
 if(typeof input.gallery!=="boolean")throw invalid("Mode galerie invalide.");
 const tags=normalizeForumTags(input.tags);
 const updated=await pool.query(`INSERT INTO cmd_native_forum_settings(channel_id,guild_id,tags,gallery)
    VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(channel_id) DO UPDATE SET
    tags=EXCLUDED.tags,gallery=EXCLUDED.gallery,updated_at=NOW()
    WHERE cmd_native_forum_settings.guild_id=EXCLUDED.guild_id
    RETURNING tags,gallery`,[String(forum.id),guildId,JSON.stringify(tags),input.gallery]);
 if(!updated.rows.length)throw invalid("Forum non modifiable.",403);
 return {ok:true,guildId,channelId:String(forum.id),tags:updated.rows[0].tags,gallery:updated.rows[0].gallery};
}

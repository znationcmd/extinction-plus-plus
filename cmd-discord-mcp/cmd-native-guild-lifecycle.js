// CMD Sphere native server ownership actions.
// Invoked only on explicit user requests; never touches linked Discord servers.
export async function leaveNativeGuild(pool,auth,input){
 const guildId=String(input.guildId||""),userId=String(auth.user.id);
 const m=await pool.query("SELECT m.membership_role,g.owner_user_id FROM cmd_native_members m JOIN cmd_native_guilds g ON g.id=m.guild_id WHERE m.guild_id=$1 AND m.user_id=$2 LIMIT 1",[guildId,userId]);
 if(!m.rows.length)throw Error("Tu n'es pas membre de ce serveur.");
 if(String(m.rows[0].owner_user_id)===userId||m.rows[0].membership_role==="owner")throw Error("Le propriétaire doit d'abord transférer ou supprimer le serveur.");
 const deleted=await pool.query("DELETE FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2 AND membership_role<>'owner' AND EXISTS(SELECT 1 FROM cmd_native_guilds g WHERE g.id=$1 AND g.owner_user_id<>$2) RETURNING user_id",[guildId,userId]);
 if(!deleted.rowCount)throw Error("Départ impossible : vérifie les droits du propriétaire.");
 return {ok:true,left:true,guildId};
}
export async function transferNativeGuildOwner(pool,auth,input){
 const guildId=String(input.guildId||""),oldOwner=String(auth.user.id),newOwner=String(input.userId||"");
 if(!guildId||!newOwner||newOwner===oldOwner||input.confirmTransfer!==true)throw Error("Choisis un autre membre et confirme.");
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  const r=await client.query("SELECT id,name,owner_user_id,source_discord_id FROM cmd_native_guilds WHERE id=$1 FOR UPDATE",[guildId]);
  const guild=r.rows[0];
  if(!guild||String(guild.owner_user_id)!==oldOwner)throw Error("Seul le propriétaire peut transférer le serveur.");
  if(guild.source_discord_id)throw Error("Transfert indisponible pour une copie importée de Discord.");
  if(String(input.confirmName||"")!==guild.name)throw Error("Le nom du serveur ne correspond pas.");
  const target=await client.query("SELECT user_id FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2 FOR UPDATE",[guildId,newOwner]);
  if(!target.rows.length)throw Error("Le nouveau propriétaire doit avoir rejoint le serveur.");
  await client.query("UPDATE cmd_native_members SET membership_role='member' WHERE guild_id=$1 AND user_id=$2",[guildId,oldOwner]);
  await client.query("UPDATE cmd_native_members SET membership_role='owner' WHERE guild_id=$1 AND user_id=$2",[guildId,newOwner]);
  await client.query("UPDATE cmd_native_guilds SET owner_user_id=$2,updated_at=NOW() WHERE id=$1",[guildId,newOwner]);
  await client.query("COMMIT");
  return {ok:true,transferred:true,guildId,newOwnerId:newOwner};
 }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
}
export async function deleteNativeGuild(pool,auth,input){
 const guildId=String(input.guildId||""),uid=String(auth.user.id);
 if(input.confirmDelete!==true||input.confirmPhrase!=="SUPPRIMER")throw Error("La confirmation SUPPRIMER est obligatoire.");
 const row=await pool.query("SELECT name,source_discord_id FROM cmd_native_guilds WHERE id=$1 AND owner_user_id=$2",[guildId,uid]);
 if(!row.rows.length)throw Error("Seul le propriétaire peut supprimer son serveur.");
 if(row.rows[0].source_discord_id)throw Error("Les copies importées de Discord sont protégées contre la suppression.");
 if(String(input.confirmName||"")!==row.rows[0].name)throw Error("Saisis exactement le nom du serveur.");
 const deleted=await pool.query("DELETE FROM cmd_native_guilds WHERE id=$1 AND owner_user_id=$2 AND name=$3 AND source_discord_id IS NULL RETURNING id",[guildId,uid,row.rows[0].name]);
 if(!deleted.rowCount)throw Error("La suppression a été bloquée. Réessaie après actualisation.");
 return {ok:true,deleted:true,guildId};
}

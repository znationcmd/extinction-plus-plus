/* CMD Sphere native member onboarding — self-selected SAFE roles only.
 * Opt-in owner configuration, one-time member choice; never remove role grants.
 * Existing permissions and membership guards must be supplied by server.js.
 */
const failure=(status,message)=>Object.assign(new Error(message),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowed=new Set(['viewChannels','sendMessages','readHistory','connect','speak',
 'addReactions','attachFiles','embedLinks','useExternalEmoji','useExternalStickers',
 'useVoiceActivity','changeNickname','createThreads','sendMessagesInThreads',
 'stream','useApplicationCommands']);
export const MAX_ONBOARDING_ROLES=10;
export function safeOnboardingRole(role){
 if(!role||String(role.name||'').toLowerCase()==='@everyone'||!UUID.test(String(role.id||'')))return false;
 const perms=role.permissions&&typeof role.permissions==='object'&&!Array.isArray(role.permissions)?role.permissions:{};
 return Object.entries(perms).every(([key,value])=>value!==true||allowed.has(key));
}
export async function initCmdOnboarding(pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_onboarding (
  guild_id UUID PRIMARY KEY REFERENCES cmd_native_guilds(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  welcome_text TEXT NOT NULL DEFAULT '',
  role_choices JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
 await pool.query(`CREATE TABLE IF NOT EXISTS cmd_native_onboarding_picks (
  guild_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES cmd_native_roles(id) ON DELETE CASCADE,
  chosen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id,user_id),
  FOREIGN KEY(guild_id,user_id) REFERENCES cmd_native_members(guild_id,user_id) ON DELETE CASCADE
 )`);
}
function parseGuild(input){const guildId=String(input?.guildId||'');if(!UUID.test(guildId))throw failure(400,'Serveur invalide.');return guildId}
function normalizeChoices(value){
 if(!Array.isArray(value)||value.length>MAX_ONBOARDING_ROLES||value.some(x=>!UUID.test(String(x))))throw failure(400,'Rôles invalides (10 maximum).');
 const choices=value.map(String);
 if(new Set(choices).size!==choices.length)throw failure(400,'Rôles en double.');
 return choices;
}
async function memberGate(auth,guildId,requireNativeMember){
 if(!auth?.user?.id)throw failure(401,'Connexion requise.');
 if(typeof requireNativeMember!=='function')throw failure(503,'Vérification d’accès indisponible.');
 try{await requireNativeMember(auth,guildId)}catch{throw failure(403,'Accès réservé aux membres du serveur.')}
}
async function ownerGate(auth,guildId,requireNativeOwner){
 if(!auth?.user?.id)throw failure(401,'Connexion requise.');
 if(typeof requireNativeOwner!=='function')throw failure(503,'Vérification d’accès indisponible.');
 try{await requireNativeOwner(auth,guildId)}catch{throw failure(403,'Configuration réservée au propriétaire du serveur.')}
}
export async function getNativeOnboarding(pool,auth,guildId,{requireNativeMember}){
 guildId=parseGuild({guildId});
 await memberGate(auth,guildId,requireNativeMember);
 const [settings,roles,pick]=await Promise.all([
  pool.query('SELECT enabled,welcome_text,role_choices FROM cmd_native_onboarding WHERE guild_id=$1',[guildId]),
  pool.query('SELECT id::text AS id,name,permissions FROM cmd_native_roles WHERE guild_id=$1 ORDER BY position DESC,name LIMIT 300',[guildId]),
  pool.query('SELECT role_id::text AS "roleId" FROM cmd_native_onboarding_picks WHERE guild_id=$1 AND user_id=$2',[guildId,String(auth.user.id)])
 ]);
 const data=settings.rows[0]||{enabled:false,welcome_text:'',role_choices:[]};
 const selected=pick.rows[0]?.roleId||null;
 const safeRoles=roles.rows.filter(safeOnboardingRole).map(x=>({id:String(x.id),name:String(x.name||'').slice(0,100)}));
 const ids=new Set(safeRoles.map(x=>x.id));
 const choices=(Array.isArray(data.role_choices)?data.role_choices:[]).map(String).filter(x=>ids.has(x));
 return {guildId,enabled:data.enabled===true,welcomeText:String(data.welcome_text||''),
  choices,selectedRoleId:selected,roles:safeRoles};
}
export async function updateNativeOnboarding(pool,auth,input,{requireNativeOwner}){
 const guildId=parseGuild(input);
 await ownerGate(auth,guildId,requireNativeOwner);
 if(typeof input.enabled!=='boolean'||typeof input.welcomeText!=='string'||input.welcomeText.length>500||/[\u0000-\u0008]/.test(input.welcomeText))throw failure(400,'Texte d’accueil ou activation invalides.');
 const choices=normalizeChoices(input.choices);
 if(input.enabled&&!choices.length)throw failure(400,'Choisis au moins un rôle avant d’activer l’accueil.');
 if(choices.length){
  const results=await pool.query('SELECT id::text AS id,name,permissions FROM cmd_native_roles WHERE guild_id=$1 AND id=ANY($2::uuid[]) FOR SHARE',[guildId,choices]);
  if(results.rows.length!==choices.length||results.rows.some(role=>!safeOnboardingRole(role)))throw failure(400,'Sélection interdite : rôle inexistant ou doté de permissions de modération.');
 }
 const saved=await pool.query(`INSERT INTO cmd_native_onboarding(guild_id,enabled,welcome_text,role_choices)
  VALUES($1,$2,$3,$4::jsonb)
  ON CONFLICT(guild_id) DO UPDATE SET enabled=EXCLUDED.enabled,welcome_text=EXCLUDED.welcome_text,
    role_choices=EXCLUDED.role_choices,updated_at=NOW()
  RETURNING enabled,welcome_text,role_choices`,[guildId,input.enabled,input.welcomeText,JSON.stringify(choices)]);
 return {guildId,enabled:saved.rows[0].enabled===true,welcomeText:String(saved.rows[0].welcome_text||''),
  choices:Array.isArray(saved.rows[0].role_choices)?saved.rows[0].role_choices:choices};
}
export async function chooseNativeOnboardingRole(pool,auth,input,{requireNativeMember}){
 const guildId=parseGuild(input),roleId=String(input?.roleId||'');
 if(!UUID.test(roleId))throw failure(400,'Rôle invalide.');
 await memberGate(auth,guildId,requireNativeMember);
 if(!pool?.connect)throw failure(503,'Base indisponible.');
 const userId=String(auth.user.id),client=await pool.connect();let active=false;
 try{
  await client.query('BEGIN');active=true;
  // Serializes a member's one-time role choice to prevent duplicate grants.
  const member=await client.query('SELECT user_id FROM cmd_native_members WHERE guild_id=$1 AND user_id=$2 FOR UPDATE',[guildId,userId]);
  if(!member.rows.length)throw failure(403,'Adhésion au serveur requise.');
  const selected=await client.query('SELECT role_id FROM cmd_native_onboarding_picks WHERE guild_id=$1 AND user_id=$2',[guildId,userId]);
  if(selected.rows.length)throw failure(409,'Rôle d’accueil déjà choisi. Le propriétaire peut gérer tes rôles.');
  const policy=await client.query('SELECT enabled,role_choices FROM cmd_native_onboarding WHERE guild_id=$1 FOR SHARE',[guildId]);
  const prefs=policy.rows[0];
  if(!prefs?.enabled||!Array.isArray(prefs.role_choices)||!prefs.role_choices.includes(roleId))throw failure(403,'Choix non autorisé sur ce serveur.');
  const found=await client.query('SELECT id::text AS id,name,permissions FROM cmd_native_roles WHERE id=$1::uuid AND guild_id=$2 FOR SHARE',[roleId,guildId]);
  if(found.rows.length!==1||!safeOnboardingRole(found.rows[0]))throw failure(403,'Ce rôle nécessite une attribution par le propriétaire.');
  await client.query('INSERT INTO cmd_native_onboarding_picks(guild_id,user_id,role_id) VALUES($1,$2,$3::uuid)',[guildId,userId,roleId]);
  await client.query('INSERT INTO cmd_native_member_roles(guild_id,user_id,role_id) VALUES($1,$2,$3::uuid) ON CONFLICT DO NOTHING',[guildId,userId,roleId]);
  await client.query('COMMIT');active=false;
  return {guildId,roleId,chosen:true};
 }catch(err){if(active)try{await client.query('ROLLBACK')}catch{}throw err}
 finally{client.release()}
}
export async function handleNativeOnboarding(req,res,url,{pool,auth,sendJson,readBody,requireNativeMember,requireNativeOwner}){
 const action=url.pathname;
 if(!['/api/native/onboarding','/api/native/onboarding/config','/api/native/onboarding/choose'].includes(action))return false;
 if(!auth?.user?.id){sendJson(res,401,{error:'Connexion requise.'});return true}
 if(!pool){sendJson(res,503,{error:'Base indisponible.'});return true}
 if((action==='/api/native/onboarding'&&req.method!=='GET')||
    (action!=='/api/native/onboarding'&&req.method!=='POST')){sendJson(res,405,{error:'Méthode non autorisée.'});return true}
 try{
  const result=action==='/api/native/onboarding'
   ?await getNativeOnboarding(pool,auth,String(url.searchParams.get('guildId')||''),{requireNativeMember})
   :action==='/api/native/onboarding/config'
    ?await updateNativeOnboarding(pool,auth,await readBody(req),{requireNativeOwner})
    :await chooseNativeOnboardingRole(pool,auth,await readBody(req),{requireNativeMember});
  res.setHeader?.('Cache-Control','private, no-store');sendJson(res,200,result);
 }catch(err){sendJson(res,err.status||500,{error:err.status?err.message:'Accueil indisponible.'})}
 return true;
}

/* Small opt-in adapter for Discord bot developers targeting CMD Sphere.
 * No Discord bot token, Discord Gateway, intents, DMs or hidden translation.
 * Use only a CMD Sphere developer token, created on CMD Sphere.
 */
export class CMDDiscordRestClient {
 constructor({baseUrl="https://cmd-sphere.up.railway.app",token}={}){
  const u=new URL(baseUrl);
  if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash)throw Error("Adresse HTTPS CMD Sphere valide requise");
  if(!/^[\w-]{32,100}$/.test(String(token||"")))throw Error("Clé API CMD Sphere requise");
  this.base=u.origin;this.token=token;
 }
 async request(method,path,body){
  if(!path.startsWith("/")||path.startsWith("//"))throw Error("Chemin API invalide");
  const r=await fetch(this.base+"/api/cmd-discord-bridge/v10"+path,{
   method,headers:{Authorization:"Bearer "+this.token,Accept:"application/json",...(body===undefined?{}:{"Content-Type":"application/json"})},
   body:body===undefined?undefined:JSON.stringify(body),redirect:"error",signal:AbortSignal.timeout(12000)
  });
  const data=await r.json();
  if(!r.ok)throw Object.assign(new Error(data.error||"CMD Sphere "+r.status),{status:r.status});
  return data;
 }
 capabilities(){return this.request("GET","/capabilities")}
 me(){return this.request("GET","/users/@me")}
 guilds(){return this.request("GET","/users/@me/guilds")}
 channels(guildId){return this.request("GET","/guilds/"+encodeURIComponent(guildId)+"/channels")}
 roles(guildId){return this.request("GET","/guilds/"+encodeURIComponent(guildId)+"/roles")}
 channel(channelId){return this.request("GET","/channels/"+encodeURIComponent(channelId))}
 messages(channelId,limit=50){return this.request("GET","/channels/"+encodeURIComponent(channelId)+"/messages?limit="+Math.max(1,Math.min(100,Math.floor(Number(limit)||50))))}
 sendMessage(channelId,content){return this.request("POST","/channels/"+encodeURIComponent(channelId)+"/messages",{content})}
}

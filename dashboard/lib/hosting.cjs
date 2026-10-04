const providers={nitrado:'Nitrado',gportal:'GPORTAL',gtx:'GTXGaming',survivalservers:'Survival Servers',hosthavoc:'Host Havoc',pingperfect:'PingPerfect',bisect:'BisectHosting',shockbyte:'Shockbyte',gameservers:'GameServers.com',dathost:'DatHost',zap:'ZAP-Hosting',verygames:'VeryGames',ovh:'OVHcloud / VPS',hetzner:'Hetzner / VPS',pterodactyl:'Panel Pterodactyl',amp:'Panel AMP',self:'Serveur personnel',other:'Autre hébergeur'};
Object.assign(providers,{
  "oxygenserv": "Oxygenserv",
  "yorkhost": "YorkHost",
  "minestrator": "Minestrator",
  "omgserv": "OMGServ",
  "helloserv": "HelloServ",
  "mtxserv": "mTxServ",
  "nitroserv": "NitroServ",
  "redheberg": "RedHeberg",
  "ouiheberg": "OuiHeberg",
  "oneheberge": "OneHeberge",
  "inovaperf": "InovaPerf",
  "skorpia": "Skorpia",
  "privateheberg": "Private Heberg",
  "ggservers": "GGServers",
  "apex": "Apex Hosting",
  "pebblehost": "PebbleHost",
  "gravelhost": "GravelHost",
  "hostinger": "Hostinger",
  "scalahosting": "ScalaHosting",
  "axenthost": "AxentHost",
  "scaleway": "Scaleway",
  "contabo": "Contabo",
  "lws": "LWS",
  "ionos": "IONOS"
});
const panels={nitrado:'https://server.nitrado.net/',gportal:'https://www.g-portal.com/',gtx:'https://www.gtxgaming.co.uk/',survivalservers:'https://www.survivalservers.com/',hosthavoc:'https://hosthavoc.com/',pingperfect:'https://pingperfect.com/',bisect:'https://www.bisecthosting.com/',shockbyte:'https://shockbyte.com/',gameservers:'https://www.gameservers.com/',dathost:'https://dathost.net/',zap:'https://zap-hosting.com/',verygames:'https://www.verygames.net/',ovh:'https://www.ovhcloud.com/',hetzner:'https://www.hetzner.com/'};
function isNitrado(server){return server?.provider?server.provider==='nitrado':!!(server?.nitradoServiceId||server?.nitradoId);}
function panelUrl(server){const value=server?.panelUrl||panels[server?.provider];if(!value)return '';try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
module.exports={providers,isNitrado,panelUrl};

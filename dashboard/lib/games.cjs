const games={
  dayz_pc:{name:'DayZ PC',rcon:'battleye',mods:true},
  dayz_ps:{name:'DayZ PlayStation',rcon:null,mods:false},
  dayz_xbox:{name:'DayZ Xbox',rcon:null,mods:false},
  ark:{name:'ARK',rcon:'source',mods:false},
  arma:{name:'Arma Reforger',rcon:null,mods:false},
  palworld:{name:'Palworld',rcon:'source',mods:false},
  conan:{name:'Conan Exiles',rcon:'source',mods:false},
  '7dtd':{name:'7 Days to Die',rcon:null,mods:false},
  aniimo:{name:'Aniimo',rcon:null,mods:false,hosting:false},
  rust:{name:'Rust',rcon:null,mods:true}
};
function normalize(game,platform='') {
  game=String(game||'').toLowerCase();
  if(game==='dayz')game=/ps|playstation/i.test(platform)?'dayz_ps':/xbox/i.test(platform)?'dayz_xbox':'dayz_pc';
  const aliases={'rust game':'rust','arma_reforger':'arma','arma reforger':'arma','ark survival ascended':'ark','ark survival evolved':'ark','conan exiles':'conan','7 days to die':'7dtd','7 days to dea':'7dtd'};
  game=aliases[game]||game;
  if(!games[game])throw new Error('Jeu non pris en charge.');return game;
}
function capability(server){return games[normalize(server.game,server.platform)];}
module.exports={games,normalize,capability};

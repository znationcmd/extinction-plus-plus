// Suggestions only. Terrain images, availability and coordinate calibration are not inferred.
const names={
  dayz:['Chernarus','Livonia','Sakhal','Nasdara / Badlands','Namalsk','Deer Isle','Banov','Esseker','Takistan','Chiemsee','Iztek','Melkart','Pripyat','Valning','Lux','Alteria'],
  ark:['The Island','The Center','Scorched Earth','Ragnarok','Aberration','Extinction','Valguero','Genesis Part 1','Genesis Part 2','Crystal Isles','Lost Island','Fjordur','Astraeos','Lost Colony','Amissa','Svartalfheim','Caballus','The Volcano'],
  arma:['Everon','Arland','Kolguyev','Anizay','Al Shabur','Luna','Operation Uppercut','Cain'],
  conan:['Exiled Lands','Isle of Siptah','Savage Wilds'],
  palworld:['Palpagos','Sakurajima','Feybreak'],
  '7dtd':['Navezgane','Pregen','Monde généré aléatoirement'],
  aniimo:[]
};
function suggestions(game,servers=[],maps=[]){const key=game?.startsWith('dayz')?'dayz':game;return [...new Set([...(names[key]||[]),...servers.filter(s=>s.game===game).map(s=>s.map),...maps.filter(m=>m.game===game).map(m=>m.name)].filter(Boolean))];}
module.exports={suggestions};

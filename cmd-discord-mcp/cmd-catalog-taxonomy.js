// CMD Sphere — additive, original-art catalog taxonomy. No copyrighted character assets.
export const CMD_UNIVERSES = Object.freeze([
  ["urban","Ville moderne"],["western","Western"],["rescue","Sauvetage"],
  ["superhero","Super-héros"],["creature-trainers","Dresseurs de créatures"],
  ["digital-world","Monde numérique"],["pirates","Pirates"],["ninja","Ninjas"],
  ["fantasy-kingdom","Royaume fantastique"],["nature-adventure","Aventure naturelle"],
  ["island-survival","Survie sur une île"],["color-heroes","Héros en équipe"],
  ["space-warriors","Guerriers spatiaux"],["high-fantasy","Fantasy"],
  ["survival-horror","Survie horrifique"]
].map(([id,label])=>Object.freeze({id,label})));
export const CMD_CATALOG_GROUPS = Object.freeze({
  avatars:["femmes","hommes","autres","favoris"],
  animals:["chats","chiens","chevaux","sauvages","fantastiques","compagnons","favoris"],
  scenes:["ville","nature","western","fantasy","science-fiction","horreur","personnels","favoris"]
});
export function filterCmdCatalog(items,{kind,group,universe,search}={}){
  if(!Array.isArray(items))return [];
  const validGroups=CMD_CATALOG_GROUPS[kind]||[];
  const term=String(search||"").trim().toLocaleLowerCase("fr");
  return items.filter(item=>item&&typeof item==="object"
    &&(!group||!validGroups.includes(group)||item.group===group)
    &&(!universe||item.universe===universe)
    &&(!term||String(item.name||"").toLocaleLowerCase("fr").includes(term)));
}
export function relatedCmdCatalog(items,avatar){
  if(!avatar?.universe)return [];
  return filterCmdCatalog(items,{universe:avatar.universe});
}

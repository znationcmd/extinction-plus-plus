const maps=require('./builtin-maps.json');
const keys=['imageUrl','tileTemplate','tileMinZoom','tileMaxZoom','tileBaseGrid','tileBottomOrigin','tileReverseZoom','sourceUrl','attribution'];
const family=game=>game?.startsWith('dayz')?'dayz':game;
function choices(game){return maps.filter(m=>family(m.game)===family(game));}
function background(game,id,variantId){
 const map=choices(game).find(m=>m.id===id);if(!map)throw new Error('Fond du catalogue incompatible avec ce jeu.');
 const variant=variantId?map.variants?.find(v=>v.id===variantId):null;
 if(variantId&&!variant)throw new Error('Variante du fond introuvable.');
 const source={...map,...variant};
 return {...Object.fromEntries(keys.map(k=>[k,source[k]])),templateId:id,templateVariant:variant?.id||''};
}
function localImage(url){return maps.some(m=>m.imageUrl===url||m.variants?.some(v=>v.imageUrl===url));}
module.exports={choices,background,localImage,keys};

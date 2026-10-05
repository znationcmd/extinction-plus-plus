const catalog=require('./dayz-loot-catalog.cjs'),images=require('./dayz-item-images.json');
const merged=new Map();
for(const [mapId,items] of Object.entries(require('./dayz-all-items.json').items))for(const item of items){
 const old=merged.get(item.name)||{id:item.name,name:item.name,categories:[],usage:[],tiers:[],maps:[],nominals:{},...images[item.name]};
 for(const key of ['categories','usage','tiers'])old[key]=[...new Set(old[key].concat(item[key]||[]))];
 old.maps.push(mapId);old.nominals[mapId]=item.nominal;merged.set(item.name,old);
}
const items=[...merged.values()],materials=/^(Firewood|WoodenPlank|WoodenStick|ShortWoodenStick|SmallStone|Stone|MetalPlate|MetalWire|BarbedWire|Bark_Birch|Bark_Oak|OakBark|BirchBark|PlantMaterial|Rope|Rag|Nail|NailBox|GardenLime|.*Seeds(?:Pack)?)$/;
module.exports={version:'Classes vanilla Bohemia Interactive (ADPL-SA), images liées au wiki pour les correspondances exactes. Modèles sans images.',licenseUrl:'/dayz-image-license.txt',items,resources:items.filter(i=>materials.test(i.name)).map(i=>({...i,kind:'resource'})),models:Object.entries(catalog.buildingCategories).map(([name,categories])=>({id:name,name,categories,kind:'building'}))};

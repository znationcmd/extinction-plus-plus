const builtin=require('./builtin-maps.json');
function family(game){return game?.startsWith('dayz_')?'dayz':game;}
const families=['ark','palworld','aniimo','dayz','conan','arma'];
function terrain(db,id,gid){return (db.maps||[]).find(m=>m.id===id&&m.guildId===gid)||builtin.find(m=>m.id===id);}
function validate(row,db,gid){
 const m=terrain(db,row.mapId,gid);if(!m||!families.includes(family(m.game)))throw new Error('Carte du Discord ou carte intégrée compatible requise.');
 if(!['creature','resource','loot'].includes(row.kind)||typeof row.name!=='string'||!row.name.trim()||row.name.length>160)throw new Error('Nom et type de point requis.');
 if(![row.x,row.z].every(Number.isFinite)||row.x<m.xMin||row.x>m.xMax||row.z<m.yMin||row.z>m.yMax)throw new Error('Point hors des limites de la carte.');
 if(row.sourceUrl){let u;try{u=new URL(row.sourceUrl)}catch{throw new Error('Source HTTPS requise.');}if(u.protocol!=='https:'||u.username||u.password)throw new Error('Source HTTPS sans identifiants requise.');}
 if(row.public===true&&!builtin.some(b=>b.id===m.id)&&m.public!==true)throw new Error('Publie d’abord la carte pour publier ses points.');
 return {...row,name:row.name.trim(),game:family(m.game)};
}
function publicView(db,game,guildId){
 if(!families.includes(game))throw new Error('Rubrique inconnue.');
 const maps=builtin.concat((db.maps||[]).filter(m=>m.public===true&&(!guildId||m.guildId===guildId)));
 const entries=(db.atlasEntries||[]).filter(e=>e.public===true&&(!guildId||e.guildId===guildId)&&family(maps.find(m=>m.id===e.mapId)?.game)===game&&maps.some(m=>m.id===e.mapId&&(builtin.some(b=>b.id===m.id)||m.guildId===e.guildId)));
 const keys=['id','mapId','kind','name','category','x','z','conditions','notes','sourceUrl','updatedAt','element','drops','diet','rarity','bounds','regionId','imageUrl'];
 return {library:game==='ark'?require('./ark-recipes.cjs'):game==='palworld'?require('./pal-guide.cjs'):game==='aniimo'?require('./aniimo-guide.cjs'):game==='conan'?require('./conan-guide.cjs'):game==='dayz'?require('./dayz-guide.cjs'):undefined,spawnRegions:game==='ark'?require('./ark-spawns.cjs').regions:undefined,defaultSources:game==='ark'?require('./ark-spawns.cjs').sources:undefined,lootCatalog:game==='dayz'?require('./dayz-loot-catalog.cjs'):undefined,creatures:game==='ark'?require('./ark-creatures.cjs'):undefined,entries:(game==='dayz'?require('./dayz-vanilla.cjs').concat(entries):game==='ark'?require('./ark-spawns.cjs').entries.concat(entries):game==='palworld'?require('./pal-map.cjs').concat(entries):entries).map(e=>Object.fromEntries(keys.map(k=>[k,e[k]]))),maps:maps.filter(m=>family(m.game)===game).map(m=>Object.fromEntries(['id','name','game','modded','edition','version','variants','imageUrl','tileTemplate','tileMinZoom','tileMaxZoom','tileBaseGrid','tileBottomOrigin','tileReverseZoom','xMin','xMax','yMin','yMax','flipY','coordinateLabel','sourceUrl','attribution'].map(k=>[k,m[k]])))};
}
function bulk(db,gid,mapId,rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>200)throw new Error('De 1 à 200 points par lot.');
 const crypto=require('node:crypto'),m=terrain(db,mapId,gid);if(!m)throw new Error('Carte introuvable.');
 const values=rows.map(r=>{const row=validate({name:r.name,kind:r.kind,category:String(r.category||'').slice(0,100),mapId,x:r.x,z:r.z,notes:String(r.notes||'').slice(0,1000),sourceUrl:String(r.sourceUrl||'').slice(0,2000),conditions:String(r.conditions||'').slice(0,500),element:String(r.element||'').slice(0,100),drops:String(r.drops||'').slice(0,1000),diet:String(r.diet||'').slice(0,300),rarity:String(r.rarity||'').slice(0,100),public:false},db,gid);return {...row,id:crypto.createHash('sha256').update(JSON.stringify([gid,mapId,row.kind,row.name,row.x,row.z,row.category])).digest('hex'),guildId:gid,createdAt:new Date().toISOString()};});
 db.atlasEntries||=[];let added=0;for(const v of values)if(!db.atlasEntries.some(e=>e.id===v.id&&e.guildId===gid)){db.atlasEntries.push(v);added++;}return added;
}
module.exports={family,families,terrain,validate,publicView,bulk};

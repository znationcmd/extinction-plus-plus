const builtins = require('./builtin-maps.json');
// Only explicitly published terrain and optionally published pins leave the tenant boundary.
function publicMaps(db) {
  const selected = (db.maps || []).filter(m => m.public === true);
  const pick = (value, keys) => Object.fromEntries(keys.map(key => [key, value[key]]));
  return {
    maps: builtins.concat(selected.map(m => pick(m, ['id','name','game','imageUrl','xMin','xMax','yMin','yMax','flipY']))),
    pins: (db.mapPins || []).filter(p => selected.some(m => m.id === p.mapId && m.guildId === p.guildId && m.publicPins === true))
      .map(p => pick(p, ['id','mapId','name','category','description','x','y'])),
    servers: []
  };
}
module.exports = {publicMaps};

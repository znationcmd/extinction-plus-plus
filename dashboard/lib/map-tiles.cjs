// Visible tiles in the viewer's 1000 x 1000 plane. No geographic projection is assumed.
function visibleTiles(map, view) {
  if (!map.tileTemplate) return [];
  const z = Math.max(map.tileMinZoom || 0, Math.min(map.tileMaxZoom || 5, Math.ceil(Math.log2(4000 / (view.size * (map.tileBaseGrid || 1))))));
  const grid = (map.tileBaseGrid || 1) * 2 ** z;
  const width = 1000 / grid;
  const x0 = Math.max(0, Math.floor(view.x / width));
  const x1 = Math.min(Math.ceil(grid) - 1, Math.ceil((view.x + view.size) / width) - 1);
  const top = map.tileBottomOrigin ? 1000 - view.y - view.size : view.y;
  const bottom = map.tileBottomOrigin ? 1000 - view.y : view.y + view.size;
  const y0 = Math.max(0, Math.floor(top / width));
  const y1 = Math.min(Math.ceil(grid) - 1, Math.ceil(bottom / width) - 1);
  const result = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const sourceZ = Number.isFinite(map.tileReverseZoom) ? map.tileReverseZoom - z : z;
    result.push({id:`${map.id}-${z}-${x}-${y}`,x:x*width,y:map.tileBottomOrigin?1000-(y+1)*width:y*width,width,
      url:map.tileTemplate.replace('{z}',sourceZ).replace('{x}',x).replace('{y}',y)});
  }
  return result;
}
module.exports = {visibleTiles};

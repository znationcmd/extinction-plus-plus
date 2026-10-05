// Convert the source's fixed square raster to a smaller square WebP; preserve map bounds.
// Usage: node scripts/prepare-pal-map-assets.cjs /path/to/pyPalworldAPI
// Source artwork attribution and MIT notice: dashboard/public/pal-data-license.txt.
const path=require('node:path'),fs=require('node:fs/promises');
const sharp=require('../dashboard/node_modules/sharp');
sharp.cache(false);sharp.concurrency(1);
(async()=>{
 const source=process.argv[2];if(!source)throw new Error('Source directory required');
 const target=path.resolve(__dirname,'../dashboard/public/companion');await fs.mkdir(target,{recursive:true});
 for(const scene of ['world','tree']){
  const input=path.join(source,'pyPalworldAPI/public/images/maps/map_locations_fast_travel_'+scene+'.png');
  const meta=await sharp(input).metadata();if(meta.width!==8192||meta.height!==8192)throw new Error('Source extent changed');
  const output=path.join(target,'palworld-'+scene+'.webp');await sharp(input).resize(2048,2048,{fit:'fill'}).webp({quality:90,effort:6}).toFile(output);
  console.log(scene,(await fs.stat(output)).size);
 }
})().catch(error=>{console.error(error.message);process.exitCode=1});

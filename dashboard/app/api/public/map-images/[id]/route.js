import png from '../../../../../lib/map-image.cjs';
export const runtime='nodejs';
const sources={
  'savage-wilds':{url:'https://raw.githubusercontent.com/SavageWildsMap/map/a44ad39ada00f282417d54e943829c608844e8be/site/images/sw_map.png',type:'image/png',repair:true},
  'astraeos':{url:'https://arkbuddy.app/images/maps/ASA/Astraeos.webp?height=2048',type:'image/webp'}
};
const images=new Map();
async function load(source) {
  const response=await fetch(source.url,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('Source indisponible.');
  const chunks=[];let length=0;
  for await(const chunk of response.body){length+=chunk.length;if(length>16*1024*1024)throw new Error('Fond trop volumineux.');chunks.push(Buffer.from(chunk));}
  const data=Buffer.concat(chunks);
  if(source.repair)return png.repairMapPng(data);
  if(data.length<16 || data.toString('ascii',0,4)!=='RIFF' || data.toString('ascii',8,12)!=='WEBP')throw new Error('Fond WebP invalide.');
  return data;
}
export async function GET(req,ctx) {
  const {id}=await ctx.params;
  const source=Object.hasOwn(sources,id)?sources[id]:null;
  if(!source)return Response.json({error:'Fond inconnu.'},{status:404});
  try {
    if(!images.has(id))images.set(id,load(source).catch(error=>{images.delete(id);throw error;}));
    return new Response(await images.get(id),{headers:{'Content-Type':source.type,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
  } catch {return Response.json({error:'Fond temporairement indisponible.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}

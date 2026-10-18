// Public, read-only world language catalogue — sourced from CMD Sphere.
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const response=await fetch("https://cmd-sphere.up.railway.app/cmd-language-catalog.json",{signal:AbortSignal.timeout(8000),next:{revalidate:3600}});
  if(!response.ok)throw Error("catalogue_unavailable");
  const raw=await response.text();
  if(raw.length<120000||raw.length>300000)throw Error("catalogue_invalid");
  return new Response(raw,{headers:{"content-type":"application/json; charset=utf-8","cache-control":"public,max-age=3600","x-content-type-options":"nosniff"}});
 }catch{return Response.json({error:"catalogue_indisponible"},{status:503})}
}

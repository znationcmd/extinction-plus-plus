function rows(data,view){
 if(view==='recipes')return data.recipes||[];
 if(view==='buildings')return data.buildings||[];
 if(view==='knowledge')return data.knowledge||[];
 if(view==='items')return data.items||[];
 if(view==='models')return data.models||[];
 if(view==='resources')return data.resources||[...new Set([...(data.creatures||[]).flatMap(c=>(c.drops||[]).map(d=>d.name)),...(data.recipes||[]).flatMap(r=>(r.ingredients||[]).map(i=>i.name))])].filter(Boolean).map(name=>({id:'resource-'+name,name,kind:'resource'}));
 return data.creatures||[];
}
function stats(value,prefix='',depth=0){
 if(!value||typeof value!=='object'||depth>4)return [];
 return Object.entries(value).flatMap(([key,v])=>typeof v==='number'&&Number.isFinite(v)?[{name:prefix+key,value:v}]:v&&typeof v==='object'?stats(v,prefix+key+' / ',depth+1):[]);
}
function related(data,item){
 return {drops:(data.creatures||[]).filter(c=>(c.drops||[]).some(d=>d.name===item.name)),recipes:[...(data.recipes||[]),...(data.buildings||[])].filter(r=>(r.ingredients||[]).some(i=>i.name===item.name)),unlocks:[...(data.recipes||[]),...(data.buildings||[]),...(data.items||[])].filter(r=>(item.recipeIds||[]).includes(r.id)||(item.unlocks||[]).includes(r.name)),prerequisites:(data.knowledge||[]).filter(k=>(item.prerequisites||[]).includes(k.id))};
}
module.exports={rows,stats,related};

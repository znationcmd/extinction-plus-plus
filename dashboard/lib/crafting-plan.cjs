function totals(rows){if(!Array.isArray(rows)||rows.length>100)throw new Error('Maximum 100 recettes.');const out=new Map();for(const r of rows){if(!Number.isSafeInteger(r.quantity)||r.quantity<1||r.quantity>100000||!Number.isSafeInteger(r.yield)||r.yield<1||r.yield>100000)throw new Error('Quantité et rendement entiers positifs requis.');if(!Array.isArray(r.ingredients)||!r.ingredients.length||r.ingredients.length>100)throw new Error('Ingrédients requis.');const batches=Math.ceil(r.quantity/r.yield);for(const i of r.ingredients){if(typeof i.name!=='string'||!i.name.trim()||i.name.length>100||!Number.isSafeInteger(i.amount)||i.amount<1||i.amount>100000)throw new Error('Ingrédient invalide.');const key=i.name.trim().toLocaleLowerCase('fr'),prior=out.get(key);out.set(key,{name:prior?.name||i.name.trim(),amount:(prior?.amount||0)+i.amount*batches});}}return [...out.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'));}
module.exports={totals};

// Expand only unambiguous recipes. Cycles and alternative recipes remain explicit purchases/inputs.
function expand(plan,recipes){
 const direct=totals(plan),index=new Map(),materials=new Map(),leftovers=new Map(),steps=new Map(),warnings=new Set();
 const key=s=>s.trim().toLocaleLowerCase('fr');
 for(const r of recipes||[]){if(!r?.ingredients?.length||!r.name)continue;try{totals([{...r,quantity:1}]);}catch{continue;}const k=key(r.name);index.set(k,[...(index.get(k)||[]),r]);}
 let visits=0;
 function add(map,k,name,amount){const before=map.get(k);const total=(before?.amount||0)+amount;if(!Number.isSafeInteger(total)||total>1e12)throw new Error('Plan trop volumineux.');map.set(k,{name:before?.name||name,amount:total});}
 function need(name,amount,path){
  if(++visits>20000)throw new Error('Plan trop complexe.');const k=key(name),stock=leftovers.get(k)||0,used=Math.min(stock,amount);leftovers.set(k,stock-used);amount-=used;if(!amount)return;
  const matches=index.get(k)||[];
  if(matches.length!==1||path.has(k)||path.size>=32){add(materials,k,name,amount);if(matches.length>1)warnings.add('Plusieurs recettes pour '+name+' : matériau conservé sans choix automatique.');if(path.has(k)||path.size>=32)warnings.add('Cycle ou profondeur excessive pour '+name+' : décomposition arrêtée.');return;}
  const r=matches[0],batches=Math.ceil(amount/r.yield),produced=batches*r.yield;leftovers.set(k,(leftovers.get(k)||0)+produced-amount);add(steps,k,r.name,batches);
  const next=new Set(path);next.add(k);for(const i of r.ingredients)need(i.name,i.amount*batches,next);
 }
 for(const d of direct)need(d.name,d.amount,new Set());
 return {materials:[...materials.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr')),steps:[...steps.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr')),warnings:[...warnings],leftovers:[...leftovers.entries()].filter(([,amount])=>amount>0).map(([k,amount])=>({name:index.get(k)?.[0]?.name||k,amount}))};
}
function parseImport(value,recipes){
 if(!value||value.format!=='extinction-crafting-plan-v1'||!Array.isArray(value.plan)||value.plan.length>100)throw new Error('Fichier de plan invalide.');
 const byId=new Map(recipes.map(r=>[r.id,r]));const rows=value.plan.map(p=>{const recipe=byId.get(p.id);if(!recipe)throw new Error('Recette absente de ce catalogue : '+String(p.id).slice(0,100));return {...recipe,quantity:p.quantity};});totals(rows);return rows;
}
module.exports.expand=expand;
module.exports.parseImport=parseImport;

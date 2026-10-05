function offspring(data,a,b){a=Number(a);b=Number(b);if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b))return [];const ids=new Set(data.breeding.filter(([x,y])=>x===a&&y===b||x===b&&y===a).map(r=>String(r[2])));return data.creatures.filter(c=>ids.has(c.id));}
module.exports={offspring};

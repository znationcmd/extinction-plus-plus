// Adapted from cadon/ARKStatsExtractor Taming.cs (MIT, attribution in ark-data-license.txt).
// Single confirmed food, KO creatures only. Special/passive taming is not approximated.
function estimate(creature,foodName,level,speed=1,drain=1){
 if(!Number.isSafeInteger(level)||level<1||level>10000)throw new Error('Niveau entier entre 1 et 10 000 requis.');
 if(![speed,drain].every(n=>Number.isFinite(n)&&n>=.001&&n<=10000))throw new Error('Multiplicateurs entre 0,001 et 10 000 requis.');
 const t=creature?.taming,f=t?.foods?.find(row=>row.name===foodName);
 if(!t?.violent||t.nonViolent)throw new Error('Ce calcul est réservé à l’apprivoisement KO standard.');
 if(!f||f.unconfirmed||f.quantity!==1||![f.affinity,f.foodValue,t.foodConsumptionBase,t.foodConsumptionMult].every(n=>Number.isFinite(n)&&n>0)||![t.affinityNeeded0,t.affinityIncreasePL,t.tamingIneffectiveness].every(n=>Number.isFinite(n)&&n>=0))throw new Error('Paramètres confirmés incomplets pour cette nourriture ou variante.');
 const affinity=t.affinityNeeded0+t.affinityIncreasePL*level;
 if(affinity<=0)throw new Error('Affinité requise non renseignée.');
 const perFood=f.affinity*speed*4,quantity=Math.ceil(affinity/perFood),seconds=Math.ceil(quantity*f.foodValue/(t.foodConsumptionBase*t.foodConsumptionMult*drain)),effectiveness=1/(1+t.tamingIneffectiveness*quantity/perFood);
 return {quantity,seconds,effectiveness,bonusLevel:Math.floor(level*effectiveness/2)};
}
module.exports={estimate};

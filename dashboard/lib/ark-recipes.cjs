// Partial catalogue of authored factual summaries; attributed per recipe.
const recipes=[
{id:'ark-recipe-sparkpowder',name:'Poudre-étincelle',category:'Matériaux',yield:2,station:'Mortier et pilon',ingredients:[{name:'Silex',amount:2},{name:'Pierre',amount:1}],sourceUrl:'https://ark.wiki.gg/wiki/Sparkpowder'},
{id:'ark-recipe-gunpowder',name:'Poudre à canon',category:'Matériaux',yield:1,station:'Mortier et pilon',ingredients:[{name:'Poudre-étincelle',amount:1},{name:'Charbon',amount:1}],sourceUrl:'https://ark.wiki.gg/wiki/Chemistry_Bench'},
{id:'ark-recipe-narcotic-chemistry',name:'Narcotique',category:'Apprivoisement',yield:6,station:'Établi de chimie',ingredients:[{name:'Narcoberry ou champignon ascerbique',amount:20},{name:'Viande avariée',amount:4}],notes:'Recette de l’établi de chimie uniquement ; ne pas utiliser ces quantités pour le mortier.',sourceUrl:'https://ark.wiki.gg/wiki/Narcotic'}
].map(r=>({...r,kind:'recipe'}));
module.exports={version:'Catalogue initial : 3 recettes ARK vérifiées. Les autres recettes et variantes de stations restent à intégrer. Paramètres vanilla ; les mods peuvent modifier les coûts.',recipes,items:[],sourceUrl:'https://ark.wiki.gg/',licenseUrl:'/ark-recipes-license.txt'};

import {cmdCloudflareReply,cmdFreeProviderConfigured} from "./cmd-ai-free-provider.js";
// CMD Sphere companion — no paid provider required for the built-in mode.
// GEMINI_API_KEY, if provided, enables optional free-tier Gemini responses.
// This server never attempts to enable billing or use a paid API model.
const jokes=[
"Pourquoi les développeurs aiment-ils l’automne ? Parce qu’ils peuvent enfin faire tomber les bugs. 🍂",
"Un serveur dit à un autre : « Tu réponds ? » L’autre : « 404, humour introuvable ! » 😄",
"Pourquoi le bot est-il allé au médecin ? Il avait attrapé un virus… informatique. 🤖",
"Que dit un Discord à un autre ? « On reste en contact, même hors ligne ! » 🟢",
"Pourquoi un ordinateur a-t-il froid ? Parce qu’il a laissé Windows ouvert ! ❄️",
"Que fait une clé USB au restaurant ? Elle demande le menu déroulant. 🍽️",
"Comment appelle-t-on un dinosaure qui connaît l’informatique ? Un tyranno-serveur ! 🦖",
"Pourquoi la bibliothèque ne plante jamais ? Elle a de très bonnes références. 📚",
"Pourquoi un bot ne gagne-t-il jamais à cache-cache ? Il répond toujours « présent » !",
"Quel est le comble pour une IA ? Ne pas avoir les idées… très nettes. ✨"
];
const info=[
[/\b(synchronis|sync|import|discord)\b/i,"Pour synchroniser tes serveurs Discord : ouvre Paramètres → Outils CMD → Synchroniser mes Discord. Si la liste est vide, utilise « Reconnecter Discord » et autorise l'accès aux serveurs. Les salons et rôles d'un serveur nécessitent les permissions correspondantes et, pour une synchronisation complète, la présence d'un bot CMD autorisé."],
[/\b(profil|avatar|banni[eè]re|statut|pastille)\b/i,"Appuie sur ton avatar en bas pour ouvrir ton profil et modifier la photo, la bannière, la bio ou les décorations. Reste appuyé sur ton avatar pour choisir 🟢 En ligne, 🟠 Occupé, 🔴 Ne pas déranger ou ⚪ Hors ligne."],
[/\b(notification|appel|sonnerie)\b/i,"Pour les notifications : Paramètres → Notifications. Autorise les notifications du navigateur et du téléphone. Les notifications push dépendent aussi des permissions de ton appareil ; pour les appels, tu peux accéder à la messagerie CMD Sphere."],
[/\b(boutique|orbe|diamant|qu[eê]te)\b/i,"La boutique, les quêtes et les diamants sont dans Paramètres → Boutique, Quêtes ou Mes diamants. Tu peux aussi y accéder depuis ton profil."],
[/\b(langue|anglais|allemand|italien|espagnol|japonais|chinois)\b/i,"Va dans Paramètres → Langue. CMD Sphere propose le français, l’anglais, l’anglais américain, l’allemand, l’espagnol, l’italien, le russe, le coréen, le japonais et le chinois."],
[/\b(bot|webhook|sauvegarde|dossier)\b/i,"Les fonctions Bots, Webhooks, Sauvegarde Discord et Dossiers sont regroupées dans Paramètres → Outils CMD. Leurs droits dépendent des permissions de ton compte et de tes serveurs."]
];
const rate=new Map();let round=0;
export function aiMode(){return cmdFreeProviderConfigured()?"cloudflare":String(process.env.GEMINI_API_KEY||process.env.CMD_AI_GEMINI_FREE_KEY||"").trim()?"gemini":"local"}
export function allowRequest(id){const now=Date.now(),k=String(id||"anonymous"),v=rate.get(k)||[];const items=v.filter(n=>now-n<60000);if(items.length>=12){rate.set(k,items);return false}items.push(now);rate.set(k,items);if(rate.size>5000){for(const [key,entry] of rate){if(entry.every(t=>now-t>60000))rate.delete(key);if(rate.size<4000)break}}return true}
function clockAnswer(s){
 const msg=String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 if(!/(heure|quelle date|quel jour|date du jour|date d.aujourd.hui|what time|current time|time in|time at)/i.test(msg))return null;
 const zones=[
  ["hong kong","Hong Kong","Asia/Hong_Kong"],["taipei","Taipei","Asia/Taipei"],
  ["chine","Chine","Asia/Shanghai"],["pekin","Pékin","Asia/Shanghai"],["beijing","Pékin","Asia/Shanghai"],["shanghai","Shanghai","Asia/Shanghai"],["guangzhou","Guangzhou","Asia/Shanghai"],["canton","Canton","Asia/Shanghai"],["shenzhen","Shenzhen","Asia/Shanghai"],
  ["tokyo","Tokyo","Asia/Tokyo"],["japon","Japon","Asia/Tokyo"],["moncton","Moncton","America/Moncton"],
  ["new york","New York","America/New_York"],["quebec","Québec","America/Toronto"],["montreal","Montréal","America/Toronto"],["toronto","Toronto","America/Toronto"],["londres","Londres","Europe/London"],["london","Londres","Europe/London"],["los angeles","Los Angeles","America/Los_Angeles"],["dubai","Dubaï","Asia/Dubai"],["sydney","Sydney","Australia/Sydney"],["moscou","Moscou","Europe/Moscow"],
  ["paris","Paris","Europe/Paris"],["ajaccio","Ajaccio","Europe/Paris"],["bastia","Bastia","Europe/Paris"],["corse","Corse","Europe/Paris"],["france","France","Europe/Paris"]
 ];
 const found=zones.find(([name])=>msg.includes(name))||["france","France","Europe/Paris"];
 const clock=new Intl.DateTimeFormat("fr-FR",{timeZone:found[2],weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
 return "🕒 À "+found[1]+", il est "+clock+" (heure locale).";
}
const cookBook=[
 {key:"crepes",match:/crepes?/,title:"Crêpes (8 à 10)",ingredients:"250 g de farine, 3 œufs, 500 ml de lait, 1 pincée de sel, 30 g de beurre",steps:["Mélange farine et sel, puis incorpore les œufs.","Verse progressivement le lait, puis le beurre fondu.","Laisse reposer 20 minutes si possible.","Cuis une louche de pâte environ une minute par face dans une poêle chaude."]},
 {key:"omelette",match:/omelette|oeufs?/,title:"Omelette (2 personnes)",ingredients:"4 œufs, une noix de beurre, sel et poivre",steps:["Bats les œufs avec sel et poivre.","Fais fondre le beurre dans une poêle à feu moyen.","Verse les œufs, remue délicatement et replie avant de servir."]},
 {key:"gateau",match:/gateau.*chocolat|chocolat.*gateau|fondant/,title:"Gâteau au chocolat",ingredients:"200 g de chocolat, 120 g de beurre, 100 g de sucre, 3 œufs, 80 g de farine",steps:["Préchauffe le four à 180 °C.","Fais fondre chocolat et beurre puis ajoute le sucre.","Incorpore les œufs et la farine.","Verse dans un moule et enfourne 20 à 25 minutes."]},
 {key:"cookies",match:/cookies?/,title:"Cookies",ingredients:"120 g de beurre, 100 g de sucre, 1 œuf, 180 g de farine, 100 g de pépites de chocolat",steps:["Préchauffe le four à 180 °C.","Mélange beurre et sucre puis ajoute l'œuf.","Incorpore farine et pépites.","Forme des boules et cuis 10 à 12 minutes."]},
 {key:"pizza",match:/pizz/,title:"Pizza maison",ingredients:"250 g de farine, 150 ml d'eau tiède, 4 g de levure sèche, huile d'olive, sel, tomate et mozzarella",steps:["Mélange et pétris la farine, l'eau, la levure, l'huile et le sel.","Laisse lever environ 1 heure.","Étale la pâte, ajoute tomate et mozzarella.","Cuis à 240 °C pendant 10 à 15 minutes."]},
 {key:"pates",match:/carbonara|pates?|spaghett/,title:"Pâtes carbonara (2 personnes)",ingredients:"200 g de pâtes, 100 g de guanciale ou lardons, 2 jaunes d'œufs, 50 g de pecorino, poivre",steps:["Fais cuire les pâtes dans une grande casserole d'eau salée.","Dore la viande dans une poêle.","Mélange les jaunes avec le fromage et le poivre.","Hors du feu, ajoute les pâtes, puis le mélange aux œufs et un peu d'eau de cuisson."]},
 {key:"riz",match:/riz|risotto/,title:"Riz aux légumes (2 personnes)",ingredients:"160 g de riz, 1 carotte, 1 courgette, 1 oignon, huile d'olive, sel et épices",steps:["Fais cuire le riz selon le paquet.","Émince les légumes et fais-les revenir avec l'huile 8 à 10 minutes.","Ajoute les épices, mélange avec le riz puis sers."]},
 {key:"poulet",match:/poulet|volaille/,title:"Poulet à la crème et aux champignons (2 personnes)",ingredients:"2 filets de poulet, 150 g de champignons, 15 cl de crème, huile, sel et poivre",steps:["Fais dorer le poulet dans une poêle 5 minutes de chaque côté.","Ajoute les champignons émincés et cuis quelques minutes.","Verse la crème et laisse mijoter jusqu'à cuisson complète du poulet.","Sers avec du riz."]},
 {key:"salade",match:/salade|legumes?/,title:"Salade composée (2 personnes)",ingredients:"1 salade, 2 tomates, 1 concombre, 2 œufs durs, huile d'olive, citron",steps:["Lave et coupe les légumes.","Fais cuire les œufs environ 9 à 10 minutes puis refroidis-les.","Mélange les légumes, ajoute les œufs et assaisonne."]},
 {key:"soupe",match:/soupe|potage|veloute/,title:"Soupe de légumes",ingredients:"3 carottes, 2 pommes de terre, 1 poireau, 1 oignon, 700 ml d'eau, sel",steps:["Lave et coupe les légumes.","Mets-les dans une casserole avec l'eau et du sel.","Laisse cuire 25 minutes puis mixe jusqu'à la texture voulue."]},
 {key:"pommes",match:/pommes? de terre|patates?/,title:"Pommes de terre sautées",ingredients:"500 g de pommes de terre, 2 c. à soupe d'huile, ail, persil, sel",steps:["Coupe les pommes de terre en petits cubes.","Fais chauffer l'huile et cuis à feu moyen avec couvercle environ 15 minutes.","Découvre et dore 5 à 10 minutes en remuant, ajoute ail et persil."]},
 {key:"tiramisu",match:/tiramisu/,title:"Tiramisu (4 portions)",ingredients:"250 g de mascarpone, 3 œufs frais, 70 g de sucre, 20 biscuits, café refroidi, cacao",steps:["Sépare les blancs et les jaunes puis mélange jaunes, sucre et mascarpone.","Monte les blancs en neige puis incorpore-les.","Trempe rapidement les biscuits dans le café et alterne avec la crème.","Réfrigère au moins 4 heures et saupoudre de cacao."]}
];
function recipeAnswer(s){
 const m=String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const intent=/(recett|cuisin|prepar|quoi manger|quoi faire a manger|idee de repas|des idees de repas|repas|plat|ingredients|comment faire|faire a manger|manger ce soir|dejeuner|diner|j.ai faim|propose|sugger|recommande|une idee de dessert|un dessert)/i.test(m);
 if(!intent)return null;
 const recipe=cookBook.find(r=>r.match.test(m));
 if(recipe)return "🍳 "+recipe.title+"\n\nIngrédients : "+recipe.ingredients+".\n\nPréparation :\n"+recipe.steps.map((v,i)=>(i+1)+". "+v).join("\n")+"\n\nBon appétit !";
 const dessert=/(dessert|sucre|gouter)/.test(m),quick=/(rapide|facile|express|pas beaucoup de temps)/.test(m);
 const list=dessert?[cookBook[0],cookBook[2],cookBook[3],cookBook[11]]:quick?[cookBook[1],cookBook[6],cookBook[8],cookBook[10]]:[cookBook[4],cookBook[7],cookBook[5],cookBook[9],cookBook[2]];
 return "🍽️ Voici quelques idées "+(dessert?"de desserts":quick?"de repas rapides":"de recettes")+" :\n"+list.map((r,i)=>(i+1)+". "+r.title).join("\n")+"\n\nDis-moi laquelle te plaît et je te donnerai les ingrédients et toutes les étapes. Tu peux aussi préciser tes ingrédients, le nombre de personnes ou ton budget.";
}
function simple(message){
 const s=message.trim();if(!s)return "Écris-moi une question ou demande une blague !";
 if(/(blague|fais.moi rire|humour|rigol|dr[oô]le|plaisanterie)/i.test(s)){round++;return jokes[round%jokes.length]}
 if(/^(salut|bonjour|hello|coucou|yo|bonsoir|hey)\b/i.test(s))return "Salut ! 👋 Je suis l’assistant CMD Sphere. Une blague, une question, ou besoin d’aide sur ton profil, les serveurs ou la boutique ?";
 if(/(merci|thanks)/i.test(s)&&s.length<45)return "Avec plaisir ! 😄 Une autre question ?";
 for(const [test,response] of info)if(test.test(s))return response;
 if(/(qui es.tu|ton nom|tu es quoi)/i.test(s))return "Je suis l’assistant CMD Sphere : je fais des blagues, j’aide dans l’application et je peux chercher des informations. Pour des réponses plus créatives, le fondateur peut activer gratuitement un modèle Gemini dans Railway.";
 return null;
}
function cleanHistory(v){return (Array.isArray(v)?v:[]).slice(-8).filter(x=>["user","assistant"].includes(x?.role)&&typeof x.text==="string").map(x=>({role:x.role==="assistant"?"model":"user",parts:[{text:x.text.slice(0,1400)}]}))}
async function gemini(message,history){
 const key=String(process.env.GEMINI_API_KEY||process.env.CMD_AI_GEMINI_FREE_KEY||"").trim();
 if(!key)return null;
 const signal=AbortSignal.timeout(14000);
 try{
   const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",{
     method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},signal,
     body:JSON.stringify({systemInstruction:{parts:[{text:"Tu es CMD IA, l'assistant sympathique de CMD Sphere, une application communautaire indépendante de Discord. Réponds naturellement dans la langue de l'utilisateur, en français par défaut. Tu fais des blagues originales à la demande, aides pour la rédaction, expliques des sujets et les usages de CMD Sphere. Ne prétends pas avoir accès aux données privées, exécuter des actions, ou synchroniser des serveurs. Sois bref, utile et honnête. Si une fonction n'existe pas, dis-le. Aucune publicité ni abonnement."}]},contents:[...cleanHistory(history),{role:"user",parts:[{text:message}]}],generationConfig:{maxOutputTokens:420,temperature:0.75}})})
   if(!r.ok)return null;
   const data=await r.json();
   const result=(data.candidates||[]).flatMap(c=>c.content?.parts||[]).map(x=>x.text||"").join("\n").trim().slice(0,4000);
   return result||null;
 }catch{return null}
}
const weatherCities=[
 ["tavaco",41.98,8.90],["porticcio",41.89,8.80],["ajaccio",41.93,8.74],["bastia",42.70,9.45],
 ["corse",41.93,8.74],["moncton",46.09,-64.78],["paris",48.86,2.35],["marseille",43.30,5.37],
 ["lyon",45.76,4.83],["nice",43.70,7.27],["toulouse",43.60,1.44],["bordeaux",44.84,-0.58],
 ["lille",50.63,3.06],["nantes",47.22,-1.55],["montpellier",43.61,3.88],["strasbourg",48.58,7.75],
 ["londres",51.51,-0.13],["london",51.51,-0.13],["berlin",52.52,13.41],["tokyo",35.68,139.69]
];
const weatherCache=new Map();
async function weatherAnswer(s){
 if(!/(m[eé]t[eé]o|quel temps|temp[eé]rature|va.t.il pleuvoir)/i.test(s))return null;
 const city=weatherCities.find(c=>s.toLowerCase().includes(c[0]));
 if(!city)return "Pour quelle ville souhaites-tu la météo ? Je peux déjà consulter Ajaccio, Bastia, Paris, Moncton et d'autres grandes villes.";
 const key=city[0],old=weatherCache.get(key);
 if(old&&Date.now()-old.at<45*60*1000)return old.text;
 try{
  const url="https://api.met.no/weatherapi/locationforecast/2.0/compact?lat="+city[1].toFixed(2)+"&lon="+city[2].toFixed(2);
  const res=await fetch(url,{headers:{"User-Agent":"CMD-Sphere/1.0 https://cmd-sphere.up.railway.app","Accept":"application/json"},signal:AbortSignal.timeout(9000)});
  if(!res.ok)throw Error("service météo HTTP "+res.status);
  const body=await res.json(),first=body.properties?.timeseries?.[0];
  if(!first)throw Error("prévision indisponible");
  const detail=first.data?.instant?.details||{},symbol=first.data?.next_1_hours?.summary?.symbol_code||"",precip=first.data?.next_1_hours?.details?.precipitation_amount;
  const meanings={clearsky:"ciel dégagé",fair:"beau temps",partlycloudy:"ciel partiellement nuageux",cloudy:"nuageux",rain:"pluie",lightrain:"pluie faible",heavyrain:"fortes pluies",snow:"neige",fog:"brouillard"};
  const current=Object.entries(meanings).find(([code])=>symbol.startsWith(code))?.[1]||"conditions variables";
  const celsius=Number(detail.air_temperature),wind=Number(detail.wind_speed);
  const reply="🌤️ Météo à "+city[0]+" : "+current+".\nTempérature : "+(Number.isFinite(celsius)?celsius.toFixed(1)+" °C":"indisponible")+
   (Number.isFinite(wind)?"\nVent : "+(wind*3.6).toFixed(0)+" km/h":"")+(Number.isFinite(precip)?"\nPrécipitations sur l’heure : "+precip+" mm":"")+
   "\n\nSource : MET Norway (données CC BY 4.0), https://api.met.no/ — Prévision actualisée selon le fournisseur.";
  weatherCache.set(key,{at:Date.now(),text:reply});return reply;
 }catch{return "La météo de "+city[0]+" est momentanément indisponible. Réessaie plus tard."}
}
async function wikipedia(message){
 const match=message.trim().match(/^(?:qui est|qu['’]est.ce que|c['’]est quoi|que signifie|parle.moi de|explique.moi|définis|definition de|définition de)\s+(.+?)[?.!]*$/i);
 if(!match)return null;
 const topic=match[1].replace(/[?!.]+$/,"").trim().slice(0,90);
 if(topic.length<3)return null;
 try{
   const api=new URL("https://fr.wikipedia.org/w/api.php");
   api.search=new URLSearchParams({action:"query",format:"json",generator:"search",gsrsearch:topic,gsrlimit:"1",prop:"extracts|info",exintro:"1",explaintext:"1",exchars:"500",inprop:"url",redirects:"1"}).toString();
   const r=await fetch(api,{headers:{"accept":"application/json"},signal:AbortSignal.timeout(5000)});
   if(!r.ok)return null;
   const data=await r.json();
   const page=Object.values(data.query?.pages||{})[0];
   const excerpt=String(page?.extract||"").replace(/\s+/g," ").trim().slice(0,850);
   if(!excerpt)return null;
   return excerpt+"\n\nSource : "+String(page.fullurl||"https://fr.wikipedia.org/");
 }catch{return null}
}
export async function answerCMD(message,history=[]){
 const m=String(message||"").trim().slice(0,2000);
 if(!m)return {reply:"Écris un message pour discuter avec CMD IA.",mode:"local"};
 const basic=clockAnswer(m)||recipeAnswer(m)||simple(m);
 if(basic)return {reply:basic,mode:"local"};
 const weather=await weatherAnswer(m);if(weather)return {reply:weather,mode:"weather"};
 const fromCloudflare=await cmdCloudflareReply(m,history);
 if(fromCloudflare)return {reply:fromCloudflare,mode:"cloudflare"};
 const gen=await gemini(m,history);
 if(gen)return {reply:gen,mode:"gemini"};
 const wiki=await wikipedia(m);
 if(wiki)return {reply:wiki,mode:"knowledge"};
 return {reply:"Je peux déjà raconter des blagues, t’aider à utiliser CMD Sphere et rechercher des définitions. Pour des réponses plus libres, un fournisseur IA partagé doit être actif. Tu peux déjà me demander l’heure dans une ville, la météo ou des idées de recettes.",mode:"local",limited:true};
}

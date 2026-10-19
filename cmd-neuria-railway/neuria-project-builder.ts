import JSZip from "jszip";
import {aiConfiguration,aiGenerationOptions,fetchAI} from "./neuria-ai-provider.ts";

export type ProjectKind="website"|"bot"|"browser"|"hosting"|"game"|"app"|"custom";
export type ProjectFile={path:string;content:string};
export type ProjectBuild={name:string;kind:ProjectKind;description:string;files:ProjectFile[];engine:string;starter:boolean;warnings:string[];createdAt:string};
export const PROJECT_KINDS:ProjectKind[]=["website","bot","browser","hosting","game","app","custom"];
const EXT=/\.(?:html?|css|jsx?|tsx?|json|md|txt|ya?ml|toml|xml|svg|py|go|rs|sh|sql|env\.example|gitignore)$/i;
const SENSITIVE=/(^|\/)(?:\.env$|\.git\/|node_modules\/|private\/|secrets?\/|credentials?\/)/i;
const MAX_FILE=32000,MAX_FILES=32,MAX_TOTAL=220000;
const DEFAULT_NAME:Record<ProjectKind,string>={website:"mon-site",bot:"mon-bot",browser:"mon-navigateur",hosting:"mon-hebergement",game:"mon-jeu",app:"mon-application",custom:"mon-projet"};
export function safeProjectPath(input:unknown):string{
 if(typeof input!=="string"||input.length>160||!input||input.startsWith("/")||input.includes("\\")||input.includes("\0")||input.includes("%")||input.includes(":"))throw Error("Chemin de fichier interdit");
 if(input.split("/").some(p=>!p||p==="."||p===".."||(p.startsWith(".")&&![".env.example",".gitignore"].includes(p)))||SENSITIVE.test(input)||(!EXT.test(input)&&![".env.example",".gitignore"].includes(input)))throw Error("Type de fichier ou chemin non autorisé");
 return input;
}
export function classifyProject(description:string,requested:string="auto"):ProjectKind{
 if(PROJECT_KINDS.includes(requested as ProjectKind))return requested as ProjectKind;
 if(/jeu vidéo|jeu video|video game|2d game|3d game|plateforme 2d|unity|godot/i.test(description))return "game";
 if(/navigateur|browser|webview/i.test(description))return "browser";
 if(/hébergeur|hebergeur|hosting|serveurs? de jeux|game server/i.test(description))return "hosting";
 if(/bot|discord|telegram/i.test(description))return "bot";
 if(/site|website|landing|portfolio|boutique|page web/i.test(description))return "website";
 if(/application|app mobile|tableau de bord|dashboard/i.test(description))return "app";
 return "custom";
}
export function slugify(name:string,fallback:string="mon-projet"){
 return name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,56)||fallback;
}
const commonCss=`:root{color-scheme:dark;font-family:system-ui,sans-serif;--bg:#120d23;--panel:#241735;--accent:#ab76f0;--text:#f8f1ff}*{box-sizing:border-box}body{margin:0;background:linear-gradient(145deg,var(--bg),#291a47);color:var(--text);min-height:100dvh}main{max-width:950px;margin:auto;padding:38px 20px}.card{border:1px solid #9565c5;border-radius:20px;background:#291a40;padding:25px;margin:18px 0;box-shadow:0 16px 36px #0005}button,input{font:inherit;padding:11px 16px;border-radius:11px}button{background:var(--accent);color:#180925;border:0;cursor:pointer;font-weight:700}button:hover{filter:brightness(1.12)}input{background:#130e24;color:white;border:1px solid #916ac1;max-width:100%}a{color:#c99cff}@media(max-width:600px){main{padding:20px 12px}}`;
function starter(kind:ProjectKind,name:string,description:string):ProjectFile[]{
 const intro=`# ${name}\n\n${description}\n\nProjet de départ créé par CMD NEURIA. Vérifier et tester avant toute mise en production.\n`;
 if(kind==="bot")return [
 {path:"package.json",content:JSON.stringify({name:slugify(name),version:"0.1.0",private:true,type:"module",scripts:{start:"node src/bot.js"},dependencies:{"discord.js":"^14.20.0"}},null,2)},
 {path:".env.example",content:"DISCORD_BOT_TOKEN=\nDISCORD_CLIENT_ID=\n"},
 {path:"src/bot.js",content:`import {Client,GatewayIntentBits,Events,REST,Routes,SlashCommandBuilder} from "discord.js";\nconst token=process.env.DISCORD_BOT_TOKEN;const clientId=process.env.DISCORD_CLIENT_ID;if(!token||!clientId)throw Error("Configurer DISCORD_BOT_TOKEN et DISCORD_CLIENT_ID");\nconst command=new SlashCommandBuilder().setName("ping").setDescription("Vérifier que le bot répond");\nawait new REST({version:"10"}).setToken(token).put(Routes.applicationCommands(clientId),{body:[command.toJSON()]});\nconst bot=new Client({intents:[GatewayIntentBits.Guilds]});bot.on(Events.InteractionCreate,async i=>{if(i.isChatInputCommand()&&i.commandName==="ping")await i.reply("Pong !")});bot.once(Events.ClientReady,c=>console.log("Connecté :",c.user.tag));await bot.login(token);\n`},
 {path:"README.md",content:intro+"\n## Démarrer\nNode 20+ : npm install, puis configure les deux variables dans un fichier .env (chargement avec node --env-file=.env src/bot.js), ou dans ton hébergeur. Invite l'application Discord avec le scope applications.commands et bot.\n\nCe socle est un bot Discord à commande /ping, pas un bot prêt à administrer un serveur.\n"}];
 if(kind==="browser")return [
 {path:"package.json",content:JSON.stringify({name:slugify(name),version:"0.1.0",private:true,scripts:{start:"electron ."},devDependencies:{electron:"^38.0.0"}},null,2)},
 {path:"main.js",content:`const {app,BrowserWindow,ipcMain}=require("electron");\nconst {URL}=require("node:url");\nlet main,tab;const safe=u=>{try{const x=new URL(u.includes("://")?u:"https://"+u);if(!["https:","http:"].includes(x.protocol))throw Error("Protocole interdit");return x.href}catch{throw Error("Adresse HTTP(S) invalide")}};\napp.whenReady().then(()=>{main=new BrowserWindow({width:1200,height:830,webPreferences:{nodeIntegration:false,contextIsolation:true,preload:require("node:path").join(__dirname,"preload.js")}});main.loadFile("index.html");tab=new BrowserWindow({parent:main,width:1100,height:650,show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});ipcMain.handle("navigate",(_,url)=>tab.loadURL(safe(String(url))));ipcMain.handle("show-page",()=>{tab.show()});ipcMain.handle("back",()=>{if(tab.webContents.canGoBack())tab.webContents.goBack()});ipcMain.handle("forward",()=>{if(tab.webContents.canGoForward())tab.webContents.goForward()});});app.on("window-all-closed",()=>app.quit());\n`},
 {path:"preload.js",content:`const{contextBridge,ipcRenderer}=require("electron");contextBridge.exposeInMainWorld("browser",{navigate:u=>ipcRenderer.invoke("navigate",u),show:()=>ipcRenderer.invoke("show-page"),back:()=>ipcRenderer.invoke("back"),forward:()=>ipcRenderer.invoke("forward")});\n`},
 {path:"index.html",content:`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><link rel="stylesheet" href="styles.css"><main><h1>🌐 ${name}</h1><section class="card"><form id="nav"><input id="url" aria-label="Adresse web" value="https://example.org" style="width:min(500px,75%)"><button>Ouvrir</button></form><p><button id="back">←</button> <button id="forward">→</button> <button id="show">Fenêtre web</button></p><p id="message">Ouvre une adresse HTTP(S) dans une fenêtre isolée.</p></section></main><script src="app.js"></script></html>`},
 {path:"app.js",content:`const status=document.getElementById("message");document.getElementById("nav").onsubmit=async e=>{e.preventDefault();try{await browser.navigate(document.getElementById("url").value);await browser.show();status.textContent="Page chargée."}catch(e){status.textContent=e.message}};for(const action of ["back","forward","show"])document.getElementById(action).onclick=()=>browser[action]();\n`},
 {path:"styles.css",content:commonCss},
 {path:"README.md",content:intro+"\n## Lancement\nnpm install puis npm start. Prototype Electron : navigation dans une fenêtre séparée, pas encore navigateur complet avec onglets, synchronisation ni protections avancées.\n"}];
 if(kind==="hosting")return [
 {path:"package.json",content:JSON.stringify({name:slugify(name),version:"0.1.0",private:true,type:"module",scripts:{start:"node server.js"}},null,2)},
 {path:"server.js",content:`import {createServer} from "node:http";import {readFile} from "node:fs/promises";\nconst port=Number(process.env.PORT||3000);const allowed={"/":"index.html","/styles.css":"styles.css","/app.js":"app.js"};createServer(async(req,res)=>{const file=allowed[new URL(req.url,"http://localhost").pathname];if(!file||req.method!=="GET"){res.writeHead(404).end("Not found");return}const body=await readFile(new URL("./"+file,import.meta.url));res.setHeader("content-type",file.endsWith(".css")?"text/css":file.endsWith(".js")?"application/javascript":"text/html");res.end(body)}).listen(port,()=>console.log("Panneau demo :",port));\n`},
 {path:"index.html",content:`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><link rel="stylesheet" href="styles.css"><main><h1>🎮 ${name}</h1><p>Tableau de bord de démonstration — aucun serveur de jeu réel n'est démarré.</p><section class="card"><h2>Serveurs</h2><button id="add">Ajouter une instance fictive</button><ul id="servers"></ul></section></main><script src="app.js"></script></html>`},
 {path:"app.js",content:`const list=document.getElementById("servers");let number=0;document.getElementById("add").onclick=()=>{const item=document.createElement("li");item.textContent="Instance de démonstration "+(++number)+" · arrêtée (simulation)";list.append(item)};\n`},
 {path:"styles.css",content:commonCss},
 {path:"README.md",content:intro+"\n## Lancement\nNode 20+ : npm start. Démonstrateur sans privilèges ni paiement. La gestion effective des serveurs, l'authentification, la facturation, les machines et les sauvegardes nécessitent une infrastructure et des tests dédiés.\n"}];
 if(kind==="game")return [
 {path:"index.html",content:`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><link rel="stylesheet" href="styles.css"><main><h1>🕹️ ${name}</h1><p>Déplace le personnage avec ← → ou A D, récupère les étoiles.</p><section class="card"><p id="score">Score : 0</p><canvas id="game" width="640" height="360" style="width:100%;max-width:640px;background:#0e0920;border-radius:12px"></canvas><p><button id="left">◀</button> <button id="right">▶</button> <button id="reset">Recommencer</button></p></section></main><script src="game.js"></script></html>`},
 {path:"styles.css",content:commonCss},
 {path:"game.js",content:`const canvas=document.getElementById("game"),ctx=canvas.getContext("2d"),keys=new Set();let x=300,target={x:60,y:120},score=0;const spawn=()=>target={x:25+Math.random()*590,y:25+Math.random()*300};function draw(){ctx.clearRect(0,0,640,360);ctx.fillStyle="#be8bff";ctx.fillRect(x,297,35,35);ctx.fillStyle="#ffdf75";ctx.beginPath();ctx.arc(target.x,target.y,12,0,7);ctx.fill();if((keys.has("ArrowLeft")||keys.has("a"))&&x>0)x-=4;if((keys.has("ArrowRight")||keys.has("d"))&&x<605)x+=4;if(Math.hypot(x+18-target.x,310-target.y)<30){score++;document.getElementById("score").textContent="Score : "+score;spawn()}requestAnimationFrame(draw)}addEventListener("keydown",e=>keys.add(e.key));addEventListener("keyup",e=>keys.delete(e.key));for(const [b,k] of [["left","ArrowLeft"],["right","ArrowRight"]]){const el=document.getElementById(b);for(const name of ["pointerdown","touchstart"])el.addEventListener(name,()=>keys.add(k));for(const name of ["pointerup","pointerleave","touchend"])el.addEventListener(name,()=>keys.delete(k))}document.getElementById("reset").onclick=()=>{score=0;x=300;spawn();document.getElementById("score").textContent="Score : 0"};draw();\n`},
 {path:"README.md",content:intro+"\n## Jouer\nOuvre index.html dans un navigateur. Prototype de jeu 2D HTML Canvas. Un jeu 3D commercial nécessite moteur graphique, assets, tests et davantage de développement.\n"}];
 const website=kind==="website"||kind==="app"||kind==="custom";
 return [
 {path:"index.html",content:`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><meta name="description" content="Projet CMD NEURIA"><link rel="stylesheet" href="styles.css"><main><h1>✨ ${name}</h1><p id="description"></p><section class="card"><h2>Bienvenue</h2><p>Première version de ton projet. Personnalise les fichiers pour continuer.</p><form id="contact"><input aria-label="Votre nom" id="name" placeholder="Ton nom" required><button>Saluer</button></form><p id="result" role="status"></p></section></main><script src="app.js"></script></html>`},
 {path:"styles.css",content:commonCss},
 {path:"app.js",content:`document.getElementById("description").textContent=${JSON.stringify(description)};document.getElementById("contact").onsubmit=e=>{e.preventDefault();document.getElementById("result").textContent="Bienvenue, "+document.getElementById("name").value+" !"};\n`},
 {path:"README.md",content:intro+"\n## Démarrer\nOuvre index.html dans le navigateur. Ce projet est un squelette HTML/CSS/JS personnalisable, pas une application complète livrée et testée.\n"}];
}
export function validateGeneratedFiles(input:unknown):ProjectFile[]{
 if(!Array.isArray(input)||!input.length||input.length>MAX_FILES)throw Error("Nombre de fichiers invalide");
 const paths=new Set<string>();let total=0;
 return input.map(file=>{
  if(!file||typeof file!=="object")throw Error("Fichier invalide");
  const path=safeProjectPath(file.path);
  if(paths.has(path.toLowerCase()))throw Error("Nom de fichier dupliqué");
  paths.add(path.toLowerCase());
  if(typeof file.content!=="string"||file.content.length>MAX_FILE)throw Error("Contenu de fichier trop volumineux");
  total+=Buffer.byteLength(file.content,"utf8");
  if(total>MAX_TOTAL)throw Error("Projet trop volumineux");
  return {path,content:file.content};
 });
}
function parseAI(text:string):ProjectFile[]|null{
 const trimmed=text.trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/,"");
 let data:any;
 try{data=JSON.parse(trimmed)}catch{
  const a=trimmed.indexOf("{"),b=trimmed.lastIndexOf("}");
  if(a<0||b<=a)return null;
  try{data=JSON.parse(trimmed.slice(a,b+1))}catch{return null}
 }
 try{return validateGeneratedFiles(data?.files)}catch{return null}
}
export async function generateProject(input:{kind?:string;description?:string;name?:string;useAI?:boolean},request:typeof fetch=fetch,env:Record<string,string|undefined>=Bun.env):Promise<ProjectBuild>{
 const desc=String(input.description||"").trim();
 if(desc.length<12||desc.length>1800)throw Error("Décris le projet (12 à 1800 caractères)");
 const kind=classifyProject(desc,String(input.kind||"auto"));
 const name=String(input.name||"").trim().slice(0,65)||DEFAULT_NAME[kind];
 const base=starter(kind,name,desc);
 const warnings=["Projet à vérifier et tester avant publication. Aucun déploiement, compte tiers ou installation de logiciel effectué."];
 let files=base,engine="starter",starterUsed=true;
 if(input.useAI!==false){
  const selected=aiConfiguration(env);
  if(selected.endpoint&&selected.token&&selected.model&&!selected.token.includes("${{")){
   try{
    const system="Tu es CMD NEURIA, développeur logiciel. Génère du vrai code source pour une première version fonctionnelle et réaliste. Réponds UNIQUEMENT en JSON strict {\\\"files\\\":[{\\\"path\\\":\\\"...\\\",\\\"content\\\":\\\"...\\\"}]}. Entre 2 et 12 fichiers, maximum 5000 caractères par fichier. Ne produis aucune clé, token, mot de passe, configuration sensible ou code qui exécute des commandes distantes. Ne suppose pas qu'un site, un hébergeur, un navigateur complet ou un grand jeu AAA soient déjà en production. Le code ne sera pas exécuté automatiquement. Privilégie HTML/CSS/JS autonomes, Node pour les bots, 2D Canvas pour les jeux, Electron pour navigateur desktop. Garde les éléments testables. Les fichiers doivent avoir des chemins relatifs sûrs.";
    const prompt="Type : "+kind+"\\nNom : "+name+"\\nDemande : "+desc+"\\nGénère un projet minimal réellement utilisable, avec README et instructions.";
    const signal=AbortSignal.timeout(43000);
    const upstream=await fetchAI(selected.endpoint,{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+selected.token},body:JSON.stringify({model:selected.model,...aiGenerationOptions(selected.provider,"normal"),messages:[{role:"system",content:system},{role:"user",content:prompt}]}),signal},env,request);
    if(upstream.ok){
     const data=await upstream.json();const raw=data?.choices?.[0]?.message?.content;
     const result=typeof raw==="string"?parseAI(raw):null;
     if(result&&result.length>=2){files=result;engine=String(upstream.neuriaModel||selected.model);starterUsed=false}
     else warnings.push("Réponse IA non structurée : projet de départ utilisé à la place.");
    }else warnings.push("Modèle IA indisponible (HTTP "+upstream.status+") : projet de départ fourni.");
   }catch{warnings.push("Le modèle a dépassé le délai ou n'a pas répondu : projet de départ fourni.")}
  }else warnings.push("Moteur IA non configuré : projet de départ fourni.");
 }
 return {name,kind,description:desc,files:validateGeneratedFiles(files),engine,starter:starterUsed,warnings,createdAt:new Date().toISOString()};
}
export async function projectZip(files:unknown,name:string):Promise<Uint8Array>{
 const entries=validateGeneratedFiles(files);
 const zip=new JSZip();
 for(const item of entries)zip.file(item.path,item.content,{createFolders:true});
 return zip.generateAsync({type:"uint8array",compression:"DEFLATE",compressionOptions:{level:5}});
}

import {test,expect} from "bun:test";
import JSZip from "jszip";
import {classifyProject,generateProject,improveProject,projectZip,safeProjectPath,validateGeneratedFiles,slugify,PROJECT_KINDS} from "./neuria-project-builder.ts";
test("types of projects automatically selected from request",()=>{
 expect(classifyProject("Crée un bot discord complet")).toBe("bot");
 expect(classifyProject("Je veux un navigateur")).toBe("browser");
 expect(classifyProject("Construis mon hébergeur de serveurs de jeux")).toBe("hosting");
 expect(classifyProject("Crée un jeu vidéo pour navigateur")).toBe("game");
 expect(classifyProject("Fais un site internet professionnel")).toBe("website");
 expect(classifyProject("Une application mobile")).toBe("app");
 expect(PROJECT_KINDS).toContain("custom");
 expect(slugify("École de Jeux CMD!")).toBe("ecole-de-jeux-cmd");
});
test("code projects have real files for all six creation categories",async()=>{
 for(const kind of PROJECT_KINDS){
  const project=await generateProject({kind,description:"Crée un vrai projet minimal avec un point d'entrée fonctionnel.",useAI:false},{...undefined} as any,{});
  expect(project.kind).toBe(kind);
  expect(project.files.length).toBeGreaterThanOrEqual(3);
  expect(project.starter).toBe(true);
  expect(project.files.some(f=>f.path==="README.md")).toBe(true);
  expect(project.deployed).toBeUndefined();
  expect(await projectZip(project.files,"demo")).toBeInstanceOf(Uint8Array);
 }
});
test("ZIP contains actual generated source files and can be extracted",async()=>{
 const p=await generateProject({kind:"bot",description:"Crée mon bot Discord avec une commande ping.",useAI:false});
 expect(p.files.map(f=>f.path)).toContain("src/bot.js");
 const zip=await JSZip.loadAsync(await projectZip(p.files,p.name));
 expect(await zip.file("src/bot.js")?.async("string")).toContain("InteractionCreate");
 expect(await zip.file(".env.example")?.async("string")).toContain("DISCORD_BOT_TOKEN=");
});
test("path traversal and accidental secrets are rejected",()=>{
 for(const path of ["../../key.txt","/etc/passwd",".env","secret/private.key","hello.zip","a\\b.js","folder/../ok.js","https:evil.js","file.png"]){
  expect(()=>safeProjectPath(path)).toThrow();
 }
 expect(safeProjectPath(".env.example")).toBe(".env.example");
 expect(()=>validateGeneratedFiles([{path:"file.js",content:"x"},{path:"FILE.JS",content:"y"}])).toThrow();
 expect(()=>validateGeneratedFiles([{path:"x.js",content:"x".repeat(32001)}])).toThrow();
});
test("Gemini can return a structured custom project which is not merely a mockup",async()=>{
 let called=0;
 const fetchMock=(async()=>{called++;return Response.json({choices:[{message:{content:JSON.stringify({files:[{path:"README.md",content:"# Créé par Gemini"},{path:"index.html",content:"<!doctype html><title>Test</title><h1>Fonctionnel</h1>"}]})}}]})}) as typeof fetch;
 const env={GEMINI_API_KEY:"test-key",NEURIA_GEMINI_MODEL:"gemini-3.8-flash"};
 const p=await generateProject({kind:"website",description:"Crée mon site qui présente des activités de karting.",useAI:true},fetchMock,env);
 expect(called).toBe(1);
 expect(p.starter).toBe(false);
 expect(p.engine).toBe("gemini-3.8-flash");
 expect(p.files.find(f=>f.path==="index.html")?.content).toContain("Fonctionnel");
});
test("malformed LLM output safely returns a labelled starter",async()=>{
 const request=(async()=>Response.json({choices:[{message:{content:"Je ne peux pas répondre en JSON"}}]})) as typeof fetch;
 const p=await generateProject({kind:"website",description:"Construis mon site vitrine de jeux vidéo.",useAI:true},request,{GEMINI_API_KEY:"test"});
 expect(p.starter).toBe(true);expect(p.engine).toBe("starter");
 expect(p.warnings.some(w=>w.includes("non structurée"))).toBe(true);
});

test("iterative AI code improvements preserve all untouched source files",async()=>{
 const original=[{path:"index.html",content:"<h1>Avant</h1>"},{path:"styles.css",content:"body { color: white }"},{path:"README.md",content:"# Mode d'emploi"}];
 let calls=0;
 const request=(async()=>{calls++;return Response.json({choices:[{message:{content:JSON.stringify({changes:[{path:"index.html",content:"<h1>Après</h1>",reason:"Corriger le titre"}],summary:"Titre modifié"})}}]})}) as typeof fetch;
 const p=await improveProject({kind:"website",name:"Mon site",description:"Améliore le titre visible sur la page d'accueil",files:original},request,{GEMINI_API_KEY:"fake-key"});
 expect(calls).toBe(1);
 expect(p.changes).toHaveLength(1);
 expect(p.files).toHaveLength(3);
 expect(p.files.find(f=>f.path==="index.html")?.content).toContain("Après");
 expect(p.files.find(f=>f.path==="styles.css")?.content).toBe(original[1].content);
 expect(p.files.find(f=>f.path==="README.md")?.content).toBe(original[2].content);
});

import {test,expect} from "bun:test";
import {inspectWorkRepository,validWorkRepo} from "./neuria-work-github.ts";

const payload=[
 {path:"README.md",type:"blob",size:90},
 {path:"src/index.ts",type:"blob",size:140},
 {path:".env",type:"blob",size:40},
 {path:"private.pem",type:"blob",size:50},
 {path:"package-lock.json",type:"blob",size:200},
 {path:"image.webp",type:"blob",size:700},
 {path:"src/long/path.ts",type:"blob",size:60}
];
const calls:string[]=[];
const fixture:typeof fetch=(async(url,init)=>{
 const u=String(url);calls.push(u);
 if(u.endsWith("/repos/znationcmd/BOT-ARK"))return Response.json({description:"Un bot ARK",private:false,default_branch:"main",archived:false,updated_at:"2026-10-19"});
 if(u.includes("/git/trees/main"))return Response.json({tree:payload,truncated:false});
 if(u.includes("/contents/README.md"))return Response.json({encoding:"base64",content:Buffer.from("# BOT ARK\nUne application.").toString("base64"),size:25});
 if(u.includes("/contents/src/index.ts"))return Response.json({encoding:"base64",content:Buffer.from("export const answer=42;").toString("base64"),size:25});
 throw Error("Unexpected URL: "+u);
}) as typeof fetch;

test("Github validates repository, branch, and unsafe paths",()=>{
 expect(()=>validWorkRepo("znationcmd/BOT-ARK","main")).not.toThrow();
 for(const input of ["../steal","example","a/../../repo","https://github.com/a/b"]){
   expect(()=>validWorkRepo(input,"main")).toThrow();
 }
 expect(()=>validWorkRepo("znationcmd/BOT-ARK","../../main")).toThrow();
});
test("Work reads actual metadata, Git tree and code; ignores credential files",async()=>{
 calls.length=0;
 const found=await inspectWorkRepository("znationcmd/BOT-ARK","", "",fixture);
 expect(found.verified).toBe(true);expect(found.readonly).toBe(true);
 expect(found.sources.map(x=>x.sourceType)).toContain("tree");
 expect(found.sources.some(x=>x.title==="src/index.ts")).toBe(true);
 expect(found.sources.some(x=>x.title===".env")).toBe(false);
 expect(found.sources.map(x=>x.excerpt).join("\n")).not.toContain("private.pem");
 expect(found.sources.some(x=>x.excerpt.includes("answer=42"))).toBe(true);
 expect(calls.length).toBe(4);
});
test("Private GitHub source requires personal OAuth; no server-wide token fallback",async()=>{
 const privateGetter=async()=>Response.json({private:true,default_branch:"main"});
 await expect(inspectWorkRepository("owner/private","", "",privateGetter as typeof fetch)).rejects.toThrow("connexion GitHub");
});
test("Cannot falsely certify a failed remote GitHub request",async()=>{
 const failing=async()=>new Response('{"message":"no"}',{status:403});
 await expect(inspectWorkRepository("znationcmd/BOT-ARK","", "",failing as typeof fetch)).rejects.toThrow("GitHub access refused");
});

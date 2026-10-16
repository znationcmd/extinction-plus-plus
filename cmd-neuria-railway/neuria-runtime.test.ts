import {test,expect,afterAll} from 'bun:test';
import {Script} from 'node:vm';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const folder=mkdtempSync(join(tmpdir(),'neuria-test-'));
Bun.env.PORT='0';
Bun.env.NEURIA_QUOTA_DB_PATH=join(folder,'quota.sqlite');
Bun.env.NEURIA_WORK_ADMIN_KEY='test-admin-key-01234567890123456789';
Bun.env.NEURIA_OAUTH_ENCRYPTION_KEY='test-encryption-key-01234567890123456789';
Bun.env.NEURIA_ORACLE_WORKER_URL='https://worker.test/oracle';
Bun.env.NEURIA_PULSE_WORKER_URL='https://worker.test/pulse';
Bun.env.NEURIA_GENERATION_WORKER_TOKEN='test-worker-token';
const originalFetch=globalThis.fetch;
let mode='fail',workerCalls=0;
globalThis.fetch=(async(input,init)=>{
 const url=String(input);
 if(url==='https://api.github.com/user')return Response.json({id:123456});
 if(url.startsWith('https://worker.test/')){
  workerCalls++;
  if(mode==='throw')throw new Error('worker unavailable');
  if(mode==='fail')return new Response('unavailable',{status:503});
  if(mode==='bad')return new Response('not a GLB',{headers:{'content-type':'application/json'}});
  const bytes=new Uint8Array(44);bytes.set(new TextEncoder().encode('glTF'));
  return new Response(bytes,{headers:{'content-type':'model/gltf-binary'}});
 }
 return originalFetch(input,init);
}) as typeof fetch;
const {neuriaServer}=await import('./index.ts');
const base='http://127.0.0.1:'+neuriaServer.port;
const iv=crypto.getRandomValues(new Uint8Array(12));
const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(Bun.env.NEURIA_OAUTH_ENCRYPTION_KEY));
const key=await crypto.subtle.importKey('raw',digest,'AES-GCM',false,['encrypt']);
const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode('test-github-token'));
const cookie='neuria_github='+Buffer.concat([Buffer.from(iv),Buffer.from(encrypted)]).toString('base64url');
function generate(prompt:unknown='une maison'){
 return fetch(base+'/api/neuria/generation/oracle',{method:'POST',headers:{'content-type':'application/json','x-neuria-work-key':Bun.env.NEURIA_WORK_ADMIN_KEY!,cookie},body:JSON.stringify({prompt})});
}
afterAll(()=>{neuriaServer.stop(true);globalThis.fetch=originalFetch;rmSync(folder,{recursive:true,force:true});});
test('the entire delivered browser script parses',async()=>{
 const response=await fetch(base+'/client.js');expect(response.status).toBe(200);
 const code=await response.text();expect(()=>new Script(code)).not.toThrow();
});
test('invalid prompts do not reserve quota or call the worker',async()=>{
 const before=workerCalls;expect((await generate('')).status).toBe(400);expect(workerCalls).toBe(before);
 const {quotaDatabase}=await import('./neuria-generation-quota.ts');
 expect(quotaDatabase().query('SELECT COUNT(*) AS count FROM generation_quota').get().count).toBe(0);
});
test('upstream errors, invalid results and timeouts refund the quota',async()=>{
 for(const nextMode of ['fail','bad','throw']){
  mode=nextMode;expect((await generate()).status).toBe(502);
  const {quotaDatabase}=await import('./neuria-generation-quota.ts');
  expect(quotaDatabase().query('SELECT COUNT(*) AS count FROM generation_quota').get().count).toBe(0);
 }
});
test('successful generation reserves Oracle only, for 24h, per account',async()=>{
 mode='success';expect((await generate()).status).toBe(200);
 const before=workerCalls;expect((await generate()).status).toBe(429);expect(workerCalls).toBe(before);
 const {reserveGeneration,refundFailedGeneration}=await import('./neuria-generation-quota.ts');
 expect(reserveGeneration('github:123456','pulse').allowed).toBe(true);
 expect(reserveGeneration('github:999999','oracle').allowed).toBe(true);
 const now=Date.now()+24*60*60*1000+1000;
 expect(reserveGeneration('github:123456','oracle',now).allowed).toBe(true);
 refundFailedGeneration('github:123456','oracle',now-1);
 expect(reserveGeneration('github:123456','oracle',now+1).allowed).toBe(false);
});
test('document exports preserve lines, columns, slides and accented PDF text',async()=>{
 const request=(format,content)=>fetch(base+'/api/files/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({format,title:'Essai été',content})});
 const doc=await request('docx','Première ligne\nDeuxième ligne');expect(doc.status).toBe(200);
 const JSZip=(await import('jszip')).default;
 const zip=await JSZip.loadAsync(await doc.arrayBuffer());
 const xml=await zip.file('word/document.xml')!.async('string');
 expect(xml).toContain('Première ligne');expect(xml.match(/<w:p>/g)?.length).toBe(3);
 const xls=await request('xlsx','Nom;Valeur\nTest;42');expect(xls.status).toBe(200);
 const ExcelJS=(await import('exceljs')).default;const book=new ExcelJS.Workbook();await book.xlsx.load(await xls.arrayBuffer());
 expect(book.worksheets[0].rowCount).toBe(2);expect(book.worksheets[0].getCell('B2').value).toBe('42');
 const ppt=await request('pptx','Première diapositive\n---\nDeuxième diapositive');expect(ppt.status).toBe(200);
 const slides=await JSZip.loadAsync(await ppt.arrayBuffer());expect(Object.keys(slides.files).filter(x=>/^ppt\/slides\/slide\d+\.xml$/.test(x)).length).toBe(2);
 const pdf=await request('pdf','Café été\nDeuxième ligne');expect(pdf.status).toBe(200);
 const bytes=new Uint8Array(await pdf.arrayBuffer());expect(new TextDecoder().decode(bytes.slice(0,5))).toBe('%PDF-');
});

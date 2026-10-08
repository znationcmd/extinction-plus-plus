const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(process.env.CMD_TEST_SERVER||path.join(root,'cmd-discord-mcp/server.js'),'utf8');
const signing=source.slice(source.indexOf('function signPayload('),source.indexOf('function verifyDiscordBridge('));
function signingContext(now){
 const Clock=class extends Date {static now(){return now.value}};
 return vm.createContext({crypto,Buffer,Date:Clock,oauthSecret:'test-only-secret',b64url:input=>Buffer.from(input).toString('base64url')});
}
test('Pending Discord login has no timeout while issued tokens still expire',()=>{
 const now={value:Date.now()},ctx=signingContext(now);
 vm.runInContext(signing,ctx);
 for(const typ of ['dashboard_tx','oauth_tx']){
  const route=source.match(new RegExp('const tx=signPayload\\(\\{typ:"'+typ+'"[^\\n]+'))[0];
  const exp=route.match(/exp:([^,]+),/)[1];
  const token=vm.runInContext('signPayload({typ:"'+typ+'",exp:'+exp+'})',ctx);
  ctx.token=token;now.value+=14*60*1000;
  assert.equal(vm.runInContext('verifySigned(token).typ',ctx),typ);
  ctx.token=token.slice(0,-1)+(token.endsWith('A')?'B':'A');
  assert.throws(()=>vm.runInContext('verifySigned(token)',ctx),/Signature invalide/);
  ctx.token=token;now.value+=17*60*1000;
  assert.equal(vm.runInContext('verifySigned(token).typ',ctx),typ);
 }
 ctx.token=vm.runInContext('signPayload({typ:"access",exp:Date.now()+1000})',ctx);
 now.value+=2000;assert.throws(()=>vm.runInContext('verifySigned(token)',ctx),/Jeton expiré/);
 ctx.token=vm.runInContext('signPayload({typ:"dashboard_session",exp:0})',ctx);
 assert.throws(()=>vm.runInContext('verifySigned(token)',ctx),/Jeton expiré/);
});
test('Bridge pending state has no timeout and uses a secure browser session cookie',async()=>{
 const file=fs.readFileSync(path.join(root,'dashboard/app/api/mod-auth/login/route.js'),'utf8');
 const stripped=file.replace(/^import .*;\n/gm,'').replace(/export /g,'');
 let saved;
 const ctx=vm.createContext({crypto,URL,URLSearchParams,Date,process:{env:{CLIENT_ID:'test',CLIENT_SECRET:'test',DISCORD_BRIDGE_TARGETS:'https://sphere.example'}},origin:()=> 'https://bridge.example',cookieOptions:{httpOnly:true,sameSite:'lax',secure:true},seal:x=>{saved=x;return 'sealed'},failure:e=>({error:e.message}),NextResponse:{redirect:url=>({url:String(url),cookies:{set:(name,value,opts)=>{ctx.cookie={name,value,opts}}}})}});
 vm.runInContext(stripped,ctx);const before=Date.now();
 const result=await ctx.GET({url:'https://bridge.example/api/mod-auth/login?bridge=https://sphere.example&bridge_state=signed-state'});
 assert.equal(new URL(result.url).hostname,'discord.com');
 assert.equal(saved.bridgeState,'signed-state');assert.equal(saved.bridgeTarget,'https://sphere.example');
 assert.equal(ctx.cookie.opts.maxAge,undefined);assert.equal(ctx.cookie.opts.httpOnly,true);assert.equal(ctx.cookie.opts.secure,true);
 assert.equal(saved.expires,0);assert.equal(saved.typ,'discord_login');
 const rejected=await ctx.GET({url:'https://bridge.example/api/mod-auth/login?bridge=https://evil.example'});
 assert.match(rejected.error,/non autorisé/);
});
test('Bridge callback rejects mismatched state before contacting Discord',async()=>{
 const file=fs.readFileSync(path.join(root,'dashboard/app/api/mod-auth/callback/route.js'),'utf8');
 const stripped=file.replace(/^import .*;\n/gm,'').replace(/export /g,'');
 let removed=false,calls=0;
 const ctx=vm.createContext({URL,cookies:async()=>({get:()=>({value:'sealed'}),delete:()=>{removed=true}}),unseal:()=>({state:'expected'}),failure:e=>({error:e.message}),fetch:()=>{calls++;throw Error('must not fetch')}});
 vm.runInContext(stripped,ctx);
 const result=await ctx.GET({url:'https://bridge.example/api/mod-auth/callback?state=wrong&code=test'});
 assert.match(result.error,/Connexion Discord invalide/);assert.equal(calls,0);assert.equal(removed,true);
});

test('Only encrypted pending login states may omit a deadline',()=>{
 const file=fs.readFileSync(path.join(root,'dashboard/lib/mod-auth.js'),'utf8');
 const begin=file.indexOf('function key()');
 const end=file.indexOf('export const cookieOptions');
 const stripped=file.slice(begin,end).replace(/export /g,'');
 const now={value:Date.now()};
 const Clock=class extends Date {static now(){return now.value}};
 const ctx=vm.createContext({crypto,Buffer,Date:Clock,secure:{configuredSecrets:()=>['a'.repeat(32)],validSecret:()=>true}});
 vm.runInContext(stripped,ctx);
 const pending=ctx.seal({typ:'discord_login',state:'b'.repeat(64),expires:0});
 const session=ctx.seal({typ:'session',expires:now.value+1000});
 now.value+=24*60*60*1000;
 assert.equal(ctx.unseal(pending).typ,'discord_login');
 assert.equal(ctx.unseal(session),null);
 assert.equal(ctx.unseal(ctx.seal({typ:'session',expires:0})),null);
 assert.equal(ctx.unseal(ctx.seal({typ:'discord_login',state:'invalid',expires:0})),null);
 assert.equal(ctx.unseal(pending.slice(0,-8)),null);
});

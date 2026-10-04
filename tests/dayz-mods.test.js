const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs/promises');
const path=require('path');
const {validateConfig,allowed,isDayzPC}=require('../shared/dayz-mod-store');
const {execute,files}=require('../shared/dayz-mod-worker');
const base={mods:[{id:'123',folder:'@CF'}],root:'/dayz',delayMinutes:0,autoUpdate:false,channelId:''};
test('founder access requires ownership or an explicitly delegated role',()=>{
  assert.equal(allowed(true,[],[]),true);
  assert.equal(allowed(false,['founder'],['founder']),true);
  assert.equal(allowed(false,['admin'],['founder']),false);
  assert.equal(allowed(false,[],[]),false);
});
test('only explicit DayZ PC records are eligible',()=>{
  assert.equal(isDayzPC({game:'dayz_pc'}),true);
  assert.equal(isDayzPC({game:'DayZ',platform:'PC'}),true);
  for(const s of [{game:'dayz_ps'},{game:'dayz_xbox'},{game:'DayZ',platform:'Xbox'},{game:'ark'},{game:'dayz'}])assert.equal(isDayzPC(s),false);
});
test('configuration rejects path traversal, executable args, duplicates and silent automatic restarts',()=>{
  assert.deepEqual(validateConfig(base),base);
  for(const cfg of [ {...base,root:'/dayz/../keys'}, {...base,mods:[{id:'123 +quit',folder:'@CF'}]}, {...base,mods:[{id:'123',folder:'../keys'}]}, {...base,mods:[...base.mods,...base.mods]}, {...base,delayMinutes:-1}, {...base,autoUpdate:true} ])assert.throws(()=>validateConfig(cfg));
});
function harness(status='started',fault='') {
  const entries=new Map([['/dayz',{dir:true}],['/dayz/@CF',{dir:true}],['/dayz/@CF/old.pbo',{size:7}],['/dayz/keys',{dir:true}],['/dayz/keys/test.bikey',{size:3}]]);
  const calls=[];
  let failed=false;
  const ftp={
    access:async()=>calls.push('connect'), cd:async target=>{assert(entries.has(target));},
    ensureDir:async target=>{entries.set(target,{dir:true});},
    uploadFromDir:async(local,target)=>{entries.set(target,{dir:true});for(const f of await files(local)){entries.set(path.posix.join(target,f.relative),{size:f.size});const parent=path.posix.dirname(path.posix.join(target,f.relative));entries.set(parent,{dir:true});}calls.push('stage-mod');},
    uploadFrom:async(file,target)=>{entries.set(target,{size:(await fs.stat(file)).size});calls.push('stage-key');},
    list:async target=>[...entries].filter(([p])=>path.posix.dirname(p)===target).map(([p,v])=>({name:path.posix.basename(p),size:fault==='size' && p.endsWith('new.pbo') ? v.size+1 : v.size})),
    rename:async(from,to)=>{
      if(fault==='swap' && to==='/dayz/keys/test.bikey' && !failed){failed=true;throw new Error('FTP transfer failed');}
      assert(entries.has(from),`missing ${from}`);assert(!entries.has(to),`destination exists ${to}`);
      for(const [p,value] of [...entries])if(p===from||p.startsWith(from+'/')){entries.delete(p);entries.set(to+p.slice(from.length),value);}calls.push(`rename:${to}`);
    },
    removeDir:async target=>{for(const [p] of [...entries])if(p===target||p.startsWith(target+'/'))entries.delete(p);},close:()=>calls.push('close')
  };
  const server={id:'g:s',guild_id:'g',service_id:'s',name:'Test',active:true,config:base};
  const dependencies={ftp,pool:{query:async()=>calls.push('installed')},api:{getGameServer:async()=>({data:{gameserver:{game:'dayz',status,credentials:{ftp:{hostname:'example',username:'user',password:'secret'}}}}}),stop:async()=>calls.push('stop'),restart:async()=>calls.push('start')},workshop:async()=>[{id:'123',folder:'@CF',updated:100,name:'CF'}],download:async(mod,temp)=>{
    if(fault==='download')throw new Error('Download failed');
    const local=path.join(temp,'123');await fs.mkdir(path.join(local,'Addons'),{recursive:true});await fs.mkdir(path.join(local,'Keys'));
    await fs.writeFile(path.join(local,'Addons','new.pbo'),'NEW_MOD');await fs.writeFile(path.join(local,'Keys','test.bikey'),'NEW_KEY');calls.push('download');
    return {...mod,local,files:await files(local)};
  },report:async phase=>calls.push(`report:${phase}`),notify:async()=>calls.push('notice'),waitStatus:async(api,id,expected)=>{calls.push(`wait:${expected}`);if(fault==='start' && expected==='started')throw new Error('Startup failed');},sleep:async()=>{}};
  return {server,dependencies,calls,entries};
}
test('downloads and verifies before stopping, installs keys, then starts',async()=>{
  const h=harness();await execute(h.server,{id:'test'},h.dependencies);
  assert(h.calls.indexOf('download')<h.calls.indexOf('stop'));
  assert(h.calls.indexOf('stage-key')<h.calls.indexOf('stop'));
  assert(h.calls.indexOf('wait:stopped')<h.calls.indexOf('rename:/dayz/@CF'));
  assert(h.calls.indexOf('rename:/dayz/keys/test.bikey')<h.calls.indexOf('start'));
  assert(h.entries.has('/dayz/@CF/Addons/new.pbo'));
  assert(!h.entries.has('/dayz/@CF/old.pbo'));
  assert(![...h.entries.keys()].some(p=>p.includes('.extinction-mods')));
});
test('download and size failures leave the game server running and files intact',async()=>{
  for(const fault of ['download','size']){
    const h=harness('started',fault);await assert.rejects(execute(h.server,{id:'test'},h.dependencies));
    assert(!h.calls.includes('stop'));assert(!h.calls.includes('start'));assert(h.entries.has('/dayz/@CF/old.pbo'));
  }
});
test('partial install failure restores old mod and old key before restarting',async()=>{
  const h=harness('started','swap');await assert.rejects(execute(h.server,{id:'test'},h.dependencies));
  assert(h.entries.has('/dayz/@CF/old.pbo'));assert.equal(h.entries.get('/dayz/keys/test.bikey').size,3);
  assert(h.calls.includes('start'));assert(!h.calls.includes('installed'));
});
test('already stopped server stays stopped',async()=>{
  const h=harness('stopped');await execute(h.server,{id:'test'},h.dependencies);
  assert(!h.calls.includes('stop'));assert(!h.calls.includes('start'));
});
test('failed startup retains the old backups and does not report success',async()=>{
  const h=harness('started','start');await assert.rejects(execute(h.server,{id:'test'},h.dependencies));
  assert(h.entries.has('/dayz/.extinction-mods-test/backup/@CF/old.pbo'));
  assert(!h.calls.includes('report:Mods mis à jour — serveur démarré'));
});
test('lost database lock after stopping blocks installation and restart for manual recovery',async()=>{
  const h=harness();
  h.dependencies.check=()=>{if(h.calls.includes('wait:stopped'))throw Object.assign(new Error('Lock lost'),{leaseLost:true,recoveryRequired:true});};
  await assert.rejects(execute(h.server,{id:'test'},h.dependencies),e=>e.recoveryRequired===true);
  assert(!h.calls.includes('rename:/dayz/@CF'));assert(!h.calls.includes('start'));assert(h.entries.has('/dayz/@CF/old.pbo'));
});

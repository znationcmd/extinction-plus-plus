const test=require('node:test');
const assert=require('node:assert/strict');
const {handleCmdProfileScene}=awaitImport();
function awaitImport(){return import('../cmd-profile-scene-api.js')}
const endpoint=new URL('https://cmd-sphere.up.railway.app/api/profile/scene');
const image='data:image/png;base64,'+Buffer.from('89504e470d0a1a0a00000000','hex').toString('base64');
function harness(){
 const users=new Map();
 const statements=[];
 const get=id=>{
  if(!users.has(id))users.set(id,{
   cmd_avatar_scene:{scene:'neonforest',avatarPreset:'guardian',avatarStyle:'3d',petStyle:'3d',pet:'fox',vehicle:'kart',home:'villa',top:'jacket',hideHome:false},
   cmd_avatar_scene_image:'old-background',cmd_avatar_character_image:'old-character',cmd_avatar_pet_image:'old-pet'
  });
  return users.get(id);
 };
 const pool={async query(sql,args=[]){
  statements.push({sql,args});
  if(sql.startsWith('SELECT cmd_avatar_scene'))return {rows:[structuredClone(get(args[0]))]};
  if(sql.startsWith('INSERT INTO cmd_global_profiles')){get(args[0]);return {rows:[]}};
  if(sql.startsWith('UPDATE cmd_global_profiles SET cmd_avatar_scene=')){
   assert.match(sql,/COALESCE\(cmd_avatar_scene,'\{\}'::jsonb\) \|\| \$2::jsonb/,'Atomic JSONB merge required');
   assert.match(sql,/WHERE user_id=\$1/,'Account scoping required');
   const record=get(args[0]),patch=JSON.parse(args[1]);
   record.cmd_avatar_scene={...record.cmd_avatar_scene,...patch};
   if(args[5])record.cmd_avatar_scene_image=args[2];
   if(args[6])record.cmd_avatar_character_image=args[3];
   if(args[7])record.cmd_avatar_pet_image=args[4];
   return {rows:[{cmd_avatar_scene:structuredClone(record.cmd_avatar_scene)}]};
  }
  return {rows:[]};
 }};
 const request=(method,uid,payload)=>{
  const bytes=Buffer.from(JSON.stringify(payload??{}));
  return {req:{method,async *[Symbol.asyncIterator](){yield bytes;}},context:{pool,auth:uid?{user:{id:uid}}:null}};
 };
 const execute=async(method,uid,payload)=>{
  const {req,context}=request(method,uid,payload);
  const res={status:0,body:'',writeHead(status){this.status=status;return this},end(data){this.body=String(data??'');return this}};
  const matched=await handleCmdProfileScene(req,res,endpoint,context);
  assert.equal(matched,true);
  return {status:res.status,body:JSON.parse(res.body)};
 };
 return {get,pool,statements,execute};
}
test('Existing legacy 3D model and historical catalogue IDs survive GET',async()=>{
 const h=harness(),r=await h.execute('GET','member-A');
 assert.equal(r.status,200);
 for(const [key,value] of Object.entries({scene:'neonforest',avatarPreset:'guardian',avatarStyle:'3d',petStyle:'3d',pet:'fox',vehicle:'kart',home:'villa',hideHome:false}))
  assert.equal(r.body.scene[key],value,key);
});
test('A partial save changes only requested fields and preserves everything else',async()=>{
 const h=harness(),before=structuredClone(h.get('member-A'));
 const r=await h.execute('POST','member-A',{scene:{pet:'catalog-pet-65'}});
 assert.equal(r.status,200,JSON.stringify(r.body));
 assert.deepEqual(h.get('member-A').cmd_avatar_scene,{...before.cmd_avatar_scene,pet:'catalog-pet-65'});
 for(const key of ['cmd_avatar_scene_image','cmd_avatar_character_image','cmd_avatar_pet_image'])
  assert.equal(h.get('member-A')[key],before[key]);
});
test('Unrelated changes from two devices do not overwrite each other',async()=>{
 const h=harness();
 assert.equal((await h.execute('POST','member-A',{scene:{avatarPreset:'reference-avatar-67',avatarStyle:'2d'}})).status,200);
 assert.equal((await h.execute('POST','member-A',{scene:{vehicle:'catalog-vehicle-27'}})).status,200);
 assert.equal(h.get('member-A').cmd_avatar_scene.avatarPreset,'reference-avatar-67');
 assert.equal(h.get('member-A').cmd_avatar_scene.vehicle,'catalog-vehicle-27');
 assert.equal(h.get('member-A').cmd_avatar_scene.scene,'neonforest');
 assert.equal(h.get('member-A').cmd_avatar_scene.home,'villa');
});
test('Explicitly removing one personal image never removes another',async()=>{
 const h=harness();
 assert.equal((await h.execute('POST','member-A',{customBackground:null})).status,200);
 const p=h.get('member-A');
 assert.equal(p.cmd_avatar_scene_image,null);
 assert.equal(p.cmd_avatar_character_image,'old-character');
 assert.equal(p.cmd_avatar_pet_image,'old-pet');
 assert.equal(p.cmd_avatar_scene.scene,'neonforest');
});
test('Invalid values are rejected without writing and private profiles stay isolated',async()=>{
 const h=harness();
 const bad=await h.execute('POST','member-A',{scene:{home:'javascript:unsafe'}});
 assert.equal(bad.status,400);
 assert.equal(h.statements.filter(q=>q.sql.startsWith('UPDATE cmd_global_profiles')).length,0);
 assert.equal((await h.execute('POST',null,{scene:{scene:'beach'}})).status,401);
 assert.equal((await h.execute('POST','member-B',{scene:{scene:'catalog-scene-150'}})).status,200);
 assert.equal(h.get('member-A').cmd_avatar_scene.scene,'neonforest');
 assert.equal(h.get('member-B').cmd_avatar_scene.scene,'catalog-scene-150');
});
test('A partial legacy scene save does not coerce its avatar into reference-avatar-0',async()=>{
 const h=harness();
 assert.equal((await h.execute('POST','member-A',{scene:{petName:'Milo'}})).status,200);
 assert.equal(h.get('member-A').cmd_avatar_scene.avatarPreset,'guardian');
 assert.equal(h.get('member-A').cmd_avatar_scene.avatarStyle,'3d');
 assert.equal(h.get('member-A').cmd_avatar_scene.petName,'Milo');
});

const test=require("node:test");
const assert=require("node:assert/strict");
const {Buffer}=require("node:buffer");
function makeGLB(){
 const metadata=Buffer.from(JSON.stringify({asset:{version:"2.0"},scenes:[{nodes:[0]}],nodes:[{name:"Root"}]}));
 const json=Buffer.concat([metadata,Buffer.alloc((4-metadata.length%4)%4,32)]);
 const blob=Buffer.alloc(20+json.length);
 blob.write("glTF",0);blob.writeUInt32LE(2,4);blob.writeUInt32LE(blob.length,8);
 blob.writeUInt32LE(json.length,12);blob.write("JSON",16);json.copy(blob,20);
 return blob;
}
function output(){
 const r={status:0,headers:null,body:null};
 r.writeHead=(s,h)=>{r.status=s;r.headers=h};
 r.end=b=>{r.body=b};return r;
}
function bodyRequest(bytes,method="PUT"){
 return {method,headers:{"content-type":"model/gltf-binary"},async *[Symbol.asyncIterator](){yield bytes}};
}
test("GLB upload rejects unauthorized and corrupt data, saves private uploads",async()=>{
 const api=await import("../cmd-profile-3d-api.js");
 const records=new Map();
 const calls=[];
 const pool={async query(sql,params=[]){
  calls.push(sql);
  if(sql.includes("FROM cmd_profile_3d_assets"))return {rows:records.has(params[0]+"/"+params[1])?[{glb:records.get(params[0]+"/"+params[1])}]:[]};
  if(sql.startsWith("INSERT INTO cmd_profile_3d_assets"))records.set(params[0]+"/"+params[1],params[2]);
  if(sql.startsWith("DELETE FROM cmd_profile_3d_assets"))records.delete(params[0]+"/"+params[1]);
  return {rows:[]};
 }};
 await api.initCmdProfile3D(pool);
 assert.equal(calls.length,1);
 const route={pathname:"/api/profile/3d/avatar"};
 const denied=output();await api.handleCmdProfile3D(bodyRequest(makeGLB()),denied,route,{pool,auth:null});
 assert.equal(denied.status,401);
 const bad=output();await api.handleCmdProfile3D(bodyRequest(Buffer.from("bad glb")),bad,route,{pool,auth:{user:{id:"42"}}});
 assert.equal(bad.status,400);
 const uploaded=output();await api.handleCmdProfile3D(bodyRequest(makeGLB()),uploaded,route,{pool,auth:{user:{id:"42"}}});
 assert.equal(uploaded.status,200);
 const fetched=output();await api.handleCmdProfile3D({method:"GET"},fetched,route,{pool,auth:{user:{id:"42"}}});
 assert.equal(fetched.status,200);assert.equal(fetched.body.toString("ascii",0,4),"glTF");
 const other=output();await api.handleCmdProfile3D({method:"GET"},other,route,{pool,auth:{user:{id:"77"}}});
 assert.equal(other.status,404);
 const deleted=output();await api.handleCmdProfile3D({method:"DELETE"},deleted,route,{pool,auth:{user:{id:"42"}}});
 assert.equal(deleted.status,200);
});
test("3D scene config retains 3D mode, model choice and original profile ownership",async()=>{
 const api=await import("../cmd-profile-scene-api.js");
 const query=[];
 const pool={async query(sql,args){query.push({sql,args});return {rows:[]}}};
 await api.initCmdProfileScene(pool);
 assert.ok(query.some(x=>x.sql.includes("cmd_avatar_scene")));
 let a=output();
 const input=Buffer.from(JSON.stringify({scene:{scene:"neonforest",gender:"female",avatarStyle:"3d",avatarModel:"michelle",petStyle:"3d",petModel:"fox",pet:"fox"}}));
 await api.handleCmdProfileScene({method:"POST",async *[Symbol.asyncIterator](){yield input}},a,{pathname:"/api/profile/scene"},{pool,auth:{user:{id:"42"}}});
 assert.equal(a.status,200);
 assert.equal(JSON.parse(a.body).scene.avatarModel,"michelle");
 assert.equal(JSON.parse(a.body).scene.scene,"neonforest");
 assert.ok(query.some(x=>x.sql.startsWith("UPDATE cmd_global_profiles SET")));
});

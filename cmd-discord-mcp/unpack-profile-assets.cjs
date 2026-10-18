// Release-owned image archive. Extract to separate immutable public assets at startup.
// Use atomic replacement so concurrent processes never observe a half-written JSON
// catalogue manifest, image or avatar file while another process is extracting it.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const directory=path.join(__dirname,'profile-assets');
if(fs.existsSync(directory)){
 const chunks=fs.readdirSync(directory).filter(name=>/^catalogue\.br\.part-\d{3}$/.test(name)).sort();
 const entries=JSON.parse(zlib.brotliDecompressSync(Buffer.concat(chunks.map(name=>fs.readFileSync(path.join(directory,name))))).toString('utf8'));
 for(const [name,base64] of Object.entries(entries)){
  if(!/^public\/(avatars\/v3|universe\/v1)\/[a-z0-9.-]+$/.test(name))throw Error('Invalid catalogue asset path');
  const destination=path.join(__dirname,name);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  const bytes=Buffer.from(base64,'base64');
  const tmp=destination+'.tmp-'+process.pid+'-'+crypto.randomBytes(8).toString('hex');
  try{fs.writeFileSync(tmp,bytes,{flag:'wx'});fs.renameSync(tmp,destination)}
  finally{try{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}catch{}}
 }
}

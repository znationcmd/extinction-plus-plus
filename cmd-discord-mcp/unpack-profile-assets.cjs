// Release-owned image archive. Extract to separate immutable public assets at startup.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const directory=path.join(__dirname,'profile-assets');
if(fs.existsSync(directory)){
 const chunks=fs.readdirSync(directory).filter(name=>/^catalogue\.br\.part-\d{3}$/.test(name)).sort();
 const entries=JSON.parse(zlib.brotliDecompressSync(Buffer.concat(chunks.map(name=>fs.readFileSync(path.join(directory,name))))).toString('utf8'));
 for(const [name,base64] of Object.entries(entries)){
  if(!/^public\/(avatars\/v3|universe\/v1)\/[a-z0-9.-]+$/.test(name))throw Error('Invalid catalogue asset path');
  const destination=path.join(__dirname,name);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,Buffer.from(base64,'base64'));
 }
}

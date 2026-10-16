// Release-owned photographic assets; verify all bytes before publishing local files.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const partsDir=path.join(__dirname,'realistic-assets');
if(!fs.existsSync(partsDir))throw Error('Photographic asset archive is missing');
const names=fs.readdirSync(partsDir).filter(n=>/^photographic\.br\.part-\d{3}$/.test(n)).sort();
if(!names.length)throw Error('Photographic asset archive is empty');
const payload=JSON.parse(zlib.brotliDecompressSync(Buffer.concat(names.map(n=>fs.readFileSync(path.join(partsDir,n))))));
if(payload.version!==1||!Array.isArray(payload.manifest?.assets)||payload.manifest.assets.length!==52)throw Error('Invalid photographic catalogue manifest');
const verified=[];
for(const asset of payload.manifest.assets){for(const variant of ['preview','full']){const item=asset[variant];if(!/^[a-z-]+-(preview|4k)\.webp$/.test(item?.file||''))throw Error('Invalid photographic asset path');const bytes=Buffer.from(payload.files[item.file]||'','base64');if(bytes.length!==item.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Photographic asset failed integrity check: '+item.file);verified.push([item.file,bytes]);}}
const out=path.join(__dirname,'public/cmd-realistic/v1');fs.mkdirSync(out,{recursive:true});for(const [file,bytes]of verified)fs.writeFileSync(path.join(out,file),bytes);fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(payload.manifest,null,2)+'\n');console.log('[photographic-assets]',payload.manifest.assets.length,'verified assets,',verified.length,'image files');

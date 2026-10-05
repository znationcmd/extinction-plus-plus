module.exports=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(require('./ark-spawns-data.cjs'),'base64')));

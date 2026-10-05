module.exports=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(require('./dayz-loot-catalog-data.cjs'),'base64')));

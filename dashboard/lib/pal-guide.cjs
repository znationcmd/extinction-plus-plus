module.exports=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(require('./pal-guide-data.cjs'),'base64')));

module.exports=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(require('./pal-map-data.cjs'),'base64')));

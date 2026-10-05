module.exports=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(require('./ark-creatures-data.cjs'),'base64')));

module.exports=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(require('./conan-guide-data.json').gzipBase64,'base64')));

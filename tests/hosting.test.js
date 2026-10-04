const test=require('node:test');
const assert=require('node:assert/strict');
const hosting=require('../dashboard/lib/hosting.cjs');
test('hosting keeps legacy Nitrado support while explicitly selected hosts never use its API',()=>{
 assert.equal(hosting.isNitrado({nitradoServiceId:'123'}),true);
 assert.equal(hosting.isNitrado({provider:'gportal',nitradoServiceId:'123'}),false);
 assert.equal(hosting.isNitrado({provider:'other'}),false);
 assert.equal(hosting.isNitrado({provider:'nitrado'}),true);
 assert.equal(hosting.providers.gportal,'GPORTAL');
 assert.equal(hosting.panelUrl({provider:'gportal'}),'https://www.g-portal.com/');
 assert.equal(hosting.panelUrl({provider:'other',panelUrl:'https://panel.example.com/servers/1'}),'https://panel.example.com/servers/1');
});
test('panel links never expose credentials or execute non-HTTPS URLs',()=>{
 for(const panelUrl of ['javascript:alert(1)','http://panel.example.com','https://user:secret@panel.example.com','bad url'])assert.equal(hosting.panelUrl({panelUrl}),'');
});

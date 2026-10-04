const test=require('node:test');
const assert=require('node:assert/strict');
const {validateFile,MAX_BYTES}=require('../shared/file-validator');
test('JSON accepts BOM and reports malformed syntax with location',()=>{
  assert.equal(validateFile('config.json','\uFEFF{"name":"DayZ"}').valid,true);
  assert.equal(validateFile('config.JSON','[1,2,3]').valid,true);
  for(const text of ['', '{\n "x": 1,\n}', '{"a":NaN}', '/* comment */ {}']){
    const result=validateFile('config.json',text);assert.equal(result.valid,false);assert(result.line>=1);assert(result.column>=1);
  }
});
test('XML accepts comments, declarations, namespaces and escaped entities',()=>{
  assert.equal(validateFile('config.xml','<?xml version="1.0"?><root><!-- test --><item name="a &amp; b"/></root>').valid,true);
});
test('XML rejects mismatched tags, multiple roots, unknown entities, invalid characters and DTDs',()=>{
  for(const text of ['', '<a><b></a>', '<a/><b/>', '<a>&missing;</a>', '<a>\u0000</a>', '<!DOCTYPE a [<!ENTITY b "x">]><a>&b;</a>']){
    const result=validateFile('config.xml',text);assert.equal(result.valid,false,text);assert(result.line>=1);
  }
});
test('DayZ reports duplicate names, missing names, numeric issues and flags as warnings',()=>{
  const result=validateFile('types.xml','<types><type name="A"><nominal>1</nominal><min>2</min><flags deloot="2"/></type><type name="A"><lifetime>-1</lifetime></type><type/></types>');
  assert.equal(result.valid,true);assert.equal(result.entries,3);assert.equal(result.warnings.length,5);
  assert.equal(validateFile('events.xml','<events><event name="Zombie"><nominal>1</nominal></event></events>').warnings.length,0);
  assert.equal(validateFile('custom.xml','<types><type name="A"/></types>').warnings.length,0);
});
test('rejects unsupported extensions, non-text and oversized input',()=>{
  assert.throws(()=>validateFile('payload.exe','{}'));assert.throws(()=>validateFile('config.json',null));assert.throws(()=>validateFile('config.json',' '.repeat(MAX_BYTES+1)));
});

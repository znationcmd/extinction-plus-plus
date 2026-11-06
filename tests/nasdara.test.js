'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {BUNKERS,ANTENNAS,MORSE_DIGITS,decodeTransmission,findBunker}=require('../shared/nasdara-data');
const {createMorseStream}=require('../shared/nasdara-stream');

test('Nasdara lists 23 unique bunkers and the radio antennas',()=>{
  assert.equal(BUNKERS.length,23);
  assert.equal(new Set(BUNKERS.map(x=>x.grid)).size,23);
  assert.ok(ANTENNAS.filter(a=>a.type==='TC6').length>=4);
  assert.equal(findBunker('100 121')?.grid,'100121');
  assert.throws(()=>findBunker('not a position'),/Position/);
});

test('Nasdara Morse decodes real 10 digit transmissions without inventing codes',()=>{
  const signal='1001210481';
  const morse=signal.split('').map(n=>Object.keys(MORSE_DIGITS).find(k=>MORSE_DIGITS[k]===n)).join(' ');
  const decoded=decodeTransmission(morse);
  assert.equal(decoded.position,'100121');
  assert.equal(decoded.code,'0481');
  assert.equal(decoded.bunker?.grid,'100121');
  assert.equal(decodeTransmission('100121').code,null);
  assert.throws(()=>decodeTransmission('100121048'),/incomplet/);
  assert.throws(()=>decodeTransmission('10012104812'),/incomplet/);
});

test('audio Morse stream converts real timings to a known bunker and keycode',()=>{
  const stream=createMorseStream();
  const message='1001210481';
  const reverse=Object.fromEntries(Object.entries(MORSE_DIGITS).map(([m,d])=>[d,m]));
  let t=100;
  const output=[];
  stream.sample(false,t);
  for(const digit of message){
    for(const symbol of reverse[digit]){
      t+=280;
      output.push(...stream.sample(true,t));
      t+=(symbol==='-'?1300:450);
      output.push(...stream.sample(false,t));
    }
    t+=1300;
    output.push(...stream.sample(false,t));
  }
  assert.equal(output.length,1);
  assert.equal(output[0].digits,message);
  assert.equal(output[0].code,'0481');
  assert.equal(stream.snapshot().digits,'');
});

test('interrupted and malformed audio must not display a code',()=>{
  const stream=createMorseStream();
  stream.sample(false,100);
  stream.sample(true,200);
  stream.sample(false,600);
  stream.sample(false,1800);
  assert.equal(stream.snapshot().digits,'');
  stream.sample(false,8500);
  assert.deepEqual(stream.sample(false,8600),[]);
});

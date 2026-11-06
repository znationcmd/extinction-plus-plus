'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'dashboard/components/NasdasTowerRadio.jsx'),'utf8');
const style=fs.readFileSync(path.join(root,'dashboard/components/NasdasTowerRadio.module.css'),'utf8');
const dashboard=fs.readFileSync(path.join(root,'dashboard/components/BunkerNasdasReceiver.jsx'),'utf8');
const keyer=fs.readFileSync(path.join(root,'dashboard/components/NasdasMorseWorkbench.jsx'),'utf8');

test('radio has five selectable ambient chapters and real interactive controls',()=>{
  for(const title of ['Sable froid',"L'antenne",'Le signal','Parasites','Le bunker'])assert.ok(source.includes(title),title);
  for(const control of ['togglePower','setFrequency','setVolume','setNight','setScene','onClick'])assert.ok(source.includes(control),control);
  assert.ok(source.includes('createOscillator()'),'the radio must generate real local sound on play');
  assert.ok(source.includes('createBufferSource()'),'analog wind/static audio should be generated locally');
  assert.ok(source.includes('80,0 MHz'),'in-game Morse tuning must not be mistaken for ambient FM');
});

test('dashboard displays the radio before the decoder and pauses ambiance during capture',()=>{
  assert.ok(dashboard.includes('<NasdasTowerRadio captureActive={listening}/>'));
  assert.ok(dashboard.includes('<NasdasMorseWorkbench/>'));
  assert.ok(dashboard.indexOf('<NasdasTowerRadio')<dashboard.indexOf('<NasdasMorseWorkbench'));
  assert.ok(source.includes('if(!captureActive)return;'));
  assert.ok(source.includes('shutdown();setPower(false)'));
  assert.ok(style.includes('@media (max-width:650px)'));
  assert.ok(keyer.includes('styles.morseKey') && keyer.includes('styles.morsePressed'));
});

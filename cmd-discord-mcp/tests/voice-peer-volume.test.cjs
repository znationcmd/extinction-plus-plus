const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const source=fs.readFileSync(path.join(__dirname,'../call-ui.js'),'utf8');
function mountedController(video){
 const label={textContent:''};
 const tile={dataset:{peer:'remote-123'},querySelector:s=>s==='video'?video:s==='[data-volume-output]'?label:null};
 const stage={children:[tile]};
 const begin=source.indexOf('const peerVolumes=new Map();');
 const end=source.indexOf('\nlet activeScreenTrack=null;',begin);
 assert.ok(begin>=0&&end>begin,'Real call volume controller is available');
 const code=source.slice(begin,end);
 const control=Function('stage','const $=()=>stage;'+code+';return {applyPeerVolume,peerVolumes};')(stage);
 return {control,label,stage,tile};
}
test('Voice participant volume menu is rendered on remote peers without adding controls to own camera',async()=>{
 const {callPage}=await import(pathToFileURL(path.join(__dirname,'../call-ui.js')));
 const html=callPage({user:{id:'owner'}},'room');
 assert.ok(html.includes('data-peer-volume'));
 assert.ok(html.includes('Volume de ce participant'));
 assert.ok(html.includes("self?'':'<div class=\"peer-volume\""));
 assert.ok(html.includes('slider.addEventListener("input"'));
 assert.ok(html.includes('slider.disabled=true'));
 assert.ok(html.includes('video.volume=volume'));
 assert.ok(html.includes('video.muted=amount===0'));
 assert.ok(html.includes('peerVolumes.delete(id)'));
 assert.ok(html.includes('aria-label="Volume individuel"'));
});
test('Speaker changes only their own local remote-playback volume and mute/unmute state',()=>{
 const video={volume:1,muted:false};
 const {control,label}=mountedController(video);
 assert.equal(control.applyPeerVolume('remote-123',45),true);
 assert.equal(video.volume,0.45);
 assert.equal(label.textContent,'45 %');
 assert.equal(control.peerVolumes.get('remote-123'),45);
 assert.equal(control.applyPeerVolume('remote-123',0),true);
 assert.equal(video.volume,0);assert.equal(video.muted,true);
 assert.equal(control.applyPeerVolume('remote-123',100),true);
 assert.equal(video.volume,1);assert.equal(video.muted,false);
});
test('Unknown or invalid volume changes never alter playback',()=>{
 const video={volume:1,muted:false};
 const {control}=mountedController(video);
 for(const value of [-1,101,44.5,'bad',null,Infinity])assert.equal(control.applyPeerVolume('remote-123',value),false);
 assert.equal(control.applyPeerVolume('not-in-call',40),false);
 assert.equal(video.volume,1);assert.equal(control.peerVolumes.size,0);
});
test('Devices that ignore HTML video volume do not report a successful adjustment',()=>{
 const video={muted:false};
 Object.defineProperty(video,'volume',{get:()=>1,set:()=>{},configurable:true});
 const {control}=mountedController(video);
 assert.equal(control.applyPeerVolume('remote-123',25),false);
 assert.equal(control.peerVolumes.has('remote-123'),false);
 assert.equal(video.muted,false);
});

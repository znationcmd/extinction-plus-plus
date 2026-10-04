const test=require('node:test');const assert=require('node:assert/strict');const zlib=require('node:zlib');
const {repairMapPng}=require('../dashboard/lib/map-image.cjs');
function crc(data){let c=0xffffffff;for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data,bad=false){const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(type,4);data.copy(b,8);b.writeUInt32BE(bad?0:crc(b.subarray(4,-4)),b.length-4);return b;}
const sig=Buffer.from([137,80,78,71,13,10,26,10]);const h=Buffer.alloc(13);h.writeUInt32BE(1,0);h.writeUInt32BE(1,4);h[8]=8;h[9]=2;
const ihdr=chunk('IHDR',h),idat=chunk('IDAT',zlib.deflateSync(Buffer.from([0,12,34,56]))),iend=chunk('IEND',Buffer.alloc(0));const clean=Buffer.concat([sig,ihdr,idat,iend]);
test('removing a broken ICC profile preserves image pixels and all valid chunks',()=>{
 const profile=chunk('iCCP',Buffer.from('broken'),true);const repaired=repairMapPng(Buffer.concat([sig,ihdr,profile,idat,iend]));assert.deepEqual(repaired,clean);assert.deepEqual(repairMapPng(clean),clean);
});
test('pixel corruption, truncation, oversized and non-image inputs are rejected',()=>{
 const damaged=Buffer.from(clean);damaged[ihdr.length+sig.length+9]^=1;assert.throws(()=>repairMapPng(damaged));assert.throws(()=>repairMapPng(clean.subarray(0,-1)));assert.throws(()=>repairMapPng(Buffer.from('html')));assert.throws(()=>repairMapPng(Buffer.alloc(16*1024*1024+1)));
});

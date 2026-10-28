import { expect, test } from 'bun:test';
import { cachedClientBundle } from './neuria-static-cache.ts';

test('initial JS response contains an ETag and requires revalidation',async()=>{
  const r=cachedClientBundle(new Request('https://example.com/client.js'),'console.log("CMD");');
  expect(r.status).toBe(200);
  expect(r.headers.get('cache-control')).toContain('no-cache');
  expect(r.headers.get('x-content-type-options')).toBe('nosniff');
  expect(await r.text()).toBe('console.log("CMD");');
  expect(r.headers.get('etag')).toMatch(/^"[a-f0-9]{64}"$/);
});
test('unchanged ETag returns 304 without downloading the client bundle',async()=>{
  const req=new Request('https://example.com/client.js');
  const old=cachedClientBundle(req,'var cmd=1;');
  const newer=cachedClientBundle(new Request(req.url,{headers:{'if-none-match':old.headers.get('etag')!}}),'var cmd=1;');
  expect(newer.status).toBe(304);
  expect(await newer.text()).toBe('');
});
test('new release content forces a full fresh JS response',async()=>{
  const req=new Request('https://example.com/client.js');
  const previous=cachedClientBundle(req,'var cmd=1;');
  const updated=cachedClientBundle(new Request(req.url,{headers:{'if-none-match':previous.headers.get('etag')!}}),'var cmd=2;');
  expect(updated.status).toBe(200);
  expect(await updated.text()).toBe('var cmd=2;');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function worker(network) {
  const events = {};
  const stored = new Map([['/offline.html', { publicOfflineScreen: true }]]);
  const writes = [];
  vm.runInNewContext(fs.readFileSync('dashboard/public/sw.js', 'utf8'), {
    URL, Promise,
    self: { location: { origin: 'https://dashboard.example' }, addEventListener: (name, handler) => { events[name] = handler; } },
    fetch: network,
    caches: { open: async () => ({ match: async key => stored.get(key), addAll: async paths => writes.push(...paths) }) }
  });
  const fetchEvent = request => {
    let response;
    events.fetch({ request, respondWith: promise => { response = promise; } });
    return response;
  };
  return { fetchEvent, writes, stored };
}
test('PWA does not intercept API, writes, external requests or Next data', () => {
  const w = worker(() => { throw new Error('should not call network'); });
  for (const request of [
    { url:'https://dashboard.example/api/dayz-mods', method:'GET', mode:'navigate' },
    { url:'https://dashboard.example/api/file-validator', method:'POST', mode:'cors' },
    { url:'https://discord.com/api/oauth2/authorize', method:'GET', mode:'navigate' },
    { url:'https://dashboard.example/dayz-mods?_rsc=123', method:'GET', mode:'cors' }
  ]) assert.equal(w.fetchEvent(request), undefined);
  assert.equal(w.writes.length, 0);
});
test('offline navigation returns the public screen without exposing dashboard data', async () => {
  const w = worker(async () => { throw new Error('offline'); });
  const response = await w.fetchEvent({ url:'https://dashboard.example/dayz-mods', method:'GET', mode:'navigate' });
  assert.equal(response.publicOfflineScreen, true);
  assert.equal(w.writes.length, 0);
});
test('online navigation always uses current network data and never stores it', async () => {
  const privatePage = { fresh: true };
  const w = worker(async () => privatePage);
  assert.equal(await w.fetchEvent({ url:'https://dashboard.example/owner-config', method:'GET', mode:'navigate' }), privatePage);
  assert.equal(w.writes.length, 0);
});

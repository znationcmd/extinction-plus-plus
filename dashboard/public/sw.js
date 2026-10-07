/* Only public offline assets are cached. Dashboard and APIs always use fresh network responses. */
const CACHE = 'extinction-pwa-v6';
const OFFLINE = '/offline.html';
const PUBLIC_FILES = [OFFLINE, '/app-icons/icon-192.png', '/app-icons/icon-512.png', '/app-icons/maskable-512.png', '/app-icons/apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('extinction-pwa-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request,{cache:'no-store'}).catch(() => caches.open(CACHE).then(cache => cache.match(OFFLINE))));
  } else if (PUBLIC_FILES.includes(url.pathname) && !url.search) {
    event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>caches.open(CACHE).then(cache=>cache.match(url.pathname))));
  }
});

// KennelPort Site Manager's service worker: screens open offline; nothing is
// saved offline. Pages come from the network first and fall back to the last copy
// (or a plain offline screen); the app's own files come from the cache first.
// Signed-in pages are cached per browser only. Bump VERSION when these files change.
const VERSION = 'kp-manage-1';
const SHELL = ['/offline', '/_kp/m/app.css?v=1', '/_kp/m/app.js?v=1', '/_kp/m/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/ops') || url.pathname.startsWith('/__')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(async () => (await caches.match(req)) || (await caches.match('/offline'))));
    return;
  }
  if (url.pathname.startsWith('/_kp/m/') || url.pathname.startsWith('/_kp/fonts/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});

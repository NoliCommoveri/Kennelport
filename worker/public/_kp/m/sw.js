// KennelPort Site Manager's service worker: screens open offline; nothing is
// saved offline. Pages come from the network first and fall back to the last copy
// (or a plain offline screen); the app's own files come from the cache first.
// Signed-in pages are cached per browser only. Bump VERSION when these files change.
const VERSION = 'kp-manage-5';
const SHELL = ['/offline', '/_kp/m/app.css?v=5', '/_kp/m/app.js?v=5', '/_kp/m/icon-192.png', '/_kp/m/icon-64.png'];

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

// A push carries no text (src/push.js). Ask the server what to show, proving this
// is the subscribed browser with the subscription's own secret. Whatever goes
// wrong, a plain notification still shows: a push must always show one.
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let n = { title: 'KennelPort', body: 'Something new on your website.', path: '/', tag: 'kennelport' };
    try {
      const sub = await self.registration.pushManager.getSubscription();
      if (sub) {
        const res = await fetch('/push/pending', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint, auth: b64(sub.getKey('auth')) }) });
        if (res.ok) n = { ...n, ...(await res.json()) };
      }
    } catch { /* show the plain one */ }
    await self.registration.showNotification(n.title, { body: n.body, tag: n.tag, renotify: true, icon: '/_kp/m/icon-192.png', badge: '/_kp/m/icon-64.png', data: { path: n.path } });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const path = e.notification.data?.path || '/';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) if (new URL(w.url).origin === location.origin) { await w.navigate(path).catch(() => {}); return w.focus(); }
    return self.clients.openWindow(path);
  })());
});

/* Service worker de Grenier Pro : permet l'installation depuis le navigateur et un démarrage rapide.
   Les DONNÉES ne sont jamais mises en cache (/api/*) : elles viennent toujours du serveur. */
const V = 'grenier-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(['/'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  if (r.mode === 'navigate') {
    // pages : toujours la version la plus récente si le serveur répond, sinon la coque en cache
    e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(V).then((x) => x.put('/', c)); return res; }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(V).then((x) => x.put(r, c)); } return res; })));
});

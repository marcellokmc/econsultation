/* Service worker de Grenier Terrain : l'application s'ouvre sans réseau. Les appels /api ne sont jamais mis en cache. */
const V = 'grenier-terrain-v1';
const SHELL = ['/terrain/', '/terrain/app.js', '/terrain/manifest.webmanifest', '/extras/commun.css', '/icon-192.png', '/favicon.ico'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('grenier-terrain') && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  const key = r.mode === 'navigate' ? '/terrain/' : r;
  // réseau d'abord (version la plus récente), sinon la copie gardée sur le téléphone
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(V).then((x) => x.put(key, c)); } return res; }).catch(() => caches.match(key)));
});

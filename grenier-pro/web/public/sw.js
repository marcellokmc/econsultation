/* Grenier : l'application s'ouvre sans réseau (coque et fichiers mis en cache). Les données (/api) ne sont jamais mises en cache. */
const V = 'grenier-v3';
async function precache() {
  const c = await caches.open(V);
  const res = await fetch('/', { cache: 'no-store' });
  const html = await res.clone().text();
  await c.put('/', res);
  const urls = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await c.addAll([...new Set([...urls, '/manifest.webmanifest', '/icon-192.png', '/favicon.ico'])]);
}
self.addEventListener('install', (e) => { e.waitUntil(precache().then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/v/')) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(V).then((x) => x.put('/', c)); } return res; }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((res) => {
    if (res.ok && (u.pathname.startsWith('/assets/') || /\.(png|ico|webmanifest|woff2?)$/.test(u.pathname))) { const c = res.clone(); caches.open(V).then((x) => x.put(r, c)); }
    return res;
  })));
});

/* Service Worker: App-Shell wird beim ersten Besuch gecached -> danach komplett offline */
const CACHE = 'sakura-jade-v7';
const SHELL = ['./', './index.html', './style.css', './app.js', './wushu-data.js', './manifest.webmanifest',
  './fonts/pjs-latin.woff2', './fonts/pjs-latin-ext.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon.png'];

self.addEventListener('install', e => {
  // Tolerant: eine fehlende Datei (z. B. unvollständiger Upload) darf die Installation nicht verhindern
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Cache first, im Hintergrund aktualisieren (stale-while-revalidate)
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit || caches.match('./index.html'));
    return hit || net;
  }));
});

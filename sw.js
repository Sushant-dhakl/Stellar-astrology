/* sw.js — Stellar Astrology Service Worker
   Strategy: Cache-first for static assets, Network-first for HTML
   This gives offline resilience + near-instant repeat visits.
*/
const CACHE = 'stellar-v1';
const STATIC = [
  '/',
  '/index.html',
  '/contact.html',
  '/manifest.json',
  /* Add other pages as needed: '/services.html', '/blog.html' */
];

/* ── INSTALL: pre-cache critical shell ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: remove old caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH ── */
self.addEventListener('fetch', e => {
  const {request} = e;
  const url = new URL(request.url);

  // Skip cross-origin requests (Google Maps, Fonts CDN, etc.)
  if (url.origin !== location.origin) return;

  // HTML: Network-first (always fresh content)
  if (request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then(res => { const c = res.clone(); caches.open(CACHE).then(cache => cache.put(request, c)); return res; })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Images & assets: Cache-first
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        const c = res.clone();
        caches.open(CACHE).then(cache => cache.put(request, c));
        return res;
      });
    })
  );
});

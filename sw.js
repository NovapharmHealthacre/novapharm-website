/**
 * NovaPharm Sovereign Healthcare - Institutional Service Worker
 * Version: 1.0.0
 * Scope: /
 * Architecture: Offline-first caching with stale-while-revalidate for static assets,
 *               network-first for authoritative Codex/API queries.
 */

const CACHE_NAME = 'novapharm-cache-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/corporate',
  '/corporate.html',
  '/founder',
  '/founder.html',
  '/corporate.js',
  '/founder.js',
  '/site.webmanifest',
  '/brand/novapharm-logo.svg',
  '/robots.txt',
  '/sitemap.xml',
  '/.well-known/security.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Continue even if some individual resources fail to pre-fetch
        console.warn('[NovaPharm SW] Pre-cache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never cache API or Codex backend POST/PUT/DELETE requests
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first for HTML documents to ensure contemporaneous regulatory freshness
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match('/corporate.html');
          });
        })
    );
    return;
  }

  // Cache-first for images, SVGs, and static JS/CSS
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to revalidate (stale-while-revalidate)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      });
    })
  );
});

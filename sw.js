// Retire only the cache introduced by the replaced 3 November public release.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await caches.delete('novapharm-cache-v1.0.0');
    await self.clients.claim();
    await self.registration.unregister();
  })());
});

const CACHE_NAME = 'filemanager-static-v1';  // Bump this to v2, v3, etc. when needed
const STATIC_ASSETS = [
  '/',
  '/content.css',
  '/content.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/sw.js'
];

self.addEventListener('install', event => {
  console.log('[sw] Installed');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
  console.log('[sw] Activated');
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isStatic = STATIC_ASSETS.includes(url.pathname);
  const isGET = event.request.method === 'GET';
  const isSameOrigin = url.origin === location.origin;

  if (isGET && isStatic && isSameOrigin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request);
      })
    );
  }
});
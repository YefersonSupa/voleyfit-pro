const CACHE_NAME = 'voleyfit-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.svg',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.png',
  './favicon.ico',
  './RUTINA_VOLEYFIT_PRO.pdf'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Network-first sin caché HTTP para documentos HTML
self.addEventListener('fetch', event => {
  const isHtml = event.request.mode === 'navigate' || 
                 event.request.destination === 'document' || 
                 event.request.url.includes('index.html');

  if (isHtml) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(response => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first para imágenes y recursos estáticos
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (event.request.method === 'GET' && networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return networkResponse;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

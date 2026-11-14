const CACHE_NAME = 'voleyfit-v13';
const CRITICAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './logo.svg',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.png',
  './favicon.ico'
];

// Instalación inmediata sin esperas
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CRITICAL_ASSETS);
    })
  );
});

// Activación y borrado inmediato de cachés obsoletas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Eliminando caché antigua:', k);
        return caches.delete(k);
      })
    )).then(() => {
      return self.clients.claim();
    })
  );
});

// Manejo de peticiones: Network-first estricto para HTML y version.json
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // version.json siempre desde internet sin pasar por caché
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  const isHtml = event.request.mode === 'navigate' || 
                 event.request.destination === 'document' || 
                 url.pathname.endsWith('/') || 
                 url.pathname.endsWith('index.html');

  if (isHtml) {
    // Network-first con no-cache: siempre busca la última versión si hay red
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Si no hay red, sirve el index.html en caché
          return caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // Cache-first para imágenes y estáticos
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (event.request.method === 'GET' && networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// Mensajes directos desde la app
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

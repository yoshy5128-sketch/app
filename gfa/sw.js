const CACHE_NAME = 'gunfight-arena-cache-v5';
const urlsToCache = [
  './',
  './index.html',
  './icon.png',
  './icon-192.png',
  './icon-512.png'
];

// Install a service worker
self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate and clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Cache and return requests
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isScript = event.request.destination === 'script' || url.pathname.endsWith('/script.js') || url.pathname.endsWith('script.js');
  const isHtml = event.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('index.html');

  if (isScript || isHtml) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const respClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

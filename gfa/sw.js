const CACHE_NAME = 'gunfight-arena-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './script.js',
  // Note: Add other crucial assets like sounds or map files here if needed
  // e.g., './gun.mp3', './map/000.json'
  './icon.png' 
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
});

// Cache and return requests
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

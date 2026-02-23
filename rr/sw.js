const CACHE_NAME = 'roadrage-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/cs.html',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/js/controls/OrbitControls.js',
  'https://cdn.jsdelivr.net/npm/lil-gui@0.17.0/dist/lil-gui.umd.min.js',
  '/icon.png',
  '/top.png',
  '/crash.mp3',
  '/bcrash.mp3',
  '/ecrs.mp3',
  '/crs.mp3',
  '/jin.mp3',
  '/mh.mp3',
  '/pr.mp3',
  '/vp.mp3',
  '/as.mp3',
  '/fu.mp3'
];

// インストールイベント
self.addEventListener('install', event => {
  console.log('Service Worker: インストール中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: ファイルをキャッシュ中...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: インストール完了');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: インストール失敗', error);
      })
  );
});

// アクティベートイベント
self.addEventListener('activate', event => {
  console.log('Service Worker: アクティベート中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 古いキャッシュを削除', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: アクティベート完了');
      return self.clients.claim();
    })
  );
});

// フェッチイベント
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        
        // キャッシュになければネットワークから取得
        return fetch(event.request)
          .then(response => {
            // レスポンスが有効かチェック
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // レスポンスをクローンしてキャッシュ
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.error('Service Worker: ネットワークエラー', error);
            
            // HTMLファイルの場合はオフラインページを返す
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// メッセージイベント
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

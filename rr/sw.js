const CACHE_NAME = 'roadrage-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/cs.html',
  '/manifest.json',
  '/libs/three.min.js',
  '/libs/OrbitControls.js',
  '/libs/lil-gui.umd.min.js',
  '/icon.png',
  '/icon-192.png',
  '/icon-512.png',
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
  console.log('Service Worker: フェッチリクエスト', event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュにあればそれを返す
        if (response) {
          console.log('Service Worker: キャッシュから返信', event.request.url);
          return response;
        }
        
        // キャッシュになければネットワークから取得
        console.log('Service Worker: ネットワークから取得', event.request.url);
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

// バックグラウンド同期（オプション）
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // バックグラウンドで必要な処理を実行
  console.log('Service Worker: バックグラウンド同期実行');
  return Promise.resolve();
}

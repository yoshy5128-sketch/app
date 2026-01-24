const CACHE_NAME = 'everest-v5'; // バージョンを更新
const assets = [
  './',
  './index.html',
  './top.png',
  './icon.png',
  './wind.mp3'
];

// インストール時にキャッシュ
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assets))
  );
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// ネットワーク優先（オンラインなら最新を取得、オフラインならキャッシュを表示）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
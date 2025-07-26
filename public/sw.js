const CACHE_NAME = "music-player-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/index.css",
  "/script.js",
  // 필요한 기타 정적 자원들
];

// 설치 시 캐시 저장
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 활성화 시 이전 캐시 제거
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME)
      .map(key => caches.delete(key)))
    )
  );
});

// 네트워크 요청 가로채기 (캐시 우선 전략)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

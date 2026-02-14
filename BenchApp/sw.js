// ============================================================
// Service Worker — кэширует файлы для работы офлайн
// ============================================================

const CACHE_NAME = 'bench100-v12';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './program-data.js',
  './manifest.json'
];

// Установка: кэшируем все файлы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// Активация: удаляем старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Запросы: сначала кэш, потом сеть
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

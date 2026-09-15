const CACHE_NAME = 'hebrew-calendar-v1';
const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/dashboard.css',
  './css/editor.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/calendar/calendar-engine.js',
  './js/storage/indexeddb.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});

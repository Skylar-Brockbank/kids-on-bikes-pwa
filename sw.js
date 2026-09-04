const CACHE_NAME = 'roster-v3';

// Cache both explicit .html paths and clean URL paths
const ASSETS = [
  './',
  './index.html',
  './detail.html',
  './detail',
  './form.html',
  './form',
  './app.js',
  './detail.js',
  './form.js',
  './classes.json',
  './skills.json',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Navigation fallback matching both clean routes and .html extensions
          if (event.request.mode === 'navigate') {
            const url = new URL(event.request.url);
            const path = url.pathname;

            if (path.endsWith('./form') || path.endsWith('./form.html')) {
              return caches.match('./form') || caches.match('./form.html');
            }
            if (path.endsWith('./detail') || path.endsWith('./detail.html')) {
              return caches.match('./detail') || caches.match('./detail.html');
            }
            return caches.match('./index.html') || caches.match('/');
          }
        });
    })
  );
});
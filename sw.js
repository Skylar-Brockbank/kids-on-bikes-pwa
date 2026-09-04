const CACHE_NAME = 'roster-v4';

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

// Helper to refresh all pre-cached files from network when online
async function updateCachedAssets() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    console.log('[SW] Successfully updated local files from network.');
  } catch (err) {
    console.warn('[SW] Could not update cached files:', err);
  }
}

// Install: Initial pre-cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: Clean up old caches and claim clients immediately
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
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate Strategy for GET requests
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      // 1. Prepare background network update promise if online
      const fetchPromise = fetch(event.request)
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
          // Offline navigation fallback
          if (event.request.mode === 'navigate') {
            const url = new URL(event.request.url);
            const path = url.pathname;

            if (path.endsWith('/form') || path.endsWith('form.html')) {
              return caches.match('./form') || caches.match('./form.html');
            }
            if (path.endsWith('/detail') || path.endsWith('detail.html')) {
              return caches.match('./detail') || caches.match('./detail.html');
            }
            return caches.match('./index.html') || caches.match('./');
          }
        });

      // 2. Return cached asset immediately if available; otherwise wait for network fetch
      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for explicit message events (e.g. triggered when app regains connectivity)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REFRESH_CACHE') {
    event.waitUntil(updateCachedAssets());
  }
});
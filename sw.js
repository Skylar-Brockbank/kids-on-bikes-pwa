const CACHE_NAME = 'roster-v6';

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

// Force fetch from server network (bypassing HTTP disk cache) and update Cache Storage
async function forceUpdateCache() {
  const cache = await caches.open(CACHE_NAME);
  
  // Create request objects with cache: 'reload'
  const updatePromises = ASSETS.map(async (url) => {
    const req = new Request(url, { cache: 'reload' });
    const res = await fetch(req);
    if (res && res.status === 200) {
      await cache.put(url, res);
    }
  });

  await Promise.all(updatePromises);
}

// Service worker message listener
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FORCE_UPDATE_CACHE') {
    event.waitUntil(
      forceUpdateCache()
        .then(() => {
          // Notify the client that update was successful
          event.ports[0].postMessage({ status: 'SUCCESS' });
        })
        .catch((err) => {
          event.ports[0].postMessage({ status: 'ERROR', error: err.message });
        })
    );
  }
});

// (Keep install, activate, and fetch event listeners as previously configured)


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
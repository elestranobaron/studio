
const CACHE_NAME = 'wodburner-cache-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/scan',
  '/generate',
  '/timers',
  '/hero-wods',
  '/premium',
  '/settings',
  '/login',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests and cross-origin requests (like Cloudflare's)
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // For navigation requests, use a network-first strategy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }
  
  // For other requests (assets), use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          (response) => {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      }).catch(() => {
        // If both cache and network fail, show a generic fallback for images or other assets
        // This part is tricky as you don't have a specific offline asset for everything.
        // Returning nothing or a specific offline placeholder could be an option.
        // For now, we let it fail, which is what the browser would do anyway.
      })
  );
});


self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});


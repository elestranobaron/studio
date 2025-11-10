const CACHE = "wodburner-v2025";
const FILES = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener("fetch", e => {
  // BYPASS COMPLET POUR LES NAVIGATIONS (pages HTML)
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request));
    return;
  }

  // CACHE NORMAL POUR LES ASSETS STATIQUES
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});
const CACHE_NAME = "wodburner-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
  // ajoute tes fonts/css/js critiques si tu veux
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ⚠️ NE JAMAIS cacher ou interférer avec les requêtes Firebase Auth
  if (url.origin.includes("firebase") || url.pathname.includes("__/auth")) {
    return fetch(event.request);
  }

  // Pour tout le reste → cache first, puis network
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
const CACHE_NAME = "wodburner-v4"; // change le numéro à chaque grosse MAJ

// Liste des fichiers qu’on veut ABSOLUMENT disponibles offline dès la première visite
const PRECACHE_ASSETS = [
  "/",
  "/index.html",        // si tu as un fichier index.html séparé
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
  // ajoute tes CSS/JS critiques ici si tu veux
];

// Pré-cache pendant l’install, mais en mode "best effort" (aucun blocage si un fichier 404)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Certains assets de pré-cache ont échoué (normal)", err);
        // On ne bloque PAS l’installation → super important !
      });
    })
    .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Nettoyage des vieux caches (fortement recommandé)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Jamais toucher Firebase / auth / API sensibles
  if (url.origin.includes("firebase") || url.pathname.includes("__/auth")) {
    return fetch(event.request);
  }

  // 2. Seulement les GET
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }

        // On met à jour le cache avec la réponse fraîche
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      })
      .catch(() => {
        // Offline → on renvoie ce qu’on a en cache (y compris les assets pré-cachés)
        return caches.match(event.request, { cacheName: CACHE_NAME }) ||
               caches.match("/"); // fallback sur la page d’accueil si rien
      })
  );
});
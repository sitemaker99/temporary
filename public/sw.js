// Aniflix Service Worker — minimal, no scary permissions
// ─────────────────────────────────────────────────────
// This SW only caches static assets for offline resilience.
// It does NOT request:
//   ✗ Push notifications
//   ✗ Background sync
//   ✗ Geolocation
//   ✗ Camera / Microphone
//   ✗ Persistent storage
// ─────────────────────────────────────────────────────

const CACHE_NAME = "aniflix-v1";
const STATIC_ASSETS = [
  "/icon.png",
  "/icon-192x192.png",
  "/manifest.json",
];

// Install: cache minimal static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API, auth, or cross-origin requests
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.origin !== self.location.origin
  ) {
    return; // Let browser handle normally
  }

  // Cache-first for static files only
  if (
    request.method === "GET" &&
    (url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".ico") ||
      url.pathname === "/manifest.json")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});

// Explicitly: no push listener, no notificationclick, no sync listener
// This means the browser will NEVER prompt for notification permission via this SW.

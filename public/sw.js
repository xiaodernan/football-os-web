// Football OS's service worker (M458). Hand-written, no plugin: the app is a hash-named Vite
// build, so a PRECACHE LIST would be stale the moment the build changes — the strategy here is
// runtime caching with a versioned cache name instead.
//
// Three rules, in the order the fetch handler applies them:
//   1. Same-origin GET only. Anything else is left to the browser untouched — the app must not
//      silently fail a request it would have made fine.
//   2. The API (/functions/) is never cached: a stale API answer is a lie about the world.
//   3. Navigations are network-first with a cached-shell fallback, so an offline deep link
//      still opens the app; static assets are stale-while-revalidate, so a cached asset paints
//      immediately and refreshes behind the scene.
const VERSION = "football-os-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"];

const put = async (request, response) => {
  const cache = await caches.open(VERSION);
  await cache.put(request, response);
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/functions/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) put(request, response.clone());
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

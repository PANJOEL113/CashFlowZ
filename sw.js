const CACHE_NAME = "cashflowz-v29";
const DYNAMIC_CACHE = "cashflowz-dynamic-v1";

const JS_ASSETS = [
  "/js/storage.js",
  "/js/utils.js",
  "/js/charts.js",
  "/js/components/toast.js",
  "/js/components/modal.js",
  "/js/components/period-filter.js",
  "/js/components/sort-filter.js",
  "/js/layout.js",
  "/js/router.js",
  "/js/views/dashboard.js",
  "/js/views/transaction.js",
  "/js/views/insight.js",
  "/js/views/insight-detail.js",
  "/js/views/profile.js",
  "/js/views/setting.js",
  "/js/modals/transaction.js",
  "/js/auth.js",
];

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/base.css",
  "/css/layout.css",
  "/css/views.css",
  "/css/components.css",
  "/css/responsive.css",
  "/asset/logo/logofull.svg",
  "/asset/logo/logo-only.svg",
  "/asset/logo/favicon-32.png",
  "/asset/logo/icon-180.png",
  "/asset/logo/icon-192.png",
  "/asset/logo/icon-512.png",
  "/manifest.json",
  "/firebase/firebase-config.js",
  "/firebase/auth.js",
  "/firebase/firestore.js",
];

const CDN_URLS = [
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
  "https://cdn.jsdelivr.net",
  "https://www.gstatic.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) =>
        cache.add(url).catch(() => console.warn("[SW] Gagal cache:", url))
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== DYNAMIC_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isCDN = CDN_URLS.some((cdn) => url.origin.startsWith(cdn));

  if (event.request.method !== "GET") return;

  if (isCDN) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/firebase/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
        return cached || fetchPromise;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  if (JS_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const FILES_TO_CACHE = [
    '/',
    '/manifest.webmanifest',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/index.html',
    '/styles.css',
    '/index.js'
];

// creating static cache for when page loads
const CACHE_NAME = "static-budget-cache-v1";
// runtime cache for offline use
const RUNTIME_CACHE = "runtime-cache";

// install
self.addEventListener("install", event => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activiate", event => {
    const currentCaches = [CACHE_NAME, DATA_STATIC_CACHE];
    event.waitUntil(
        caches
            .keys()
            .then(cacheNames => {
                return cacheNames.filter(
                    cacheName => !currentCaches.includes(cacheName)
                );
            })
            .then(cachesToDelete => {
                return Promise.all(
                    cachesToDelete.map(cacheToDelete => {
                        if (cacheToDelete !== STATIC_CACHE && cacheToDelete !== DATA_STATIC_CACHE) {
                            console.log("Removing old cache data", cacheToDelete);
                            return caches.delete(cacheToDelete)
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});
self.addEventListener("fetch", event => {
    if (
        event.request.method !== "GET" ||
        !event.request.url.startsWith(self.location.origin)
    ) {
        event.respondWith(fetch(event.request));
        return;
    }
    if (event.request.url.includes("/api/transaction/bulk")) {
        event.respondWith(
            caches.open(DATA_STATIC_CACHE).then(cache => {
                return fetch(event.request)
                    .then(response => {
                        cache.put(event.request, response.clone());
                        return response;
                    })
                    .catch(() => caches.match(event.request));
            })
        );
        return;
    }
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return caches.open(RUNTIME_CACHE).then(cache => {
                return fetch(event.request).then(response => {
                    return cache.put(event.request, response.clone()).then(() => {
                        return response;
                    });
                });
            });
        })
    );
});
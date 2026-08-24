// AGC Finance - PWA Service Worker (Full Offline Standalone & Cache-First)
const CACHE_NAME = 'agc-finance-pwa-v7';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-icon-192.png',
  '/maskable-icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/icon.svg'
];

// Install Event - Pre-cache shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Precache parcial concluído:', err);
      });
    })
  );
});

// Activate Event - purge old caches immediately & take control of all clients
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

// Fetch Event - Cache-First for static assets, network fallback with auto-caching
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Never intercept backend API routes
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Return from cache immediately if present
      if (cachedResponse) {
        // Opportunistic background update if online
        if (navigator.onLine) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
            })
            .catch(() => {});
        }
        return cachedResponse;
      }

      // 2. Fetch from network and dynamically cache
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Cache all frontend static assets, js bundles, css, images, fonts, html
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(async () => {
          // 3. Fallback when network is down/server is stopped
          if (event.request.mode === 'navigate') {
            const cachedIndex = await caches.match('/index.html') || await caches.match('/');
            if (cachedIndex) return cachedIndex;
          }

          // If looking for a script or css that was cached under a previous or clean path
          const fallback = await caches.match(event.request, { ignoreSearch: true });
          if (fallback) return fallback;

          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});

/// <reference lib="webworker" />

const CACHE_NAME = 'lumina-txt-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/logo.svg',
];

// ─── Install: cache static assets only (skip / in dev) ─────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {
      // Swallow errors for missing assets in dev
    })
  );
  // Activate immediately without waiting for old worker to finish
  self.skipWaiting();
});

// ─── Activate: clean up old caches ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ─── Fetch: network-first with cache fallback ───────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API routes (AI, etc.)
  if (request.url.includes('/api/')) return;

  // Skip Next.js dev assets — never cache turbopack chunks
  if (request.url.includes('/_next/')) return;

  // Skip HMR and WebSocket connections
  if (request.url.includes('__next_hmr') || request.url.includes('/__nextjs')) return;

  // Skip chrome-extension and other non-http(s)
  if (!request.url.startsWith('http')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, serve cached /
          if (request.mode === 'navigate') {
            // Don't serve cached HTML — always try network for app shell
            return new Response('Offline', { status: 503, statusText: 'Offline' });
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

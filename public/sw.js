// Service Worker for UNO PWA
//
// PRECACHE_URLS and CACHE_VERSION are replaced at build time by scripts/postcache.cjs.
// PRECACHE_URLS contains every file in the dist/ folder so offline works immediately
// after the first online visit — no runtime HTML parsing needed.
// CACHE_VERSION is a build timestamp so each deploy gets a unique cache name.
//
const CACHE_VERSION = 'BUILD_TS';           // ← replaced by postcache.cjs
const CACHE_NAME    = `uno-${CACHE_VERSION}`;
const APP_BASE      = '/';                  // ← replaced by postcache.cjs

const PRECACHE_URLS = [];  // ← replaced by postcache.cjs after build

// ── Install: pre-cache everything ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => {
        console.error('[SW] precache failed:', err);
        throw err;
      })
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: delete old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────

// Build fetch options that bypass the localtunnel interstitial page.
// For navigate requests we cannot use `new Request(request, …)` because
// browsers throw a TypeError when the mode is overridden — so we pass
// plain init options instead.
function bypassHeaders(request) {
  const headers = new Headers(request.headers);
  headers.set('Bypass-Tunnel-Reminder', '1');
  return headers;
}

// Wraps fetch() with a timeout; resolves to a Response or rejects.
function fetchWithTimeout(input, init, ms = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

// ── Fetch: cache-first for assets, network-first for navigation ───────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Navigation (HTML): try network so updates are picked up; fall back to cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(
        request.url,
        {
          method: request.method,
          headers: bypassHeaders(request),
          credentials: request.credentials,
          redirect: 'follow',
        },
        5000,
      )
        .then((res) => {
          const clone = res.clone();
          caches
            .open(CACHE_NAME)
            .then((c) => c.put(request, clone))
            .catch((err) => console.warn('[SW] navigation cache.put failed:', err));
          return res;
        })
        .catch(async () => {
          // Try the exact URL first — cached by c.put(request, clone) on previous visits
          const byUrl = await caches.match(request, { ignoreVary: true });
          if (byUrl) return byUrl;
          // Fall back to the precached shell
          const byIndex = await caches.match(`${APP_BASE}index.html`, { ignoreVary: true });
          if (byIndex) return byIndex;
          // Should never reach here if precache succeeded
          console.error('[SW] offline fallback: no cached index.html found');
          return new Response('<h1>Offline</h1><p>Reload when connected.</p>', {
            status: 503,
            headers: { 'Content-Type': 'text/html' },
          });
        }),
    );
    return;
  }

  // Everything else: cache-first (assets have hashed names so they never change).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request.url, { headers: bypassHeaders(request) }).then((res) => {
          if (res.ok) {
            caches
              .open(CACHE_NAME)
              .then((c) => c.put(request, res.clone()))
              .catch((err) => console.warn('[SW] asset cache.put failed:', err));
          }
          return res;
        }),
    ),
  );
});

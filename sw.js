const CACHE = 'savings-manager-v4';
const ASSETS = ['./', './index.html', './css/style.css', './js/app.js', './js/db.js', './js/finance.js', './js/ui.js', './js/utils.js', './js/sync.js', './js/config.js', './manifest.json', './icon.svg'];
self.addEventListener('install', event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); });
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
// Network-first for this app's own files so new deployments are picked up; cache is the offline fallback.
// Requests to other origins (e.g. Supabase) are never intercepted or cached.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => { const clone = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, clone)); return response; }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});

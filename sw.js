const CACHE_NAME = 'nexus-cyber-lab-v1.0.2';
const APP_SHELL = [
  './', './index.html', './manifest.webmanifest', './assets/favicon.svg', './assets/icon.svg',
  './assets/runtime/page.html.gz', './assets/runtime/styles.css.gz',
  './assets/runtime/app.js.gz', './assets/runtime/globe.js.gz', './assets/runtime/simulation.js.gz',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('nexus-cyber-lab-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  }).catch(() => request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});

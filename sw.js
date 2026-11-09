const CACHE = "nexus-shell-v20";
const FILES = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("nexus-shell-") && key !== CACHE).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/data/current.json")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const stableKey = new URL("./data/current.json", self.registration.scope).href;
      try {
        const fresh = await fetch(event.request, { cache: "no-store" });
        if (fresh.ok) await cache.put(stableKey, fresh.clone());
        return fresh;
      } catch {
        const stale = await cache.match(stableKey);
        if (stale) return stale;
        return new Response(JSON.stringify({schemaVersion:1,overallStatus:"offline",generatedAt:null,feeds:{}}), {
          status:503, headers:{"Content-Type":"application/json"}
        });
      }
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => event.request.mode === "navigate" ? caches.match("./index.html") : Response.error())));
});
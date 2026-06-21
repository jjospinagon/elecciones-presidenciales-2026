/* Service Worker — Elecciones 2026
   App shell cacheada (rápida y disponible offline); datos en vivo siempre por red. */
const CACHE = "elec2026-v5";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./data_r1.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  const live = u.hostname.includes("workers.dev");          // datos en vivo (Worker)
  // Otros dominios (fotos de candidatos, etc.): el navegador los maneja directo.
  if (u.origin !== location.origin && !live) return;
  const html = e.request.mode === "navigate" || u.pathname.endsWith(".html");
  if (live || html) {
    // Red primero: siempre lo más fresco; si no hay red, cae a caché.
    e.respondWith(
      fetch(e.request).then(resp => {
        if (u.origin === location.origin) {
          const cp = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp));
        }
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Estáticos propios (íconos, manifiesto, data_r1): caché primero.
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

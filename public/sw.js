/* Service Worker — FulboMundial
   Maneja caché básica offline (requerida por PWABuilder / Google Play TWA) y notificaciones push. */

const CACHE_NAME = "fulbomundial-v2";
const PRECACHE_URLS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Para recursos estáticos (íconos, manifest), estrategia Cache-First con actualización
  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Para navegación, Network-First sin bloquear autenticación ni datos en vivo
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FulboMundial — Sin conexión</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b7746;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px}.card{background:rgba(0,0,0,.25);padding:32px;border-radius:20px;max-width:360px}button{margin-top:16px;background:#fff;color:#0b7746;border:none;padding:12px 24px;border-radius:12px;font-weight:800;cursor:pointer}</style></head><body><div class="card"><div style="font-size:48px">⚽</div><h2>Se cortó la señal en la cancha</h2><p>Revisá tu conexión a internet para volver al partido.</p><button onclick="location.reload()">Reintentar</button></div></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          )
      )
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "FulboMundial", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "FulboMundial";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" },
    vibrate: [80, 40, 80],
    tag: data.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

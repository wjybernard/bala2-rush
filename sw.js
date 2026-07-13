/* Bala2 Rush — service worker
   Bikin game jalan OFFLINE. Naikin CACHE_VERSION tiap update game
   biar HP pemain narik versi baru. */
const CACHE_VERSION = "bala2-rush-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",
  "./favicon.png"
];

// Pasang: cache semua aset. Kalau ada 1 file gagal, jangan gagalin semuanya.
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.all(
      ASSETS.map((url) =>
        cache.add(new Request(url, { cache: "reload" })).catch(() => {})
      )
    );
    self.skipWaiting();
  })());
});

// Aktif: buang cache versi lama
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Halaman: coba jaringan dulu (biar dapet update), kalau offline pakai cache
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (err) {
        const cache = await caches.open(CACHE_VERSION);
        return (await cache.match("./index.html")) ||
               (await cache.match("./")) ||
               Response.error();
      }
    })());
    return;
  }

  // Aset lain: cache dulu (cepet + offline), sambil diem-diem update
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const hit = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === "basic") cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return hit || (await network) || Response.error();
  })());
});

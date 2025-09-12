// /sw.js — Cache-first para imágenes de Supabase
const CACHE = 'wh-img-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : Promise.resolve())));
  })());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo cachea imágenes del dominio supabase
  if (!url.hostname.endsWith('supabase.co')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) {
      // Actualiza en background
      event.waitUntil(fetch(req).then(res => cache.put(req, res.clone())).catch(()=>{}));
      return hit;
    }
    try {
      const res = await fetch(req);
      cache.put(req, res.clone());
      return res;
    } catch (e) {
      // Fallback opcional (puedes devolver un 1x1 transparente si quieres)
      return new Response('', { status: 504 });
    }
  })());
});

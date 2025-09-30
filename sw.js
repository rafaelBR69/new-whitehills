// /sw.js — Cache first con revalidación para imágenes de Supabase (solo)
// v2
const CACHE_NAME = 'wh-supa-img-v2';
const CACHE_PREFIX = 'wh-supa-img-';
const SUPABASE_SUFFIX = '.supabase.co';

// 1) INSTALACIÓN
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
  self.skipWaiting();
});

// 2) ACTIVACIÓN → borra caches antiguas del mismo prefijo
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
        .map(k => caches.delete(k))
    );
  })());
  self.clients.claim();
});

// 3) FETCH → solo imágenes de Supabase
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo tocar peticiones a Supabase y de tipo "image"
  const isSupabase = url.hostname.endsWith(SUPABASE_SUFFIX);
  const isImage = req.destination === 'image' ||
                  /(image|img)/i.test(req.headers.get('accept') || '');

  if (!isSupabase || !isImage) {
    // No interceptar nada más (HTML/CSS/JS quedan fuera)
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // 3.1 Intento de hit en caché
    const cached = await cache.match(req);
    if (cached) {
      // Revalida en background (no bloquea la respuesta)
      event.waitUntil(
        fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
        }).catch(() => {})
      );
      return cached;
    }

    // 3.2 Red de primeras; si OK, guarda en caché
    try {
      const res = await fetch(req, { cache: 'no-store' });
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      // 3.3 Fallback 1x1 transparente (PNG) si no hay red
      const transparent1x1 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B3oZt3i8AAAAASUVORK5CYII=';
      return new Response(
        Uint8Array.from(atob(transparent1x1), c => c.charCodeAt(0)),
        { headers: { 'Content-Type': 'image/png' }, status: 200 }
      );
    }
  })());
});

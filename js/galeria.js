/* =========================================================
   Galería 3D – optimizada (render completo + Supabase CDN)
   ========================================================= */

const DEBUG = false;

/** Toggle rápido por si quisieras volver al URL original sin transform */
const USE_SUPA_TRANSFORM = true;

/** Helper: URLs optimizadas vía Supabase Transform API */
// Reemplaza supa() por esta versión con formato
function supa(url, { w, q = 70, resize = 'cover', format } = {}) {
  if (!USE_SUPA_TRANSFORM) return url;
  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace('/storage/v1/object/', '/storage/v1/render/image/');
    if (w) u.searchParams.set('width', String(w));
    u.searchParams.set('quality', String(q));
    u.searchParams.set('resize', resize);
    if (format) u.searchParams.set('format', format); // avif | webp | jpeg
    return u.toString();
  } catch {
    return url;
  }
}

/** 1) Tus URLs públicas (Supabase) */
const PROVIDED_IMAGES = [
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/basement_1_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/basement_2_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/basement_3_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/bedroom_1_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/bedroom_2_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/exterior_facade_1_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/exterior_facade_2_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/exterior_facade_3_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/garage_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/garden_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/kitchen_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Living_room_1_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Living_room_2_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Living_room_3_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Living_room_4_WhiteHills.webp"
];

/** 2) Utilidades para títulos */
function titleFromUrl(url) {
  const file = decodeURIComponent(url.split('/').pop() || '');
  const base = file.replace(/\.[a-z0-9]+$/i, '');
  const parts = base.split('_');
  const brand = (parts[parts.length - 1] || '').trim();
  const main  = parts.slice(0, parts.length - 1).join(' ').trim();
  return { name: capitalizeWords(main || base), brand: brand || 'WhiteHills' };
}
function capitalizeWords(s){ return s.replace(/\w\S*/g, w => w[0].toUpperCase()+w.slice(1)); }

/** 3) Datos */
const TEAM = PROVIDED_IMAGES.map(u => {
  const t = titleFromUrl(u);
  return { name: t.name, role: t.brand, img: u };
});

/** 4) DOM */
const $track  = document.getElementById('glrTrack');
const $dots   = document.getElementById('glrDots');
const $nameEl = document.querySelector('.glr-member__name');
const $roleEl = document.querySelector('.glr-member__role');

let $left = null;
let $right = null;

/** Estado */
let team = TEAM;
let cards = [];
let current = 0;
let animating = false;

function hydrateImage(card) {
  const img = card.querySelector('img[data-src]');
  if (!img) return;

  img.src    = img.dataset.src;
  if (img.dataset.srcset) img.srcset = img.dataset.srcset;
  img.removeAttribute('data-src');
  img.removeAttribute('data-srcset');
}

/** 6) Creación de card + dot */
function createCardAndDot(member, i) {
  const card = document.createElement('div');
  card.className = 'glr-card';
  card.dataset.index = i;

  const img = document.createElement('img');
  img.alt = member.name;

  // Carga “rápida” para las 5 primeras visibles del carrusel
  const eager = i < 4;
  img.decoding = 'async';
  img.loading = eager ? 'eager' : 'lazy';
  img.setAttribute('fetchpriority', eager ? 'high' : 'low');

  img.src = supa(member.img, { w: 1200, q: 75 });
  img.srcset = [
    `${supa(member.img, { w: 480,  q: 70 })} 480w`,
    `${supa(member.img, { w: 768,  q: 70 })} 768w`,
    `${supa(member.img, { w: 1200, q: 75 })} 1200w`,
    `${supa(member.img, { w: 1600, q: 75 })} 1600w`
  ].join(', ');
  img.sizes = '(max-width: 768px) 90vw, (max-width: 1200px) 70vw, 900px';

  img.addEventListener('load', () => img.classList.add('is-loaded'));

  img.onerror = () => {
    card.style.background = 'linear-gradient(135deg,#222,#111)';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'center';
    card.style.color = '#888';
    card.style.fontSize = '14px';
    card.textContent = 'Imagen no disponible';
    card.classList.add('no-img');
    if (DEBUG) console.warn('No se pudo cargar:', member.img);
  };

  // Si es eager, hidrátala ya
  if (eager) { card.appendChild(img); hydrateImage(card); }
  else { card.appendChild(img); } // se hidratará luego

  const dot = document.createElement('div');
  dot.className = 'glr-dot';
  dot.dataset.index = i;

  return { card, dot };
}

/** 7) Render completo (evita desajustes) */
function renderCards(members) {
  if (!$track || !$dots) return;
  $track.innerHTML = '';
  $dots.innerHTML  = '';

  members.forEach((m, i) => {
    const { card, dot } = createCardAndDot(m, i);
    $track.appendChild(card);
    $dots.appendChild(dot);
  });

  cards = Array.from(document.querySelectorAll('.glr-card'));
}

function hydrateNeighborhood(center) {
  const idxs = [];
  for (let d of [0,1,2,-1,-2]) {
    const k = (center + d + cards.length) % cards.length;
    idxs.push(k);
  }
  idxs.forEach(i => hydrateImage(cards[i]));
}


/** 8) Posiciones */
function updateClasses(newIndex) {
  if (animating || cards.length === 0) return;
  animating = true;

  current = (newIndex + cards.length) % cards.length;

  hydrateNeighborhood(current);

  cards.forEach((card, i) => {
    const offset = (i - current + cards.length) % cards.length;
    card.classList.remove('is-center','is-left-1','is-left-2','is-right-1','is-right-2','is-hidden');

    if (offset === 0)      card.classList.add('is-center');
    else if (offset === 1) card.classList.add('is-right-1');
    else if (offset === 2) card.classList.add('is-right-2');
    else if (offset === cards.length - 1) card.classList.add('is-left-1');
    else if (offset === cards.length - 2) card.classList.add('is-left-2');
    else                    card.classList.add('is-hidden');
  });

  if ($dots) {
    Array.from($dots.children).forEach((dot, i) => {
      dot.classList.toggle('is-active', i === current);
      dot.setAttribute('aria-current', i === current ? 'true' : 'false');
    });
  }

  if ($nameEl) $nameEl.style.opacity = '0';
  if ($roleEl) $roleEl.style.opacity = '0';

  setTimeout(() => {
    if ($nameEl) $nameEl.textContent = team[current]?.name || '—';
    if ($roleEl) $roleEl.textContent = team[current]?.role || '—';
    if ($nameEl) $nameEl.style.opacity = '1';
    if ($roleEl) $roleEl.style.opacity = '1';
  }, 300);

  setTimeout(() => { animating = false; }, 800);
}

/** 9) Controles */
function resolveControls(){
  $left  = document.querySelector('.glr-nav--left, [data-glr="prev"], .carousel-control-prev.glr-control');
  $right = document.querySelector('.glr-nav--right, [data-glr="next"], .carousel-control-next.glr-control');
}
function bindEvents() {
  resolveControls();

  if ($left)  $left.addEventListener('click', () => updateClasses(current - 1));
  if ($right) $right.addEventListener('click', () => updateClasses(current + 1));

  if ($dots) {
    $dots.addEventListener('click', (e) => {
      const d = e.target.closest('.glr-dot'); if (!d) return;
      const idx = parseInt(d.dataset.index, 10);
      if (!Number.isNaN(idx)) updateClasses(idx);
    });
  }
  if ($track) {
    $track.addEventListener('click', (e) => {
      const c = e.target.closest('.glr-card'); if (!c) return;
      const idx = parseInt(c.dataset.index, 10);
      if (!Number.isNaN(idx)) updateClasses(idx);
    });
  }

  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement?.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
    if (e.key === 'ArrowLeft')  updateClasses(current - 1);
    if (e.key === 'ArrowRight') updateClasses(current + 1);
  });

  let startX = 0;
  document.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].screenX; }, { passive:true });
  document.addEventListener('touchend', (e) => {
    const diff = startX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) updateClasses(diff > 0 ? current + 1 : current - 1);
  }, { passive:true });
}

// deja tu supa() tal cual, pero NO envíes {format:'webp'} desde preloadOnce
function preloadOnce(url, { w = 64, q = 40 } = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = supa(url, { w, q }); // <-- sin format
  });
}


/** Precarga con límite de concurrencia */
function ensureImages(urls, opts = {}) {
  const CONCURRENCY = 4;           // ajusta si quieres más/menos paralelo
  let cursor = 0;

  function runNext() {
    if (cursor >= urls.length) return Promise.resolve();
    const u = urls[cursor++];
    return preloadOnce(u, opts).finally(runNext);
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, urls.length) }, runNext);
  // Devolvemos una promesa, pero en tu init la llamas “a fuego” sin await, está bien.
  return Promise.all(workers);
}

function runIdle(fn, timeout = 1200){
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(fn, { timeout });
  }
  return setTimeout(fn, timeout);
}

/** 10) Init */
(async function init(){
  if (DEBUG) console.log('[galería] init… total imágenes:', PROVIDED_IMAGES.length);

  // Render primero (rápido)
  renderCards(team);
  bindEvents();

  // Primer layout (hidrata current ±2 dentro de updateClasses)
  setTimeout(() => updateClasses(0), 30);

  // Precalienta miniaturas en tiempo ocioso (concurrencia baja)
  runIdle(() => ensureImages(PROVIDED_IMAGES, { w: 48, q: 38 }));
})();

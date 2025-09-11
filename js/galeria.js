/* =========================================================
   Galería 3D – con verificación de carga de imágenes
   ========================================================= */

const DEBUG = false;

/** 1) Tus URLs públicas (Supabase) */
const PROVIDED_IMAGES = [
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/basement_1_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/basement_2_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/basement_3_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/bedroom_1_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/bedroom_2_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/exterior%20facade_1_WhiteHills.png",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/exterior%20facade_2_WhiteHills.png",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/exterior%20facade_3_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/garage_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/garden_WhiteHills.png",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/kitchen_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Living%20room_1_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Living%20room_2_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Living%20room_3_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Living%20room_4_WhiteHills.jpg"
];

/** 2) Utilidades para títulos */
function titleFromUrl(url) {
  const file = decodeURIComponent(url.split('/').pop() || '');
  const base = file.replace(/\.[a-z0-9]+$/i, '');
  const parts = base.split('_');
  const brand = (parts[parts.length - 1] || '').trim();
  const main = parts.slice(0, parts.length - 1).join(' ').trim();
  return { name: capitalizeWords(main || base), brand: brand || 'WhiteHills' };
}
function capitalizeWords(s){ return s.replace(/\w\S*/g, w => w[0].toUpperCase()+w.slice(1)); }

/** 3) Datos */
const TEAM = PROVIDED_IMAGES.map(u => {
  const t = titleFromUrl(u);
  return { name: t.name, role: t.brand, img: u };
});

/** 4) DOM (elementos fijos ya presentes en HTML) */
const $track  = document.getElementById('glrTrack');
const $dots   = document.getElementById('glrDots');
const $nameEl = document.querySelector('.glr-member__name');
const $roleEl = document.querySelector('.glr-member__role');

/* Controles (se resuelven después, cuando el DOM ya está listo) */
let $left = null;
let $right = null;

/** Estado */
let team = TEAM;
let cards = [];
let current = 0;
let animating = false;

/** 5) Pre-carga y verificación */
function preload(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve({ url, ok:true });
    img.onerror = () => resolve({ url, ok:false });
    img.src = url;
  });
}
async function ensureImages(urls){
  try {
    const results = await Promise.all(urls.map(preload));
    const oks = results.filter(r => r.ok).length;
    if (DEBUG) console.log(`[galería] Imágenes OK: ${oks}/${urls.length}`, results);
    return results;
  } catch (e) {
    console.warn('[galería] Error precargando imágenes', e);
    return [];
  }
}

/** 6) Render dinámico */
function renderCards(members) {
  if (!$track || !$dots) {
    console.warn('[galería] Falta contenedor del track o de los dots.');
    return;
  }

  $track.innerHTML = '';
  $dots.innerHTML = '';

  members.forEach((m, i) => {
    const card = document.createElement('div');
    card.className = 'glr-card';
    card.dataset.index = i;

    const img = document.createElement('img');
    img.alt = m.name;
    img.src = m.img;

    img.onerror = () => {
      // Placeholder visual si falla
      card.style.background = 'linear-gradient(135deg,#222,#111)';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.justifyContent = 'center';
      card.style.color = '#888';
      card.style.fontSize = '14px';
      card.textContent = 'Imagen no disponible';
      if (DEBUG) console.warn('No se pudo cargar:', m.img);
    };

    card.appendChild(img);
    $track.appendChild(card);

    const dot = document.createElement('div');
    dot.className = 'glr-dot';
    dot.dataset.index = i;
    $dots.appendChild(dot);
  });

  cards = Array.from(document.querySelectorAll('.glr-card'));
}

/** 7) Posiciones */
function updateClasses(newIndex) {
  if (animating || cards.length === 0) return;
  animating = true;

  current = (newIndex + cards.length) % cards.length;

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

/** 8) Controles: resolver selectores posibles */
function resolveControls(){
  // Soporta flechas nativas y, si algún día las cambias, también las tipo Bootstrap con data-glr
  $left  = document.querySelector('.glr-nav--left, [data-glr="prev"], .carousel-control-prev.glr-control');
  $right = document.querySelector('.glr-nav--right, [data-glr="next"], .carousel-control-next.glr-control');
}

/** 9) Eventos con null-safety */
function bindEvents() {
  resolveControls();

  if ($left)  $left.addEventListener('click', () => updateClasses(current - 1));
  else if (DEBUG) console.warn('[galería] No se encontró la flecha izquierda (.glr-nav--left).');

  if ($right) $right.addEventListener('click', () => updateClasses(current + 1));
  else if (DEBUG) console.warn('[galería] No se encontró la flecha derecha (.glr-nav--right).');

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

  // Teclado (evita robar teclas cuando se escribe en inputs)
  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement?.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
    if (e.key === 'ArrowLeft')  updateClasses(current - 1);
    if (e.key === 'ArrowRight') updateClasses(current + 1);
  });

  // Swipe táctil
  let startX = 0;
  document.addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].screenX;
  }, { passive:true });

  document.addEventListener('touchend', (e) => {
    const diff = startX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) updateClasses(diff > 0 ? current + 1 : current - 1);
  }, { passive:true });

  // Re-resuelve controles si el header reinyecta contenido (por si hay SPA)
  document.addEventListener('glr:controls:refresh', () => {
    resolveControls();
    if ($left && !$left.__glrBound) {
      $left.addEventListener('click', () => updateClasses(current - 1));
      $left.__glrBound = true;
    }
    if ($right && !$right.__glrBound) {
      $right.addEventListener('click', () => updateClasses(current + 1));
      $right.__glrBound = true;
    }
  });
}

/** 10) Init */
(async function init(){
  if (DEBUG) console.log('[galería] init… total imágenes:', PROVIDED_IMAGES.length);

  // 1) Preload (no bloquea el render, sólo para logs)
  await ensureImages(PROVIDED_IMAGES);

  // 2) Render UI
  renderCards(team);

  // 3) Eventos (cuando ya existen cards/dots)
  bindEvents();

  // 4) Asegura un primer layout antes de aplicar transforms
  setTimeout(() => updateClasses(0), 30);
})();

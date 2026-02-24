/* =========================================================
   Galería 3D – optimizada (render completo + Supabase CDN)
   (recortes 16:9 desde el servidor)
   ========================================================= */

const DEBUG = false;
const VARIANT_VERSION = "v1";
const VARIANT_WIDTHS = [480, 1024, 1920];

function toVariantUrl(originalUrl, width) {
  try {
    const u = new URL(originalUrl);
    const ext = u.pathname.match(/\.[a-z0-9]+$/i)?.[0] || "";
    if (!ext) return originalUrl;
    u.pathname = u.pathname.replace(new RegExp(`${ext}$`, "i"), `.${VARIANT_VERSION}.${width}.webp`);
    return u.toString();
  } catch {
    return originalUrl;
  }
}

/** 1) Tus URLs públicas (Supabase) */
const PROVIDED_IMAGES = [
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/basement_1_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/bedroom_1_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Kitchen_2_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Living_room_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/bedroom_2_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/exterior_facade_1_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/exterior_facade_2_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/exterior_facade_3_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Inside_the_Basement_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/Inside_the_Basement_2_WhiteHills.jpg",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/garage_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/garden_WhiteHills.webp",
  "https://fnmgoidqojutofowzuey.supabase.co/storage/v1/object/public/PDFWH/images/kitchen_WhiteHills.webp",
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

  // Solo la primera imagen arranca eager; el resto lazy.
  const eager = i === 0;
  img.decoding = 'async';
  img.loading = eager ? 'eager' : 'lazy';
  img.setAttribute('fetchpriority', eager ? 'high' : 'low');

  const [w480, w1024, w1920] = VARIANT_WIDTHS;
  const src480 = toVariantUrl(member.img, w480);
  const src1024 = toVariantUrl(member.img, w1024);
  const src1920 = toVariantUrl(member.img, w1920);

  img.src = src1024;
  img.srcset = `${src480} ${w480}w, ${src1024} ${w1024}w, ${src1920} ${w1920}w`;
  img.sizes = '(max-width: 600px) 480px, (max-width: 1200px) 1024px, 1920px';
  img.dataset.fallbackSrc = member.img;

  img.addEventListener('load', () => img.classList.add('is-loaded'));

  img.onerror = () => {
    if (img.dataset.fallbackApplied !== '1') {
      img.dataset.fallbackApplied = '1';
      img.srcset = '';
      img.sizes = '';
      img.src = img.dataset.fallbackSrc || member.img;
      return;
    }

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

  card.appendChild(img);

  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = 'glr-dot';
  dot.dataset.index = i;
  dot.setAttribute('aria-current', 'false');
  dot.setAttribute(
    'aria-label',
    (document.documentElement.lang || '').toLowerCase().startsWith('en')
      ? `Go to image ${i + 1}`
      : `Ir a imagen ${i + 1}`
  );

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

function bindEvents() {
  // Dots → salto directo al índice
  if ($dots) {
    $dots.addEventListener('click', (e) => {
      const d = e.target.closest('.glr-dot'); if (!d) return;
      const idx = parseInt(d.dataset.index, 10);
      if (!Number.isNaN(idx)) updateClasses(idx);
    });
  }

  // Utilidad: mitad horizontal de un rect
  const midX = (rect) => rect.left + rect.width / 2;

  // Click en el track → decide por lado (izq = prev, der = next)
  if ($track) {
    $track.addEventListener('click', (e) => {
      const targetCard = e.target.closest('.glr-card');

      // 1) Click sobre una card
      if (targetCard) {
        const idx = parseInt(targetCard.dataset.index, 10);
        if (Number.isNaN(idx)) return;

        const offset = (idx - current + cards.length) % cards.length;

        // a) Si es la card central: mitad izquierda = prev, derecha = next
        if (offset === 0) {
          const r = targetCard.getBoundingClientRect();
          updateClasses(e.clientX < midX(r) ? current - 1 : current + 1);
          return;
        }

        // b) Si no es la central:
        //    - Clic en una card del lado izquierdo → prev
        //    - Clic en una card del lado derecho → next
        // Nota: offset grande (cercano a length) significa "lado izquierdo" por el wrap.
        const isLeftSide = offset > cards.length / 2;
        updateClasses(isLeftSide ? current - 1 : current + 1);
        return;
      }

      // 2) Click en hueco del track: usa el centro del track
      const tr = $track.getBoundingClientRect();
      updateClasses(e.clientX < midX(tr) ? current - 1 : current + 1);
    });
  }

  // Teclado
  document.addEventListener('keydown', (e) => {
    const tag = (document.activeElement?.tagName || '').toUpperCase();
    if (['INPUT','TEXTAREA','SELECT','BUTTON'].includes(tag)) return;
    if (e.key === 'ArrowLeft')  updateClasses(current - 1);
    if (e.key === 'ArrowRight') updateClasses(current + 1);
  });

  // Gestos táctiles
  let startX = 0;
  document.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].screenX; }, { passive:true });
  document.addEventListener('touchend', (e) => {
    const diff = startX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) updateClasses(diff > 0 ? current + 1 : current - 1);
  }, { passive:true });
}

/** 10) Init */
(async function init(){
  if (DEBUG) console.log('[galería] init… total imágenes:', PROVIDED_IMAGES.length);

  // Render primero
  renderCards(team);
  bindEvents();

  // Primer layout
  setTimeout(() => updateClasses(0), 30);
})();

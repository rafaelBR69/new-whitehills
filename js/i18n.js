/* ===========================================================
   i18n.js → i18next + mapeo de rutas por idioma
   =========================================================== */

/* ---------- 1) Renderizado de textos y atributos ---------- */
function renderPage () {
  document
    .querySelectorAll('[data-i18n]:not([data-i18n*="\\["])')
    .forEach(el => { el.innerHTML = i18next.t(el.dataset.i18n); });

  document
    .querySelectorAll('[data-i18n*="\\["]')
    .forEach(el => {
      el.dataset.i18n.split(';').forEach(str => {
        const m = str.match(/^\s*\[([^\]]+)]\s*(.+)$/); // [attr]key
        if (m) el.setAttribute(m[1], i18next.t(m[2]));
      });
    });

  document
    .querySelectorAll('[data-i18n-placeholder]')
    .forEach(el => { el.placeholder = i18next.t(el.dataset.i18nPlaceholder); });

  const sel = document.getElementById('langSwitcher');
  if (sel) sel.value = (i18next.resolvedLanguage || i18next.language || 'es').slice(0,2);
}

/* ---------- 2) Utilidades de rutas / idioma ---------- */
function detectLocaleFromURL () {
  const m = location.pathname.match(/^\/(es|en)(?:\/|$)/i);
  if (m) return m[1].toLowerCase();
  // Si no hay prefijo en URL, lee cookie
  const ck = document.cookie.match(/(?:^|;\s*)wh_lang=([^;]+)/);
  if (ck) {
    const val = decodeURIComponent(ck[1]).slice(0,2);
    if (val === 'en' || val === 'es') return val;
  }
  return 'en'; // por defecto EN
}

function getRoutesMap () {
  return {
    es: {
      home:         '/es/inicio',
      availability: '/es/disponibilidad',
      location:     '/es/localizacion',
      process:      '/es/proceso-compra',
      contact:      '/es/contacto',
      galeria:      '/es/galeria',
      legal:        '/es/aviso-legal',
      cookies:      '/es/politica-cookies',
      privacy:      '/es/politica-privacidad'
    },
    en: {
      home:         '/en/home',
      availability: '/en/availability',
      location:     '/en/location',
      process:      '/en/process',
      contact:      '/en/contact',
      galeria:      '/en/gallery',
      legal:        '/en/legal-notice',
      cookies:      '/en/cookie-policy',
      privacy:      '/en/privacy-policy'
    }
  };
}

// === Cambio de idioma centralizado (navega a la ruta canónica) ===
window.setLang = function setLang(l) {
  const lang = (l === 'en') ? 'en' : 'es';
  try { localStorage.setItem('i18nextLng', lang); } catch {}
  try {
    document.cookie = 'wh_lang=' + encodeURIComponent(lang) + ';path=/;max-age=' + (60*60*24*365);
  } catch {}

  const R = getRoutesMap()[lang];
  const semantic = getCurrentSemanticRoute(); // home, contact, gallery, etc.
  let dest = R[semantic] || R.home;

  // conserva sección si estás en home con hash válido
  if (location.hash === '#availability' || location.hash === '#location') {
    dest += location.hash;
  }
  location.href = dest; // ← navegación real asegura idioma correcto y cache fresca
};

/* Ruta semántica actual (para mantenerla al cambiar idioma) */
function getCurrentSemanticRoute () {
  const p = location.pathname.replace(/\/+$/,'').toLowerCase();
  const h = (location.hash || '').toLowerCase();

  if (h === '#availability') return 'availability';
  if (h === '#location')     return 'location';

  if (p.endsWith('/index.html') || p === '' || p === '/')                                        return 'home';
  if (p.endsWith('/contact.html')      || /\/(es\/contacto|en\/contact)(\/)?$/.test(p))          return 'contact';
  if (p.endsWith('/proceso.html')      || /\/(es\/proceso-compra|en\/process)(\/)?$/.test(p))    return 'process';
  if (/\/(es\/disponibilidad|en\/availability)(\/)?$/.test(p))                                   return 'availability';
  if (/\/(es\/localizacion|en\/location)(\/)?$/.test(p))                                         return 'location';
  if (p.endsWith('/galeria.html')      || /\/(es\/galeria|en\/gallery)(\/)?$/.test(p))           return 'galeria';
  if (p.endsWith('/legal-notice.html') || /\/(es\/aviso-legal|en\/legal-notice)(\/)?$/.test(p))  return 'legal';
  if (p.endsWith('/cookies-policy.html')||/\/(es\/politica-cookies|en\/cookie-policy)(\/)?$/.test(p)) return 'cookies';
  if (p.endsWith('/privacy-policy.html')||/\/(es\/politica-privacidad|en\/privacy-policy)(\/)?$/.test(p)) return 'privacy';

  return 'home';
}

/* ---------- 3) Aplicar i18n + rutas ---------- */
window.applyI18nAndRoutes = function applyI18nAndRoutes () {
  if (window.i18next && i18next.isInitialized) renderPage();

  const L = detectLocaleFromURL();     // 'es' | 'en'
  const routes = getRoutesMap()[L];

  // 🔎 considerar home también en /es/inicio y /en/home
  const onHome = /^(?:\/|\/index\.html|\/es\/inicio\/?|\/en\/home\/?)$/i.test(location.pathname);

  const setHref = (selector, url) => {
    document.querySelectorAll(selector).forEach(a => a.setAttribute('href', url));
  };

  // Logo / Home
  setHref('a.navbar-brand, a[data-route="home"]', routes.home);

  // Availability / Location → hash si estás en home; ruta limpia si no
  setHref('header a[data-route="availability"], footer a[data-route="availability"]',
          onHome ? '#availability' : routes.availability);
  setHref('header a[data-route="location"], footer a[data-route="location"]',
          onHome ? '#location' : routes.location);

  // Páginas físicas
  setHref('a[data-route="process"]',  routes.process);
  setHref('a[data-route="contact"]',  routes.contact);
  setHref('a[data-route="galeria"]',  routes.galeria);

  // Footer legales
  setHref('footer a[data-route="legal"]',   routes.legal);
  setHref('footer a[data-route="cookies"]', routes.cookies);
  setHref('footer a[data-route="privacy"]', routes.privacy);

  // html[lang]
  document.documentElement.setAttribute('lang', L);

  // Marca activo en el header
  const path = location.pathname.replace(/\/+$/,'').toLowerCase();
  document.querySelectorAll('header a[href]').forEach(a => {
    const href = (a.getAttribute('href')||'').replace(/\/+$/,'').toLowerCase();
    a.classList.remove('active'); a.removeAttribute('aria-current');
    if (href && href !== '#' && href === path) {
      a.classList.add('active');
      a.setAttribute('aria-current','page');
    }
  });

  // Título y meta description por página (si existen claves)
  const semantic = getCurrentSemanticRoute();
  const keyBase  = (
    semantic === 'galeria'   ? 'gallery' :
    semantic === 'process'   ? 'process' :
    semantic === 'contact'   ? 'contact' :
    semantic === 'legal'     ? 'legal'   :
    semantic === 'cookies'   ? 'cookies' :
    semantic === 'privacy'   ? 'privacy' :
    semantic === 'home'      ? 'home'    : null
  );

  if (keyBase) {
    const metaTitle = i18next.t(`${keyBase}.metaTitle`, { defaultValue: '' });
    if (metaTitle) document.title = metaTitle;

    const metaDesc = i18next.t(`${keyBase}.metaDescription`, { defaultValue: '' });
    if (metaDesc) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement('meta'); m.setAttribute('name','description'); document.head.appendChild(m); }
      m.setAttribute('content', metaDesc);
    }
  }

  // Canonical dinámico si existe <link id="canonical">
  const canonicalEl = document.querySelector('link#canonical');
  if (canonicalEl) canonicalEl.href = location.href;

  // En home con hash → scroll suave
  if (onHome && (location.hash === '#availability' || location.hash === '#location')) {
    requestAnimationFrame(() => {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Vincular cambio de idioma una sola vez
  const sel = document.getElementById('langSwitcher');
  if (sel && !sel.dataset.boundLangChange) {
    sel.dataset.boundLangChange = '1';
    sel.addEventListener('change', (e) => {
      const newLang = e.target.value || 'es';
      i18next.changeLanguage(newLang);

      const semantic = getCurrentSemanticRoute();
      const R = getRoutesMap()[newLang] || getRoutesMap().es;

      // Si estás en home con hash de sección, conserva el hash
      const hasHashSection = (location.hash === '#availability' || location.hash === '#location');
      let dest = R[semantic] || R.home;
      if (hasHashSection) dest = R.home + location.hash;

      location.href = dest;
    });
  }
};

/* ---------- 4) Inicializa i18next ---------- */
i18next
  .use(i18nextHttpBackend)
  .use(i18nextBrowserLanguageDetector)
  .init({
    supportedLngs: ['es','en'],
    fallbackLng  : 'en',
    load         : 'languageOnly',
    nonExplicitSupportedLngs: true,
    detection: {
      // La RUTA manda; luego cookie; el resto fuera para evitar estados viejos
      order: ['path', 'cookie'],
      caches: ['cookie'],
      cookieName: 'wh_lang'
    },
    preload: ['es','en'],
    backend: { loadPath: '/langs/{{lng}}.json' },
    initImmediate: false,
    debug: false
  })
  .then(() => {
    renderPage();
    window.applyI18nAndRoutes();
  })
  .catch(err => console.error('i18n init error', err));

i18next.on?.('languageChanged', () => {
  renderPage();
  window.applyI18nAndRoutes();
});

/* ---------- 5) Scroll si viene ?section=... (cuando llegas desde rutas limpias) ---------- */
(function(){
  const params  = new URLSearchParams(location.search);
  const section = params.get('section'); // availability | location
  const targetId = section === 'availability' ? 'availability'
                 : section === 'location'     ? 'location'
                 : null;
  if (!targetId) return;

  const go = () => {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(go, 50);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(go, 50));
  }
})();

/* ---------- 6) Intercepción de clicks en HOME (garantiza el scroll) ---------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-route="availability"], a[data-route="location"]');
  if (!a) return;

  const onHome = /^(?:\/|\/index\.html|\/es\/inicio\/?|\/en\/home\/?)$/i.test(location.pathname);
  if (!onHome) return; // fuera de home, navega normal

  e.preventDefault();
  const id = a.getAttribute('data-route') === 'availability' ? 'availability' : 'location';
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { history.replaceState(null, '', '#' + id); } catch(_) {}
  }
});

/* --- Scroll for pretty paths (/en/location, /es/disponibilidad, etc.) --- */
(function () {
  const p = location.pathname.replace(/\/+$/, '').toLowerCase();

  let targetId = null;
  if (/\/(es\/disponibilidad|en\/availability)$/.test(p)) targetId = 'availability';
  if (/\/(es\/localizacion|en\/location)$/.test(p))       targetId = 'location';

  if (!targetId) return;

  const scrollNow = () => {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(scrollNow, 50));
  } else {
    setTimeout(scrollNow, 50);
  }
})();
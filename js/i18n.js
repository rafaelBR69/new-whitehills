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

  const currentLang = (i18next.resolvedLanguage || i18next.language || detectLocaleFromURL() || 'es').slice(0,2);
  const sel = document.getElementById('langSwitcher');
  if (sel) sel.value = currentLang;

  const badge = document.getElementById('lang-current');
  if (badge) badge.textContent = currentLang.toUpperCase();
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
  location.href = dest; // navegación real asegura idioma correcto y cache fresca
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

  // 🔑 fuerza traducción de la ruleta (desktop + móvil)
  if (typeof window.translateRuleta === 'function') {
    window.translateRuleta();
  }

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

  // WhatsApp CTA con mensaje precargado por idioma
  const defaultWaMessage = L === 'en'
    ? 'Hello, I would like more information about WhiteHills villas.'
    : 'Buenas, quiero más información sobre las villas de WhiteHills';
  const waMessageRaw = (window.i18next && typeof i18next.t === 'function')
    ? i18next.t('chatCta.message', { defaultValue: defaultWaMessage })
    : defaultWaMessage;
  const waMessage = (!waMessageRaw || waMessageRaw === 'chatCta.message')
    ? defaultWaMessage
    : waMessageRaw;
  setHref('a.floating-whatsapp', `https://wa.me/34621283445?text=${encodeURIComponent(waMessage)}`);

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

  // SEO por ruta: prioridad a seo.<route> y fallback a claves legacy
  const semantic = getCurrentSemanticRoute();
  const legacyKeyBase = (
    semantic === 'galeria'   ? 'gallery' :
    semantic === 'process'   ? 'process' :
    semantic === 'contact'   ? 'contact' :
    semantic === 'legal'     ? 'legal'   :
    semantic === 'cookies'   ? 'cookies' :
    semantic === 'privacy'   ? 'privacy' :
    semantic === 'home'      ? 'home'    : null
  );
  const seoKeyBase = `seo.${semantic}`;

  const upsertMeta = (selector, attrs, content) => {
    if (!content) return;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  const seoTitle = i18next.t(`${seoKeyBase}.title`, { defaultValue: '' });
  const seoDesc = i18next.t(`${seoKeyBase}.metaDescription`, { defaultValue: '' });
  const seoCanonical = i18next.t(`${seoKeyBase}.canonical`, { defaultValue: '' });
  const seoRobots = i18next.t(`${seoKeyBase}.robots`, { defaultValue: '' });
  const seoOgTitle = i18next.t(`${seoKeyBase}.ogTitle`, { defaultValue: seoTitle });
  const seoOgDesc = i18next.t(`${seoKeyBase}.ogDescription`, { defaultValue: seoDesc });

  const fallbackTitle = legacyKeyBase ? i18next.t(`${legacyKeyBase}.metaTitle`, { defaultValue: '' }) : '';
  const fallbackDesc = legacyKeyBase ? i18next.t(`${legacyKeyBase}.metaDescription`, { defaultValue: '' }) : '';
  const fallbackRobots = legacyKeyBase ? i18next.t(`${legacyKeyBase}.robots`, { defaultValue: '' }) : '';

  const pageTitle = seoTitle || fallbackTitle;
  const pageDesc = seoDesc || fallbackDesc;
  const pageRobots = seoRobots || fallbackRobots;
  const canonicalHref = seoCanonical || location.href;

  if (pageTitle) document.title = pageTitle;
  upsertMeta('meta[name="description"]', { name: 'description' }, pageDesc);
  upsertMeta('meta[name="robots"]', { name: 'robots' }, pageRobots);
  upsertMeta('meta[property="og:title"]', { property: 'og:title' }, seoOgTitle || pageTitle);
  upsertMeta('meta[property="og:description"]', { property: 'og:description' }, seoOgDesc || pageDesc);
  upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalHref);
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, seoOgTitle || pageTitle);
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, seoOgDesc || pageDesc);

  const canonicalEl = document.querySelector('link#canonical, link[rel="canonical"]');
  if (canonicalEl) canonicalEl.href = canonicalHref;

  const routeMap = getRoutesMap();
  const toAbs = (rel) => rel ? `${location.origin}${rel}` : '';
  const altEsUrl = toAbs(routeMap.es[semantic] || routeMap.es.home);
  const altEnUrl = toAbs(routeMap.en[semantic] || routeMap.en.home);
  const xDefaultUrl = altEnUrl;
  const altEsEl = document.querySelector('link#alt-es');
  const altEnEl = document.querySelector('link#alt-en');
  const altXDefaultEl = document.querySelector('link#alt-x-default');
  if (altEsEl) altEsEl.href = altEsUrl;
  if (altEnEl) altEnEl.href = altEnUrl;
  if (altXDefaultEl) altXDefaultEl.href = xDefaultUrl;

  // En home con hash → scroll suave
  if (onHome && (location.hash === '#availability' || location.hash === '#location')) {
    requestAnimationFrame(() => {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Vincular cambio de idioma (select + dropdown) una sola vez
  const goToLanguage = (lang) => {
    const next = (lang || 'es').slice(0,2).toLowerCase() === 'en' ? 'en' : 'es';
    if (typeof window.setLang === 'function') window.setLang(next);
    else location.href = (next === 'en') ? '/en/home' : '/es/inicio';
  };

  const sel = document.getElementById('langSwitcher');
  if (sel && !sel.dataset.boundLangChange) {
    sel.dataset.boundLangChange = '1';
    sel.addEventListener('change', (e) => {
      goToLanguage(e.target.value);
    });
  }

  document.querySelectorAll('.lang-menu [data-lang]').forEach(btn => {
    if (btn.dataset.boundLangChange) return;
    btn.dataset.boundLangChange = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      goToLanguage(btn.dataset.lang);
    });
  });
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

    // 🔑 por si la ruleta se creó antes
    if (typeof window.translateRuleta === 'function') {
      window.translateRuleta();
    }
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

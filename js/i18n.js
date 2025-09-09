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
  const l = (i18next?.resolvedLanguage || i18next?.language || 'es').slice(0,2);
  return (l === 'en' || l === 'es') ? l : 'es';
}

function getRoutesMap () {
  return {
    es: {
      home:         '/es/inicio',
      availability: '/es/disponibilidad',
      location:     '/es/localizacion',
      process:      '/es/proceso-compra',
      contact:      '/es/contacto',
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
      legal:        '/en/legal-notice',
      cookies:      '/en/cookie-policy',
      privacy:      '/en/privacy-policy'
    }
  };
}

/* Ruta semántica actual (para mantenerla al cambiar idioma) */
function getCurrentSemanticRoute () {
  const p = location.pathname.replace(/\/+$/,'').toLowerCase();
  const h = (location.hash || '').toLowerCase();

  if (h === '#availability') return 'availability';
  if (h === '#location')     return 'location';

  if (p.endsWith('/index.html') || p === '' || p === '/')                                       return 'home';
  if (p.endsWith('/contact.html') || /\/(es\/contacto|en\/contact)(\/)?$/.test(p))              return 'contact';
  if (p.endsWith('/proceso.html') || /\/(es\/proceso-compra|en\/process)(\/)?$/.test(p))        return 'process';
  if (/\/(es\/disponibilidad|en\/availability)(\/)?$/.test(p))                                   return 'availability';
  if (/\/(es\/localizacion|en\/location)(\/)?$/.test(p))                                         return 'location';
  if (p.endsWith('/legal-notice.html')   || /\/(es\/aviso-legal|en\/legal-notice)(\/)?$/.test(p))   return 'legal';
  if (p.endsWith('/cookies-policy.html') || /\/(es\/politica-cookies|en\/cookie-policy)(\/)?$/.test(p)) return 'cookies';
  if (p.endsWith('/privacy-policy.html') || /\/(es\/politica-privacidad|en\/privacy-policy)(\/)?$/.test(p)) return 'privacy';

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

  // Availability / Location
  setHref('header a[data-route="availability"], footer a[data-route="availability"]',
          onHome ? '#availability' : routes.availability);
  setHref('header a[data-route="location"], footer a[data-route="location"]',
          onHome ? '#location' : routes.location);

  // Páginas físicas
  setHref('a[data-route="process"]', routes.process);
  setHref('a[data-route="contact"]', routes.contact);

  // Footer legales
  setHref('footer a[data-route="legal"]',   routes.legal);
  setHref('footer a[data-route="cookies"]', routes.cookies);
  setHref('footer a[data-route="privacy"]', routes.privacy);

  document.documentElement.setAttribute('lang', L);

  // En home con hash → scroll suave
  if (onHome && (location.hash === '#availability' || location.hash === '#location')) {
    requestAnimationFrame(() => {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
};

/* ---------- 4) Inicializa i18next ---------- */
i18next
  .use(i18nextHttpBackend)
  .use(i18nextBrowserLanguageDetector)
  .init({
    supportedLngs: ['es','en'],
    fallbackLng  : 'es',
    load         : 'languageOnly',
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['localStorage', 'htmlTag', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
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
  if (!onHome) return; // fuera de home, dejamos que navegue a la ruta limpia

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
  // ¿Estamos en una URL limpia que apunta a una sección de index?
  const p = location.pathname.replace(/\/+$/, '').toLowerCase();

  let targetId = null;
  if (/\/(es\/disponibilidad|en\/availability)$/.test(p)) targetId = 'availability';
  if (/\/(es\/localizacion|en\/location)$/.test(p))       targetId = 'location';

  if (!targetId) return;

  const scrollNow = () => {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Espera a que el DOM esté listo (y a que se inyecten parciales si aplica)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(scrollNow, 50));
  } else {
    setTimeout(scrollNow, 50);
  }
})();

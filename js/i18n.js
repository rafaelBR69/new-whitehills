/* ===========================================================
   i18n.js  → inicializa i18next, fuerza idioma por URL
              y mapea enlaces a rutas limpias ES/EN
   =========================================================== */

/* --- Idioma desde la URL (/es/... | /en/...) --- */
const pathLang = location.pathname.replace(/^\/+/, '').split('/')[0];
const urlLang  = (pathLang === 'en' || pathLang === 'es') ? pathLang : 'es';
document.documentElement.lang = urlLang;

/* --- Pintado de textos y atributos --- */
function renderPage () {
  // a) nodos con texto interno (clave simple)
  document
    .querySelectorAll('[data-i18n]:not([data-i18n*="\\["])')
    .forEach(el => { el.innerHTML = i18next.t(el.dataset.i18n); });

  // b) nodos con sintaxis [attr]clave ; [title]foo;[aria-label]bar
  document
    .querySelectorAll('[data-i18n*="\\["]')
    .forEach(el => {
      el.dataset.i18n.split(';').forEach(str => {
        const m = str.match(/^\s*\[([^\]]+)]\s*(.+)$/);   // [attr]key
        if (m) el.setAttribute(m[1], i18next.t(m[2]));
      });
    });

  // c) compatibilidad antigua
  document
    .querySelectorAll('[data-i18n-placeholder]')
    .forEach(el => { el.placeholder = i18next.t(el.dataset.i18nPlaceholder); });

  // d) sincroniza el <select>
  const sel = document.getElementById('langSwitcher');
  if (sel) sel.value = i18next.resolvedLanguage.slice(0,2);
}

/* --- Mapeo de rutas limpias ES/EN para menú y footer --- */
function mapCleanRoutes () {
  const L = (document.documentElement.lang === 'en') ? 'en' : 'es';

  const routes = {
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

  // Previene clics hasta que haya href real
  document.querySelectorAll('a.nav-link[href="#"], footer a[href="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      if (a.getAttribute('href') === '#') e.preventDefault();
    }, {capture:true});
  });

  // Asigna href a todo lo que tenga data-route
  document.querySelectorAll('a[data-route]').forEach(a=>{
    const key = a.getAttribute('data-route');
    if (routes[L][key]) a.setAttribute('href', routes[L][key]);
  });

  // Selector de idioma → redirección a la home del idioma elegido
  const sel = document.getElementById('langSwitcher');
  if (sel) {
    sel.value = L;
    sel.onchange = (e)=>{
      const v = (e.target.value === 'en') ? 'en' : 'es';
      location.href = routes[v].home;
    };
  }
}

/* --- Inicializa i18next priorizando el PATH --- */
i18next
  .use(i18nextHttpBackend)
  .use(i18nextBrowserLanguageDetector)
  .init({
    supportedLngs: ['es', 'en'],
    fallbackLng  : 'es',
    lng          : urlLang,                 // fuerza el idioma de arranque
    load         : 'languageOnly',
    nonExplicitSupportedLngs: true,

    backend: { loadPath: '/langs/{{lng}}.json' },

    detection: {
      order: ['path', 'localStorage', 'cookie', 'navigator', 'htmlTag'],
      lookupFromPathIndex: 0,
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },

    preload: ['es', 'en'],
    initImmediate: false,
    debug: false
  })
  .then(() => {
    renderPage();
    mapCleanRoutes(); // importante: después de tener el lang
  })
  .catch(console.error);

/* --- Re-render si cambia el idioma (por cualquier motivo) --- */
i18next.on('languageChanged', () => {
  document.documentElement.lang = i18next.language.slice(0,2);
  renderPage();
  mapCleanRoutes();
});

/* ========= Utilidades SEO / UX ========= */
/* 1) Scroll a secciones si viene ?section=availability|location|... */
(function(){
  const params  = new URLSearchParams(location.search);
  const section = params.get('section');
  if(!section) return;

  const targetId = section === 'availability' ? 'availability'
                 : section === 'location'     ? 'location'
                 : null;
  if(!targetId) return;

  const go = () => {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(go, 50);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(go, 50));
  }
})();

// === al final de i18n.js ===
window.renderI18n = renderPage;
window.mapCleanRoutes = mapCleanRoutes;
window.applyI18nAndRoutes = function(){
  try { renderPage(); } catch(e){}
  try { mapCleanRoutes(); } catch(e){}
};

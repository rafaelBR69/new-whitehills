/* ===========================================================
   i18n.js  →  inicializa i18next y gestiona el selector idioma
   =========================================================== */

/* 1 · Pinta textos y atributos cada vez que cambie el idioma */
function renderPage () {
  /* a)  nodos con texto interno (clave simple, sin corchetes) */
  document
    .querySelectorAll('[data-i18n]:not([data-i18n*="\\["])')
    .forEach(el => { el.innerHTML = i18next.t(el.dataset.i18n); });

  /* b)  nodos con sintaxis [attr]clave  (puede haber varios separados por ;) */
  document
    .querySelectorAll('[data-i18n*="\\["]')
    .forEach(el => {
      el.dataset.i18n.split(';').forEach(str => {
        const m = str.match(/^\s*\[([^\]]+)]\s*(.+)$/);   // [attr]key
        if (m) el.setAttribute(m[1], i18next.t(m[2]));
      });
    });

  /* c)  compatibilidad antigua: data-i18n-placeholder="clave" */
  document
    .querySelectorAll('[data-i18n-placeholder]')
    .forEach(el => { el.placeholder = i18next.t(el.dataset.i18nPlaceholder); });

  /* d)  sincroniza el <select> */
  const sel = document.getElementById('langSwitcher');
  if (sel) sel.value = i18next.resolvedLanguage;
}

/* 2 · Inicializa i18next una sola vez para todo el sitio */
i18next
  .use(i18nextHttpBackend)
  .use(i18nextBrowserLanguageDetector)
  .init({
    /* idiomas que SÍ existen en /langs */
    supportedLngs: ['es', 'en'],
    fallbackLng : 'es',

    /* en‑GB, en‑US, es‑MX… → en / es */
    load                     : 'languageOnly',
    nonExplicitSupportedLngs : true,

    /* recuerda la elección entre pestañas */
    detection: {
      order : ['localStorage', 'htmlTag', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },

    /* descarga los dos archivos al arrancar (evita flashes) */
    preload: ['es', 'en'],

    backend: { loadPath: '/langs/{{lng}}.json' },

    /* bloquea el hilo hasta que los JSON están en memoria  */
    initImmediate: false,

    debug: false               // pon true en desarrollo para missing keys
  })
  .then(renderPage)             // se llama cuando TODO está cargado
  .catch(console.error);

/* 3 · Cambia idioma al tocar el <select> */
document.addEventListener('change', e => {
  if (e.target.id === 'langSwitcher') {
    i18next.changeLanguage(e.target.value);
  }
});

/* 4 · Reactualiza si el idioma cambia por cualquier otro medio */
i18next.on('languageChanged', renderPage);

/* ========= Utilidades SEO / UX ========= */

// 1) Scroll a secciones si viene ?section=availability|location|...
(function(){
  const params = new URLSearchParams(location.search);
  const section = params.get('section');
  if(!section) return;

  // mapea 'availability' → '#availability', 'location' → '#location'
  const targetId = section === 'availability' ? 'availability'
                 : section === 'location'     ? 'location'
                 : null;

  if(!targetId) return;

  const go = () => {
    const el = document.getElementById(targetId);
    if(!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // espera a que se inserten los parciales si hace falta
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(go, 50);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(go, 50));
  }
})();

// 2) Enlaces del header según idioma (evita href rotos en /en/…)
(function(){
  // Detecta idioma actual desde i18next (si existe) o desde URL
  function getLocale(){
    if (window.i18next && i18next.language) {
      const l = i18next.language.slice(0,2);
      return (l === 'en' || l === 'es') ? l : 'es';
    }
    const m = location.pathname.match(/^\/(es|en)(\/|$)/i);
    return m ? m[1] : 'es';
  }
  const L = getLocale();

  // Mapa de rutas limpias por idioma
  const routes = {
    es: {
      home: '/es/inicio',
      availability: '/es/disponibilidad',
      location: '/es/localizacion',
      process: '/es/proceso-compra',
      contact: '/es/contacto'
    },
    en: {
      home: '/en/home',
      availability: '/en/availability',
      location: '/en/location',
      process: '/en/process',
      contact: '/en/contact'
    }
  };

  // Aplica a los enlaces del menú si existen
  const map = {
    'a[data-i18n="nav.home"]':        routes[L].home,
    'a[data-i18n="nav.availability"]':routes[L].availability,
    'a[data-i18n="nav.location"]':    routes[L].location,
    'a[data-i18n="nav.process"]':     routes[L].process,
    'a[data-i18n="nav.contact"]':     routes[L].contact
  };
  for (const sel in map){
    const a = document.querySelector(sel);
    if (a) a.setAttribute('href', map[sel]);
  }

  // Cambia <html lang="…">
  document.documentElement.setAttribute('lang', L === 'en' ? 'en' : 'es');

  // Cambia selector si existe
  const sel = document.getElementById('langSwitcher');
  if (sel) sel.value = L;

  // Al cambiar idioma desde el selector → redirige a la home del otro idioma
  if (sel) sel.addEventListener('change', (e)=>{
    const v = e.target.value === 'en' ? 'en' : 'es';
    location.href = routes[v].home;
  });
})();
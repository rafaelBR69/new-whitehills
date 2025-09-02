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

    backend: { loadPath: './langs/{{lng}}.json' },

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

/* ──────────────────────────────
   0. Header: cambia color + logo
──────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  const header  = document.querySelector('header');
  const logoImg = document.querySelector('.logo img');       // <img> real
  const hero    = document.querySelector('.section_1');      // sección-foto

  if (!header || !logoImg || !hero) return;                  // seguridad

  /* rutas de tus dos logos */
  const WHITE_LOGO = '/images/logo-blanco.png';
  const GREEN_LOGO = '/images/logo.png';

  /* — IO: cuando el héroe deja de ser visible — */
  const io = new IntersectionObserver(
    ([entry]) => {
      const onHero = entry.isIntersecting;

      header.classList.toggle('scrolled', !onHero);     // color de la barra
      logoImg.src = onHero ? WHITE_LOGO : GREEN_LOGO;   // cambia logo
    },
    { threshold: 0 }                                    // basta 1 px
  );

  io.observe(hero);
});

/* ──────────────────────────────
   1. Menú hamburguesa
──────────────────────────────── */
function toggleNav () {
  const navLinks = document.getElementById('navLinks');
  navLinks.classList.toggle('active');
  navLinks.style.color = 'white';
}

/* ──────────────────────────────
   2. Animaciones “reveal” al hacer scroll
──────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);      // quita si quieres repetir
        }
      });
    },
    { threshold: 0.3 }                      // 30 % visible
  );
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
});

/* ──────────────────────────────
   3. Pop-up (formularios → Google Sheets)
   ─ Visita y Brochure con modales separados
──────────────────────────────── */

const $id = (x) => document.getElementById(x);

/* Helper genérico: soporta .show y .is-open */
function toggleModal(modalEl, show = true) {
  if (!modalEl) return;
  modalEl.classList.toggle('show', show);
  modalEl.classList.toggle('is-open', show);   // por si tus estilos usan esta
  document.body.classList.toggle('modal-open', show);
  if (show) modalEl.querySelector('.modal__box')?.focus();
}

/* Carga perezosa del parcial de modales si falta en el DOM */
async function ensureModalsLoaded() {
  if (document.getElementById('brochureModal')) return true;
  const res = await fetch('/partials/modals.html', { cache: 'no-store' });
  if (!res.ok) { console.error('No se pudo cargar /partials/modals.html'); return false; }
  const html = await res.text();
  // ⬇️ Inserta modales como hijos directos de <body>
  document.body.insertAdjacentHTML('beforeend', html);
  window.applyI18nAndRoutes && window.applyI18nAndRoutes();
  return !!document.getElementById('brochureModal');
}


/* Visit (infoModal) */
window.openVisitModal  = async () => {
  if (!(await ensureModalsLoaded())) return;
  toggleModal(document.getElementById('infoModal'), true);
};
window.closeVisitModal = () => toggleModal(document.getElementById('infoModal'), false);

/* Brochure (brochureModal) — ahora asíncrono y con URL */
window.openBrochureModal  = async (pdfURL = '') => {
  if (!(await ensureModalsLoaded())) return;
  const modal = document.getElementById('brochureModal');
  if (!modal) return console.warn('#brochureModal no encontrado tras cargar parcial');

  // pasa la URL al hidden
  const hidden = modal.querySelector('input[name="download_url"]');
  if (hidden) hidden.value = pdfURL;

  toggleModal(modal, true);
};
window.closeBrochureModal = () => {
  const m = document.getElementById('brochureModal');
  if (m) toggleModal(m, false);
};

/* Gracias (thankModal) */
window.openThank  = async () => {
  if (!(await ensureModalsLoaded())) return;
  toggleModal(document.getElementById('thankModal'), true);
};
window.closeThank = () => toggleModal(document.getElementById('thankModal'), false);


/* Alias compatibilidad con código existente */
window.openModal  = () => window.openVisitModal();
window.closeModal = () => window.closeVisitModal();

/* Cierre por overlay o botón X (para cualquier modal) */
document.addEventListener('click', (e) => {
  const target    = (e.target && e.target.nodeType === 3) ? e.target.parentElement : e.target;
  const isOverlay = target?.classList?.contains('modal__overlay');
  const closeBtn  = target?.closest?.('.modal__close');
  if (isOverlay || closeBtn) {
    const modal = (isOverlay ? target.closest('.modal') : closeBtn.closest('.modal'));
    if (modal) toggleModal(modal, false);  // ← asegura limpiar .show/.is-open y body
  }
  // ids específicos de "Gracias" (por compatibilidad)
  const id = target?.id;
  if (id === 'thankOverlay' || id === 'thankClose' || id === 'thankOk') closeThank();
});

/* ▶️ Abrir “Agendar visita” (.btn-visit) */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-visit');
  if (!btn) return;

  e.preventDefault();
  const unit = btn.getAttribute('data-unit') || '';
  const form = $id('visitForm'); // <-- antes buscabas 'leadForm'
  if (form) {
    let u = form.querySelector('[name="unidad"]');
    if (!u) { u = document.createElement('input'); u.type = 'hidden'; u.name = 'unidad'; form.appendChild(u); }
    u.value = unit;

    let origin = form.querySelector('[name="origin"]') || form.querySelector('[name="origen"]');
    if (!origin) { origin = document.createElement('input'); origin.type = 'hidden'; origin.name = 'origin'; form.appendChild(origin); }
    origin.value = 'Agendar visita – Web';
  }
  openVisitModal();
});

/* ▶️ CTA fijo móvil “Contact” → abre modal de datos existente */
document.addEventListener('click', async (e) => {
  const trigger = e.target.closest('[data-action="open-contact-modal"]');
  if (!trigger) return;

  // Si no existe la función modal, dejamos navegación normal al enlace.
  if (typeof window.openVisitModal !== 'function') return;

  e.preventDefault();
  await window.openVisitModal();
});


/* ▶️ Abrir “Obtener brochure” (a.btn-brochure) */
document.addEventListener('click', async (e) => {
  const link = e.target.closest('a.btn-brochure');
  if (!link) return;

  e.preventDefault();

  const pdfURL = link.getAttribute('href') || '';
  await openBrochureModal(pdfURL); // ← se asegura de cargar el parcial y abrir
});


/* ==== Envío a Google Sheets para TODOS los formularios data-lead ==== */
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (!form.matches('form[data-lead]')) return;

  e.preventDefault();

  const fd = new FormData(form);

  // Honeypot
  if (fd.get('website')?.trim()) {
    console.warn('[Spam-bot] envío bloqueado');
    return;
  }
  fd.delete('website');

  // ----- Normalización de nombres (ES -> EN) -----
  if (!fd.get('name') && fd.get('nombre'))     fd.set('name',    fd.get('nombre'));
  if (!fd.get('phone') && fd.get('telefono'))  fd.set('phone',   fd.get('telefono'));
  if (!fd.get('message') && fd.get('mensaje')) fd.set('message', fd.get('mensaje'));

  // Tipo de formulario (útil en Sheet)
  const formType =
    form.id === 'visitForm'     ? 'visit'    :
    form.id === 'brochureForm'  ? 'brochure' :
    form.id === 'leadForm'      ? 'contact'  :
    'form';
  fd.set('form_type', formType);

  // Origen FORZADO según tipo
  fd.set('origin', formType === 'brochure' ? 'Formulario Brochure' : 'Formulario Web');

  // RGPD / marketing (si existen)
  const rgpdInput = form.querySelector('[name="rgpd"]');
  const mkInput   = form.querySelector('[name="marketing_ok"]');
  if (rgpdInput) fd.set('rgpd', rgpdInput.checked ? 'Sí' : 'No');
  if (mkInput)   fd.set('marketing_ok', mkInput.checked ? 'Sí' : 'No');

  const data = Object.fromEntries(fd.entries());

  // Para "brochure": abrir PDF automáticamente tras enviar
  const shouldDownload = String(form.dataset.downloadOnSuccess || '').toLowerCase() === 'true';
  const downloadUrl = data.download_url || form.querySelector('[name="download_url"]')?.value;

  try {
    // Cierra el modal actual (si aplica) y abre “Gracias”
    form.closest('.modal')?.classList.remove('show');
    if (typeof openThank === 'function') openThank();

    await fetch(
      'https://script.google.com/macros/s/AKfycbwXUji7ljlDIuacCTfThyAY2bEtKuvvYhk8o5uGH-F-M82dbuLXNayt-31ppnAkrBj7aQ/exec',
      { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) }
    );

    if (shouldDownload && downloadUrl) {
      window.open(downloadUrl, '_blank', 'noopener');
    }

    form.reset();
  } catch (err) {
    console.error(err);
    alert('Ups, no se pudo enviar. Inténtalo de nuevo.');
  }
}, true);

/* — Helpers existentes — */
function setInfoDisabled($out, disabled = true) {
  if (!$out || !$out.length) return;
  $out.toggleClass('is-disabled', disabled)
      .attr('aria-hidden', disabled ? 'true' : 'false');
}
function normalizeUnitStatus(status) {
  return String(status || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
}
function shouldHideUnitContent(status) {
  const est = normalizeUnitStatus(status);
  return est === 'reservado' || est === 'vendido';
}
function clearMobileUnitExtra() {
  const container = document.getElementById('mobile-unit-extra');
  if (container) container.innerHTML = '';
}
function uid(prefix='id') {
  return `${prefix}-${Math.random().toString(36).slice(2,9)}`;
}

  /* ──────────────────────────────
    Availability map (Image-Mapster)
  ──────────────────────────────── */
const AVAILABILITY_DATA_CACHE = new Map();

function normalizeAvailabilityData(payload) {
  if (!payload || typeof payload !== 'object') return {};

  if (Array.isArray(payload)) {
    const pairs = payload
      .filter(Boolean)
      .map((v) => [String(v.id || v.numero_ud || '').toLowerCase(), v])
      .filter(([k]) => !!k);
    return Object.fromEntries(pairs);
  }

  return payload;
}

function loadAvailabilityData(jsonURL) {
  const key = String(jsonURL || '').trim();
  if (!key) return Promise.reject(new Error('Missing availability JSON URL'));

  if (AVAILABILITY_DATA_CACHE.has(key)) {
    return AVAILABILITY_DATA_CACHE.get(key);
  }

  const isDefaultAvailabilityJson = /\/availability-data\.json(?:[?#].*)?$/i.test(key);
  const fetchDirect = () => fetch(key, { cache: 'force-cache' }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
  const source = isDefaultAvailabilityJson && window.__WH_AVAILABILITY_DATA_PROMISE
    ? Promise.resolve(window.__WH_AVAILABILITY_DATA_PROMISE).catch(fetchDirect)
    : fetchDirect();

  const promise = Promise.resolve(source).then(normalizeAvailabilityData);
  AVAILABILITY_DATA_CACHE.set(key, promise);
  return promise;
}

  window.initAvailabilityMap = function initAvailabilityMap () {
    // 1) Librerías disponibles
    if (!window.jQuery || !$.fn.mapster) {
      console.warn('[Map] jQuery/Mapster no disponible todavía');
      return;
    }

    // 2) Elementos necesarios (solo exigimos la imagen)
    const $img = $('#avail-img');
    const $section = $('.section_1--availability'); // opcional
    const $out = $('#info-text');

    console.debug('[Map] initAvailabilityMap → img:', $img.length, 'section:', $section.length);

    if (!$img.length) {
      console.warn('[Map] #avail-img no encontrado (no puedo iniciar)');
      return;
    }

    // evita doble inicialización
    if ($img.data('mapstered')) {
      console.log('[Map] ya estaba inicializado');
      return;
    }

    // 3) Dónde está el JSON (lee de section o de la propia img)
    const jsonURL = ($section.length ? $section.data('json') : null) || $img.data('json');
    if (!jsonURL) {
      console.error('[Map] Falta data-json en <section> o en la <img>');
      return;
    }

    // 4) Neutraliza href por si el parcial trae alguno
    $('map[name="avail-map"] area').attr('href', '#');

    // 5) Carga de datos y arranque
    loadAvailabilityData(jsonURL)
      .then((viviendas) => {
        window.VIVIENDAS = viviendas;

        const order    = orderKeysFromMap();
        const mqMobile = window.matchMedia('(max-width: 768px)');

        // 1) Construye la ruleta SIN autoselección
        buildRuleta(viviendas, { autoselectOnInit: false });

        // 2) Panel deshabilitado de inicio (ninguna unidad seleccionada)
        setInfoDisabled($('#info-text'), true);

        // 3) Inicia Mapster SIN initialKey (no marca A1 ni ninguna)
        iniciarMapster(viviendas, null, { paintInfoOnConfigured: !mqMobile.matches });

        // 4) Cambio de breakpoint: no autoseleccionar nunca
        if (mqMobile.addEventListener) {
          mqMobile.addEventListener('change', (e) => {
            if (e.matches) {
              // Entrando a móvil → ocultamos panel y limpiamos estado visual de cards
              const $info = $('#info-text');
              $info.empty();
              setInfoDisabled($info, true);
              clearMobileUnitExtra();
              $('#ruleta-track .ruleta-card').removeClass('is-active');
            } else {
              // Volviendo a desktop → si hay card activa reaplicamos la selección
              const $active = $('#ruleta-track .ruleta-card.is-active');
              if ($active.length) {
                const key  = String($active.data('key')).toLowerCase();
                selectUnidad(key, { source: 'breakpoint' });
              } else {
                const $info = $('#info-text');
                $info.empty();
                setInfoDisabled($info, true);
              }
            }
          });
        }
      })
      .catch((err) => console.error('[Map] No se pudo leer', jsonURL, err));

    function iniciarMapster (viviendas, initialKey = null, opts = {}) {

      console.log('[Map] Viviendas cargadas:', viviendas);

      const base   = '2F4F4F';
      const border = '2F4F4F';
      const RED    = 'B63E3E';  // vendido / no disponible
      const YELLOW = 'FFC300';  // reservado

      // helper para comparar estados de forma robusta
      const norm = s => String(s || '').toLowerCase().replace(/[_-]+/g,' ').trim();

      const vendidos = [];
      const areaOpts = Object.keys(viviendas).map(key => {
        const v = viviendas[key];
        if (!v) return { key };

        const est = norm(v.estado);

        // === VENDIDO → rojo y clicable (sin mostrar contenido en panel) ===
        if (est === 'vendido') {
          vendidos.push(key);
          return {
            key, isSelectable:true, staticState:true, selected:true,
            render_highlight:{ fillColor:RED, fillOpacity:0.55, stroke:true, strokeColor:RED, strokeWidth:3 },
            render_select   :{ fillColor:RED, fillOpacity:0.55, stroke:true, strokeColor:RED, strokeWidth:3 }
          };
        }

        // === NO DISPONIBLE → MISMO COLOR QUE VENDIDO (rojo) PERO CLICABLE ===
        if (est === 'no disponible') {
          return {
            key,
            render_highlight:{ fillColor:RED, fillOpacity:0.55, stroke:true, strokeColor:RED, strokeWidth:3 },
            render_select   :{ fillColor:RED, fillOpacity:0.45, stroke:true, strokeColor:RED, strokeWidth:3 }
          };
        }

        // === RESERVADO → amarillo y clicable ===
        if (est === 'reservado') {
          return {
            key,
            selected: true,
            render_highlight:{ fillColor:YELLOW, fillOpacity:0.55, stroke:true, strokeColor:YELLOW, strokeWidth:3 },
            render_select   :{ fillColor:YELLOW, fillOpacity:0.45, stroke:true, strokeColor:YELLOW, strokeWidth:3 }
          };
        }

        // === DISPONIBLE / otros ===
        return {
          key,
          render_highlight:{ fillColor:base, fillOpacity:0.55, stroke:true, strokeColor:base, strokeWidth:3 },
          render_select   :{ fillColor:base, fillOpacity:0.35, stroke:true, strokeColor:base, strokeWidth:3 }
        };
      });

      $img.mapster({
        wrapClass      : 'plan-wrapper',
        mapKey         : 'data-key',
        singleSelect   : false,
        clickNavigate  : false,
        scaleMap       : true,
        areas          : areaOpts,

        render_select    : { fillColor: base, fillOpacity: 0.60, stroke:true, strokeColor: border, strokeWidth:3 },
        render_highlight : { fillColor: base, fillOpacity: 0.25, stroke:true, strokeColor: border, strokeWidth:3 },

        onMouseout: function(){
          if(_selectedKey){
            requestAnimationFrame(() => $img.mapster('set', true, _selectedKey));
          }
        },

        onClick: function(area, e){
          if (e && e.preventDefault) e.preventDefault();
          const key = String(area.key).toLowerCase();
          const v = viviendas[key];
          if (!v) return false;

          // 👇 Centraliza selección + pintado (evita dobles)
          selectUnidad(key, { source:'mapster' });
          return false;
        },

        onConfigured: function() {

          _mapReady = true;

          const reapplySelected = () => {
            if (_selectedKey) {
              if (_prevKey && _prevKey !== _selectedKey) {
                $img.mapster('set', false, _prevKey);
              }
              $img.mapster('set', true, _selectedKey);
              _prevKey = _selectedKey;
            }
          };

          const ajustar = () => {
            const natural = $img[0].naturalWidth || 3000;
            const parentW = $img.parent().width();
            const targetW = Math.min(parentW, natural);
            $img.mapster('resize', targetW, 0, 0);
            requestAnimationFrame(reapplySelected);
          };
          ajustar();
          $(window).on('resize', ajustar);

          if (initialKey) {
            selectUnidad(initialKey, { source: 'init' });
          }

          if (_pendingSelection) {
            selectUnidad(_pendingSelection, { source: 'pending' });
            _pendingSelection = null;
          }
        }

      });

      $img.data('mapstered', true);
      console.log('[Map] Mapster inicializado');
    }

    // Pon esto arriba, cerca de otras constantes
    const ASSET_BASE = '/whitehills/new-whitehills/';

    // Convierte "assets/loquesea.mp4" -> "/whitehills/new-whitehills/assets/loquesea.mp4"
    // Deja intactas las URLs absolutas (http/https o que ya empiecen por "/")
    function resolveAsset(u) {
      if (!u) return '';
      if (/^https?:\/\//i.test(u) || u.startsWith('/')) return u;
      return ASSET_BASE + u.replace(/^\.?\//,'');
    }

    function autoplayUnitVideo() {
      const v = document.querySelector('#info-text .video-el');
      if (!v) return;

      // Pausa otros vídeos
      document.querySelectorAll('video').forEach(el => { if (el !== v) { try{ el.pause(); }catch{} } });

      // Intenta reproducir con sonido; si el navegador bloquea, vuelve a intentar en mute
      const start = () => {
        const p = v.play();
        if (p && typeof p.then === 'function') {
          p.catch(() => {           // Safari/iOS u otros bloqueos
            v.muted = true;
            v.play().catch(()=>{});
          });
        }
      };

      // iOS: asegúrate de inline
      v.setAttribute('playsinline','');
      v.playsInline = true;

      if (v.readyState >= 2) start();
      else v.addEventListener('canplay', start, { once:true });
    }

    // Idioma actual (i18next → <html lang> → 'es-ES')
    const getLang = () =>
      (window.i18next?.language || document.documentElement.lang || 'es-ES')
        .replace('_','-');

    /* Convierte strings: "1.074.600€", "1,074,600.50", "1.074.600,50", " - €"... */
    function toNumber(v){
      if (typeof v === 'number') return v;
      const s = String(v ?? '').trim();
      if (!/\d/.test(s)) return NaN;

      // Deja solo dígitos, puntos y comas (y posible -)
      const clean = s.replace(/[^\d.,-]/g, '');
      const hasDot   = clean.includes('.');
      const hasComma = clean.includes(',');

      // Caso con dos separadores: el último es decimal; el resto miles
      if (hasDot && hasComma){
        const lastSep = Math.max(clean.lastIndexOf('.'), clean.lastIndexOf(','));
        const intPart = clean.slice(0, lastSep).replace(/[.,]/g, '');
        const decPart = clean.slice(lastSep + 1).replace(/[^\d]/g, '');
        return Number(intPart + (decPart ? '.' + decPart : ''));
      }

      // Solo comas o solo puntos
      const sep = hasComma ? ',' : (hasDot ? '.' : '');
      if (!sep) return Number(clean.replace(/[^\d-]/g, ''));

      const parts = clean.split(sep);
      const last  = parts[parts.length - 1];

      // Si el último bloque tiene exactamente 3 dígitos -> probablemente miles
      if (last.length === 3 && parts.length > 1){
        return Number(clean.replace(new RegExp('\\' + sep, 'g'), ''));
      }
      // Si no, interpretamos el separador como decimal
      return Number(parts.join('.'));
    }

    function formatEUR(v, lang = getLang()){
      const n = toNumber(v);
      if (!Number.isFinite(n) || n <= 0) return '';
      const loc = lang.startsWith('en') ? 'en-GB' :
                  lang.startsWith('es') ? 'es-ES' : lang;
      return new Intl.NumberFormat(loc, {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(n);
    }

    function toKey(s) {
      return String(s || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    }

    function getPhaseKey(d) {
      const raw = d?.fase ?? d?.phase ?? '';
      const k = toKey(raw);
      if (k === 'phase_1' || k === 'fase_1') return 'fase_1';
      if (k === 'phase_2' || k === 'fase_2') return 'fase_2';
      return '';
    }

    function getPhaseLabel(phaseKey) {
      if (phaseKey === 'fase_1') return 'Fase 1';
      if (phaseKey === 'fase_2') return 'Fase 2';
      return '';
    }


    function mostrarInfo(viviendas, key, $out) {
      const d = viviendas[key];
      if (!d || !$out?.length) return;

      const norm  = s => String(s || '').toLowerCase().replace(/[_-]+/g,' ').trim();
      const asKey = s => String(s || '').toLowerCase().trim().replace(/[\s-]+/g, '_');

      const estNorm   = norm(d.estado);
      const estadoKey = asKey(d.estado);
      const phaseKey  = getPhaseKey(d);
      const phaseText = getPhaseLabel(phaseKey);
      const phaseCls  = phaseKey ? ` phase-pill--${phaseKey.endsWith('2') ? '2' : '1'}` : '';

      /* ===============================
        SIN CONTENIDO (reservado / vendido)
      =============================== */
      if (shouldHideUnitContent(estNorm)) {
        $out.empty();
        setInfoDisabled($out, true);
        return;
      }

      /* ===============================
        VISTA MÍNIMA (no disponible)
      =============================== */
      if (estNorm === 'no disponible') {
        $out.html(`
          <div class="wh-info">
            <div class="info-card info-card--wide">
              <div class="info-card-head">
                <h3>
                  ${d.numero_ud || key}
                  ${phaseKey ? `
                    <span class="phase-pill${phaseCls}"
                          data-i18n="unit.phase.${phaseKey}">
                      ${phaseText}
                    </span>` : ``}
                  <span class="badge badge-${estadoKey}"
                        data-i18n="unit.status.${estadoKey}">
                    ${d.estado || ''}
                  </span>
                </h3>
              </div>
            </div>
          </div>
        `);

        // 🔤 Traducción correcta
        if (window.i18next?.isInitialized) {
          $out[0].querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = i18next.t(el.dataset.i18n, {
              defaultValue: el.textContent.trim()
            });
          });
        }

        setInfoDisabled($out, false);
        return;
      }

      /* ===============================
        VISTA COMPLETA (disponible)
      =============================== */
      const webURL = d.plano_pdf_web || d.plano_pdf || '';
      const pdfId  = uid('pdf-preview');

      const priceFmt  = formatEUR(d.coste_sin_iva);
      const priceHTML = priceFmt
        ? `<div class="precio"><strong>${priceFmt}</strong></div>`
        : '';

      const guessBase = typeof window.UNIT_VIDEO_BASE === 'string'
        ? window.UNIT_VIDEO_BASE.replace(/\/+$/, '')
        : '';

      const guessed  = guessBase
        ? `${guessBase}/${asKey(d.numero_ud || key)}.mp4`
        : '';

      const videoURL = resolveAsset(d.video_url || d.video || guessed || '');
      const hasVideo = !!videoURL;

      const mediaH =
        window.matchMedia('(min-width: 1200px)').matches ? 560 :
        window.matchMedia('(min-width: 992px)').matches  ? 520 :
        window.matchMedia('(min-width: 768px)').matches  ? 460 :
        window.matchMedia('(min-width: 600px)').matches  ? 380 : 280;

      $out.html(`
        <div class="wh-info">
          <div class="info-card info-card--wide">

            <!-- CABECERA -->
            <div class="info-card-head">
              <h3>
                ${d.numero_ud}
                ${phaseKey ? `
                  <span class="phase-pill${phaseCls}"
                        data-i18n="unit.phase.${phaseKey}">
                    ${phaseText}
                  </span>` : ``}
                <span class="badge badge-${estadoKey}"
                      data-i18n="unit.status.${estadoKey}">
                  ${d.estado || ''}
                </span>
              </h3>
            </div>

            <!-- DATOS -->
            <div class="info-card-grid">
              <div class="info-card-col col-only">
                <ul class="list-unstyled info-list--compact">
                  <li><span data-i18n="unit.info.plot_m2">Parcela (m²)</span> <strong>${d.plot_m2 ?? '-'}</strong></li>
                  <li><span data-i18n="unit.info.built_area">Superficie construida (m²)</span> <strong>${d.built_area ?? '-'}</strong></li>
                  <li><span data-i18n="unit.info.covered_terraces">Terrazas (m²)</span> <strong>${d.covered_terraces ?? '-'}</strong></li>
                  <li><span data-i18n="unit.info.garden">Jardín</span> <strong>${d.garden ?? '-'}</strong></li>
                </ul>
                ${priceHTML}
              </div>
            </div>

            <!-- MEDIOS -->
            <div class="unit-media" style="--media-h:${mediaH}px;">
              <div class="media-col">
                <div class="pdf-box" id="${pdfId}"></div>
              </div>

              ${hasVideo ? `
              <div class="media-col">
                <div class="video-frame">
                  <video class="video-el" id="${pdfId}-vid"
                        controls preload="metadata" playsinline
                        ${d.video_poster ? `poster="${d.video_poster}"` : ''}>
                    <source src="${videoURL}" type="video/mp4">
                    <span data-i18n="unit.media.video_not_supported">
                      Your browser does not support HTML5 video.
                    </span>
                  </video>
                </div>
              </div>` : ''}
            </div>

            <!-- CTA -->
            <div class="visit-actions">
              <button type="button" class="btn-visit" data-unit="${d.numero_ud || key}">
                <span data-i18n="unit.cta.schedule_visit">Agendar visita</span>
              </button>
            </div>

          </div>
        </div>
      `);

      /* 🔤 Traducción correcta POST-render */
      if (window.i18next?.isInitialized) {
        $out[0].querySelectorAll('[data-i18n]').forEach(el => {
          el.textContent = i18next.t(el.dataset.i18n, {
            defaultValue: el.textContent.trim()
          });
        });
      }

      setInfoDisabled($out, false);

      /* PDF */
      if (webURL) {
        renderPdfGallery(webURL, $out.find('#' + pdfId), {
          initialPage: 1,
          maxHeight: mediaH,
          zoom: 0.95
        });
      }

      /* Vídeo */
      if (hasVideo) {
        const v = document.getElementById(`${pdfId}-vid`);
        if (v && !v.currentSrc) v.load();
      }

      /* CTA */
      $out.off('click', '.btn-visit').on('click', '.btn-visit', function (e) {
        e.preventDefault();
        if (typeof openModal === 'function') openModal();
      });
    }


    function mostrarInfoMobile(viviendas, key) {
      const d = viviendas[key];
      if (!d) return;

      const videoURL = resolveAsset(d.video_url || '');
      const containerId = 'mobile-unit-extra';

      // Si no hay vídeo → limpia y sal
      if (!videoURL) {
        const c = document.getElementById(containerId);
        if (c) c.innerHTML = '';
        return;
      }

      const html = `
        <div class="mobile-unit-info">
          <div class="mobile-video">
            <video class="video-el" controls playsinline preload="metadata">
              <source src="${videoURL}" type="video/mp4">
              <span data-i18n="unit.media.video_not_supported">
                Your browser does not support HTML5 video.
              </span>
            </video>
          </div>
        </div>
      `;

      // Insertar DEBAJO de la ruleta
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document
          .getElementById('ruleta-track')
          ?.insertAdjacentElement('afterend', container);
      }

      container.innerHTML = html;

      // ✅ TRADUCCIÓN CORRECTA (tu sistema real)
      if (window.i18next?.isInitialized) {
        container
          .querySelectorAll('[data-i18n]')
          .forEach(el => {
            el.textContent = i18next.t(el.dataset.i18n, {
              defaultValue: el.textContent.trim()
            });
          });
      }

      // Autoplay seguro en móvil
      setTimeout(() => autoplayUnitVideo(), 200);
    }

    /* === Utilidades ========================================================= */
    function orderKeysFromMap(){
      // Ordena las cards igual que las áreas del <map> (evita problemas de orden)
      return $('map[name="avail-map"] area').map((i,el)=>$(el).data('key')).get();
    }

    /* Helper: URL del plano (prioriza web -> pdf -> print) */
    function getPlanoURL(d) {
      // Cubrimos todas las variantes que has usado en el proyecto
      return d.plano_pdf_web || d.plano_pdf || d.plano_pdf_print || d.pdf || '';
    }

    function buildRuleta(viviendas, { autoselectOnInit = true } = {}) {
      const norm  = s => String(s || '').toLowerCase().replace(/[_-]+/g,' ').trim();
      const asKey = s => String(s || '').toLowerCase().trim().replace(/[\s-]+/g, '_');

      const order  = orderKeysFromMap(); // 🔥 keys EXACTAS del <map>
      const $track = $('#ruleta-track');
      $track.empty();

      /* ===============================
        CONSTRUCCIÓN DE CARDS
      =============================== */
      order.forEach(key => {
        const d = viviendas[key]; // 🔥 SIN tocar la key
        if (!d) {
          console.warn('[RUETA] Vivienda no encontrada en JSON:', key);
          return;
        }

        const estNorm   = norm(d.estado);
        const estadoKey = asKey(d.estado);
        const phaseKey  = getPhaseKey(d);
        const phaseText = getPhaseLabel(phaseKey);
        const phaseCls  = phaseKey ? ` phase-pill--${phaseKey.endsWith('2') ? '2' : '1'}` : '';

        const pdfURL = typeof getPlanoURL === 'function'
          ? getPlanoURL(d)
          : (d.plano_pdf_web || d.plano_pdf || d.plano_pdf_print || '');
        const canShowPlan = estNorm === 'disponible';

        const priceText = typeof formatEUR === 'function'
          ? formatEUR(d.coste_sin_iva)
          : (d.coste_sin_iva ? String(d.coste_sin_iva) : '');

        /* ===============================
          CARD NORMAL (Disponible/Vendido)
        =============================== */
        $track.append(`
          <article class="ruleta-card ruleta-card--wide p-3"
                  data-key="${key}"
                  data-state="${estadoKey}">

            <header class="ruleta-card__head d-flex justify-content-between align-items-center mb-3">
              <div class="ruleta-card__head-left">
                <h4 class="ruleta-card__title m-0">${d.numero_ud || key}</h4>
                ${phaseKey ? `
                  <span class="phase-pill${phaseCls}"
                        data-i18n="unit.phase.${phaseKey}">
                    ${phaseText}
                  </span>` : ``}
              </div>
              <span class="badge badge-${estadoKey}"
                    data-i18n="unit.status.${estadoKey}">
                ${d.estado || ''}
              </span>
            </header>

            <div class="ruleta-card__body">
              <ul class="ruleta-card__list list-unstyled mb-3" style="font-size: 0.9em;">
                <li class="d-flex justify-content-between mb-1">
                  <span data-i18n="unit.info.plot_m2"></span> <strong>${d.plot_m2 ?? '-'}</strong>
                </li>
                <li class="d-flex justify-content-between mb-1">
                  <span data-i18n="unit.info.built_area"></span> <strong>${d.built_area ?? '-'}</strong>
                </li>
                <li class="d-flex justify-content-between mb-1">
                  <span data-i18n="unit.info.covered_terraces"></span> <strong>${d.covered_terraces ?? '-'}</strong>
                </li>
                <li class="d-flex justify-content-between mb-1">
                  <span data-i18n="unit.info.garden"></span> <strong>${d.garden ?? '-'}</strong>
                </li>
              </ul>

              <div class="ruleta-card__bottom d-flex flex-column gap-2 mt-auto">
                <div class="d-flex justify-content-between align-items-end">
                  ${
                    priceText
                      ? `<div class="precio mb-0" style="font-size: 1.4rem;"><strong>${priceText}</strong></div>`
                      : `<div class="precio mb-0" style="font-size: 1.4rem;"><strong><span data-i18n="unit.price.na"></span></strong></div>`
                  }
                </div>

                ${
                  canShowPlan && pdfURL
                    ? `<a href="${pdfURL}" target="_blank" rel="noopener"
                         class="btn btn-sm btn-dark w-100 d-flex align-items-center justify-content-center gap-2"
                         style="border-radius: 50px; font-weight: 600;">
                         <i class="fa-regular fa-file-pdf"></i>
                         <span data-i18n="unit.actions.view_plan">Obtener plano</span>
                       </a>`
                    : ``
                }
              </div>
            </div>
          </article>
        `);
      });

      /* ===============================
        TRADUCCIÓN (UNA SOLA VEZ)
      =============================== */
      if (window.i18next?.isInitialized) {
        $track[0].querySelectorAll('[data-i18n]').forEach(el => {
          el.textContent = i18next.t(el.dataset.i18n, {
            defaultValue: el.textContent.trim()
          });
        });
      }

      /* ===============================
        INTERACCIÓN / SELECCIÓN
      =============================== */
      let activeIndex = 0;

      function activateByIndex(i, { scroll = true, source = 'ruleta' } = {}) {
        const $cards = $track.find('.ruleta-card');
        const $card  = $cards.eq(i);
        if (!$card.length) return;

        const key = $card.data('key'); // 🔥 KEY REAL
        const d   = viviendas[key];
        if (!d) return;

        activeIndex = i;
        $cards.removeClass('is-active');
        $card.addClass('is-active');

        // 🔥 AQUÍ YA FUNCIONA mostrarInfo / mostrarInfoMobile
        selectUnidad(key, { source });

        if (scroll) {
          $card[0].scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest'
          });
        }
      }

      $track
        .off('click', '.ruleta-card')
        .on('click', '.ruleta-card', function () {
          activateByIndex($(this).index(), { source: 'ruleta' });
        });

      /* ===============================
        SELECCIÓN INICIAL
      =============================== */
      if (autoselectOnInit) {
        const firstIdx = order.findIndex(k => {
          const v = viviendas[k];
          const s = v ? norm(v.estado) : '';
          return v && s !== 'reservado' && s !== 'vendido' && s !== 'no disponible';
        });
        activateByIndex(Math.max(firstIdx, 0), { scroll: false });
      }
    }

    let _prevKey = null;
    let _selectedKey = null;
    let _pendingSelection = null;
    let _mapReady = false;
    

    function scrollInfoIntoView() {
      const el = document.getElementById('info-text');
      if (!el) return;

      const header = document.querySelector('header');
      const offset = (header?.offsetHeight || 0) + 16; // margen bajo cabecera
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;

      // ¿Está suficientemente visible? (al menos mitad)
      const halfVisible = (r.top >= offset && r.top <= vh*0.5) || (r.bottom <= vh && r.bottom >= vh*0.5);
      if (halfVisible) return;

      const y = window.scrollY + r.top - offset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }

    function selectUnidad(rawKey, { source } = {}) {
      const key = String(rawKey).toLowerCase();
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const $img = $('#avail-img');
      const viviendas = window.VIVIENDAS || window.viviendas || {};
      const unidad = viviendas[key];
      if (!unidad) return;
      const hideContent = shouldHideUnitContent(unidad.estado);

      // 1) Card activa en la ruleta
      const $cards = $('#ruleta-track .ruleta-card');
      if ($cards.length) {
        $cards.removeClass('is-active')
              .filter('[data-key="'+ key +'"]').addClass('is-active');
      }

      // 2) Selección en Mapster (persistente)
      if (_mapReady) {
        if (_prevKey && _prevKey !== key) {
          const prev = viviendas[_prevKey];
          const prevEst = normalizeUnitStatus(prev?.estado);
          // 👇 Si la anterior era "reservado", la dejamos pintada en amarillo
          if (prevEst !== 'reservado') {
            $img.mapster('set', false, _prevKey);
          }
        }
        $img.mapster('set', true, key);         // pinta la nueva
        _prevKey = key;
        _selectedKey = key;                     // <- recordamos cuál está seleccionada
        requestAnimationFrame(() => {
          if (_selectedKey === key) $img.mapster('set', true, key);
        })
      } else {
        _pendingSelection = key;                // la aplicamos cuando esté configurado
      }

      // 3) Panel: solo desktop
      if (!isMobile) {
        const $out = $('#info-text');
        clearMobileUnitExtra();
        if (hideContent) {
          $out.empty();
          setInfoDisabled($out, true);
          return;
        }

        mostrarInfo(viviendas, key, $out);
        setInfoDisabled($out, false);
        autoplayUnitVideo();
        scrollInfoIntoView();
      } else {
        if (hideContent) {
          clearMobileUnitExtra();
          return;
        }
        mostrarInfoMobile(viviendas, key);
      }
    }

    /* === Inicialización ===================================================== */
    
  };

  // fallback: si la página cargó y el parcial ya está, intenta iniciar
  window.addEventListener('load', () => {
    window.initAvailabilityMap && window.initAvailabilityMap();
  });


  function animatePrice(selector, finalValue, duration, startValue = 0) {
    const el = document.querySelector(selector);
    const start = performance.now();
    const delta = finalValue - startValue;

    const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const current = startValue + delta * p;
      el.textContent = fmt.format(Math.round(current));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Requiere pdfjsLib ya cargado (PDF.js)
function renderPdfGallery(url, $container, opts = {}) {
  const initialPage = Number(opts.initialPage || 1);
  const zoom        = Number(opts.zoom || 1);      // 1 = ancho del contenedor; <1 más pequeño; >1 más grande
  const maxHeight   = Number(opts.maxHeight || 0); // 0 = sin límite de alto

  // Estructura del carrusel
  $container.html(`
    <div class="pdf-carousel" role="region" aria-label="Previsualización de plano">
      <button class="pdf-nav prev btn btn-outline-secondary btn-sm rounded-circle" aria-label="Página anterior" type="button">‹</button>
      <div class="pdf-canvas-wrap">
        <canvas class="pdf-canvas"></canvas>
      </div>
      <button class="pdf-nav next btn btn-outline-secondary btn-sm rounded-circle" aria-label="Página siguiente" type="button">›</button>
    </div>
    <div class="pdf-dots" aria-label="Paginador"></div>
  `);

  const $wrap   = $container.find('.pdf-carousel');
  const $canvas = $wrap.find('.pdf-canvas');
  const ctx     = $canvas.get(0).getContext('2d');
  const $prev   = $wrap.find('.prev');
  const $next   = $wrap.find('.next');
  const $dots   = $container.find('.pdf-dots');

  let pdfDoc = null;
  let pageNum = initialPage;

  // Abre el PDF completo al hacer clic
  $canvas.on('click', () => window.open(url, '_blank', 'noopener'));

  // Render: encaja al ancho disponible y NO supera maxHeight
  const renderPage = (num) => {
    pdfDoc.getPage(num).then(page => {
      const dpr = window.devicePixelRatio || 1;

      // ancho CSS disponible dentro del carrusel (restando padding)
      const wrapEl   = $wrap.get(0);
      const styles   = getComputedStyle(wrapEl);
      const padLeft  = parseFloat(styles.paddingLeft)  || 0;
      const padRight = parseFloat(styles.paddingRight) || 0;
      const availW   = Math.max(320, wrapEl.clientWidth - padLeft - padRight);

      // escalas por ancho y por alto máximo
      const vp1      = page.getViewport({ scale: 1 });
      const byWidth  = availW / vp1.width;
      const byHeight = maxHeight ? (maxHeight / vp1.height) : Infinity;

      // escala final: respeta el más restrictivo (y aplica zoom)
      const cssScale = Math.min(byWidth, byHeight) * zoom;

      // viewport en píxeles (para el canvas) y tamaño CSS en HiDPI
      const vpPx  = page.getViewport({ scale: cssScale * dpr });
      const cssW  = Math.round(vpPx.width  / dpr);
      const cssH  = Math.round(vpPx.height / dpr);

      $canvas.attr({ width: Math.round(vpPx.width), height: Math.round(vpPx.height) });
      $canvas.css({ width: cssW + 'px', height: cssH + 'px', cursor: 'pointer' });

      page.render({ canvasContext: ctx, viewport: vpPx }).promise.then(() => updateDots(num));
    });
  };

  const updateDots = (active) => {
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pdf-dot' + (i === active ? ' active' : '');
      b.setAttribute('aria-label', `Ir a la página ${i}`);
      b.addEventListener('click', () => { pageNum = i; renderPage(pageNum); });
      frag.appendChild(b);
    }
    $dots.empty().get(0).appendChild(frag);
    $prev.prop('disabled', active <= 1);
    $next.prop('disabled', active >= pdfDoc.numPages);
  };

  $prev.on('click', () => { if (pageNum > 1) { pageNum--; renderPage(pageNum); } });
  $next.on('click', () => { if (pageNum < pdfDoc.numPages) { pageNum++; renderPage(pageNum); } });

  // Carga del documento + fallback
  const safeURL = encodeURI(url);
  pdfjsLib.getDocument({ url: safeURL }).promise
    .then(pdf => {
      pdfDoc = pdf;
      pageNum = Math.min(Math.max(1, initialPage), pdfDoc.numPages);
      window.addEventListener('resize', () => renderPage(pageNum));
      renderPage(pageNum);
    })
    .catch(err => {
      console.error('[PDF] Error pdf.js, fallback:', err);
      const viewer = 'https://mozilla.github.io/pdf.js/web/viewer.html?file=' + encodeURIComponent(url) + '#zoom=page-fit';
      $container.html(`<iframe src="${viewer}" width="100%" height="720" style="border:0" loading="lazy"></iframe>`);
    });
}

/*════════ PROMO: lista + contador al hacer scroll ═════════════════=*/

// ---- 1. Config de los ítems --------------------------------------
const PROMO_ITEMS = [
  { key: 'units',     icon: 'casa-residencial.svg'   },
  { key: 'beds',      icon: 'cama.svg', extra: 'icon-dorm' },
  { key: 'mins',      icon: 'vacaciones.svg',      extra: 'icon-plano' },
  { key: 'sunnydays', icon: 'sol.svg'     }
];

const ICON_BASE = '/images/iconos/';

// ---- 2. Construye la lista (con “0” inicial) ---------------------
function buildPromoList() {
  const box = document.getElementById('promoStats');
  if (!box) return;

  // Evita duplicados si ya se construyó
  if (box.querySelector('ul')) return;

  // O, si prefieres, forzar estado limpio:
  // box.innerHTML = '';

  const ul = document.createElement('ul');

  PROMO_ITEMS.forEach(({ key, icon, extra = '' }) => {
    ul.insertAdjacentHTML('beforeend', `
      <li class="promo-pair" data-key="${key}">
        <img src="${ICON_BASE}${icon}" class="promo-icon ${extra}" alt="">
        <span id="${key}-count" class="promo-count">0</span>
        <span class="promo-label"></span>
      </li>
    `);
  });

  box.appendChild(ul);
}

  // ---- 3. Contador robusto ----------------------------------------
  function animateCount(selector, finalValue, duration = 800) {
    const el = document.querySelector(selector);
    if (!el || !Number.isFinite(finalValue)) return;

    const start = performance.now();
    const fmt   = new Intl.NumberFormat('es-ES');

    const tick = now => {
      const p = Math.min(1, (now - start) / duration);
      el.textContent = fmt.format(Math.round(finalValue * p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---- 4. Traduce label + anima valor ------------------------------
  function initPromoCounters() {
    PROMO_ITEMS.forEach(({ key }) => {
      const data = i18next.t(`home.promo.${key}`, { returnObjects: true });
      if (!data || typeof data !== 'object') return;

      document.querySelector(`.promo-pair[data-key="${key}"] .promo-label`)
              .textContent = data.label;

      const n = Number(String(data.value).replace(/[^\d.-]/g, ''));
      if (Number.isFinite(n)) animateCount(`#${key}-count`, n, 800);
    });
  }

  // ---- 5. IO: sólo dispara la animación ----------------------------
  function observePromoCounters() {
    const section = document.getElementById('promoStats');
    if (!section) return;

    const io = new IntersectionObserver((entries, obs) => {
      const first = entries[0];
      if (first.isIntersecting) {
        console.log('🟢 promo visible: %', (first.intersectionRatio * 100).toFixed(1));
        initPromoCounters();     // traduce + anima
        obs.disconnect();        // sólo una vez
      }
    }, {
      threshold: 0.10            // ← 10 % del elemento visible
      // Si prefieres la otra fórmula:
      // threshold: 0,
      // rootMargin: '0px 0px -90% 0px'
    });

    io.observe(section);
  }

let __promoStarted = false;

document.addEventListener('DOMContentLoaded', () => {
  const startPromo = () => {
    if (__promoStarted) return;          // evita dobles arranques
    __promoStarted = true;
    buildPromoList();
    observePromoCounters();
  };

  if (window.i18next?.isInitialized) {
    // i18next ya listo
    startPromo();
  } else if (window.i18next?.on) {
    // Espera a que i18next termine de inicializarse
    const handler = () => {
      startPromo();
      // limpiamos el listener para no dejarlo colgado
      if (typeof i18next.off === 'function') {
        i18next.off('initialized', handler);
      }
    };
    i18next.on('initialized', handler);
  } else {
    // Si i18next no existe, arranca igualmente
    startPromo();
  }
});


(() => {
  const hero = document.querySelector('.section_1.parallax-bg');
  if (!hero) return;

  // Desactiva si el usuario prefiere menos movimiento o si es táctil
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (prefersReduced || isTouch) return;

  let rafId = null;
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  const INTENSITY = 20;   // px máximos de desplazamiento desde el centro
  const SMOOTH = 0.12;    // 0–1 (mayor = sigue más rápido)

  function onMove(e){
    const rect = hero.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;

    // -0.5 .. 0.5 aprox (según distancia al centro)
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;

    targetX = dx * INTENSITY;
    targetY = dy * INTENSITY;

    if (!rafId) rafId = requestAnimationFrame(update);
  }

  function update(){
    // Interpolación suave (lerp)
    currentX += (targetX - currentX) * SMOOTH;
    currentY += (targetY - currentY) * SMOOTH;

    hero.style.backgroundPosition = `calc(50% + ${currentX}px) calc(50% + ${currentY}px)`;

    if (Math.abs(currentX - targetX) > 0.1 || Math.abs(currentY - targetY) > 0.1) {
      rafId = requestAnimationFrame(update);
    } else {
      rafId = null;
    }
  }

  // Solo trackea el mouse cuando está sobre el hero (mejor perf)
  hero.addEventListener('mousemove', onMove, { passive: true });
  hero.addEventListener('mouseleave', () => {
    targetX = targetY = 0;        // vuelve al centro
    if (!rafId) rafId = requestAnimationFrame(update);
  });
})();

// === Selector de idioma: delega siempre en window.setLang (i18n.js) ===
document.addEventListener('DOMContentLoaded', () => {
  // Dropdown personalizado: <button data-lang="es|en">
  document.querySelectorAll('.lang-menu [data-lang]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const lng = (btn.dataset.lang || 'es').toLowerCase();
      if (typeof window.setLang === 'function') window.setLang(lng);
      else location.href = (lng === 'en') ? '/en/home' : '/es/inicio';
    });
  });

  // Fallback <select id="langSwitcher">
  const sel = document.getElementById('langSwitcher');
  if (sel) {
    sel.addEventListener('change', (e) => {
      const lng = (e.target.value || 'es').toLowerCase();
      if (typeof window.setLang === 'function') window.setLang(lng);
      else location.href = (lng === 'en') ? '/en/home' : '/es/inicio';
    });
  }
});


// ─────────────────────────────────────────────────────────────
// i18n: carga diccionarios, función translateIn y ganchos globales
// ─────────────────────────────────────────────────────────────
/*
// Ajusta estas rutas a donde tienes tus JSON
const I18N_FILES = {
  es: 'langs/es.json',
  en: 'langs/en.json'
};

// Traduce todos los elementos dentro de un contenedor (por defecto, documento entero)
function translateIn(root = document) {
  if (!window.i18next) return;

  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = i18next.t(key, { defaultValue: el.textContent?.trim() || '' });
    if (/_html$/.test(key)) el.innerHTML = val;
    else el.textContent = val;
  });
}

// Utilidad pública por si otros módulos la invocan (ya la llamas en modales)
window.applyI18nAndRoutes = function applyI18nAndRoutes(root = document) {
  translateIn(root);
  // Si tienes otras piezas que dependan del idioma, lánzalas aquí también:
  if (typeof refreshPromoCounters === 'function') refreshPromoCounters();
};

// Carga de recursos + init
async function initI18n() {
  const stored = (localStorage.getItem('i18n_lang') || document.documentElement.lang || 'es').toLowerCase();
  const want = (stored === 'en' ? 'en' : 'es');

  // Cargar los JSON de ambos idiomas (cache-first del navegador)
  const [esJson, enJson] = await Promise.all([
    fetch(I18N_FILES.es).then(r => r.json()),
    fetch(I18N_FILES.en).then(r => r.json())
  ]);

  await i18next.init({
    lng: want,
    fallbackLng: 'es',
    resources: {
      es: { translation: esJson },
      en: { translation: enJson }
    }
  });

  // Pinta inicialmente
  document.documentElement.setAttribute('lang', want);
  window.applyI18nAndRoutes(document);
}

// Cuando i18next cambie de idioma -> repintamos
if (window.i18next) {
  i18next.on('languageChanged', () => {
    // Actualiza atributo lang en <html>
    const cur = (i18next.language || 'es').slice(0,2).toLowerCase();
    document.documentElement.setAttribute('lang', cur === 'en' ? 'en' : 'es');

    // Re-traducir todo y refrescar contadores/otros módulos
    window.applyI18nAndRoutes(document);
  });
}

// Inicia i18n al cargar
document.addEventListener('DOMContentLoaded', () => {
  initI18n().catch(err => console.error('[i18n] init error:', err));
});


// ─────────────────────────────────────────────────────────────
// 6) Refresco al cambiar de idioma (i18next / evento propio)
// ─────────────────────────────────────────────────────────────

// A) actualiza labels y re-anima valores desde el i18n actual
function refreshPromoCounters() {
  const box = document.getElementById('promoStats');
  if (!box) return;

  // si aún no existe la lista (p. ej. navegación SPA), créala
  if (!box.querySelector('ul')) buildPromoList();

  // 1) reset visual: poner todos a "0"
  PROMO_ITEMS.forEach(({ key }) => {
    const countEl = document.getElementById(`${key}-count`);
    if (countEl) countEl.textContent = '0';
  });

  // 2) traducir labels + re-animar valores del idioma actual
  initPromoCounters();
}

// B) pequeño debounce por si disparan varios eventos seguidos
let _langRefreshTimer = null;
function onLanguageChangedDebounced() {
  clearTimeout(_langRefreshTimer);
  _langRefreshTimer = setTimeout(refreshPromoCounters, 50);
}

// C) engancha eventos de cambio de idioma
//    (i) evento nativo de i18next
if (window.i18next && typeof i18next.on === 'function') {
  i18next.on('languageChanged', onLanguageChangedDebounced);
}
//    (ii) si en tu app disparas un evento custom (p. ej. setLang → window.dispatchEvent(new Event('i18n:changed')))
window.addEventListener('i18n:changed', onLanguageChangedDebounced);
*/
function applyI18nToContainer(root) {
  if (!root || !window.i18next?.isInitialized) return;

  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = i18next.t(el.dataset.i18n, {
      defaultValue: el.textContent.trim()
    });
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = i18next.t(el.dataset.i18nPlaceholder);
  });
}


window.translateDynamic = function translateDynamic(root) {
  if (!window.i18next || !i18next.isInitialized) return;

  root
    .querySelectorAll('[data-i18n]')
    .forEach(el => {
      const key = el.dataset.i18n;
      const val = i18next.t(key, { defaultValue: el.textContent });
      el.textContent = val;
    });
};

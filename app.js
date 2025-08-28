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
   3. Pop‑up  (formulario → Google Sheets)
──────────────────────────────── */

/* Configuración */
const TIME_DELAY = 19_000;     // 19 s

/* Referencias DOM (pueden NO existir en algunas páginas) */
const modal        = document.getElementById('infoModal');
const overlay      = document.getElementById('modalOverlay');
const btnClose     = document.getElementById('modalClose');
const leadForm     = document.getElementById('leadForm');

const thankModal   = document.getElementById('thankModal');
const thankOverlay = document.getElementById('thankOverlay');
const thankClose   = document.getElementById('thankClose');
const thankOk      = document.getElementById('thankOk');
const CANVAS_SIZE = 1024;

/* Helper ─ añade listener sólo si el nodo existe */
const on = (el, evt, fn) => el && el.addEventListener(evt, fn);

/* Helpers pop‑up */
const openModal  = () => modal      && modal.classList.add('show');
const closeModal = () => modal      && modal.classList.remove('show');
const openThank  = () => thankModal && thankModal.classList.add('show');
const closeThank = () => thankModal && thankModal.classList.remove('show');

/* Cerrar modales */
on(btnClose   , 'click', closeModal);
on(overlay    , 'click', closeModal);
on(thankClose , 'click', closeThank);
on(thankOk    , 'click', closeThank);
on(thankOverlay,'click', closeThank);

/* Apertura automática SOLO por tiempo */
if (modal) {
  setTimeout(openModal, TIME_DELAY);
}

/* ==== Envío a Google Sheets para TODOS los formularios data‑lead ==== */
document.querySelectorAll('form[data-lead]').forEach(form => {
  form.addEventListener('submit', async e => {
    e.preventDefault();

    /* ➊ Recogemos campos + honeypot ---------------------------------- */
    const fd = new FormData(form);

    /* Honeypot: si el campo invisible “website” NO está vacío ⇒ bot */
    if (fd.get('website')?.trim()) {           // 👈
      console.warn('[Spam‑bot] envío bloqueado'); // 👈
      return;                                  // 👈  abortamos envío
    }
    fd.delete('website');                      // 👈  ya no lo necesitamos

    const data = Object.fromEntries(fd.entries());

    /* ➋ Fuente de la solicitud (para la hoja) */
    data.origin = form.dataset.origin || 'Formulario Web';

    try {
      /* cierra pop‑up o muestra gracias, si existen */
      if (typeof closeModal === 'function') closeModal();
      if (typeof openThank  === 'function') openThank();

      /* ➌ Envío sin CORS a Google Sheets */
      await fetch(
        'https://script.google.com/macros/s/AKfycbxlBgB28gJM1LyutP76PLlsJy9dWhuZTgwFwT3fYZrEH4CBZu0UQ8peW3hkz8Nnsukjqw/exec',
        { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) }
      );

      form.reset();          // limpia el formulario
    } catch (err) {
      console.error(err);
      alert('Ups, no se pudo enviar. Inténtalo de nuevo.');
    }
  });
});

// — Helpers para (des)habilitar la info-card —
function setInfoDisabled($out, disabled = true) {
  if (!$out || !$out.length) return;
  $out.toggleClass('is-disabled', disabled)
      .attr('aria-hidden', disabled ? 'true' : 'false');
}

// ID único para contenedores (evita colisiones)
function uid(prefix='id') {
  return `${prefix}-${Math.random().toString(36).slice(2,9)}`;
}


  /* ──────────────────────────────
    Availability map (Image-Mapster)
  ──────────────────────────────── */
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
    $.getJSON(jsonURL)
      .done((list) => {
        const viviendas = Array.isArray(list)
          ? Object.fromEntries(list.map(v => [String(v.id).toLowerCase(), v]))
          : list;

        window.VIVIENDAS = viviendas;

        const order = orderKeysFromMap();
        const firstSelectable = (() => {
          for (const k of order) {
            const v = viviendas[k];
            if (v && v.estado !== 'vendido') return k;
          }
          return order[0] || Object.keys(viviendas)[0];
        })();

        const mqMobile = window.matchMedia('(max-width: 768px)');

        // 1) SIEMPRE construimos la ruleta
        buildRuleta(viviendas, { autoselectOnInit: false });

        // 2) En móvil: marcamos card inicial y seleccionamos EN EL MAPA
        if (mqMobile.matches) {
          if (firstSelectable) {
            $('#ruleta-track .ruleta-card[data-key="' + firstSelectable + '"]').addClass('is-active');
            // 👇 Importante: también selecciona esa vivienda en Mapster
            selectUnidad(firstSelectable, { source: 'ruleta' });
          }
          setInfoDisabled($('#info-text'), true);
        } else {
          setInfoDisabled($('#info-text'), true);
        }

        // 3) Iniciamos Mapster (en desktop pinta info al terminar)
        iniciarMapster(viviendas, firstSelectable, { paintInfoOnConfigured: !mqMobile.matches });

        // (Opcional) si cambia el tamaño y entra/sale de móvil
        if (mqMobile.addEventListener) {
          mqMobile.addEventListener('change', (e) => {
            if (e.matches) {
              setInfoDisabled($('#info-text'), true);
              const $active = $('#ruleta-track .ruleta-card.is-active');
              if (!$active.length) {
                const $first = $('#ruleta-track .ruleta-card').first();
                if ($first.length) $first.addClass('is-active');
              }
            } else {
              const key = $('#ruleta-track .ruleta-card.is-active').data('key') || firstSelectable;
              if (key) {
                const $out = $('#info-text');
                if (typeof mostrarInfo === 'function') {
                  if (mostrarInfo.length >= 3) { mostrarInfo(viviendas, key, $out); }
                  else { mostrarInfo(key); }
                }
                setInfoDisabled($out, false);
              }
            }
          });
        }
      })
      .fail(() => console.error('[Map] No se pudo leer', jsonURL));

    function iniciarMapster (viviendas, initialKey = null, opts = {}) {

      console.log('[Map] Viviendas cargadas:', viviendas);

      const base   = '2F4F4F';
      const border = '2F4F4F';

      const vendidos = [];
      const areaOpts = Object.keys(viviendas).map(key => {
        const v = viviendas[key];
        if (!v) return { key };

        if (v.estado === 'vendido') {
          vendidos.push(key);
          return {
            key, isSelectable:false, staticState:true, selected:true,
            render_highlight:{ fillColor:'B63E3E', fillOpacity:0.55, stroke:true, strokeColor:'B63E3E', strokeWidth:3 },
            render_select   :{ fillColor:'B63E3E', fillOpacity:0.55, stroke:true, strokeColor:'B63E3E', strokeWidth:3 }
          };
        }
        if (v.estado === 'reservado') {
          return {
            key,
            render_highlight:{ fillColor:'FFC300', fillOpacity:0.55, stroke:true, strokeColor:'FFC300', strokeWidth:3 },
            render_select   :{ fillColor:'FFC300', fillOpacity:0.45, stroke:true, strokeColor:'FFC300', strokeWidth:3 }
          };
        }
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
          if (!v || v.estado === 'vendido') return false;

          // 👇 Centraliza selección + pintado (evita dobles)
          selectUnidad(key, { source:'mapster' });
          return false;
        },

        onConfigured: function() {

          _mapReady = true;

          const reapplySelected = () => {
            if (_selectedKey) {
              // por si acaso, limpia la anterior que tuviéramos guardada
              if (_prevKey && _prevKey !== _selectedKey) {
                $img.mapster('set', false, _prevKey);
              }
              $img.mapster('set', true, _selectedKey); // <- vuelve a marcarla
              _prevKey = _selectedKey;
            }
          };

          const ajustar = () => {
            const natural = $img[0].naturalWidth || 3000;
            const parentW = $img.parent().width();
            const targetW = Math.min(parentW, natural);
            $img.mapster('resize', targetW, 0, 0);
            // importante: reaplicar selección tras el resize
            requestAnimationFrame(reapplySelected);
          };
          ajustar();
          $(window).on('resize', ajustar);

          // Selección inicial correctamente (pasa por selectUnidad)
          if (initialKey) {
            selectUnidad(initialKey, { source: 'init' });
          }

          // Si hubo una selección antes de que Mapster estuviera listo
          if (_pendingSelection) {
            selectUnidad(_pendingSelection, { source: 'pending' });
            _pendingSelection = null;
          }
        }

      });

      // marca como inicializado
      $img.data('mapstered', true);
      console.log('[Map] Mapster inicializado');
    }

    function mostrarInfo(viviendas, key, $out) {
      const d = viviendas[key];
      if (!d) { 
        $out.html('<p>Sin datos.</p>'); 
        return; 
      }

      // URLs: prioriza web/print si existen; cae a plano_pdf
      const webURL   = d.plano_pdf_web   || d.plano_pdf || '';
      const printURL = d.plano_pdf_print || webURL;

      // ID único para el contenedor de la galería
      const pdfId = uid('pdf-preview');

      $out.html(`
        <div class="info-card-col col-left">
          <h3>${d.numero_ud}
            <span class="badge badge-${d.estado}">${d.estado}</span>
          </h3>
          <ul class="list-unstyled info-list">
            <li>m2c SR (PB + P1): <strong>${d.m2c_sr}</strong></li>
            <li>m2c BR (Sótano): <strong>${d.m2c_br}</strong></li>
            <li>Castillete: <strong>${d.castillete}</strong></li>
            <li>Terrazas cubiertas: <strong>${d.terrazas_cubiertas}</strong></li>
            <li>Pérgola: <strong>${d.pergola}</strong></li>
          </ul>
        </div>

        <div class="info-card-col col-right">
          <ul class="list-unstyled info-list">
            <li>Terrazas descubiertas: <strong>${d.terrazas_descubiertas}</strong></li>
            <li>m2 villa SIN castillete: <strong>${d.terrazas_m2villa_sin_castillete}</strong></li>
            <li>m2 villa CON castillete: <strong>${d.terrazas_m2villa_con_castillete}</strong></li>
            <li>Parcela: <strong>${d.parcela}</strong></li>
            <li>Jardín: <strong>${d.jardin}</strong></li>
          </ul>
          <div class="precio"><strong>${d.coste_sin_iva || ''}</strong></div>

          ${printURL ? `
          <div class="pdf-actions" style="margin-top:.5rem">
          </div>` : ``}
        </div>

        <!-- Galería PDF -->
        <div class="pdf-preview" id="${pdfId}"></div>
      `);

      // Activa la tarjeta
      setInfoDisabled($out, false);

      // Render de la vista previa
      if (webURL) {
        const $pdf = $out.find('#' + pdfId);

        // Altura máxima responsive (ajústalo a tu gusto)
        const maxH =
          window.matchMedia('(min-width:1200px)').matches ? 560 :
          window.matchMedia('(min-width:768px)').matches  ? 500 : 420;

        renderPdfGallery(webURL, $pdf, {
          initialPage: 1,
          maxHeight : maxH, // tope de altura del canvas
          zoom      : 0.95  // 1 ocupa todo el ancho; <1 un poco más pequeño
        });
      } else {
        console.warn('[PDF] La vivienda no tiene URL de plano:', key);
      }
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
      const order  = orderKeysFromMap();
      const $track = $('#ruleta-track');
      $track.empty();

      // 1) Pintar cards completas (2 columnas + precio + botón)
      order.forEach(key => {
        const d = viviendas[key];
        if (!d) return;

        const pdfURL = d.plano_pdf_web || d.plano_pdf || d.plano_pdf_print || '';

        const html = `
          <article class="ruleta-card ruleta-card--wide" role="listitem" data-key="${key}">
            <header class="ruleta-card__head d-flex align-items-center justify-content-between">
              <h4 class="ruleta-card__title m-0">${d.numero_ud || key}</h4>
              <span class="badge badge-${d.estado}">${d.estado}</span>
            </header>

            <div class="ruleta-card__body">
              <div class="ruleta-card__cols">
                <ul class="ruleta-card__list">
                  <li>m2c SR (PB + P1): <strong>${d.m2c_sr ?? '-'}</strong></li>
                  <li>m2c BR (Sótano): <strong>${d.m2c_br ?? '-'}</strong></li>
                  <li>Castillete: <strong>${d.castillete ?? '-'}</strong></li>
                  <li>Terrazas cubiertas: <strong>${d.terrazas_cubiertas ?? '-'}</strong></li>
                  <li>Pérgola: <strong>${d.pergola ?? '-'}</strong></li>
                </ul>
                <ul class="ruleta-card__list">
                  <li>Terrazas descubiertas: <strong>${d.terrazas_descubiertas ?? '-'}</strong></li>
                  <li>m2 villa SIN castillete: <strong>${d.terrazas_m2villa_sin_castillete ?? '-'}</strong></li>
                  <li>m2 villa CON castillete: <strong>${d.terrazas_m2villa_con_castillete ?? '-'}</strong></li>
                  <li>Parcela: <strong>${d.parcela ?? '-'}</strong></li>
                  <li>Jardín: <strong>${d.jardin ?? '-'}</strong></li>
                </ul>
              </div>

              <div class="ruleta-card__price precio mt-2">
                <strong>${d.coste_sin_iva ? d.coste_sin_iva : 'No disponible €'}</strong>
              </div>
            </div>

            <div class="ruleta-card__foot mt-2">
              ${pdfURL ? `
                <a class="btn-ver-plano" href="${pdfURL}" target="_blank" rel="noopener">
                  Ver plano
                </a>
              ` : ``}
            </div>
          </article>`;
        $track.append(html);
      });

      let activeIndex = 0;

      function updateArrows() {
        // flechas ocultas por CSS, esta función puede quedarse vacía
      }

      function activateByIndex(i, { scroll = true, source = 'ruleta' } = {}) {
        const $cards = $track.find('.ruleta-card');
        const $card  = $cards.eq(i);
        if (!$card.length) return;

        activeIndex = i;
        $cards.removeClass('is-active');
        $card.addClass('is-active');

        const key = String($card.data('key')).toLowerCase();
        selectUnidad(key, { source });

        if (scroll) {
          $card.get(0).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
        updateArrows();
      }

      // Click en card
      $track.off('click', '.ruleta-card').on('click', '.ruleta-card', function () {
        activateByIndex($(this).index(), { source: 'ruleta' });
      });

      // Activación al terminar el scroll (card más centrada)
      let scrollTO = null;
      $track.off('scroll').on('scroll', function() {
        clearTimeout(scrollTO);
        scrollTO = setTimeout(() => {
          const $cards = $track.find('.ruleta-card');
          const trackRect = $track[0].getBoundingClientRect();
          const centerX = trackRect.left + trackRect.width / 2;

          let best = -1, bestDist = Infinity;
          $cards.each(function(i) {
            const r = this.getBoundingClientRect();
            const c = r.left + r.width / 2;
            const d = Math.abs(c - centerX);
            if (d < bestDist) { bestDist = d; best = i; }
          });

          if (best >= 0 && best !== activeIndex) {
            activateByIndex(best, { scroll: false, source: 'ruleta' });
          }
        }, 120);
      });

      // Estado inicial
      if (autoselectOnInit) {
        let firstIdx = 0;
        for (let i = 0; i < order.length; i++) {
          const v = viviendas[order[i]];
          if (v && v.estado !== 'vendido') { firstIdx = i; break; }
        }
        activateByIndex(firstIdx, { scroll: false, source: 'ruleta' });
      } else {
        updateArrows();
      }
    }

    let _prevKey = null;
    let _selectedKey = null;
    let _pendingSelection = null;
    let _mapReady = false;

    function selectUnidad(rawKey, { source } = {}) {
      const key = String(rawKey).toLowerCase();
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const $img = $('#avail-img');

      // 1) Card activa en la ruleta
      const $cards = $('#ruleta-track .ruleta-card');
      if ($cards.length) {
        $cards.removeClass('is-active')
              .filter('[data-key="'+ key +'"]').addClass('is-active');
      }

      // 2) Selección en Mapster (persistente)
      if (_mapReady) {
        if (_prevKey && _prevKey !== key) {
          $img.mapster('set', false, _prevKey); // quita la anterior
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
        try {
          if (typeof mostrarInfo === 'function') {
            if (mostrarInfo.length >= 3) {
              mostrarInfo(window.VIVIENDAS || window.viviendas, key, $out);
            } else {
              mostrarInfo(key);
            }
          }
          setInfoDisabled($out, false);
        } catch(e) { console.warn('mostrarInfo error:', e); }
      } else {
        setInfoDisabled($('#info-text'), true);
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
  { key: 'units',     icon: 'edificio.webp'   },
  { key: 'parking',   icon: 'parking.webp'    },
  { key: 'beds',      icon: 'dormitorio.webp', extra: 'icon-dorm' },
  { key: 'plot',      icon: 'plano.png',      extra: 'icon-plano' },
  { key: 'sunnydays', icon: 'tiempo.webp'     }
];

// ---- 2. Construye la lista (con “0” inicial) ---------------------
function buildPromoList() {
  const box = document.getElementById('promoStats');
  if (!box) return;

  const ul = document.createElement('ul');

  PROMO_ITEMS.forEach(({ key, icon, extra = '' }) => {
    ul.insertAdjacentHTML('beforeend', `
      <li class="promo-pair" data-key="${key}">
        <img src="/images/iconos/${icon}" class="promo-icon ${extra}" alt="">
        <span id="${key}-count" class="promo-count">0</span>
        <span class="promo-label"></span>
        
      </li>`);
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
      threshold: 0.10            // ← 10 % del elemento visible
      // Si prefieres la otra fórmula:
      // threshold: 0,
      // rootMargin: '0px 0px -90% 0px'
    });

    io.observe(section);
  }

  /* ---------- Orquestación de la promo ---------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const startPromo = () => {
    buildPromoList();        // crea el <ul> con los “0”
    observePromoCounters();  // espera al 10 % de visibilidad y anima
  };

  if (i18next.isInitialized) {
    startPromo();            // i18next ya estaba listo
  } else {
    i18next.on('initialized', startPromo); // se ejecutará cuando acabe
  }
});

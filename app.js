/* ──────────────────────────────
   0. Header: cambia color + logo
──────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  const header  = document.querySelector('header');
  const logoImg = document.querySelector('.logo img');       // <img> real
  const hero    = document.querySelector('.section_1');      // sección-foto

  if (!header || !logoImg || !hero) return;                  // seguridad

  /* rutas de tus dos logos */
  const WHITE_LOGO = './images/logo-blanco.png';
  const GREEN_LOGO = './images/logo.png';

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
   3. Pop-up (formulario → Google Sheets)
   ─ Solo abre al hacer clic en “Agendar visita”
──────────────────────────────── */

const $id = (x) => document.getElementById(x);

/* Helpers pop-up: buscan el nodo cada vez (robusto si inyectas partials) */
window.openModal  = () => { const m = $id('infoModal');  if (m) m.classList.add('show'); };
window.closeModal = () => { const m = $id('infoModal');  if (m) m.classList.remove('show'); };
window.openThank  = () => { const m = $id('thankModal'); if (m) m.classList.add('show'); };
window.closeThank = () => { const m = $id('thankModal'); if (m) m.classList.remove('show'); };

/* Cierre del modal por overlay / botón X (delegación, funciona siempre) */
document.addEventListener('click', (e) => {
  const id = e.target.id;
  if (id === 'modalOverlay' || id === 'modalClose')            closeModal();
  if (id === 'thankOverlay' || id === 'thankClose' || id === 'thankOk') closeThank();
});

/* ▶️ Abrir pop-up al pulsar “Agendar visita” (botón con clase .btn-visit) */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-visit');
  if (!btn) return;

  e.preventDefault();
  const unit = btn.getAttribute('data-unit') || '';

  // Pre-rellena la unidad y el origen en el formulario del modal
  const form = $id('leadForm');
  if (form) {
    let u = form.querySelector('[name="unidad"]');
    if (!u) { u = document.createElement('input'); u.type = 'hidden'; u.name = 'unidad'; form.appendChild(u); }
    u.value = unit;

    let origin = form.querySelector('[name="origin"]') || form.querySelector('[name="origen"]');
    if (!origin) { origin = document.createElement('input'); origin.type = 'hidden'; origin.name = 'origin'; form.appendChild(origin); }
    origin.value = 'Agendar visita – Web';
  }

  openModal();
});

/* ==== Envío a Google Sheets para TODOS los formularios data-lead ==== */
/* Delegado: también funciona si el <form> se inyecta después */
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (!form.matches('form[data-lead]')) return;

  e.preventDefault();

  // Honeypot
  const fd = new FormData(form);
  if (fd.get('website')?.trim()) {
    console.warn('[Spam-bot] envío bloqueado');
    return;
  }
  fd.delete('website');

  const data = Object.fromEntries(fd.entries());
  data.origin = form.dataset.origin || 'Formulario Web';

  try {
    closeModal();
    openThank();

    await fetch(
      'https://script.google.com/macros/s/AKfycbxlBgB28gJM1LyutP76PLlsJy9dWhuZTgwFwT3fYZrEH4CBZu0UQ8peW3hkz8Nnsukjqw/exec',
      { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) }
    );

    form.reset();
  } catch (err) {
    console.error(err);
    alert('Ups, no se pudo enviar. Inténtalo de nuevo.');
  }
}, true);

// — Helpers existentes (si los usas en otros sitios) —
function setInfoDisabled($out, disabled = true) {
  if (!$out || !$out.length) return;
  $out.toggleClass('is-disabled', disabled)
      .attr('aria-hidden', disabled ? 'true' : 'false');
}
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
      const _t = (k, dv = '') => (window.i18next ? i18next.t(k, { defaultValue: dv }) : (dv || k));

      if (!d) {
        $out.html('<p data-i18n="unit.info.empty">Sin datos.</p>');
        if (typeof translateIn === 'function') translateIn($out[0]);
        else {
          // Fallback de traducción local
          $out.find('[data-i18n]').each(function () {
            const k = this.getAttribute('data-i18n');
            const val = _t(k, this.textContent);
            if (/_html$/.test(k)) this.innerHTML = val; else this.textContent = val;
          });
        }
        return;
      }

      // URLs para el visor PDF
      const webURL   = d.plano_pdf_web || d.plano_pdf || '';
      const printURL = d.plano_pdf_print || webURL;

      const pdfId = uid('pdf-preview');
      const estadoClass = String(d.estado || '').toLowerCase().trim().replace(/\s+/g, '-');

      // Precio: conserva tu misma lógica (solo se muestra si hay coste_sin_iva)
      const priceHTML = d.coste_sin_iva
        ? `<div class="precio"><strong>${d.coste_sin_iva}</strong></div>`
        : '';

      $out.html(`
        <!-- CABECERA A TODA ANCHURA -->
        <div class="info-card-head">
          <h3>
            ${d.numero_ud}
            <span class="badge badge-${estadoClass}" data-i18n="unit.status.${estadoClass}">${d.estado || ''}</span>
          </h3>
        </div>

        <!-- COLUMNA IZQUIERDA -->
        <div class="info-card-col col-left">
          <ul class="list-unstyled info-list">
            <li><span data-i18n="unit.info.m2c_sr">m2c SR (PB + P1)</span> <strong>${d.m2c_sr ?? '-'}</strong></li>
            <li><span data-i18n="unit.info.m2c_br">m2c BR (Sótano)</span> <strong>${d.m2c_br ?? '-'}</strong></li>
            <li><span data-i18n="unit.info.castillete">Castillete</span> <strong>${d.castillete ?? '-'}</strong></li>
            <li><span data-i18n="unit.info.terrazas_cubiertas">Terrazas cubiertas</span> <strong>${d.terrazas_cubiertas ?? '-'}</strong></li>
            <li><span data-i18n="unit.info.pergola">Pérgola</span> <strong>${d.pergola ?? '-'}</strong></li>
          </ul>
        </div>

        <!-- COLUMNA DERECHA -->
        <div class="info-card-col col-right">
          <ul class="list-unstyled info-list">
            <li><span data-i18n="unit.info.terrazas_descubiertas">Terrazas descubiertas</span> <strong>${d.terrazas_descubiertas ?? '-'}</strong></li>
            <li><span data-i18n="unit.info.m2villa_sin_castillete"></span> <strong>${d.terrazas_m2villa_sin_castillete ?? '-'}</strong></li>
            <li><span data-i18n="unit.info.m2villa_con_castillete"></span> <strong>${d.terrazas_m2villa_con_castillete ?? '-'}</strong></li>
            <li><span data-i18n="unit.info.parcela">Parcela</span> <strong>${d.parcela ?? '-'}</strong></li>
            <li><span data-i18n="unit.info.jardin">Jardín</span> <strong>${d.jardin ?? '-'}</strong></li>
          </ul>
          ${priceHTML}
          ${printURL ? `<div class="pdf-actions" style="margin-top:.5rem"></div>` : ``}
        </div>

        <!-- PDF debajo de las 2 columnas -->
        <div class="pdf-preview" id="${pdfId}"></div>

        <!-- CTA AGENDAR VISITA (debajo del PDF) -->
        <div class="visit-actions">
          <button type="button" class="btn-visit" data-unit="${d.numero_ud || key}">
            <span data-i18n="unit.cta.schedule_visit">Agendar visita</span>
          </button>
        </div>
      `);

      // Traducir el bloque recién insertado
      if (typeof translateIn === 'function') {
        translateIn($out[0]);
      } else {
        // Fallback si no tienes helper translateIn
        $out.find('[data-i18n]').each(function () {
          const k = this.getAttribute('data-i18n');
          const val = _t(k, this.textContent);
          if (/_html$/.test(k)) this.innerHTML = val; else this.textContent = val;
        });
      }

      // Activa la tarjeta
      setInfoDisabled($out, false);

      // Render PDF
      if (webURL) {
        const $pdf = $out.find('#' + pdfId);
        const maxH =
          window.matchMedia('(min-width:1200px)').matches ? 560 :
          window.matchMedia('(min-width:768px)').matches  ? 500 : 420;

        renderPdfGallery(webURL, $pdf, { initialPage: 1, maxHeight: maxH, zoom: 0.95 });
      } else {
        console.warn('[PDF] La vivienda no tiene URL de plano:', key);
      }

      // Click en "Agendar visita" → abre el pop-up y pre-rellena unidad
      $out.off('click', '.btn-visit').on('click', '.btn-visit', function (e) {
        e.preventDefault();
        const unit = this.getAttribute('data-unit') || key;

        // Rellena el formulario del modal con la unidad (si existe)
        try {
          if (window.leadForm) {
            let inp = leadForm.querySelector('[name="unidad"]');
            if (!inp) {
              inp = document.createElement('input');
              inp.type = 'hidden';
              inp.name = 'unidad';
              leadForm.appendChild(inp);
            }
            inp.value = unit;

            // (opcional) origen
            let org = leadForm.querySelector('[name="origin"]') || leadForm.querySelector('[name="origen"]');
            if (!org) {
              org = document.createElement('input');
              org.type = 'hidden';
              org.name = 'origin';
              leadForm.appendChild(org);
            }
            org.value = _t('unit.cta.origin_schedule', 'Agendar visita – Web');
          }
        } catch (err) {
          console.warn('No pude pre-rellenar la unidad en el leadForm:', err);
        }

        // Abre el modal con tu helper existente
        if (typeof openModal === 'function') openModal();
        else {
          const m = document.getElementById('infoModal');
          if (m) m.classList.add('show');
        }
      });
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
      const _t = (k, dv = '') => (window.i18next ? i18next.t(k, { defaultValue: dv }) : (dv || k));

      const order  = orderKeysFromMap();
      const $track = $('#ruleta-track');
      $track.empty();

      // 1) Pintar cards completas (2 columnas + precio + botón)
      order.forEach(key => {
        const d = viviendas[key];
        if (!d) return;

        const pdfURL = (typeof getPlanoURL === 'function')
          ? getPlanoURL(d)
          : (d.plano_pdf_web || d.plano_pdf || d.plano_pdf_print || '');

        const estadoClass = String(d.estado || '').toLowerCase().trim().replace(/\s+/g, '-');

        const html = `
          <article class="ruleta-card ruleta-card--wide" role="listitem" data-key="${key}">
            <header class="ruleta-card__head d-flex align-items-center justify-content-between">
              <h4 class="ruleta-card__title m-0">${d.numero_ud || key}</h4>
              <span class="badge badge-${estadoClass}" data-i18n="unit.status.${estadoClass}">${d.estado || ''}</span>
            </header>

            <div class="ruleta-card__body">
              <div class="ruleta-card__cols">
                <ul class="ruleta-card__list">
                  <li><span data-i18n="unit.info.m2c_sr">m2c SR (PB + P1)</span>: <strong>${d.m2c_sr ?? '-'}</strong></li>
                  <li><span data-i18n="unit.info.m2c_br">m2c BR (Sótano)</span>: <strong>${d.m2c_br ?? '-'}</strong></li>
                  <li><span data-i18n="unit.info.castillete">Castillete</span>: <strong>${d.castillete ?? '-'}</strong></li>
                  <li><span data-i18n="unit.info.terrazas_cubiertas">Terrazas cubiertas</span>: <strong>${d.terrazas_cubiertas ?? '-'}</strong></li>
                  <li><span data-i18n="unit.info.pergola">Pérgola</span>: <strong>${d.pergola ?? '-'}</strong></li>
                </ul>
                <ul class="ruleta-card__list">
                  <li><span data-i18n="unit.info.terrazas_descubiertas">Terrazas descubiertas</span>: <strong>${d.terrazas_descubiertas ?? '-'}</strong></li>
                  <li><span data-i18n="unit.info.m2villa_sin_castillete">m2 villa SIN castillete</span>: <strong>${d.terrazas_m2villa_sin_castillete ?? '-'}</strong></li>
                  <li><span data-i18n="unit.info.m2villa_con_castillete">m2 villa CON castillete</span>: <strong>${d.terrazas_m2villa_con_castillete ?? '-'}</strong></li>
                  <li><span data-i18n="unit.info.parcela">Parcela</span>: <strong>${d.parcela ?? '-'}</strong></li>
                  <li><span data-i18n="unit.info.jardin">Jardín</span>: <strong>${d.jardin ?? '-'}</strong></li>
                </ul>
              </div>

              <div class="ruleta-card__bottom">
                <div class="ruleta-card__price precio">
                  <strong>${d.coste_sin_iva ? d.coste_sin_iva : `<span data-i18n="unit.price.na">No disponible €</span>`}</strong>
                </div>
                ${pdfURL ? `
                  <a class="btn-ver-plano" href="${pdfURL}" target="_blank" rel="noopener">
                    <span data-i18n="unit.actions.view_plan">Ver plano</span>
                  </a>
                ` : ``}
              </div>
            </div>
          </article>`;
        $track.append(html);
      });

      // Traducir el bloque recién creado
      if (typeof translateIn === 'function') {
        translateIn($track[0]);
      } else {
        // Fallback si no tienes helper translateIn
        $track.find('[data-i18n]').each(function () {
          const k = this.getAttribute('data-i18n');
          const val = _t(k, this.textContent);
          if (/_html$/.test(k)) this.innerHTML = val; else this.textContent = val;
        });
      }

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
  { key: 'units',     icon: 'casa-residencial.svg'   },
  { key: 'beds',      icon: 'cama.svg', extra: 'icon-dorm' },
  { key: 'mins',      icon: 'vacaciones.svg',      extra: 'icon-plano' },
  { key: 'sunnydays', icon: 'sol.svg'     }
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
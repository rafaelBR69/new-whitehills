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
   3. Pop-up (formularios → Google Sheets)
   ─ Visita y Brochure con modales separados
──────────────────────────────── */

const $id = (x) => document.getElementById(x);

/* Helper genérico */
function toggleModal(modalEl, show = true) {
  if (!modalEl) return;
  modalEl.classList.toggle('show', show);
  if (show) modalEl.querySelector('.modal__box')?.focus();
}

/* Visit (infoModal) */
window.openVisitModal  = () => toggleModal($id('infoModal'), true);
window.closeVisitModal = () => toggleModal($id('infoModal'), false);

/* Brochure (brochureModal) */
window.openBrochureModal  = () => toggleModal($id('brochureModal'), true);
window.closeBrochureModal = () => toggleModal($id('brochureModal'), false);

/* Gracias (thankModal) */
window.openThank  = () => toggleModal($id('thankModal'), true);
window.closeThank = () => toggleModal($id('thankModal'), false);

/* Alias compatibilidad con código existente */
window.openModal  = () => window.openVisitModal();
window.closeModal = () => window.closeVisitModal();

/* Cierre por overlay o botón X (para cualquier modal) */
document.addEventListener('click', (e) => {
  const isOverlay = e.target.classList?.contains('modal__overlay');
  const closeBtn  = e.target.closest?.('.modal__close');
  if (isOverlay || closeBtn) {
    const modal = (isOverlay ? e.target.closest('.modal') : closeBtn.closest('.modal'));
    modal?.classList.remove('show');
  }
  // ids específicos de "Gracias" (por compatibilidad)
  const id = e.target.id;
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


/* ▶️ Abrir “Obtener brochure” (a.btn-brochure) */
document.addEventListener('click', (e) => {
  const link = e.target.closest('a.btn-brochure');
  if (!link) return;

  e.preventDefault();

  // Pasamos la URL del PDF al hidden del formulario de brochure
  const pdfURL = link.getAttribute('href') || '';
  const form = $id('brochureForm');
  if (form) {
    const hidden = form.querySelector('input[name="download_url"]');
    if (hidden) hidden.value = pdfURL;
  }
  openBrochureModal();
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
  if (!fd.get('name') && fd.get('nombre'))    fd.set('name',    fd.get('nombre'));
  if (!fd.get('phone') && fd.get('telefono')) fd.set('phone',   fd.get('telefono'));
  if (!fd.get('message') && fd.get('mensaje'))fd.set('message', fd.get('mensaje'));

  // Origin por si no viene via data-origin
  if (!fd.get('origin')) {
    fd.set('origin', form.dataset.origin || 'Formulario Web');
  }

  // Tipo de formulario (útil en Sheet)
  if (!fd.get('form_type')) {
    fd.set('form_type',
      form.id === 'visitForm'     ? 'visit' :
      form.id === 'brochureForm'  ? 'brochure' :
      form.id || 'form'
    );
  }

  // RGPD / marketing (si existen)
  const rgpdInput = form.querySelector('[name="rgpd"]');
  const mkInput   = form.querySelector('[name="marketing_ok"]');
  if (rgpdInput) fd.set('rgpd', rgpdInput.checked ? 'Sí' : 'No');
  if (mkInput)   fd.set('marketing_ok', mkInput.checked ? 'Sí' : 'No');

  const data = Object.fromEntries(fd.entries());

  // Para "brochure": abrir PDF automáticamente tras enviar
  const shouldDownload = String(form.dataset.downloadOnSuccess).toLowerCase() === 'true';
  const downloadUrl = data.download_url || form.querySelector('[name="download_url"]')?.value;

  try {
    // Cierra el modal actual (si aplica) y abre “Gracias”
    form.closest('.modal')?.classList.remove('show');
    openThank();

    await fetch(
      'https://script.google.com/macros/s/AKfycbwKiHszSE0B-BIaMAbV6JTShlpzE-rVCxTxJMWJWgLdI6FRbaCL9cPDB8lojN5EhQAgzQ/exec',
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
              setInfoDisabled($('#info-text'), true);
              $('#ruleta-track .ruleta-card').removeClass('is-active');
            } else {
              // Volviendo a desktop → si hay card activa mostramos su info; si no, nada
              const $active = $('#ruleta-track .ruleta-card.is-active');
              if ($active.length) {
                const key  = String($active.data('key')).toLowerCase();
                const $out = $('#info-text');
                if (typeof mostrarInfo === 'function') {
                  if (mostrarInfo.length >= 3) { mostrarInfo(viviendas, key, $out); }
                  else { mostrarInfo(key); }
                }
                setInfoDisabled($out, false);
              } else {
                setInfoDisabled($('#info-text'), true);
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
      const RED    = 'B63E3E';  // vendido / no disponible
      const YELLOW = 'FFC300';  // reservado

      // helper para comparar estados de forma robusta
      const norm = s => String(s || '').toLowerCase().replace(/[_-]+/g,' ').trim();

      const vendidos = [];
      const areaOpts = Object.keys(viviendas).map(key => {
        const v = viviendas[key];
        if (!v) return { key };

        const est = norm(v.estado);

        // === VENDIDO → bloqueado (no clickable), rojo ===
        if (est === 'vendido') {
          vendidos.push(key);
          return {
            key, isSelectable:false, staticState:true, selected:true,
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

          const est = norm(v.estado);
          // ❌ sólo bloqueamos VENDIDO; NO bloqueamos no_disponible ni reservado
          if (est === 'vendido') return false;

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

    function mostrarInfo(viviendas, key, $out) {
      const d = viviendas[key];
      const _t = (k, dv = '') => (window.i18next ? i18next.t(k, { defaultValue: dv }) : (dv || k));
      const norm  = s => String(s || '').toLowerCase().replace(/[_-]+/g,' ').trim();
      const asKey = s => String(s || '').toLowerCase().trim().replace(/[\s-]+/g, '_');

      if (!d) {
        $out.html('<p data-i18n="unit.info.empty">Sin datos.</p>');
        if (typeof translateIn === 'function') translateIn($out[0]);
        else {
          $out.find('[data-i18n]').each(function () {
            const k = this.getAttribute('data-i18n');
            const val = _t(k, this.textContent);
            if (/_html$/.test(k)) this.innerHTML = val; else this.textContent = val;
          });
        }
        return;
      }

      const estNorm   = norm(d.estado);
      const estadoKey = asKey(d.estado);

      // ⛔ Vista mínima para NO DISPONIBLE y RESERVADO (solo badge)
      if (estNorm === 'no disponible' || estNorm === 'reservado') {
        $out.html(`
          <div class="info-card-head">
            <h3>
              ${d.numero_ud || key}
              <span class="badge badge-${estadoKey}" data-i18n="unit.status.${estadoKey}">${d.estado || ''}</span>
            </h3>
          </div>
        `);

        if (typeof translateIn === 'function') translateIn($out[0]);
        else {
          $out.find('[data-i18n]').each(function () {
            const k = this.getAttribute('data-i18n');
            const val = _t(k, this.textContent);
            if (/_html$/.test(k)) this.innerHTML = val; else this.textContent = val;
          });
        }
        setInfoDisabled($out, false);
        return;
      }

      // === Vista completa (disponible/otros) — UNA COLUMNA ===
      const webURL = d.plano_pdf_web || d.plano_pdf || '';
      const pdfId  = uid('pdf-preview');

      const priceHTML = (typeof d.coste_sin_iva === 'string' && /\d/.test(d.coste_sin_iva))
        ? `<div class="precio"><strong>${d.coste_sin_iva}</strong></div>`
        : '';

      $out.html(`
        <!-- CABECERA -->
        <div class="info-card-head">
          <h3>
            ${d.numero_ud}
            <span class="badge badge-${estadoKey}" data-i18n="unit.status.${estadoKey}">${d.estado || ''}</span>
          </h3>
        </div>

        <!-- UNA SOLA COLUMNA -->
        <div class="info-card-grid">
          <div class="info-card-col col-only">
            <ul class="list-unstyled info-list">
              <li><span data-i18n="unit.info.m2c_sr">m2c SR (PB + P1)</span> <strong>${d.m2c_sr ?? '-'}</strong></li>
              <li><span data-i18n="unit.info.m2c_br">m2c BR (Sótano)</span> <strong>${d.m2c_br ?? '-'}</strong></li>
              <li><span data-i18n="unit.info.castillete">Castillete</span> <strong>${d.castillete ?? '-'}</strong></li>
              <li><span data-i18n="unit.info.terrazas_cubiertas">Terrazas cubiertas</span> <strong>${d.terrazas_cubiertas ?? '-'}</strong></li>
              <li><span data-i18n="unit.info.superficie">Superficie</span> <strong>${d.superficie ?? '-'}</strong></li>
            </ul>

            ${priceHTML}
          </div>
        </div>

        <!-- PDF debajo -->
        <div class="pdf-preview" id="${pdfId}"></div>

        <!-- CTA -->
        <div class="visit-actions">
          <button type="button" class="btn-visit" data-unit="${d.numero_ud || key}">
            <span data-i18n="unit.cta.schedule_visit">Agendar visita</span>
          </button>
        </div>
      `);

      // Traducción
      if (typeof translateIn === 'function') translateIn($out[0]);
      else {
        $out.find('[data-i18n]').each(function () {
          const k = this.getAttribute('data-i18n');
          const val = _t(k, this.textContent);
          if (/_html$/.test(k)) this.innerHTML = val; else this.textContent = val;
        });
      }

      setInfoDisabled($out, false);

      // PDF (si hay)
      if (webURL) {
        const $pdf = $out.find('#' + pdfId);
        const maxH =
          window.matchMedia('(min-width:1200px)').matches ? 560 :
          window.matchMedia('(min-width:768px)').matches  ? 500 : 420;

        renderPdfGallery(webURL, $pdf, { initialPage: 1, maxHeight: maxH, zoom: 0.95 });
      } else {
        console.warn('[PDF] La vivienda no tiene URL de plano:', key);
      }

      // CTA
      $out.off('click', '.btn-visit').on('click', '.btn-visit', function (e) {
        e.preventDefault();
        const unit = this.getAttribute('data-unit') || key;

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
          if (v && v.estado !== 'reservado') { firstIdx = i; break; }
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

      // 1) Card activa en la ruleta
      const $cards = $('#ruleta-track .ruleta-card');
      if ($cards.length) {
        $cards.removeClass('is-active')
              .filter('[data-key="'+ key +'"]').addClass('is-active');
      }

      // 2) Selección en Mapster (persistente)
      if (_mapReady) {
        if (_prevKey && _prevKey !== key) {
          const prev = (window.VIVIENDAS || window.viviendas || {})[_prevKey];
          const prevEst = String(prev?.estado || '').toLowerCase().replace(/[_-]+/g,' ').trim();
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
        try {
          if (typeof mostrarInfo === 'function') {
            if (mostrarInfo.length >= 3) {
              mostrarInfo(window.VIVIENDAS || window.viviendas, key, $out);
            } else {
              mostrarInfo(key);
            }
          }
          setInfoDisabled($out, false);
          scrollInfoIntoView();
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

const ICON_BASE = './images/iconos/';

// ---- 2. Construye la lista (con “0” inicial) ---------------------
function buildPromoList() {
  const box = document.getElementById('promoStats');
  if (!box) return;

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

(function () {
  // Dominios de producción donde quieres slugs bonitos
  const PROD_HOSTS = [
    'whitehillsvillas.com',
    'www.whitehillsvillas.com',
    'rafaelbr69.github.io'     // quita/añade los que necesites
  ];
  const IS_PROD = PROD_HOSTS.includes(location.hostname);

  // Mapa slug → archivo .html para desarrollo local
  function slugToHtml(url) {
    try {
      const u = new URL(url, location.origin);
      const path = u.pathname.replace(/\/+$/,''); // sin barra final
      const hash = u.hash || '';

      const map = {
        '/es/inicio':              'index.html',
        '/en/home':                'index.html',
        '/es/proceso-compra':      'proceso.html',
        '/en/process':             'proceso.html',
        '/es/contacto':            'contact.html',
        '/en/contact':             'contact.html',
        '/es/aviso-legal':         'legal-notice.html',
        '/en/legal-notice':        'legal-notice.html',
        '/es/politica-cookies':    'cookies-policy.html',
        '/en/cookie-policy':       'cookies-policy.html',
        '/es/politica-privacidad': 'privacy-policy.html',
        '/en/privacy-policy':      'privacy-policy.html'
      };

      const html = map[path];
      return (html ? html : url) + hash;
    } catch {
      return url;
    }
  }

  // Selector de idioma
  const $select = document.getElementById('langSwitcher');
  const initialLang = (localStorage.getItem('i18n_lang') || 'es').toLowerCase();

  function applyLang(lng) {
    document.querySelectorAll('a[data-href-es]').forEach(a => {
      // slug objetivo según idioma
      const slug = (lng === 'en') ? a.dataset.hrefEn : a.dataset.hrefEs;

      if (IS_PROD) {
        // En producción usamos slugs bonitos
        if (slug) a.setAttribute('href', slug);
      } else {
        // En local dejamos el href (fallback .html). Si faltara, convertimos a .html
        const current = a.getAttribute('href') || '';
        if (!current || /^\/(es|en)\//.test(current)) {
          a.setAttribute('href', slugToHtml(slug));
        }
      }
    });
  }

  applyLang(initialLang);
  if ($select) {
    $select.value = initialLang;
    $select.addEventListener('change', e => {
      const lng = e.target.value.toLowerCase();
      localStorage.setItem('i18n_lang', lng);
      applyLang(lng);
    });
  }

  // Cinturón y tirantes: si en local haces clic en un slug, lo convertimos a .html al vuelo.
  if (!IS_PROD) {
    document.addEventListener('click', (ev) => {
      const a = ev.target.closest('a[data-href-es]');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (/^\/(es|en)\//.test(href)) { // parece slug
        ev.preventDefault();
        const lng = (localStorage.getItem('i18n_lang') || 'es').toLowerCase();
        const slug = (lng === 'en') ? a.dataset.hrefEn : a.dataset.hrefEs;
        location.href = slugToHtml(slug);
      }
    });
  }
})();

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

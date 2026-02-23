# Documentación Técnica del Proyecto New WhiteHills

Este documento proporciona una visión detallada de la arquitectura, estructura y funcionamiento del sitio web "New WhiteHills".

## 1. Introducción

El proyecto es un sitio web estático moderno (Single Page Application feel, aunque multipágina) desarrollado con HTML5, CSS3 y Vanilla JavaScript. Su objetivo es promocionar una promoción inmobiliaria, ofreciendo características avanzadas como:

*   **Internacionalización (i18n):** Soporte completo inglés/español con rutas amigables (`/es/inicio`, `/en/home`).
*   **Mapa de Disponibilidad Interactivo:** Plano visual donde los usuarios pueden ver el estado de cada vivienda en tiempo real.
*   **Galería 3D Optimizada:** Carrusel de imágenes con carga diferida y optimización vía CDN de Supabase.
*   **Captación de Leads:** Formularios integrados con Google Sheets y automatización de envío de PDFs.
*   **PWA Light:** Service Worker para caché de imágenes y mejor rendimiento.

## 2. Estructura del Proyecto

```text
/
├── index.html              # Página de inicio (redirige según idioma)
├── contact.html            # Página de contacto
├── galeria.html            # Página de galería
├── proceso.html            # Página de proceso de compra
├── legal-notice.html       # Páginas legales (Aviso Legal, Privacidad, Cookies)
│
├── app.js                  # Lógica principal de la aplicación (UI, Modales, Mapa, Forms)
├── sw.js                   # Service Worker (Caché de imágenes Supabase)
├── style.css               # Estilos globales principales
├── mediaquaries.css        # Ajustes responsivos
│
├── js/
│   ├── i18n.js             # Motor de internacionalización y enrutamiento
│   ├── galeria.js          # Lógica específica del carrusel/galería 3D
│   └── ...
│
├── langs/
│   ├── es.json             # Textos en Español
│   └── en.json             # Textos en Inglés
│
├── partials/               # Fragmentos HTML reutilizables
│   ├── header.html         # Cabecera
│   ├── footer.html         # Pie de página
│   ├── modals.html         # Ventanas modales (Visita, Brochure, Gracias)
│   └── availability-map.html # Estructura del mapa
│
└── assets/ & images/       # Recursos estáticos (imágenes, vídeos, planos)
```

## 3. Componentes Principales

### 3.1. Internacionalización (`js/i18n.js`)
El sistema utiliza la librería `i18next` para gestionar los idiomas.
*   **Detección:** El idioma se detecta por la URL (p.ej. `/es/`), luego por cookie (`wh_lang`), y finalmente por defecto es Inglés (`en`).
*   **Rutas Semánticas:** Existe un mapeo de rutas para que cada idioma tenga URLs amigables (SEO friendly).
    *   Ejemplo: `home` -> `/es/inicio` o `/en/home`.
*   **Traducción:** Se utiliza el atributo `data-i18n="clave"` en el HTML. El script carga el JSON correspondiente de la carpeta `langs/` y sustituye el texto.
*   **Cambio de Idioma:** Al cambiar el idioma (selector en header/footer), se establece una cookie y se redirige a la URL equivalente en el nuevo idioma.

### 3.2. Mapa de Disponibilidad (`app.js` - `initAvailabilityMap`)
Es la funcionalidad estrella de la home.
*   **Tecnología:** Utiliza `jQuery` y el plugin `ImageMapster` para hacer interactivo un mapa de imagen (`area` tags sobre una imagen).
*   **Datos:** Se cargan desde un JSON (o embebidos) que contiene el estado de cada unidad (`disponible`, `reservado`, `vendido`, `no disponible`).
*   **Interacción:**
    *   **Desktop:** Al pasar el ratón o hacer clic, se muestra un panel lateral con información detallada (precio, m², vídeo, descarga de plano).
    *   **Mobile:** Se muestra una "ruleta" (lista de tarjetas) debajo del mapa. Al seleccionar una vivienda en la ruleta, se muestra su información.
*   **Estados:**
    *   *Vendido/No Disponible:* Se pinta en rojo y no permite interacción profunda.
    *   *Reservado:* Se pinta en amarillo.
    *   *Disponible:* Se puede seleccionar y ver detalles completos.

### 3.3. Formularios y Leads (`app.js`)
El sitio no utiliza un backend tradicional (PHP/Node) para guardar los datos, sino que conecta con **Google Sheets**.
*   **Envío:** Al enviar un formulario (`visitForm`, `brochureForm`, `leadForm`), JavaScript intercepta el evento `submit`.
*   **Google Script:** Los datos se envían vía `fetch` a una URL de Google Apps Script (Macro) que guarda la fila en una hoja de cálculo.
*   **Lógica de Brochure:**
    *   El usuario solicita el brochure.
    *   Se guardan sus datos.
    *   Si el envío es exitoso, se abre/descarga automáticamente el PDF en una nueva pestaña.
    *   Se muestra un modal de "Gracias".
*   **Honeypot:** Incluye un campo oculto (`website`) para evitar spam básico. Si se rellena, el envío se bloquea.

### 3.4. Galería 3D (`js/galeria.js`)
Una galería visualmente rica para mostrar renders.
*   **Fuente:** Las imágenes están alojadas en **Supabase Storage**.
*   **Optimización:** Utiliza la API de transformación de imágenes de Supabase para servir imágenes con el tamaño y formato (WebP/AVIF) adecuado para cada dispositivo, mejorando el rendimiento.
*   **Navegación:** Funciona como un carrusel circular ("ruleta") con efectos de clases CSS (`is-center`, `is-left-1`, etc.) para dar sensación de profundidad.

### 3.5. Service Worker (`sw.js`)
Mejora la velocidad de carga para usuarios recurrentes.
*   **Estrategia:** Cache-first con revalidación en segundo plano (Stale-While-Revalidate).
*   **Scope:** Solo intercepta y cachea las peticiones de imágenes que van al dominio de Supabase (`.supabase.co`).
*   **Fallback:** Si no hay conexión y la imagen no está en caché, devuelve un píxel transparente 1x1.

## 4. Estilos y Diseño
*   **CSS Puro:** No se usa Tailwind ni Bootstrap (salvo algunas clases de utilidad o resets que puedan venir heredados). Todo el diseño es "hand-crafted" en `style.css`.
*   **Parallax:** `app.js` incluye un efecto parallax suave en el ratón para la sección Hero (`.section_1.parallax-bg`).

## 5. Mantenimiento

### Añadir una nueva traducción
1.  Abrir `langs/es.json` y `langs/en.json`.
2.  Añadir la nueva clave-valor respetando la jerarquía JSON.
3.  En el HTML, añadir el atributo `data-i18n="nueva.clave"` al elemento.

### Actualizar disponibilidad de viviendas
1.  Editar el archivo de datos JSON (o la variable `list` si está hardcodeada en la integración final).
2.  Buscar la unidad por su ID o clave.
3.  Cambiar el campo `estado` a `vendido`, `reservado` o `disponible`.
4.  Si cambia el precio, actualizar `coste_sin_iva`.

### Cambiar imágenes de la galería
1.  Subir las nuevas imágenes al Bucket de Supabase.
2.  Editar la constante `PROVIDED_IMAGES` en `js/galeria.js` con las nuevas URLs públicas.

---
*Documentación generada automáticamente para el proyecto New WhiteHills.*

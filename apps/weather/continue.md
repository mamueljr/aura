# 📑 AuraWeather - Registro de Desarrollo y Especificaciones (`continue.md`)

Este archivo sirve como bitácora viva del proyecto **AuraWeather**. Contiene la descripción general, las especificaciones tecnológicas y el historial detallado de todas las mejoras y cambios realizados por fecha.

---

## 📝 Descripción del Proyecto

**AuraWeather** es una aplicación web y móvil híbrida premium diseñada para consultar y predecir el clima en tiempo real de cualquier parte del mundo. Desarrollada con un enfoque moderno de **Glassmorphism**, cuenta con soporte para ser instalada como una **PWA (Progressive Web App)** y está preconfigurada para compilarse como una aplicación nativa de Android mediante **Capacitor**.

La aplicación destaca por sus efectos visuales climatológicos dinámicos en vivo (motor de partículas 2D de lluvia y nieve), sonido ambiental sintetizado en tiempo real, geolocalización inteligente y un gráfico interactivo del pronóstico para las próximas horas.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend Core**: HTML5 (semántico) y JavaScript (ES6 vanilla).
* **Diseño y Estilos (CSS)**: Vanilla CSS3, con uso intensivo de variables dinámicas, desenfoques de fondo (`backdrop-filter`) y keyframes para partículas.
* **Gráficos e Iconografía**:
  * **Chart.js**: Renderizado de gráficos de líneas interactivos y responsivos.
  * **Lucide Icons**: Paquete de iconos minimalistas.
* **APIs de Clima y Datos**:
  * **Open-Meteo API**: Consulta gratuita de pronósticos (temperatura, viento, humedad, radiación UV, amanecer/atardecer) y geocodificación.
* **Sonido Dinámico (Offline)**:
  * **Web Audio API**: Generación y filtrado de ondas de audio digital en el cliente para simular lluvia, viento y tormentas sin archivos externos.
* **Integración del Sistema & PWA**:
  * **Service Worker (`sw.js`)**: Estrategia de caché local para soporte offline.
  * **Web Share API**: Compartición nativa del reporte climatológico.
  * **Capacitor (Android)**: Envoltura híbrida para empaquetado nativo en móviles.
* **CI/CD / Nube**:
  * **GitHub Actions**: Pipeline para compilación automática del archivo `.apk` de instalación nativa en la nube.

---

## 📅 Historial de Cambios y Mejoras

### 30 de Junio de 2026
* **Tarjeta de Astronomía (Sol y Luna)**:
  * Implementación de un widget interactivo con un arco SVG dinámico de doble propósito.
  * Durante el día, dibuja un **Sol dorado** (`#fbbf24`) que sigue una curva trigonométrica basada en el tiempo transcurrido desde el amanecer hasta el atardecer.
  * Durante la noche, el nodo se transforma en una **Luna plateada** (`#e2e8f0`) que avanza sobre la misma curva midiendo el transcurso de la noche hasta el amanecer del día siguiente.
  * Se añadió el cálculo matemático del ciclo sinódico lunar para determinar la fase lunar exacta (ej. *Creciente Cóncava*, *Luna Llena*) y su porcentaje de iluminación.
* **Pronóstico por Horas Deslizable (Swipeable)**:
  * Creación de un carrusel de tarjetas horizontal deslizable con soporte táctil para móviles, mostrando las siguientes 12 horas de forma clara y accesible sin necesidad de leer el gráfico.
* **Filtros del Gráfico de Tendencia**:
  * Adición de botones (**6H / 12H / 24H**) en el gráfico para que los usuarios puedan recortar el rango de horas.
  * Se estableció **6H por defecto** para evitar que la gráfica se encime o se comprima en pantallas verticales de teléfonos.
* **Sintetizador de Audio Ambiental (Web Audio API)**:
  * Creación de un motor de sonido climatológico sintetizado 100% offline. Genera lluvia (ruido blanco + filtro paso banda), tormenta (lluvia + truenos de baja frecuencia periódicos) y viento (ruido blanco + LFO oscilante).
  * Persistencia de sonido: Se guarda la preferencia del usuario en `localStorage` (`aura_sound_muted`). El sonido está **activado por defecto** y, para cumplir con las políticas de autoplay de los navegadores, se activa con el primer toque o interacción del usuario en la pantalla.
* **Remoción de la Sección de Radar**:
  * Se eliminó el mapa interactivo de Leaflet y RainViewer para eliminar avisos de "zoom level not supported" generados por la API de radar en niveles altos de ampliación, aligerando el peso total de carga de la aplicación.
* **Mejoras de Espaciado y Usabilidad**:
  * Corrección de margen inferior en cabeceras de tarjeta (`.card-header` a `1.25rem`) para separar los subtítulos del contenido inferior.
  * Ajuste de columnas en el pronóstico de 7 días para móviles (`grid-template-columns: 2.8fr 3fr 2.2fr` en menores a 480px), asignando más espacio al nombre del día para evitar que se encime con el icono meteorológico.

### 2 de Julio de 2026
* **Control de Tiempos de Espera (Fetch Timeout)**:
  * Se creó una función utilitaria `fetchWithTimeout` que permite abortar peticiones fetch si sobrepasan un tiempo límite, previniendo congelamientos de la interfaz ante caídas de red o fallas en servidores externos.
  * **API del Clima**: Configurado con un tiempo límite de **8 segundos** para peticiones a Open-Meteo. Si se agota el tiempo, la app aborta la petición, oculta el cargador infinito ("skeleton loader") y despliega una interfaz con un botón destacado de **Reintentar** y un icono de desconexión.
  * **API de Geolocalización Inversa**: Configurado con un límite de **4 segundos** en `bigdatacloud.net` para la geolocalización por GPS e inicio automático, garantizando que el flujo inicial de la app no quede bloqueado si la resolución del nombre de ciudad se ralentiza.
  * **API de Autocompletado de Ciudades**: Límite de **5 segundos** para evitar bloqueos en el campo de búsqueda de texto.
* **API de Respaldo Automático (MET Norway Failover)**:
  * Se integró la API pública de **MET Norway (yr.no)** como proveedor de clima secundario de respaldo.
  * Si la petición a la API principal (Open-Meteo) falla o supera el tiempo de espera de 8 segundos, la aplicación captura el fallo e inicia de forma inmediata una llamada a la API de MET Norway.
  * Se desarrolló un transformador de datos (`mapMetNorwayToOpenMeteo`) que adapta la estructura JSON de MET Norway al formato estándar de Open-Meteo. Esto hace que el cambio de API sea 100% transparente para el usuario final, manteniendo intactos todos los componentes visuales (gráficos de tendencias, tarjetas deslizables, astronomía diurna/nocturna y sintetizador de audio).
* **Actualización Forzada e Inmediata de PWA**:
  * Se implementó un detector de actualizaciones avanzadas en el registro del Service Worker en `index.html`.
  * Ahora, cuando se publica una nueva versión de la app en GitHub Pages, la aplicación envía un comando `SKIP_WAITING` y escucha el evento `controllerchange`.
  * Esto fuerza una **recarga de página automática e instantánea** para el usuario tan pronto como la nueva versión se instala, eliminando por completo el problema del "caché pegajoso" sin requerir que el usuario borre los datos de forma manual o cierre la aplicación.

### 3 de Julio de 2026
* **Inversión de Prioridad de APIs del Clima (Solución definitiva a inestabilidad)**:
  * **Problema**: Open-Meteo continúa caído o bloqueado para el usuario final. Esto causaba un retraso sistemático de 8 segundos de carga en cada recarga o búsqueda mientras la app esperaba el timeout de la API principal antes de pasar al respaldo.
  * **Solución**: Se invirtió la prioridad de las APIs de clima en `fetchWeatherData`.
  * **Nuevo Flujo**:
    * **API Principal**: **BrightSky (api.brightsky.dev)**. Al ser ahora la principal y tener soporte de CORS nativo, la aplicación vuelve a cargar el clima de forma **instantánea** (menos de 1 segundo).
    * **API de Respaldo**: **Open-Meteo**. Si BrightSky llegara a fallar, la aplicación intentará de forma transparente cargar datos desde Open-Meteo en segundo plano.
  * **Exclusión de Caché en sw.js**: Se actualizó el Service Worker (caché **`v16`**) para omitir el almacenamiento dinámico de `api.brightsky.dev`.

### 7 de Julio de 2026
* **Pase de pulido estético general**:
  * **Profundidad de las tarjetas de vidrio**: `.card` ganó un borde superior de realce (`border-top` claro) y una sombra interior sutil, acentuando el efecto de cristal premium.
  * **Transición cinematográfica entre temas de clima**: los gradientes de fondo se refactorizaron en tres stops de color (`--grad-stop-1/2/3`) registrados vía `@property`, lo que permite que el cambio de un clima a otro haga un verdadero *crossfade* animado en vez de saltar de golpe.
  * **Ícono principal con vida propia**: el ícono de clima actual ahora flota suavemente y su resplandor pulsa con el color de acento del tema (`iconFloat`).
  * **Shimmer de carga con tinte de acento**: el efecto shimmer del skeleton loader ahora mezcla `--theme-accent` vía `color-mix()` en vez de un gris neutro fijo.
  * **Motor de partículas migrado a canvas**: la lluvia y la nieve dejaron de ser `div`s animados por CSS y ahora se dibujan en `#weather-particles-canvas` con velocidad variable y deriva de viento, luciendo más naturales; también se eliminó el efecto de lluvia CSS redundante que quedaba duplicado bajo el sistema anterior.
  * **Micro-interacciones**: los botones de favorito, compartir y sonido tienen ahora una respuesta táctil al presionar (`:active` con escala), el botón de favorito hace un "pop" elástico al activarse y el de sonido pulsa mientras el audio está activo.
  * **Tipografía editorial**: la temperatura principal pasó de peso 800 a 300 para un contraste más marcado frente al título de la app.
  * **Sistema de radios consistente**: se introdujeron los tokens `--radius-sm/md/lg/full` y se unificaron los `border-radius` dispersos (12/16/20/24/9999px) del resto de la hoja de estilos.
  * **Modo claro**: se añadió soporte `@media (prefers-color-scheme: light)` que aclara el cristal y oscurece el texto en los temas dinámicos (la nieve ya tenía su propio look claro).
  * **Estado vacío de favoritos**: se añadió un ícono de estrella tenue junto al texto para que no se perciba como un error.
  * **Accesibilidad de teclado**: se añadieron anillos de `:focus-visible` a botones, inputs y enlaces, a juego con el acento del tema.
  * **Service Worker**: caché incrementada a **`v20`** para forzar la actualización de todos los usuarios.

### 8 de Julio de 2026
* **Bloque de pulido estético (Prioridad 1)**:
  * **Relámpago sincronizado con el trueno**: se añadió un overlay `#lightning-flash` en el fondo que hace un doble parpadeo irregular (`lightningStrike`) al ritmo de un temporizador de tormenta (`startStormEffects`/`triggerLightning`). La luz llega primero y el trueno de audio poco después (300–1500 ms), replicando la física real. El agendado de truenos se movió de `applyAudioState` al temporizador de tormenta para que luz y sonido queden acoplados; el destello se ve aunque el sonido esté silenciado.
  * **Rebalanceo de acentos apagados**: `--theme-accent` de *nublado* pasó de `#94a3b8` a `#60a5fa` y el de *noche* de `#a5b4fc` a `#818cf8`, para que todos los temas tengan el mismo "pop" que soleado y tormenta.
  * **Accesibilidad — movimiento reducido**: nuevo bloque `@media (prefers-color-scheme: reduce)` que desactiva animaciones decorativas, flotación del ícono, shimmer y el destello; en `app.js`, `prefersReducedMotion()` omite las partículas y el flash (el trueno de audio se conserva).
  * **Scrollbar global**: la barra de desplazamiento de toda la página ahora es fina y se tiñe con el acento del tema (`::-webkit-scrollbar` + `scrollbar-color`), a juego con la del carrusel horario.
  * **Entrada escalonada de tarjetas**: cada bloque de `.main-content` aparece con un ligero retraso incremental (`cardEnter`, 50–330 ms) para una entrada más orquestada que el fade simultáneo anterior.
  * **Service Worker**: caché incrementada a **`v21`**.
* **Fondo por capas de ambiente (Prioridad 2, #7)**:
  * Se añadieron tres capas decorativas puramente en CSS dentro de `.dynamic-background` (`.bg-stars`, `.bg-sun`, `.bg-clouds`), colocadas detrás de las partículas (`z-index: -2`) y reveladas con un fundido de 1.2s según la clase de clima del `body`.
  * **Estrellas (noche)**: dos capas de estrellas (`::before`/`::after`) con distinta densidad y ritmo de titileo (`twinkle`), creando un parallax sutil de brillo.
  * **Halo de sol (soleado de día)**: un resplandor cálido radial en la esquina superior que "respira" con una animación de escala/brillo (`sunBreathe`).
  * **Nubes (nublado y tormenta)**: blobs suaves que se desplazan horizontalmente en bucle lento de 90s (`cloudDrift`); en tormenta aparecen atenuadas al 70%.
  * Todas las capas se congelan (sin titileo/deriva/respiración) bajo `prefers-reduced-motion`, permaneciendo visibles pero estáticas.
  * **Service Worker**: caché incrementada a **`v22`**.
* **Corrección del "doble arranque" al abrir la app (recarga fantasma)**:
  * **Síntoma**: al abrir la PWA cargaba, mostraba el clima y anunciaba "ubicación detectada", y segundos después repetía todo el proceso (reaparecía el skeleton) de forma redundante.
  * **Causa 1 (principal)**: el arranque en dos fases (`initApp` carga la última ciudad → `detectUserLocationAutomatically` re-consulta el GPS) llamaba a `fetchWeatherData` una segunda vez **aunque la ubicación fuera la misma** ya cargada, y esa segunda llamada siempre reponía el skeleton completo.
  * **Fix 1**: `detectUserLocationAutomatically` ahora compara con `isSameLocation` y, si el GPS resuelve a la misma ubicación que ya está en pantalla, **no hace nada** (sin toast ni refetch).
  * **Fix 2**: `fetchWeatherData` acepta `options.silent`. Cuando ya hay clima renderizado (caso de la actualización automática por GPS a otra ubicación), sustituye los datos en su lugar **sin ocultar el contenido ni mostrar el skeleton**; y ante un fallo silencioso conserva el clima visible en vez de pintar la pantalla de error.
  * **Causa 2 (secundaria)**: `sw.js` usaba `self.clients.claim()` en `activate`, que en la primera carga (sin controlador) disparaba un `controllerchange` → `window.location.reload()` espurio tras instalar/actualizar.
  * **Fix 3**: se eliminó `clients.claim()`. Las actualizaciones reales siguen recargando vía `SKIP_WAITING` + `controllerchange` (la página ya está controlada), pero desaparece el recargón de la primera apertura.
  * **Service Worker**: caché incrementada a **`v23`**.
* **Lote final de mejoras estéticas (Prioridad 2, #5, #6, #8, #9, #10)**:
  * **#5 Tipografía "hero"**: la temperatura principal pasó a 6.5rem con peso 200 y tracking negativo (`-0.04em`); la unidad se redujo a superíndice (1.6rem, peso 500) para un contraste editorial marcado. Ajustados los tamaños en móvil (5rem) y landscape (4.5rem).
  * **#6 Icono de clima a color**: el icono principal ya no usa un único acento; ahora toma un color propio por clima vía `--icon-color` (sol dorado, nube plateada, lluvia azul, nieve celeste, luna índigo, rayo ámbar). En modo claro se sustituyen los tonos pálidos por versiones más saturadas para conservar el contraste sobre el cristal luminoso.
  * **#8 Toggle manual de tema**: nuevo botón en el header que cicla **auto → claro → oscuro** (iconos `monitor`/`sun`/`moon`), con persistencia en `localStorage` (`aura_theme`). El JS resuelve la preferencia y fija `data-theme` en `<html>`; el modo claro se refactorizó de `@media (prefers-color-scheme)` a selectores `:root[data-theme="light"]`, y en modo *auto* se sigue en vivo el cambio del sistema vía `matchMedia`. La barra del navegador (`meta[theme-color]`) acompaña al tema.
  * **#9 Marca propia + favicon**: se reemplazó el logo genérico `cloud-sun` de Lucide por una marca SVG inline ("orbe de aura" con anillos y gradiente cálido→frío); se añadió `assets/favicon.svg` con la misma identidad y su `<link rel="icon">`.
  * **#10 Modo landscape compacto**: nuevo `@media (orientation: landscape) and (max-height: 500px)` que colapsa cabecera, logo, tipografía y paddings para aprovechar la poca altura en teléfonos en horizontal.
  * **Service Worker**: caché incrementada a **`v24`** y `favicon.svg` añadido al precache.

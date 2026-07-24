# AuraWeather - App de Clima Premium & PWA

AuraWeather es una aplicación web y móvil híbrida premium diseñada para consultar y predecir el clima en tiempo real de cualquier parte del mundo. Desarrollada con un enfoque moderno de **Glassmorphism**, cuenta con soporte para ser instalada como una **PWA (Progressive Web App)** en dispositivos Android/iOS y está pre-configurada para compilarse como una aplicación nativa de Android mediante **Capacitor**.

La versión web pública y segura (HTTPS) está alojada en:
👉 **[https://mamueljr.github.io/App_Clima/](https://mamueljr.github.io/App_Clima/)**

---

## 🚀 Características Clave (Efecto "WOW")

1. **Diseño Premium y Dinámico**:
   - Interfaz basada en tarjetas translúcidas con desenfoque de fondo (*Glassmorphism*).
   - Los degradados y el color de acento de la aplicación cambian automáticamente según el estado del clima actual (soleado, nublado, lluvioso, tormenta, nevado o noche).
2. **Efectos Climatológicos en Vivo**:
   - Cuenta con un motor de partículas en 2D. Si el clima reporta lluvia, tormenta o nieve, se inyectan gotas de lluvia cayendo a gran velocidad o copos de nieve flotando sutilmente en el fondo de la pantalla de forma animada.
3. **Geolocalización Inteligente**:
   - Al abrir la aplicación, esta detecta de manera automática la ubicación GPS/celular en segundo plano para mostrar el clima local inmediatamente (ej. Chihuahua, México).
   - Cuenta con un botón manual para forzar la detección de ubicación y buscador inteligente con autocompletado en tiempo real.
4. **Selector de Unidades (°C / °F)**:
   - Permite alternar de manera instantánea entre Celsius y Fahrenheit. Los cálculos se realizan en el cliente, actualizando el gráfico, el clima actual y el pronóstico de 7 días al instante sin necesidad de recargar ni realizar peticiones adicionales.
5. **Gráfico de Pronóstico de 24 Horas**:
   - Un gráfico de líneas interactivo (desarrollado con *Chart.js*) que despliega las fluctuaciones de temperatura y probabilidad de lluvia para las siguientes 24 horas.
6. **Favoritos & Persistencia**:
   - Posibilidad de añadir ciudades a una lista de favoritos que se guarda en la memoria local (`localStorage`), permitiendo un acceso rápido con un solo clic.
7. **Botón de Compartir Integrado**:
   - Utiliza la **Web Share API nativa** en teléfonos móviles para que compartas tu clima actual en WhatsApp o Telegram con un clic. En ordenadores de escritorio, copia el reporte automáticamente al portapapeles.
8. **Funciona Sin Conexión (Modo Offline PWA)**:
   - Gracias al uso de un **Service Worker (`sw.js`)**, todos los archivos estáticos de la aplicación (HTML, CSS, JS, iconos, tipografías) se almacenan en caché tras la primera carga. La aplicación se iniciará al instante y mostrará los favoritos incluso sin internet.

---

## 🛠️ Estructura del Proyecto

* `index.html`: Estructura semántica HTML5, enlaces al manifiesto y carga de librerías mediante CDN optimizadas para caché.
* `style.css`: Sistema de diseño visual, variables CSS dinámicas, responsive design (mobile-first) y animaciones de partículas.
* `app.js`: Lógica principal en JavaScript (peticiones a la API de clima de Open-Meteo, geolocalización, manipulación del DOM, lógica de favoritos, gráfico e instalación programática).
* `manifest.json`: Configuración de la PWA (nombre, colores temáticos, iconos y modo standalone para ejecutarse a pantalla completa como app nativa).
* `sw.js`: Service Worker que maneja el almacenamiento en caché local y estrategias de red para uso offline.
* `assets/icons/`: Iconos en formato PNG requeridos para la instalación en dispositivos.
* `capacitor.config.json`: Configuración de Capacitor para envolver la app en el proyecto nativo.
* `copy-assets.js`: Script Node.js multiplataforma para compilar y mover los activos web a la carpeta de entrada de Capacitor (`www/`).
* `.github/workflows/build-apk.yml`: Pipeline de GitHub Actions listo para compilar automáticamente el archivo `.apk` de instalación nativa en la nube.

---

## 📦 Cómo Ejecutar Localmente

### 1. Iniciar el Servidor de Desarrollo
Si deseas probar la aplicación localmente en tu computadora:
1. Asegúrate de tener instalado [Node.js](https://nodejs.org/).
2. Abre la terminal en el directorio del proyecto e instala las dependencias de desarrollo de Capacitor:
   ```bash
   npm install
   ```
3. Compila los recursos estáticos ejecutando:
   ```bash
   npm run build
   ```
4. Inicia un servidor de desarrollo simple para acceder a la aplicación:
   ```bash
   npx http-server -p 8080
   ```
5. Abre en tu navegador la dirección `http://localhost:8080`.

---

## 🤖 Compilación de la Aplicación Móvil (.APK)

La aplicación está completamente configurada para empaquetarse en un instalador nativo de Android mediante **Capacitor**.

### Método Automático (GitHub Actions)
Hemos creado un flujo de trabajo que compila la APK en la nube de GitHub cada vez que se hace un `git push`. 
> [!IMPORTANT]
> **Nota de Facturación de GitHub**: El flujo de compilación de GitHub Actions (`build-apk.yml`) requiere que la cuenta del repositorio no tenga problemas de facturación o verificación pendientes en [Configuración de Facturación de GitHub](https://github.com/settings/billing) para poder ejecutar las máquinas virtuales gratuitas de GitHub. Una vez resuelto el estado de facturación, la APK se compilará automáticamente en la pestaña **Actions** del repositorio para su libre descarga.

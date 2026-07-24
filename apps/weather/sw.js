/**
 * AuraWeather Service Worker for PWA
 */

const CACHE_NAME = 'aura-weather-cache-v24';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

// Evento Install: Guardar recursos estáticos locales en caché (100% de éxito garantizado)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Guardando shell de la aplicación en caché...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Evento Activate: Limpiar cachés antiguas
// Nota: NO usamos self.clients.claim(). Reclamar el control en la primera carga
// (aún sin controlador) dispara un 'controllerchange' que provocaba una recarga
// espuria justo tras instalar la PWA. En una actualización real la página ya está
// controlada, así que SKIP_WAITING + controllerchange siguen recargando bien.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Evento Fetch: Intercepta peticiones y sirve desde caché si no hay internet
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // No cachear llamadas a las APIs del clima para garantizar datos frescos
  if (requestUrl.hostname.includes('open-meteo.com') || requestUrl.hostname.includes('bigdatacloud.net') || requestUrl.hostname.includes('api.brightsky.dev')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(JSON.stringify({ error: "Sin conexión a internet" }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Estrategia Cache-First con caída a red para recursos estáticos
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Validar respuesta correcta antes de guardar en caché (permitir basic y cors)
          if (!networkResponse || networkResponse.status !== 200 || 
              (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
            return networkResponse;
          }

          // Clonar la respuesta para guardarla en la caché dinámica (aquí se guardan Lucide y Chart.js)
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});

// Permitir activar el Service Worker inmediatamente cuando el frontend lo solicite
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

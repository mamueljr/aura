/**
 * AuraWeather - Lógica Principal (Premium Javascript)
 */

// Variable global para controlar la instalación de la PWA
let deferredPrompt = null;
let audioCtx = null;
let rainSound = null;
let windSound = null;
let stormTimeout = null; // temporizador de rayos/truenos durante tormenta
let isSoundMuted = localStorage.getItem('aura_sound_muted') === 'true';
let currentActiveWeatherCode = null;
let currentWindSpeed = 0;

// Motor de partículas (lluvia/nieve) en canvas
let particleCanvas = null;
let particleCtx = null;
let particleAnimationId = null;
let particles = [];
let particleMode = null; // 'rain' | 'snow' | null

// Estado de la aplicación
const AppState = {
  currentCity: {
    name: 'Madrid, España',
    lat: 40.4168,
    lon: -3.7038
  },
  favorites: [],
  hourlyChart: null,
  unit: 'C',
  lastWeatherData: null,
  chartHours: 6
};

// Mapeo de códigos de clima WMO (World Meteorological Organization)
const WeatherCodes = {
  0: { label: 'Despejado', icon: 'sun', class: 'weather-clear-day' },
  1: { label: 'Mayormente Despejado', icon: 'cloud-sun', class: 'weather-clear-day' },
  2: { label: 'Parcialmente Nublado', icon: 'cloud-sun', class: 'weather-cloudy' },
  3: { label: 'Cubierto / Nublado', icon: 'cloud', class: 'weather-cloudy' },
  45: { label: 'Niebla', icon: 'cloud-fog', class: 'weather-cloudy' },
  48: { label: 'Niebla con Escarcha', icon: 'cloud-fog', class: 'weather-cloudy' },
  51: { label: 'Llovizna Ligera', icon: 'cloud-drizzle', class: 'weather-rainy' },
  53: { label: 'Llovizna Moderada', icon: 'cloud-drizzle', class: 'weather-rainy' },
  55: { label: 'Llovizna Densa', icon: 'cloud-drizzle', class: 'weather-rainy' },
  56: { label: 'Llovizna Helada Ligera', icon: 'cloud-snow', class: 'weather-snowy' },
  57: { label: 'Llovizna Helada Densa', icon: 'cloud-snow', class: 'weather-snowy' },
  61: { label: 'Lluvia Ligera', icon: 'cloud-rain', class: 'weather-rainy' },
  63: { label: 'Lluvia Moderada', icon: 'cloud-rain', class: 'weather-rainy' },
  65: { label: 'Lluvia Fuerte', icon: 'cloud-rain', class: 'weather-rainy' },
  66: { label: 'Lluvia Helada Ligera', icon: 'cloud-hail', class: 'weather-rainy' },
  67: { label: 'Lluvia Helada Fuerte', icon: 'cloud-hail', class: 'weather-rainy' },
  71: { label: 'Nevada Ligera', icon: 'snowflake', class: 'weather-snowy' },
  73: { label: 'Nevada Moderada', icon: 'snowflake', class: 'weather-snowy' },
  75: { label: 'Nevada Fuerte', icon: 'snowflake', class: 'weather-snowy' },
  77: { label: 'Granizo de Nieve', icon: 'snowflake', class: 'weather-snowy' },
  80: { label: 'Chubascos de Lluvia Ligeros', icon: 'cloud-rain', class: 'weather-rainy' },
  81: { label: 'Chubascos de Lluvia Moderados', icon: 'cloud-rain', class: 'weather-rainy' },
  82: { label: 'Chubascos de Lluvia Violentos', icon: 'cloud-rain-wind', class: 'weather-rainy' },
  85: { label: 'Chubascos de Nieve Ligeros', icon: 'cloud-snow', class: 'weather-snowy' },
  86: { label: 'Chubascos de Nieve Fuertes', icon: 'cloud-snow', class: 'weather-snowy' },
  95: { label: 'Tormenta Eléctrica', icon: 'cloud-lightning', class: 'weather-storm' },
  96: { label: 'Tormenta con Granizo Ligero', icon: 'cloud-lightning', class: 'weather-storm' },
  99: { label: 'Tormenta con Granizo Fuerte', icon: 'cloud-lightning', class: 'weather-storm' }
};

// Selectores del DOM
const elements = {
  citySearch: document.getElementById('city-search'),
  searchResults: document.getElementById('search-results'),
  geoBtn: document.getElementById('geo-btn'),
  favoritesToggleBtn: document.getElementById('favorites-toggle-btn'),
  favoritesBar: document.getElementById('favorites-bar'),
  favoritesList: document.getElementById('favorites-list'),
  statusMessage: document.getElementById('status-message'),
  statusLoading: document.getElementById('status-loading'),
  statusError: document.getElementById('status-error'),
  mainContent: document.getElementById('main-content'),
  weatherLocation: document.getElementById('weather-location'),
  favoriteBtn: document.getElementById('favorite-btn'),
  localTime: document.getElementById('local-time'),
  currentTemp: document.getElementById('current-temp'),
  weatherDesc: document.getElementById('weather-desc'),
  mainWeatherIconContainer: document.getElementById('main-weather-icon-container'),
  tempMax: document.getElementById('temp-max'),
  tempMin: document.getElementById('temp-min'),
  insightText: document.getElementById('insight-text'),
  rainChance: document.getElementById('rain-chance'),
  uvIndex: document.getElementById('uv-index'),
  humidityVal: document.getElementById('humidity-val'),
  windVal: document.getElementById('wind-val'),
  feelsLikeVal: document.getElementById('feels-like-val'),
  pressureVal: document.getElementById('pressure-val'),
  forecastList: document.getElementById('forecast-list'),
  toastContainer: document.getElementById('toast-container'),
  unitToggleBtn: document.getElementById('unit-toggle-btn'),
  shareBtn: document.getElementById('share-btn'),
  sunriseTimeLabel: document.getElementById('sunrise-time-label'),
  sunsetTimeLabel: document.getElementById('sunset-time-label'),
  sunriseVal: document.getElementById('sunrise-val'),
  sunsetVal: document.getElementById('sunset-val'),
  moonPhaseIconContainer: document.getElementById('moon-phase-icon-container'),
  moonPhaseLabel: document.getElementById('moon-phase-label'),
  moonIlluminationVal: document.getElementById('moon-illumination-val'),
  sunNode: document.getElementById('sun-node'),
  soundBtn: document.getElementById('sound-btn'),
  hourlyScrollContainer: document.getElementById('hourly-scroll-container'),
  themeToggleBtn: document.getElementById('theme-toggle-btn')
};

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  initTheme();
  loadFavorites();
  setupEventListeners();
  initSoundButtonState();
  
  // Cargar ciudad inicial (por defecto Madrid o última buscada)
  const savedLastCity = localStorage.getItem('aura_last_city');
  if (savedLastCity) {
    try {
      AppState.currentCity = JSON.parse(savedLastCity);
    } catch (e) {
      console.error('Error parseando última ciudad guardada', e);
    }
  }
  
  // Cargar clima inicial inmediatamente
  fetchWeatherData(AppState.currentCity.lat, AppState.currentCity.lon, AppState.currentCity.name);
  
  // Intentar geolocalización automática en segundo plano
  detectUserLocationAutomatically();
}

// ==========================================
// TEMA DE COLOR (auto / claro / oscuro)
// ==========================================
const THEME_KEY = 'aura_theme'; // 'auto' | 'light' | 'dark'
const THEME_ORDER = ['auto', 'light', 'dark'];
const THEME_META = {
  auto:  { icon: 'monitor', label: 'Tema: automático' },
  light: { icon: 'sun',     label: 'Tema: claro' },
  dark:  { icon: 'moon',    label: 'Tema: oscuro' }
};

function getStoredTheme() {
  const t = localStorage.getItem(THEME_KEY);
  return THEME_ORDER.includes(t) ? t : 'auto';
}

// Resuelve la preferencia a un valor concreto ('light' | 'dark') para el DOM
function resolveTheme(pref) {
  if (pref === 'auto') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return pref;
}

function applyTheme(pref) {
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;

  // La barra del navegador (meta theme-color) acompaña al tema resuelto
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'light' ? '#e2e8f0' : '#0f172a');

  updateThemeButtonIcon(pref);
}

function updateThemeButtonIcon(pref) {
  const btn = elements.themeToggleBtn;
  if (!btn) return;
  const { icon, label } = THEME_META[pref];
  btn.innerHTML = `<i data-lucide="${icon}" class="theme-icon"></i>`;
  btn.setAttribute('title', label);
  btn.setAttribute('aria-label', label);
  safeCreateIcons();
}

function cycleTheme() {
  const next = THEME_ORDER[(THEME_ORDER.indexOf(getStoredTheme()) + 1) % THEME_ORDER.length];
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  const names = { auto: 'Automático', light: 'Claro', dark: 'Oscuro' };
  showToast(`Tema: ${names[next]}`, THEME_META[next].icon);
}

function initTheme() {
  applyTheme(getStoredTheme());
  // En modo automático, seguir en vivo los cambios de tema del sistema
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (getStoredTheme() === 'auto') applyTheme('auto');
  });
}

// Configuración de eventos
function setupEventListeners() {
  // Búsqueda con rebote (debounce)
  let searchTimeout;
  elements.citySearch.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 3) {
      elements.searchResults.classList.add('hidden');
      return;
    }
    
    searchTimeout = setTimeout(() => {
      searchCity(query);
    }, 400);
  });

  // Cerrar sugerencias al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!elements.citySearch.contains(e.target) && !elements.searchResults.contains(e.target)) {
      elements.searchResults.classList.add('hidden');
    }
  });

  // Geolocalización
  elements.geoBtn.addEventListener('click', getUserLocation);

  // Agregar/Eliminar Favoritos
  elements.favoriteBtn.addEventListener('click', toggleCurrentFavorite);

  // Toggle de barra de favoritos
  elements.favoritesToggleBtn.addEventListener('click', () => {
    elements.favoritesBar.classList.toggle('hidden');
  });

  // Cambio de unidades
  if (elements.unitToggleBtn) {
    elements.unitToggleBtn.addEventListener('click', toggleTemperatureUnit);
  }

  // Cambio de tema (auto / claro / oscuro)
  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener('click', cycleTheme);
  }

  // Compartir clima
  if (elements.shareBtn) {
    elements.shareBtn.addEventListener('click', shareCurrentWeather);
  }

  // Botón de sonido ambiental
  if (elements.soundBtn) {
    elements.soundBtn.addEventListener('click', toggleAmbientSound);
  }

  // Filtros del gráfico por horas
  document.querySelectorAll('.chart-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.chart-filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      AppState.chartHours = parseInt(e.target.dataset.hours);
      if (AppState.lastWeatherData && AppState.lastWeatherData.hourly) {
        renderHourlyChart(AppState.lastWeatherData.hourly);
      }
    });
  });

  // Click listener por defecto en el PWA badge para guiar al usuario
  const pwaBadge = document.querySelector('.pwa-badge');
  if (pwaBadge) {
    pwaBadge.addEventListener('click', triggerPWAInstall);
  }
}

// Búsqueda de ciudades (Autocompletado)
async function searchCity(query) {
  try {
    const response = await fetchWithTimeout(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=es&format=json`, { timeout: 5000 });
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      renderSearchResults(data.results);
    } else {
      elements.searchResults.innerHTML = '<li class="no-results">No se encontraron ciudades</li>';
      elements.searchResults.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error buscando ciudad:', error);
    showToast('Error en la búsqueda de ciudades', 'wifi-off');
  }
}

// Mostrar resultados del autocompletado
function renderSearchResults(results) {
  elements.searchResults.innerHTML = '';
  results.forEach(city => {
    const li = document.createElement('li');
    const state = city.admin1 ? `, ${city.admin1}` : '';
    const displayName = `${city.name}${state}, ${city.country}`;
    
    li.innerHTML = `
      <span>${displayName}</span>
      <span class="country-code">${city.country_code ? city.country_code.toUpperCase() : ''}</span>
    `;
    
    li.addEventListener('click', () => {
      AppState.currentCity = {
        name: displayName,
        lat: city.latitude,
        lon: city.longitude
      };
      
      localStorage.setItem('aura_last_city', JSON.stringify(AppState.currentCity));
      elements.citySearch.value = '';
      elements.searchResults.classList.add('hidden');
      
      fetchWeatherData(city.latitude, city.longitude, displayName);
    });
    
    elements.searchResults.appendChild(li);
  });
  
  elements.searchResults.classList.remove('hidden');
}

// Obtener ubicación del GPS
function getUserLocation() {
  if (!navigator.geolocation) {
    showToast('La geolocalización no está soportada por tu navegador', 'alert-triangle');
    return;
  }
  
  showToast('Obteniendo tu ubicación...', 'map-pin');
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      // Intentar obtener el nombre de la ciudad mediante geocodificación inversa
      let cityName = 'Ubicación Actual';
      try {
        const response = await fetchWithTimeout(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`, { timeout: 4000 });
        const geoData = await response.json();
        if (geoData.city || geoData.locality) {
          cityName = `${geoData.city || geoData.locality}, ${geoData.countryName}`;
        }
      } catch (err) {
        console.warn('No se pudo resolver el nombre de la ubicación, usando genérico', err);
      }
      
      AppState.currentCity = { name: cityName, lat: latitude, lon: longitude };
      localStorage.setItem('aura_last_city', JSON.stringify(AppState.currentCity));
      fetchWeatherData(latitude, longitude, cityName);
    },
    (error) => {
      console.error('Error de geolocalización:', error);
      showToast('Permiso de ubicación denegado o error de señal', 'alert-circle');
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

// Helper para realizar peticiones fetch con límite de tiempo (timeout)
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Obtener datos del clima (con soporte de respaldo automático)
async function fetchWeatherData(lat, lon, cityName, options = {}) {
  // Refresco en silencio: cuando ya hay clima en pantalla (p. ej. la actualización
  // automática por GPS), no ocultamos el contenido ni mostramos el skeleton; solo
  // sustituimos los datos al llegar. Así se evita el "parpadeo" de recarga.
  const silent = options.silent && AppState.lastWeatherData && !elements.mainContent.classList.contains('hidden');

  if (!silent) {
    // Mostrar pantalla de carga (skeleton) y ocultar cualquier error previo
    elements.statusMessage.classList.remove('hidden');
    elements.mainContent.classList.add('hidden');
    elements.statusLoading.classList.remove('hidden');
    elements.statusError.classList.add('hidden');
  }

  try {
    // Intentar API Primaria (BrightSky - DWD, rápida y con CORS nativo)
    const todayStr = new Date().toISOString().split('T')[0];
    const nextWeekStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await fetchWithTimeout(`https://api.brightsky.dev/weather?lat=${lat}&lon=${lon}&date=${todayStr}&last_date=${nextWeekStr}`, { timeout: 8000 });

    if (!response.ok) throw new Error('API principal de BrightSky no disponible');

    const data = await response.json();
    const mappedData = mapBrightSkyToOpenMeteo(data, lat, lon);
    AppState.lastWeatherData = mappedData;
    renderWeather(mappedData, cityName);

    // Ocultar pantalla de carga
    elements.statusMessage.classList.add('hidden');
    elements.mainContent.classList.remove('hidden');
  } catch (primaryError) {
    console.warn('API Principal (BrightSky) falló, intentando API de respaldo (Open-Meteo)...', primaryError);

    try {
      // Intentar API de Respaldo (Open-Meteo)
      const backupResponse = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`, { timeout: 8000 });

      if (!backupResponse.ok) throw new Error('API de respaldo de Open-Meteo no disponible');

      const backupJson = await backupResponse.json();
      AppState.lastWeatherData = backupJson;
      renderWeather(backupJson, cityName);

      showToast('Cargados datos de respaldo (Open-Meteo)', 'info');

      // Ocultar pantalla de carga
      elements.statusMessage.classList.add('hidden');
      elements.mainContent.classList.remove('hidden');
    } catch (backupError) {
      console.error('Ambas APIs de clima fallaron:', backupError);

      // En un refresco silencioso conservamos el clima que ya se ve en pantalla
      // en lugar de reemplazarlo por la pantalla de error.
      if (silent) {
        showToast('No se pudo actualizar el clima local', 'wifi-off');
        return;
      }

      let errMsg = 'Ambas APIs de clima fallaron (Servicios no disponibles)';
      if (backupError.name === 'AbortError') {
        errMsg = 'Las solicitudes de clima tardaron demasiado en responder (Tiempo de espera agotado)';
      }

      elements.statusLoading.classList.add('hidden');
      elements.statusError.classList.remove('hidden');
      elements.statusError.innerHTML = `
        <i data-lucide="wifi-off" style="width: 48px; height: 48px; color: #ef4444;"></i>
        <p style="color: #cbd5e1; padding: 0 1rem; text-align: center;">Error: ${errMsg}</p>
        <button onclick="retryWeatherFetch()" style="background: var(--theme-accent); color:#0f172a; border:none; padding: 0.6rem 1.2rem; border-radius:12px; cursor:pointer; font-weight:600; margin-top: 10px;">Reintentar</button>
      `;
      safeCreateIcons();
    }
  }
}

// Reintenta la carga del clima para la ciudad actual sin recargar la página
function retryWeatherFetch() {
  fetchWeatherData(AppState.currentCity.lat, AppState.currentCity.lon, AppState.currentCity.name);
}

// Convertidor de iconos de BrightSky (Symbol Code) a códigos WMO standard
function brightSkyIconToWmoCode(icon) {
  if (!icon) return 0;
  const mapping = {
    'clear-day': 0,
    'clear-night': 0,
    'partly-cloudy-day': 2,
    'partly-cloudy-night': 2,
    'cloudy': 3,
    'fog': 45,
    'wind': 3,
    'rain': 61,
    'sleet': 66,
    'snow': 71,
    'hail': 81,
    'thunderstorm': 95
  };
  return mapping[icon] !== undefined ? mapping[icon] : 3;
}

// Estima la humedad relativa (%) a partir de temperatura y punto de rocío (formula de Magnus-Tetens),
// necesario porque algunas estaciones de BrightSky no reportan relative_humidity directamente
function estimateHumidityFromDewPoint(tempC, dewPointC) {
  if (tempC === null || tempC === undefined || dewPointC === null || dewPointC === undefined) return null;
  const a = 17.625, b = 243.04;
  const alphaTemp = (a * tempC) / (b + tempC);
  const alphaDew = (a * dewPointC) / (b + dewPointC);
  const rh = 100 * Math.exp(alphaDew - alphaTemp);
  return Math.round(Math.min(100, Math.max(0, rh)));
}

// Adaptador para convertir la estructura de BrightSky al formato JSON de Open-Meteo
function mapBrightSkyToOpenMeteo(brightData, lat, lon) {
  const weather = brightData.weather;
  if (!weather || weather.length === 0) {
    throw new Error('Formato de datos de respaldo incorrecto');
  }
  
  // Buscar el registro de hora actual más cercano a la hora local
  const nowMs = Date.now();
  let currentItem = weather[0];
  let minDiff = Math.abs(new Date(currentItem.timestamp).getTime() - nowMs);
  
  for (let i = 1; i < weather.length; i++) {
    const diff = Math.abs(new Date(weather[i].timestamp).getTime() - nowMs);
    if (diff < minDiff) {
      minDiff = diff;
      currentItem = weather[i];
    }
  }
  
  const isDay = currentItem.icon && currentItem.icon.includes('day') ? 1 : 0;
  const weatherCode = brightSkyIconToWmoCode(currentItem.icon);
  
  // Mapear datos actuales
  const current = {
    temperature_2m: currentItem.temperature,
    relative_humidity_2m: (currentItem.relative_humidity !== null && currentItem.relative_humidity !== undefined)
      ? currentItem.relative_humidity
      : estimateHumidityFromDewPoint(currentItem.temperature, currentItem.dew_point),
    apparent_temperature: currentItem.temperature, // Aproximado
    is_day: isDay,
    precipitation: currentItem.precipitation || 0,
    rain: currentItem.precipitation || 0,
    showers: 0,
    snowfall: 0,
    weather_code: weatherCode,
    cloud_cover: currentItem.cloud_cover || 0,
    pressure_msl: currentItem.pressure_msl,
    wind_speed_10m: Math.round(currentItem.wind_speed || 0) // En km/h directamente
  };
  
  // Encontrar el índice de la medianoche local de hoy para alinear los índices de las horas
  const todayDateStr = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD" local
  let midnightIndex = 0;
  for (let i = 0; i < weather.length; i++) {
    const d = new Date(weather[i].timestamp);
    if (d.toLocaleDateString('en-CA') === todayDateStr && d.getHours() === 0) {
      midnightIndex = i;
      break;
    }
  }
  
  // Mapear datos horaria (todas las horas de la semana, comenzando desde la medianoche local de hoy)
  const hourly = {
    time: [],
    temperature_2m: [],
    relative_humidity_2m: [],
    apparent_temperature: [],
    precipitation_probability: [],
    weather_code: [],
    uv_index: []
  };
  
  for (let i = midnightIndex; i < weather.length; i++) {
    const item = weather[i];
    // Guardar en formato local YYYY-MM-DDTHH:MM para que el navegador lo parsee en zona horaria local sin desfasamientos
    const localDate = new Date(item.timestamp);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hour = String(localDate.getHours()).padStart(2, '0');
    
    hourly.time.push(`${year}-${month}-${day}T${hour}:00`);
    hourly.temperature_2m.push(item.temperature);
    hourly.relative_humidity_2m.push(
      (item.relative_humidity !== null && item.relative_humidity !== undefined)
        ? item.relative_humidity
        : estimateHumidityFromDewPoint(item.temperature, item.dew_point)
    );
    hourly.apparent_temperature.push(item.temperature);
    hourly.precipitation_probability.push(item.precipitation_probability || 0);
    hourly.weather_code.push(brightSkyIconToWmoCode(item.icon));
    hourly.uv_index.push(0);
  }
  
  // Mapear datos diarios (7 días)
  const daily = {
    time: [],
    weather_code: [],
    temperature_2m_max: [],
    temperature_2m_min: [],
    apparent_temperature_max: [],
    apparent_temperature_min: [],
    sunrise: [],
    sunset: [],
    uv_index_max: [],
    precipitation_probability_max: []
  };
  
  // Agrupar por días locales
  const dayGroups = {};
  weather.forEach(item => {
    const localDateStr = item.timestamp.split('T')[0];
    if (!dayGroups[localDateStr]) {
      dayGroups[localDateStr] = [];
    }
    dayGroups[localDateStr].push(item);
  });
  
  const daysKeys = Object.keys(dayGroups).sort().slice(0, 7);
  daysKeys.forEach(dayKey => {
    const dayItems = dayGroups[dayKey];
    const temps = dayItems.map(item => item.temperature).filter(t => t !== null && t !== undefined);
    const maxTemp = temps.length > 0 ? Math.max(...temps) : 20;
    const minTemp = temps.length > 0 ? Math.min(...temps) : 10;
    
    let dayIcon = 'clear-day';
    const noonItem = dayItems.find(item => item.timestamp.includes('T12:00:00'));
    if (noonItem && noonItem.icon) {
      dayIcon = noonItem.icon;
    } else if (dayItems.length > 0) {
      dayIcon = dayItems[0].icon;
    }
    
    const probList = dayItems.map(item => item.precipitation_probability).filter(p => p !== null && p !== undefined);
    const maxProb = probList.length > 0 ? Math.max(...probList) : 0;
    
    daily.time.push(dayKey);
    daily.weather_code.push(brightSkyIconToWmoCode(dayIcon));
    daily.temperature_2m_max.push(maxTemp);
    daily.temperature_2m_min.push(minTemp);
    daily.apparent_temperature_max.push(maxTemp);
    daily.apparent_temperature_min.push(minTemp);
    
    daily.sunrise.push(`${dayKey}T06:30`);
    daily.sunset.push(`${dayKey}T20:30`);
    
    daily.uv_index_max.push(5);
    daily.precipitation_probability_max.push(maxProb);
  });
  
  return {
    latitude: lat,
    longitude: lon,
    current,
    hourly,
    daily
  };
}

// Renderizar toda la info del clima en pantalla
function renderWeather(data, cityName) {
  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;
  
  // 1. Cabecera y botón de favoritos
  elements.weatherLocation.textContent = cityName;
  updateFavoriteBtnState();
  
  // 2. Tiempo local simulado según zona horaria
  const options = { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true };
  const formattedTime = new Date().toLocaleDateString('es-ES', options);
  elements.localTime.textContent = formattedTime;
  
  // 3. Clima Actual
  const tempVal = formatTemp(current.temperature_2m, true);
  elements.currentTemp.textContent = tempVal;
  
  const codeInfo = WeatherCodes[current.weather_code] || { label: 'Desconocido', icon: 'help-circle', class: 'weather-clear-day' };
  elements.weatherDesc.textContent = codeInfo.label;
  
  // Renderizar icono principal de Lucide
  // Si es noche y está despejado/parcialmente nublado, cambiamos a icono de noche
  let mainIconName = codeInfo.icon;
  if (current.is_day === 0) {
    if (current.weather_code === 0) mainIconName = 'moon';
    else if (current.weather_code === 1 || current.weather_code === 2) mainIconName = 'cloud-moon';
  }
  elements.mainWeatherIconContainer.innerHTML = `<i data-lucide="${mainIconName}" class="main-weather-icon"></i>`;
  
  // 4. Cambiar el tema visual del body según el clima
  document.body.className = ''; // Limpiar clases
  if (current.is_day === 0 && (current.weather_code === 0 || current.weather_code === 1)) {
    document.body.classList.add('weather-night');
  } else {
    document.body.classList.add(codeInfo.class);
  }
  
  // 5. Máxima y Mínima del día
  elements.tempMax.textContent = formatTemp(daily.temperature_2m_max[0]);
  elements.tempMin.textContent = formatTemp(daily.temperature_2m_min[0]);
  
  // 6. Métricas detalladas
  elements.humidityVal.textContent = (current.relative_humidity_2m !== null && current.relative_humidity_2m !== undefined)
    ? `${current.relative_humidity_2m}%`
    : 'N/D';
  elements.windVal.textContent = `${current.wind_speed_10m} km/h`;
  elements.feelsLikeVal.textContent = formatTemp(current.apparent_temperature);
  elements.pressureVal.textContent = `${Math.round(current.pressure_msl)} hPa`;
  
  // 7. Aura Insight & Métricas secundarias
  const rainProb = daily.precipitation_probability_max[0];
  const maxUV = daily.uv_index_max[0];
  
  elements.rainChance.textContent = `${rainProb}%`;
  elements.uvIndex.textContent = getUVDescription(maxUV);
  
  generateAuraInsight(current.temperature_2m, current.weather_code, rainProb, maxUV, current.wind_speed_10m, current.is_day);
  
  // 8. Gráfico de 24 Horas
  renderHourlyScroll(hourly);
  renderHourlyChart(hourly);
  
  // 9. Pronóstico de 7 Días
  render7DayForecast(daily);
  
  // Actualizar efectos animados de partículas (lluvia / nieve)
  updateWeatherEffects(codeInfo.class, current.is_day);
  
  // Actualizar sonido ambiental según clima actual
  updateAmbientSound(current.weather_code, current.wind_speed_10m);
  
  // 10. Actualizar astronomía (Sol y Luna)
  updateAstronomy(data);
  
  // Re-procesar iconos de Lucide
  safeCreateIcons();
}

// Descripción del índice UV
function getUVDescription(uv) {
  if (uv <= 2) return `Bajo (${Math.round(uv)})`;
  if (uv <= 5) return `Moderado (${Math.round(uv)})`;
  if (uv <= 7) return `Alto (${Math.round(uv)})`;
  if (uv <= 10) return `Muy Alto (${Math.round(uv)})`;
  return `Extremo (${Math.round(uv)})`;
}

// Generación de IA/Insights basados en reglas de clima y hora del día
function generateAuraInsight(temp, code, rainProb, uv, wind, isDay) {
  let message = "";
  
  if (rainProb >= 60) {
    message = "🌧️ Alta probabilidad de lluvia hoy. Te aconsejamos llevar un paraguas contigo y usar calzado impermeable.";
  } else if (temp >= 32 && isDay === 1) {
    message = "☀️ Hace mucho calor afuera. Mantente hidratado, evita el sol al mediodía y recuerda usar protector solar de amplio espectro.";
  } else if (uv >= 7 && isDay === 1) {
    message = "🕶️ El índice de radiación UV está muy elevado. Es ideal llevar gafas de sol, sombrero y bloqueador solar si vas a estar al aire libre.";
  } else if (wind >= 30) {
    message = "💨 Hay alertas de vientos fuertes hoy. Ten precaución con objetos sueltos en terrazas y mantente alerta al caminar cerca de árboles.";
  } else if (code >= 95) {
    message = "⚡ Se pronostican tormentas eléctricas. Es preferible quedarse bajo techo y desconectar aparatos electrónicos delicados.";
  } else if (temp <= 8) {
    message = "❄️ Las temperaturas serán muy bajas. Sal bien abrigado (capas, bufanda y guantes) para evitar enfriamientos.";
  } else if (rainProb >= 20 && rainProb < 60) {
    message = "⛅ Clima inestable. Podrían ocurrir lloviznas intermitentes. Un cortavientos impermeable ligero será tu mejor aliado.";
  } else {
    // Mensaje nocturno vs diurno agradable
    if (isDay === 0) {
      message = "🌙 ✨ La noche se presenta tranquila y despejada. Excelente momento para descansar o disfrutar de una caminata nocturna fresca.";
    } else {
      message = "✨ ¡Día espectacular! Las condiciones climáticas son excelentes para realizar actividades al aire libre o dar un paseo.";
    }
  }
  
  elements.insightText.textContent = message;
}

// Renderizado del Gráfico por Horas con Chart.js
function renderHourlyChart(hourly) {
  // Validar si la librería Chart.js se cargó correctamente
  if (typeof Chart === 'undefined') {
    console.warn('La librería Chart.js no está cargada. Omitiendo gráfico.');
    return;
  }
  
  // Obtener los datos de las próximas horas a partir del índice actual
  const now = new Date();
  const currentHour = now.getHours();
  
  const labels = [];
  const temps = [];
  const rainChances = [];
  
  const numHours = AppState.chartHours || 24;
  for (let i = currentHour; i < currentHour + numHours; i++) {
    // Evitar desbordamiento de índice si i supera la longitud del array
    if (i >= hourly.time.length) break;
    
    const date = new Date(hourly.time[i]);
    const displayHour = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    labels.push(displayHour);
    
    let tempVal = hourly.temperature_2m[i];
    if (AppState.unit === 'F') {
      tempVal = (tempVal * 9) / 5 + 32;
    }
    temps.push(Math.round(tempVal));
    rainChances.push(hourly.precipitation_probability[i]);
  }
  
  // Destruir gráfico anterior si existe
  if (AppState.hourlyChart) {
    AppState.hourlyChart.destroy();
  }
  
  const ctx = document.getElementById('hourlyChart').getContext('2d');
  
  // Estilo de colores del gráfico según tema del body
  const accentColor = getComputedStyle(document.body).getPropertyValue('--theme-accent').trim() || '#38bdf8';
  
  // Crear gradiente para la temperatura
  const tempGradient = ctx.createLinearGradient(0, 0, 0, 200);
  tempGradient.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
  tempGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
  
  AppState.hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: `Temperatura (°${AppState.unit})`,
          data: temps,
          borderColor: accentColor,
          borderWidth: 3,
          backgroundColor: tempGradient,
          fill: true,
          tension: 0.4,
          yAxisID: 'yTemp',
          pointRadius: 2,
          pointHoverRadius: 6
        },
        {
          label: 'Prob. Lluvia (%)',
          data: rainChances,
          borderColor: 'rgba(96, 165, 250, 0.6)',
          borderWidth: 2,
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          yAxisID: 'yRain',
          pointRadius: 0,
          pointHoverRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#cbd5e1',
            font: { family: 'Inter', size: 11 }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#0f172ae6',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#94a3b8',
            maxTicksLimit: 8,
            font: { family: 'Inter', size: 10 }
          }
        },
        yTemp: {
          type: 'linear',
          position: 'left',
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 10 },
            callback: value => `${value}°`
          }
        },
        yRain: {
          type: 'linear',
          position: 'right',
          grid: { display: false },
          min: 0,
          max: 100,
          ticks: {
            color: '#60a5fa',
            font: { family: 'Inter', size: 10 },
            callback: value => `${value}%`
          }
        }
      }
    }
  });
}

// Renderizado de lista de 7 días
function render7DayForecast(daily) {
  elements.forecastList.innerHTML = '';
  
  // Empezamos desde el día 1 (mañana) hasta el día 7
  for (let i = 1; i < 7; i++) {
    const date = new Date(daily.time[i] + 'T00:00:00'); // Evitar desfasamiento local
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    
    const maxStr = formatTemp(daily.temperature_2m_max[i]);
    const minStr = formatTemp(daily.temperature_2m_min[i]);
    const code = daily.weather_code[i];
    const codeInfo = WeatherCodes[code] || { label: 'Desconocido', icon: 'help-circle' };
    
    const row = document.createElement('div');
    row.className = 'forecast-row';
    row.innerHTML = `
      <span class="forecast-day">${capitalizedDay}</span>
      <div class="forecast-desc-col">
        <i data-lucide="${codeInfo.icon}"></i>
        <span class="forecast-desc">${codeInfo.label}</span>
      </div>
      <div class="forecast-temps">
        <span class="forecast-max">${maxStr}</span>
        <span class="forecast-min">${minStr}</span>
      </div>
    `;
    elements.forecastList.appendChild(row);
  }
}

// FAVORITOS Y PERSISTENCIA
function loadFavorites() {
  const saved = localStorage.getItem('aura_favorites');
  if (saved) {
    try {
      AppState.favorites = JSON.parse(saved);
    } catch (e) {
      AppState.favorites = [];
    }
  }
  renderFavoritesList();
}

function renderFavoritesList() {
  elements.favoritesList.innerHTML = '';
  
  if (AppState.favorites.length === 0) {
    elements.favoritesList.innerHTML = `
      <div class="no-favorites">
        <i data-lucide="star" class="no-favorites-icon"></i>
        <p>No tienes ciudades favoritas guardadas.</p>
      </div>
    `;
    safeCreateIcons();
    return;
  }
  
  AppState.favorites.forEach((fav) => {
    const badge = document.createElement('div');
    badge.className = 'fav-badge';
    
    // Nombre corto para mostrar (ej: "Madrid")
    const shortName = fav.name.split(',')[0];
    
    badge.innerHTML = `
      <span>${shortName}</span>
      <button class="btn-remove-fav" title="Eliminar favorito">
        <i data-lucide="x"></i>
      </button>
    `;
    
    // Click en la ciudad para cargar
    badge.addEventListener('click', (e) => {
      if (e.target.closest('.btn-remove-fav')) return; // No disparar si se clickea la x
      AppState.currentCity = fav;
      localStorage.setItem('aura_last_city', JSON.stringify(fav));
      fetchWeatherData(fav.lat, fav.lon, fav.name);
      elements.favoritesBar.classList.add('hidden'); // Cerrar menú
    });
    
    // Botón eliminar favorito
    badge.querySelector('.btn-remove-fav').addEventListener('click', (e) => {
      e.stopPropagation();
      removeFavorite(fav);
    });
    
    elements.favoritesList.appendChild(badge);
  });
  
  safeCreateIcons();
}

function toggleCurrentFavorite() {
  const isFav = AppState.favorites.some(f => isSameLocation(f, AppState.currentCity));
  
  if (isFav) {
    removeFavorite(AppState.currentCity);
  } else {
    addFavorite(AppState.currentCity);
  }
}

function addFavorite(city) {
  // Evitar duplicados
  if (!AppState.favorites.some(f => isSameLocation(f, city))) {
    AppState.favorites.push(city);
    localStorage.setItem('aura_favorites', JSON.stringify(AppState.favorites));
    renderFavoritesList();
    updateFavoriteBtnState();
    showToast(`Guardado ${city.name.split(',')[0]} en favoritos`, 'star');
  }
}

function removeFavorite(city) {
  AppState.favorites = AppState.favorites.filter(f => !isSameLocation(f, city));
  localStorage.setItem('aura_favorites', JSON.stringify(AppState.favorites));
  renderFavoritesList();
  updateFavoriteBtnState();
  showToast(`Eliminado ${city.name.split(',')[0]} de favoritos`, 'trash');
}

function updateFavoriteBtnState() {
  const isFav = AppState.favorites.some(f => isSameLocation(f, AppState.currentCity));
  if (isFav) {
    elements.favoriteBtn.classList.add('active');
  } else {
    elements.favoriteBtn.classList.remove('active');
  }
}

function isSameLocation(loc1, loc2) {
  // Comparación por coordenadas aproximadas para manejar pequeñas variaciones
  return Math.abs(loc1.lat - loc2.lat) < 0.05 && Math.abs(loc1.lon - loc2.lon) < 0.05;
}

// TOAST NOTIFICATIONS (Premium feedback)
function showToast(message, iconName = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  safeCreateIcons();
  
  // Animación de salida y remoción
  setTimeout(() => {
    toast.style.transition = 'all 0.5s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => {
      toast.remove();
    }, 500);
  }, 3500);
}

// Intentar obtener la ubicación real al inicio de forma silenciosa
function detectUserLocationAutomatically() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      // Si el GPS resuelve a la MISMA ubicación que ya está cargada (caso típico:
      // el usuario vuelve a abrir la app en el mismo sitio), no hay nada que hacer.
      // Evitamos el recargón redundante que reaparecía el skeleton en cada apertura.
      if (isSameLocation({ lat: latitude, lon: longitude }, AppState.currentCity)) {
        return;
      }

      let cityName = 'Tu Ubicación';
      try {
        const response = await fetchWithTimeout(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`, { timeout: 4000 });
        const geoData = await response.json();
        if (geoData.city || geoData.locality) {
          cityName = `${geoData.city || geoData.locality}, ${geoData.countryName}`;
        }
      } catch (err) {
        console.warn('Error al resolver nombre de ubicación inicial', err);
      }

      showToast('Ubicación detectada. Actualizando clima local...', 'map-pin');

      AppState.currentCity = { name: cityName, lat: latitude, lon: longitude };
      localStorage.setItem('aura_last_city', JSON.stringify(AppState.currentCity));
      // Refresco en silencio: si ya hay clima en pantalla, se cambian los datos
      // en su lugar sin volver a mostrar el skeleton de carga.
      fetchWeatherData(latitude, longitude, cityName, { silent: true });
    },
    (error) => {
      console.warn('Geolocalización automática denegada o fallida:', error);
    },
    { enableHighAccuracy: false, timeout: 15000 }
  );
}

// Llamada segura para procesar iconos de Lucide
function safeCreateIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  } else {
    console.warn('Lucide no cargó a tiempo. Reintentando en breve...');
    setTimeout(() => {
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }, 1000);
  }
}

// Convertidor/Formateador de temperatura
function formatTemp(celsius, rawValueOnly = false) {
  let value = celsius;
  if (AppState.unit === 'F') {
    value = (celsius * 9) / 5 + 32;
  }
  value = Math.round(value);
  if (rawValueOnly) return value;
  return `${value}°${AppState.unit}`;
}

// Alternar unidades de temperatura
function toggleTemperatureUnit() {
  AppState.unit = AppState.unit === 'C' ? 'F' : 'C';
  
  const toggleBtn = elements.unitToggleBtn;
  if (toggleBtn) {
    toggleBtn.textContent = `°${AppState.unit === 'C' ? 'F' : 'C'}`;
    toggleBtn.title = `Cambiar a °${AppState.unit === 'C' ? 'F' : 'C'}`;
    toggleBtn.setAttribute('aria-label', `Cambiar a grados ${AppState.unit === 'C' ? 'Fahrenheit' : 'Celsius'}`);
  }
  
  // Actualizar indicador de unidad principal
  const unitDisplay = document.querySelector('.temp-unit');
  if (unitDisplay) {
    unitDisplay.textContent = `°${AppState.unit}`;
  }
  
  // Re-renderizar con los datos en cache si existen
  if (AppState.lastWeatherData) {
    renderWeather(AppState.lastWeatherData, AppState.currentCity.name);
  }
  
  showToast(`Unidades cambiadas a °${AppState.unit}`, 'thermometer');
}

// Compartir clima por API Web Share o Copiar
async function shareCurrentWeather() {
  if (!AppState.lastWeatherData) return;
  
  const current = AppState.lastWeatherData.current;
  const codeInfo = WeatherCodes[current.weather_code] || { label: 'Despejado' };
  const tempStr = formatTemp(current.temperature_2m);
  
  const shareText = `AuraWeather: El clima en ${AppState.currentCity.name.split(',')[0]} es de ${tempStr} (${codeInfo.label}). ¡Consulta tu pronóstico en tu navegador!`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Clima en ${AppState.currentCity.name.split(',')[0]}`,
        text: shareText,
        url: window.location.href
      });
    } catch (err) {
      console.warn('Error al compartir:', err);
    }
  } else {
    try {
      await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      showToast('¡Texto del clima copiado al portapapeles!', 'share-2');
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      showToast('No se pudo copiar el texto.', 'alert-triangle');
    }
  }
}

// Generación de partículas de clima en el fondo (Lluvia o Nieve)
// ¿El usuario prefiere movimiento reducido? Se consulta en vivo por si cambia.
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function updateWeatherEffects(weatherClass, isDay) {
  stopParticles();
  stopStormEffects();

  const reduce = prefersReducedMotion();

  // La tormenta siempre dispara rayos/truenos (el destello se omite si hay
  // movimiento reducido; el trueno de audio se mantiene).
  if (weatherClass === 'weather-storm') {
    if (!reduce) startRain(130);
    startStormEffects();
    return;
  }

  // Si es de noche y despejado/nublado, no agregamos lluvia/nieve
  if (isDay === 0 && (weatherClass === 'weather-clear-day' || weatherClass === 'weather-night')) {
    return;
  }

  // Con movimiento reducido no dibujamos partículas
  if (reduce) return;

  if (weatherClass === 'weather-rainy') {
    startRain(85);
  } else if (weatherClass === 'weather-snowy') {
    startSnow(70);
  }
}

// ==========================================
// RAYOS + TRUENOS SINCRONIZADOS (TORMENTA)
// ==========================================

function startStormEffects() {
  stopStormEffects();
  const strike = () => {
    triggerLightning();
    // Siguiente rayo en un intervalo irregular (6–18 s)
    stormTimeout = setTimeout(strike, 6000 + Math.random() * 12000);
  };
  // Primer rayo poco después de cargar el clima
  stormTimeout = setTimeout(strike, 2500 + Math.random() * 2500);
}

function stopStormEffects() {
  if (stormTimeout) {
    clearTimeout(stormTimeout);
    stormTimeout = null;
  }
}

function triggerLightning() {
  // Destello visual (se omite con movimiento reducido)
  const flash = document.getElementById('lightning-flash');
  if (flash && !prefersReducedMotion()) {
    flash.classList.remove('flashing');
    void flash.offsetWidth; // reinicia la animación forzando un reflow
    flash.classList.add('flashing');
  }
  // El trueno llega un instante después (la luz viaja más rápido que el sonido).
  // playThunder() ya verifica que exista audioCtx y que el sonido no esté silenciado.
  const thunderDelay = 300 + Math.random() * 1200;
  setTimeout(playThunder, thunderDelay);
}

function initParticleCanvas() {
  if (particleCanvas) return true;
  particleCanvas = document.getElementById('weather-particles-canvas');
  if (!particleCanvas) return false;
  particleCtx = particleCanvas.getContext('2d');
  resizeParticleCanvas();
  window.addEventListener('resize', resizeParticleCanvas);
  return true;
}

function resizeParticleCanvas() {
  if (!particleCanvas) return;
  particleCanvas.width = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}

function createRainDrop() {
  return {
    x: Math.random() * particleCanvas.width,
    y: Math.random() * -particleCanvas.height,
    length: 10 + Math.random() * 18,
    speed: 5 + Math.random() * 7,
    drift: 1 + Math.random() * 1.8, // deriva por viento
    opacity: 0.2 + Math.random() * 0.3
  };
}

function createSnowFlake() {
  return {
    x: Math.random() * particleCanvas.width,
    y: Math.random() * -particleCanvas.height,
    radius: 1.5 + Math.random() * 3,
    speed: 0.5 + Math.random() * 1.4,
    drift: Math.random() * 1 - 0.5,
    swaySeed: Math.random() * Math.PI * 2,
    opacity: 0.4 + Math.random() * 0.5
  };
}

function startRain(intensity) {
  if (!initParticleCanvas()) return;
  particleMode = 'rain';
  particles = Array.from({ length: intensity }, createRainDrop);
  animateParticles();
}

function startSnow(intensity) {
  if (!initParticleCanvas()) return;
  particleMode = 'snow';
  particles = Array.from({ length: intensity }, createSnowFlake);
  animateParticles();
}

function stopParticles() {
  if (particleAnimationId) {
    cancelAnimationFrame(particleAnimationId);
    particleAnimationId = null;
  }
  particles = [];
  particleMode = null;
  if (particleCtx && particleCanvas) {
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  }
}

function animateParticles() {
  if (!particleCtx || !particleCanvas || !particleMode) return;
  particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

  if (particleMode === 'rain') {
    particleCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    particleCtx.lineWidth = 1.2;
    particles.forEach((drop) => {
      particleCtx.globalAlpha = drop.opacity;
      particleCtx.beginPath();
      particleCtx.moveTo(drop.x, drop.y);
      particleCtx.lineTo(drop.x - drop.drift * 2, drop.y + drop.length);
      particleCtx.stroke();
      drop.y += drop.speed;
      drop.x += drop.drift;
      if (drop.y > particleCanvas.height) {
        drop.y = -drop.length;
        drop.x = Math.random() * particleCanvas.width;
      }
    });
  } else if (particleMode === 'snow') {
    particleCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    particles.forEach((flake) => {
      particleCtx.globalAlpha = flake.opacity;
      particleCtx.beginPath();
      particleCtx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      particleCtx.fill();
      flake.y += flake.speed;
      flake.x += Math.sin((flake.y + flake.swaySeed) / 40) * 0.6 + flake.drift * 0.2;
      if (flake.y > particleCanvas.height) {
        flake.y = -flake.radius;
        flake.x = Math.random() * particleCanvas.width;
      }
    });
  }
  particleCtx.globalAlpha = 1;
  particleAnimationId = requestAnimationFrame(animateParticles);
}

// ==========================================
// CONTROL DE INSTALACIÓN PWA (PROGRAMÁTICO)
// ==========================================

// Capturar el evento de instalación que envía el navegador
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevenir que el navegador muestre su propio banner automático
  e.preventDefault();
  // Guardar el evento para dispararlo más tarde
  deferredPrompt = e;
  
  // Buscar el badge del footer
  const pwaBadge = document.querySelector('.pwa-badge');
  if (pwaBadge) {
    pwaBadge.classList.add('clickable');
    pwaBadge.textContent = 'Instalar AuraWeather';
    pwaBadge.title = 'Instalar como aplicación en tu dispositivo';
    
    // Remover listener viejo por si acaso y añadir el nuevo
    pwaBadge.removeEventListener('click', triggerPWAInstall);
    pwaBadge.addEventListener('click', triggerPWAInstall);
  }
});

// Función para ejecutar la instalación cuando hagan clic
function triggerPWAInstall() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  
  if (isStandalone) {
    showToast('AuraWeather ya está instalada y funcionando.', 'check-circle');
    return;
  }

  if (!deferredPrompt) {
    showToast('Para instalar: pulsa en el menú (︙) de Chrome/Brave y elige "Instalar aplicación".', 'info');
    return;
  }
  
  // Mostrar el banner de instalación guardado
  deferredPrompt.prompt();
  
  // Analizar la respuesta del usuario
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('El usuario aceptó instalar AuraWeather.');
      showToast('¡Instalación iniciada!', 'check');
    } else {
      console.log('El usuario rechazó instalar AuraWeather.');
    }
    
    // Limpiar el prompt guardado ya que solo se puede usar una vez
    deferredPrompt = null;
    
    // Devolver el badge a su estado original
    const pwaBadge = document.querySelector('.pwa-badge');
    if (pwaBadge) {
      pwaBadge.classList.remove('clickable');
      pwaBadge.textContent = 'Versión PWA Instalable';
      pwaBadge.title = '';
    }
  });
}

// Escuchar cuando la app se haya instalado con éxito
window.addEventListener('appinstalled', (evt) => {
  console.log('AuraWeather instalada con éxito.');
  showToast('¡Aplicación instalada con éxito!', 'check-circle');
  
  // Limpiar el botón
  const pwaBadge = document.querySelector('.pwa-badge');
  if (pwaBadge) {
    pwaBadge.classList.remove('clickable');
    pwaBadge.textContent = 'AuraWeather Instalada';
  }
});

// 10. Actualizar astronomía (Sol y Luna)
function updateAstronomy(data) {
  const daily = data.daily;
  const current = data.current;
  
  if (!daily || !daily.sunrise || !daily.sunset) return;
  
  const sunriseStr = daily.sunrise[0];
  const sunsetStr = daily.sunset[0];
  
  // Formateador interno para mostrar las horas del sol de forma legible
  const formatTimeStr = (isoStr) => {
    if (!isoStr) return '--:--';
    const date = new Date(isoStr);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  
  const sunriseFormatted = formatTimeStr(sunriseStr);
  const sunsetFormatted = formatTimeStr(sunsetStr);
  
  // Mostrar valores textuales
  if (elements.sunriseVal) elements.sunriseVal.textContent = sunriseFormatted;
  if (elements.sunsetVal) elements.sunsetVal.textContent = sunsetFormatted;
  
  // Mostrar etiquetas cortas de los extremos del arco (sin AM/PM)
  const stripAmPm = (str) => str.replace(/\s*[a-zA-Z\.]+$/, '').trim();
  if (elements.sunriseTimeLabel) elements.sunriseTimeLabel.textContent = stripAmPm(sunriseFormatted);
  if (elements.sunsetTimeLabel) elements.sunsetTimeLabel.textContent = stripAmPm(sunsetFormatted);
  
  // Calcular la posición del sol en el arco visual
  const now = new Date();
  const sunriseTime = new Date(sunriseStr);
  const sunsetTime = new Date(sunsetStr);
  const sunNode = elements.sunNode;
  
  if (sunNode) {
    const isDaytime = now >= sunriseTime && now <= sunsetTime;
    let progress = 0;
    
    if (isDaytime) {
      // El sol está arriba
      const totalDaylight = sunsetTime.getTime() - sunriseTime.getTime();
      const currentDaylight = now.getTime() - sunriseTime.getTime();
      progress = currentDaylight / totalDaylight;
      
      // Color dorado para el Sol
      sunNode.setAttribute('fill', '#fbbf24');
    } else {
      // Es de noche: calcular el progreso de la noche
      let nightStart, nightEnd;
      if (now > sunsetTime) {
        // La noche empezó hoy al atardecer y termina mañana al amanecer
        nightStart = sunsetTime;
        nightEnd = daily.sunrise[1] ? new Date(daily.sunrise[1]) : new Date(sunsetTime.getTime() + 12 * 60 * 60 * 1000);
      } else {
        // La noche empezó ayer al atardecer y termina hoy al amanecer
        nightStart = daily.sunset[0] ? new Date(new Date(daily.sunset[0]).getTime() - 24 * 60 * 60 * 1000) : new Date(sunriseTime.getTime() - 12 * 60 * 60 * 1000);
        nightEnd = sunriseTime;
      }
      
      const totalNight = nightEnd.getTime() - nightStart.getTime();
      const currentNight = now.getTime() - nightStart.getTime();
      progress = currentNight / totalNight;
      
      // Color plateado/blanco para la Luna
      sunNode.setAttribute('fill', '#e2e8f0');
    }
    
    // Forzar límites de progreso
    progress = Math.max(0, Math.min(1, progress));
    
    // Ángulo de semicírculo en grados (180 a 0)
    const angleDeg = 180 - (progress * 180);
    const angleRad = (angleDeg * Math.PI) / 180;
    
    // Radio del arco es 40, centro en (50, 45) en base al viewBox del SVG
    const cx = 50 + 40 * Math.cos(angleRad);
    const cy = 45 - 40 * Math.sin(angleRad);
    
    sunNode.setAttribute('cx', cx.toFixed(1));
    sunNode.setAttribute('cy', cy.toFixed(1));
    sunNode.style.display = 'block';
  }
  
  // Calcular fase lunar
  const moonInfo = calculateMoonPhase(now);
  if (elements.moonPhaseLabel) elements.moonPhaseLabel.textContent = moonInfo.phaseName;
  if (elements.moonIlluminationVal) elements.moonIlluminationVal.textContent = `${moonInfo.illumination}% Iluminada`;
  
  // Actualizar icono de fase lunar
  const moonIconContainer = elements.moonPhaseIconContainer;
  if (moonIconContainer) {
    let iconName = 'moon';
    if (moonInfo.phaseName === 'Luna Nueva') {
      iconName = 'moon';
    } else if (moonInfo.phaseName.includes('Creciente')) {
      iconName = 'cloud-moon';
    } else if (moonInfo.phaseName === 'Luna Llena') {
      iconName = 'sparkles';
    } else {
      iconName = 'moon-star';
    }
    moonIconContainer.innerHTML = `<i data-lucide="${iconName}" id="moon-phase-icon"></i>`;
  }
}

// Algoritmo matemático simplificado para calcular la fase lunar y porcentaje
function calculateMoonPhase(date) {
  // Conocida Luna Nueva: 7 de Enero de 1970 20:35 UTC
  const knownNewMoon = new Date(1970, 0, 7, 20, 35, 0).getTime();
  const msPerCycle = 29.530588853 * 24 * 60 * 60 * 1000;
  
  let diff = date.getTime() - knownNewMoon;
  let cycleProgress = (diff % msPerCycle) / msPerCycle;
  if (cycleProgress < 0) cycleProgress += 1;
  
  let phaseName = "";
  let illumination = 0;
  
  if (cycleProgress < 0.03 || cycleProgress > 0.97) {
    phaseName = "Luna Nueva";
    illumination = 0;
  } else if (cycleProgress >= 0.03 && cycleProgress < 0.22) {
    phaseName = "Creciente Cóncava";
    illumination = Math.round(cycleProgress * 200);
  } else if (cycleProgress >= 0.22 && cycleProgress < 0.28) {
    phaseName = "Cuarto Creciente";
    illumination = 50;
  } else if (cycleProgress >= 0.28 && cycleProgress < 0.47) {
    phaseName = "Gíbosa Creciente";
    illumination = Math.round(cycleProgress * 200);
  } else if (cycleProgress >= 0.47 && cycleProgress < 0.53) {
    phaseName = "Luna Llena";
    illumination = 100;
  } else if (cycleProgress >= 0.53 && cycleProgress < 0.72) {
    phaseName = "Gíbosa Menguante";
    illumination = Math.round((1 - cycleProgress) * 200);
  } else if (cycleProgress >= 0.72 && cycleProgress < 0.78) {
    phaseName = "Cuarto Menguante";
    illumination = 50;
  } else {
    phaseName = "Menguante Cóncava";
    illumination = Math.round((1 - cycleProgress) * 200);
  }
  
  illumination = Math.max(0, Math.min(100, illumination));
  
  return { phaseName, illumination };
}


// 12. Renderizar tarjetas de pronóstico por horas (swipeable)
function renderHourlyScroll(hourly) {
  const container = elements.hourlyScrollContainer;
  if (!container) return;
  
  container.innerHTML = '';
  
  const now = new Date();
  const currentHour = now.getHours();
  
  // Renderizar las siguientes 12 horas
  for (let i = currentHour; i < currentHour + 12; i++) {
    if (i >= hourly.time.length) break;
    
    const date = new Date(hourly.time[i]);
    const displayHour = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    let tempVal = hourly.temperature_2m[i];
    if (AppState.unit === 'F') {
      tempVal = (tempVal * 9) / 5 + 32;
    }
    const tempText = `${Math.round(tempVal)}°`;
    
    const weatherCode = hourly.weather_code[i];
    const codeInfo = WeatherCodes[weatherCode] || { label: 'Desconocido', icon: 'help-circle' };
    const rainProb = hourly.precipitation_probability[i];
    
    const card = document.createElement('div');
    card.className = 'hourly-item-card';
    
    let rainBadgeHtml = '';
    if (rainProb > 0) {
      rainBadgeHtml = `<span class="hourly-item-rain"><i data-lucide="droplets" style="width: 10px; height: 10px;"></i> ${rainProb}%</span>`;
    }
    
    card.innerHTML = `
      <span class="hourly-item-time">${i === currentHour ? 'Ahora' : displayHour}</span>
      <i data-lucide="${codeInfo.icon}" class="hourly-item-icon"></i>
      <span class="hourly-item-temp">${tempText}</span>
      ${rainBadgeHtml}
    `;
    
    container.appendChild(card);
  }
}

// 13. Sintetizador de Audio Ambiental con Web Audio API (100% Offline)
function initAudioContext() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
}

function toggleAmbientSound() {
  initAudioContext();
  
  isSoundMuted = !isSoundMuted;
  localStorage.setItem('aura_sound_muted', isSoundMuted ? 'true' : 'false');
  
  const btn = elements.soundBtn;
  if (btn) {
    if (isSoundMuted) {
      btn.classList.remove('active');
      btn.title = 'Activar sonido ambiental';
      btn.setAttribute('aria-label', 'Activar sonido ambiental');
      btn.innerHTML = '<i data-lucide="volume-x" class="sound-icon"></i>';
    } else {
      btn.classList.add('active');
      btn.title = 'Desactivar sonido ambiental';
      btn.setAttribute('aria-label', 'Desactivar sonido ambiental');
      btn.innerHTML = '<i data-lucide="volume-2" class="sound-icon"></i>';
    }
    safeCreateIcons();
  }
  
  // Reanudar contexto si estaba en pausa (política del navegador)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  applyAudioState();
  
  if (!isSoundMuted) {
    showToast('Sonido ambiental activado (Sintetizado)', 'volume-2');
  } else {
    showToast('Sonido ambiental silenciado', 'volume-x');
  }
}

function updateAmbientSound(weatherCode, windSpeed) {
  currentActiveWeatherCode = weatherCode;
  currentWindSpeed = windSpeed;
  
  if (audioCtx && !isSoundMuted) {
    applyAudioState();
  }
}

function applyAudioState() {
  if (!audioCtx) return;
  
  // Si está silenciado, apagar todos los sonidos suavemente y pausar.
  // (Los rayos/truenos los gobierna el temporizador de tormenta, que ya
  //  verifica el estado de silencio en cada descarga.)
  if (isSoundMuted) {
    stopRainSound();
    stopWindSound();
    return;
  }
  
  const code = currentActiveWeatherCode;
  const wind = currentWindSpeed;
  
  const isRainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  const isStormy = code >= 95 && code <= 99;
  const isWindy = wind >= 25 || code === 3 || code === 45 || code === 48 || code === 85 || code === 86;
  
  // Manejar Sonido de Lluvia
  if (isRainy || isStormy) {
    startRainSound(isStormy ? 0.2 : 0.12);
  } else {
    stopRainSound();
  }
  
  // Los truenos ya no se agendan aquí: los dispara startStormEffects() junto
  // con el destello del rayo para que luz y sonido queden sincronizados.

  // Manejar Sonido de Viento
  if (isWindy && !isRainy && !isStormy) {
    startWindSound(Math.min(0.15, wind / 250));
  } else {
    stopWindSound();
  }
}

// Generador de ruido blanco filtrado para la lluvia
function startRainSound(targetVolume) {
  if (rainSound) {
    // Si ya existe, solo ajustamos el volumen suavemente
    rainSound.gainNode.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + 1);
    return;
  }
  
  const bufferSize = audioCtx.sampleRate * 2;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const source = audioCtx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200; // frecuencia de lluvia
  filter.Q.value = 1.0;
  
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + 1.5);
  
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  source.start();
  rainSound = { source, gainNode };
}

function stopRainSound() {
  if (!rainSound) return;
  
  const gn = rainSound.gainNode;
  const src = rainSound.source;
  
  gn.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
  setTimeout(() => {
    try {
      src.stop();
    } catch(e) {}
  }, 1100);
  
  rainSound = null;
}

// Generador de viento (ruido blanco + LFO oscilante + filtro paso bajo)
function startWindSound(targetVolume) {
  if (windSound) {
    windSound.gainNode.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + 1);
    return;
  }
  
  const bufferSize = audioCtx.sampleRate * 3;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const source = audioCtx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 350;
  
  // Modulación lenta de la frecuencia del filtro para simular ráfagas de viento
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08; // ráfagas cada 12 segundos
  
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 180;
  
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + 1.5);
  
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  lfo.start();
  source.start();
  
  windSound = { source, lfo, gainNode };
}

function stopWindSound() {
  if (!windSound) return;
  
  const gn = windSound.gainNode;
  const src = windSound.source;
  const lfo = windSound.lfo;
  
  gn.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
  setTimeout(() => {
    try {
      src.stop();
      lfo.stop();
    } catch(e) {}
  }, 1100);
  
  windSound = null;
}

// Trueno sintetizado de baja frecuencia
function playThunder() {
  if (!audioCtx || isSoundMuted) return;
  
  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 45; // frecuencia ultra baja para el retumbar
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 85;
  
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  // Ataque rápido y desvanecimiento lento (retumbar)
  gainNode.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.15);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 4.5);
  
  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 4.6);
  
  // Pequeño retumbar secundario un segundo después
  setTimeout(() => {
    if (isSoundMuted) return;
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 35;
    
    const filter2 = audioCtx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 60;
    
    const gainNode2 = audioCtx.createGain();
    gainNode2.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode2.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);
    
    osc2.connect(filter2);
    filter2.connect(gainNode2);
    gainNode2.connect(audioCtx.destination);
    
    osc2.start();
    osc2.stop(audioCtx.currentTime + 2.6);
  }, 1200);
}

// 14. Inicializar estado del botón de sonido y persistencia de audio por gestos
function initSoundButtonState() {
  const btn = elements.soundBtn;
  if (!btn) return;
  
  if (isSoundMuted) {
    btn.classList.remove('active');
    btn.title = 'Activar sonido ambiental';
    btn.setAttribute('aria-label', 'Activar sonido ambiental');
    btn.innerHTML = '<i data-lucide="volume-x" class="sound-icon"></i>';
  } else {
    btn.classList.add('active');
    btn.title = 'Desactivar sonido ambiental';
    btn.setAttribute('aria-label', 'Desactivar sonido ambiental');
    btn.innerHTML = '<i data-lucide="volume-2" class="sound-icon"></i>';

    // Registrar listener para habilitar AudioContext tras el primer gesto
    const playAudioOnGesture = () => {
      initAudioContext();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      applyAudioState();
      document.removeEventListener('click', playAudioOnGesture);
      document.removeEventListener('touchstart', playAudioOnGesture);
    };
    document.addEventListener('click', playAudioOnGesture);
    document.addEventListener('touchstart', playAudioOnGesture);
  }
}

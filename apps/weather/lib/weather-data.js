/**
 * AuraWeather — lógica pura de datos meteorológicos.
 *
 * Vive aparte de `app.js` para poder probarla: son transformaciones sin DOM ni
 * red, y es justo donde un error pasa desapercibido — un icono mal mapeado o
 * una humedad mal estimada no rompen nada, solo muestran un dato equivocado.
 */

// Convertidor de iconos de BrightSky (Symbol Code) a códigos WMO standard
export function brightSkyIconToWmoCode(icon) {
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
export function estimateHumidityFromDewPoint(tempC, dewPointC) {
  if (tempC === null || tempC === undefined || dewPointC === null || dewPointC === undefined) return null;
  const a = 17.625, b = 243.04;
  const alphaTemp = (a * tempC) / (b + tempC);
  const alphaDew = (a * dewPointC) / (b + dewPointC);
  const rh = 100 * Math.exp(alphaDew - alphaTemp);
  return Math.round(Math.min(100, Math.max(0, rh)));
}

// Adaptador para convertir la estructura de BrightSky al formato JSON de Open-Meteo
export function mapBrightSkyToOpenMeteo(brightData, lat, lon) {
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

// Descripción del índice UV
export function getUVDescription(uv) {
  if (uv <= 2) return `Bajo (${Math.round(uv)})`;
  if (uv <= 5) return `Moderado (${Math.round(uv)})`;
  if (uv <= 7) return `Alto (${Math.round(uv)})`;
  if (uv <= 10) return `Muy Alto (${Math.round(uv)})`;
  return `Extremo (${Math.round(uv)})`;
}

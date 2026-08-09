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

/**
 * Sensación térmica aparente (°C) — la misma fórmula del BOM que Open-Meteo
 * usa para `apparent_temperature`. BrightSky no la reporta; antes se copiaba
 * la temperatura, que es engañoso cuando difieren.
 *
 * AT = Ta + 0.33·e − 0.70·ws − 4.00, con e la presión de vapor (hPa) y ws el
 * viento en m/s. `windKmh` está en km/h, como lo reporta BrightSky.
 */
export function estimateApparentTemperature(tempC, rh, windKmh) {
  if (tempC === null || tempC === undefined || rh === null || rh === undefined) return null;
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  const ws = (windKmh ?? 0) / 3.6;
  return Math.round((tempC + 0.33 * e - 0.7 * ws - 4.0) * 10) / 10;
}

/**
 * Salida y puesta del sol para una fecha, en hora local del dispositivo.
 *
 * BrightSky no las reporta; antes se inventaba un 06:30/20:30 fijo que además
 * alimentaba el arco astronómico con horas falsas. Este es el algoritmo
 * clásico de salida/puesta (NOAA, exactitud típica ±2 min), corregido por
 * longitud y por la zona horaria del dispositivo EN ESA FECHA (respeta el
 * horario de verano). `tzOffsetMinutes` se inyecta en tests para que no
 * dependan de la zona de la máquina.
 *
 * Devuelve `null` cuando no hay salida/puesta ese día (sol de medianoche /
 * noche polar).
 */
export function estimateSunTimes(lat, lon, date, tzOffsetMinutes = date.getTimezoneOffset()) {
  const rad = Math.PI / 180;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Día del año.
  const n1 = Math.floor((275 * month) / 9);
  const n2 = Math.floor((month + 9) / 12);
  const n3 = 1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3);
  const N = n1 - n2 * n3 + day - 30;

  const tz = -tzOffsetMinutes / 60;
  const lngHour = lon / 15;

  const compute = (isRise) => {
    const hourBase = isRise ? 6 : 18;
    const t = N + (hourBase - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    const L = M + 1.916 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 282.634;
    let RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad;
    RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
    RA /= 15;
    const sinDec = 0.39782 * Math.sin(L * rad);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
    if (cosH < -1.0000001 || cosH > 1.0000001) return null;
    const Hdeg = Math.acos(Math.max(-1, Math.min(1, cosH))) / rad;
    const H = (isRise ? 360 - Hdeg : Hdeg) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    return (T - lngHour + tz + 24) % 24;
  };

  const rise = compute(true);
  const set = compute(false);
  if (rise === null || set === null) return null;

  const toDate = (decimalHour) => {
    const minutes = decimalHour * 60;
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.round(minutes % 60);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  };
  return { sunrise: toDate(rise), sunset: toDate(set) };
}

// "YYYY-MM-DDTHH:MM" en hora local (mismo formato que `hourly.time`): app.js lo
// parsea como hora local y no hay desfasamiento de zona.
function toLocalHourMinute(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
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

  const currentHumidity = (currentItem.relative_humidity !== null && currentItem.relative_humidity !== undefined)
    ? currentItem.relative_humidity
    : estimateHumidityFromDewPoint(currentItem.temperature, currentItem.dew_point);

  // Mapear datos actuales
  const current = {
    temperature_2m: currentItem.temperature,
    relative_humidity_2m: currentHumidity,
    apparent_temperature: estimateApparentTemperature(
      currentItem.temperature,
      currentHumidity,
      currentItem.wind_speed
    ),
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
    const itemHumidity = (item.relative_humidity !== null && item.relative_humidity !== undefined)
      ? item.relative_humidity
      : estimateHumidityFromDewPoint(item.temperature, item.dew_point);
    hourly.relative_humidity_2m.push(itemHumidity);
    hourly.apparent_temperature.push(estimateApparentTemperature(item.temperature, itemHumidity, item.wind_speed));
    hourly.precipitation_probability.push(item.precipitation_probability || 0);
    hourly.weather_code.push(brightSkyIconToWmoCode(item.icon));
    // BrightSky no reporta índice UV: null en vez de inventar un 0.
    hourly.uv_index.push(null);
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

    const feels = dayItems
      .map(item => estimateApparentTemperature(
        item.temperature,
        (item.relative_humidity !== null && item.relative_humidity !== undefined)
          ? item.relative_humidity
          : estimateHumidityFromDewPoint(item.temperature, item.dew_point),
        item.wind_speed
      ))
      .filter(v => v !== null);

    daily.time.push(dayKey);
    daily.weather_code.push(brightSkyIconToWmoCode(dayIcon));
    daily.temperature_2m_max.push(maxTemp);
    daily.temperature_2m_min.push(minTemp);
    daily.apparent_temperature_max.push(feels.length > 0 ? Math.max(...feels) : null);
    daily.apparent_temperature_min.push(feels.length > 0 ? Math.min(...feels) : null);

    // Salida/puesta del sol reales (algoritmo NOAA) en vez del 06:30/20:30
    // inventado que alimentaba el arco astronómico con horas falsas.
    const sun = estimateSunTimes(lat, lon, new Date(`${dayKey}T12:00:00`));
    daily.sunrise.push(sun ? toLocalHourMinute(sun.sunrise) : null);
    daily.sunset.push(sun ? toLocalHourMinute(sun.sunset) : null);

    // BrightSky no reporta índice UV: null en vez de inventar un 5.
    daily.uv_index_max.push(null);
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

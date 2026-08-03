import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  brightSkyIconToWmoCode,
  estimateHumidityFromDewPoint,
  getUVDescription,
  mapBrightSkyToOpenMeteo,
} from './weather-data.js';

/**
 * Estas transformaciones son el punto ciego de AuraWeather: si fallan no se
 * rompe nada visiblemente, simplemente se muestra un dato equivocado. Un icono
 * mal mapeado o una humedad mal estimada pasan desapercibidos.
 */

describe('iconos de BrightSky → códigos WMO', () => {
  it('traduce los estados del cielo', () => {
    expect(brightSkyIconToWmoCode('clear-day')).toBe(0);
    expect(brightSkyIconToWmoCode('rain')).toBe(61);
    expect(brightSkyIconToWmoCode('thunderstorm')).toBe(95);
    expect(brightSkyIconToWmoCode('snow')).toBe(71);
  });

  it('día y noche comparten código: la distinción se hace aparte', () => {
    expect(brightSkyIconToWmoCode('clear-night')).toBe(brightSkyIconToWmoCode('clear-day'));
    expect(brightSkyIconToWmoCode('partly-cloudy-night')).toBe(
      brightSkyIconToWmoCode('partly-cloudy-day'),
    );
  });

  it('sin icono asume despejado; desconocido cae a nublado', () => {
    expect(brightSkyIconToWmoCode(null)).toBe(0);
    expect(brightSkyIconToWmoCode(undefined)).toBe(0);
    // Mejor "nublado" que un valor que dispare animaciones de tormenta.
    expect(brightSkyIconToWmoCode('meteorito')).toBe(3);
  });
});

describe('humedad estimada desde el punto de rocío', () => {
  it('si rocío y temperatura coinciden, el aire está saturado', () => {
    expect(estimateHumidityFromDewPoint(20, 20)).toBe(100);
  });

  it('cuanto más separado el rocío, más seco', () => {
    const humedo = estimateHumidityFromDewPoint(20, 18);
    const seco = estimateHumidityFromDewPoint(20, 2);
    expect(humedo).toBeGreaterThan(seco);
    expect(estimateHumidityFromDewPoint(20, 10)).toBe(53); // Magnus-Tetens
  });

  it('nunca se sale de 0–100 aunque los datos vengan raros', () => {
    // Un rocío por encima de la temperatura es físicamente imposible, pero
    // una estación averiada puede reportarlo: no debe salir 120 %.
    expect(estimateHumidityFromDewPoint(10, 25)).toBe(100);
    expect(estimateHumidityFromDewPoint(30, -40)).toBeGreaterThanOrEqual(0);
  });

  it('devuelve null si falta algún dato, en vez de inventarlo', () => {
    expect(estimateHumidityFromDewPoint(null, 10)).toBeNull();
    expect(estimateHumidityFromDewPoint(20, undefined)).toBeNull();
  });
});

describe('descripción del índice UV', () => {
  it('nombra cada tramo de riesgo', () => {
    expect(getUVDescription(1)).toContain('Bajo');
    expect(getUVDescription(4)).toContain('Moderado');
    expect(getUVDescription(6)).toContain('Alto');
    expect(getUVDescription(9)).toContain('Muy Alto');
    expect(getUVDescription(12)).toContain('Extremo');
  });

  it('los límites caen en el tramo inferior', () => {
    expect(getUVDescription(2)).toContain('Bajo');
    expect(getUVDescription(5)).toContain('Moderado');
    // Un 7 es "Alto", no "Muy Alto": equivocarse aquí exagera la alarma.
    expect(getUVDescription(7)).toContain('Alto');
    expect(getUVDescription(7)).not.toContain('Muy');
  });
});

describe('BrightSky → estructura de Open-Meteo', () => {
  // Todo el renderizado asume la forma de Open-Meteo; este adaptador es el
  // único puente, así que un fallo aquí desfigura la app entera.
  const AHORA = new Date('2026-08-02T14:00:00.000Z');

  function horas(n, desde = '2026-08-02T00:00:00.000Z') {
    const inicio = new Date(desde).getTime();
    return Array.from({ length: n }, (_, i) => ({
      timestamp: new Date(inicio + i * 3600_000).toISOString(),
      temperature: 10 + i * 0.5,
      dew_point: 5,
      relative_humidity: null,
      precipitation: 0,
      cloud_cover: 20,
      pressure_msl: 1013,
      wind_speed: 12.4,
      icon: 'clear-day',
    }));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
  });
  afterEach(() => vi.useRealTimers());

  it('rechaza una respuesta vacía en vez de producir datos falsos', () => {
    expect(() => mapBrightSkyToOpenMeteo({ weather: [] }, 40, -3)).toThrow();
    expect(() => mapBrightSkyToOpenMeteo({}, 40, -3)).toThrow();
  });

  it('elige la hora más cercana al momento actual', () => {
    const data = mapBrightSkyToOpenMeteo({ weather: horas(48) }, 40, -3);

    // A las 14:00 UTC corresponde el índice 14 → 10 + 14*0.5
    expect(data.current.temperature_2m).toBe(17);
  });

  it('estima la humedad cuando la estación no la reporta', () => {
    const data = mapBrightSkyToOpenMeteo({ weather: horas(24) }, 40, -3);

    // relative_humidity viene null: debe rellenarse desde el punto de rocío.
    expect(data.current.relative_humidity_2m).toBeGreaterThan(0);
    expect(data.current.relative_humidity_2m).toBeLessThanOrEqual(100);
  });

  it('respeta la humedad medida si viene informada', () => {
    const w = horas(24);
    w[14].relative_humidity = 42;

    const data = mapBrightSkyToOpenMeteo({ weather: w }, 40, -3);

    expect(data.current.relative_humidity_2m).toBe(42);
  });

  it('deduce si es de día a partir del icono', () => {
    const dia = mapBrightSkyToOpenMeteo({ weather: horas(24) }, 40, -3);
    expect(dia.current.is_day).toBe(1);

    const noche = horas(24).map((h) => ({ ...h, icon: 'clear-night' }));
    expect(mapBrightSkyToOpenMeteo({ weather: noche }, 40, -3).current.is_day).toBe(0);
  });

  it('produce la forma que espera el renderizado', () => {
    const data = mapBrightSkyToOpenMeteo({ weather: horas(48) }, 40, -3);

    expect(data).toHaveProperty('current');
    expect(data).toHaveProperty('hourly');
    expect(data).toHaveProperty('daily');
    expect(Array.isArray(data.hourly.time)).toBe(true);
    expect(data.hourly.temperature_2m.length).toBe(data.hourly.time.length);
  });
});

/**
 * Normalización por pista (estilo ReplayGain).
 *
 * A diferencia del compresor dinámico (que actúa en tiempo real), aquí se mide
 * la sonoridad de cada archivo una sola vez y se guarda una ganancia fija, así
 * canciones masterizadas a niveles muy distintos suenan parejo sin bombear el
 * volumen como haría un compresor agresivo.
 *
 * Se calcula en el primer play y se cachea en `track.replayGain`; decodificar
 * un archivo entero es caro, así que se acota por tamaño.
 */

/** RMS objetivo, en amplitud lineal (~ -16 dBFS). */
const TARGET_RMS = 0.158;
/** Evita ganancias absurdas en silencios o archivos casi mudos. */
const MIN_GAIN = 0.1;
const MAX_GAIN = 8;
/** Por encima de esto no se decodifica: el PCM crudo sería demasiado para RAM. */
export const MAX_ANALYSIS_BYTES = 50 * 1024 * 1024;

function measureRms(buffer: AudioBuffer): number {
  let sum = 0;
  let count = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const data = buffer.getChannelData(ch);
    // Muestreo con paso: suficiente para un RMS estable sin recorrer millones
    // de samples por canal.
    const stride = Math.max(1, Math.floor(data.length / 200_000));
    for (let i = 0; i < data.length; i += stride) {
      sum += data[i] * data[i];
      count += 1;
    }
  }
  return count > 0 ? Math.sqrt(sum / count) : 0;
}

/** Ganancia lineal a aplicar para acercar `buffer` al nivel objetivo. */
export function gainForBuffer(buffer: AudioBuffer): number {
  const rms = measureRms(buffer);
  if (!(rms > 0)) return 1;
  return Math.min(MAX_GAIN, Math.max(MIN_GAIN, TARGET_RMS / rms));
}

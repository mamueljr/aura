import { describe, expect, it } from 'vitest';

import { gainForBuffer } from './loudness';

/**
 * La ganancia ReplayGain se calcula con matemática simple, pero un error de
 * signo o un RMS mal medido deja toda la biblioteca a volumen equivocado. Se
 * prueba con buffers sintéticos de amplitud conocida.
 */

function fakeBuffer(channels: Float32Array[]): AudioBuffer {
  return {
    numberOfChannels: channels.length,
    getChannelData: (ch: number) => channels[ch],
  } as unknown as AudioBuffer;
}

function constantBuffer(value: number, length = 1000): AudioBuffer {
  const data = new Float32Array(length);
  data.fill(value);
  return fakeBuffer([data]);
}

describe('gainForBuffer', () => {
  it('una señal silenciosa no recibe ganancia (evita amplificar ruido)', () => {
    expect(gainForBuffer(constantBuffer(0))).toBe(1);
  });

  it('una señal fuerte se atenúa y una débil se amplifica', () => {
    // RMS = 0.5 (fuerte) → ganancia < 1
    expect(gainForBuffer(constantBuffer(0.5))).toBeLessThan(1);
    // RMS = 0.02 (débil) → ganancia > 1
    expect(gainForBuffer(constantBuffer(0.02))).toBeGreaterThan(1);
  });

  it('acota la ganancia dentro del rango permitido', () => {
    // Señal casi nula: pediría una ganancia enorme, pero se recorta a MAX.
    expect(gainForBuffer(constantBuffer(0.000001))).toBeLessThanOrEqual(8);
  });
});

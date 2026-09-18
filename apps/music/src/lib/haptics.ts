/**
 * Vibración ligera (haptics). Solo Android/Chromium soportan `navigator.vibrate`;
 * en el resto es un no-op silencioso. Los patrones son cortos a propósito para
 * no molestar: confirmación, no atención.
 */

function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* noop */
  }
}

export function hapticTrackChange(): void {
  vibrate(15);
}

export function hapticTap(): void {
  vibrate(8);
}

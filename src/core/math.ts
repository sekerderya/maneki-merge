const SNAP = 1e6;

/**
 * Math.round that ignores floating-point noise: 50 × 1.15 is 57.49999999999999 in JS but
 * means 57.5, which rounds to 58. Values are snapped to 6 decimals first.
 */
export function roundStable(value: number): number {
  return Math.round(Math.round(value * SNAP) / SNAP);
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

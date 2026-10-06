/**
 * Camera shake (GAME_DESIGN §12), pure: a decaying two-axis wobble driven by the frame clock. A
 * stronger shake replaces a weaker one that is still running; the scene adds the offset to the
 * camera centre after fitting it, so the fit itself never changes.
 */
import { MERGE_PARTICLES, REDUCED_MOTION_PARTICLES, SHAKE } from '../config/view';

export class Shake {
  private startMs = -Infinity;
  private durationMs = 1;
  private amplitude = 0;

  /** Starts a shake of `amplitude` world units, unless a stronger one is still running. */
  add(nowMs: number, amplitude: number, durationMs: number): void {
    if (amplitude <= 0) return;
    if (this.current(nowMs) > amplitude) return;
    this.startMs = nowMs;
    this.durationMs = Math.max(1, durationMs);
    this.amplitude = amplitude;
  }

  /** The running shake's amplitude at `nowMs` (0 when still). */
  current(nowMs: number): number {
    const t = (nowMs - this.startMs) / this.durationMs;
    if (t < 0 || t >= 1) return 0;
    return this.amplitude * (1 - t) * (1 - t);
  }

  /** The camera offset at `nowMs`, written into `out`. */
  offset(nowMs: number, out: { x: number; y: number }): { x: number; y: number } {
    const a = this.current(nowMs);
    const s = (nowMs - this.startMs) / 1000;
    out.x = a === 0 ? 0 : a * Math.sin(2 * Math.PI * SHAKE.frequencyX * s);
    out.y = a === 0 ? 0 : a * Math.cos(2 * Math.PI * SHAKE.frequencyY * s) * 0.7;
    return out;
  }

  clear(): void {
    this.startMs = -Infinity;
    this.amplitude = 0;
  }
}

/** Shake amplitude (world units) for a merge into a cat of `newSize`; 0 below SHAKE.minSize. */
export function mergeShake(newSize: number): number {
  if (newSize < SHAKE.minSize) return 0;
  return SHAKE.mergeBase + (newSize - SHAKE.minSize) * SHAKE.mergePerSize;
}

/** Shake amplitude for combo level `combo`; 0 below SHAKE.comboMin, capped at SHAKE.comboMax. */
export function comboShake(combo: number): number {
  if (combo < SHAKE.comboMin) return 0;
  return Math.min(SHAKE.comboMax, (combo - SHAKE.comboMin + 1) * SHAKE.comboStep);
}

/** Particles of a merge into a cat of `newSize`, fewer with reduced motion. */
export function mergeParticleCount(newSize: number, reduced: boolean): number {
  const p = MERGE_PARTICLES;
  const count = Math.min(p.max, p.base + p.perSize * newSize);
  return Math.max(1, Math.round(reduced ? count * REDUCED_MOTION_PARTICLES : count));
}

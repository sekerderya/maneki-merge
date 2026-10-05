/**
 * Haptics (GAME_DESIGN §12, TECH_SPEC §10): `navigator.vibrate` when the browser has it (Android)
 * and the setting is on; nothing on iOS, which has no vibration API for the web.
 */
import { HAPTIC_PATTERNS, HAPTIC_TICK_INTERVAL_MS } from '../config/platform';
import type { HapticPattern } from '../config/platform';

export type { HapticPattern } from '../config/platform';

export type Vibrate = (pattern: number | number[]) => boolean;

export class Haptics {
  private enabled = true;
  private lastTickMs = -Infinity;

  constructor(
    private readonly vibrate: Vibrate | null,
    private readonly now: () => number,
  ) {}

  /** Uses the browser's vibration API, if any. */
  static forNavigator(nav: Navigator = navigator): Haptics {
    const vibrate = typeof nav.vibrate === 'function' ? nav.vibrate.bind(nav) : null;
    return new Haptics(vibrate, () => performance.now());
  }

  /** Whether this device can vibrate at all. */
  get supported(): boolean {
    return this.vibrate !== null;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.call(0);
  }

  /** Plays a pattern; merge ticks are rate-limited so a burst feels like one buzz. */
  play(name: HapticPattern): void {
    if (!this.enabled || !this.vibrate) return;
    if (name === 'tick') {
      const now = this.now();
      if (now - this.lastTickMs < HAPTIC_TICK_INTERVAL_MS) return;
      this.lastTickMs = now;
    }
    this.call([...HAPTIC_PATTERNS[name]]);
  }

  private call(pattern: number | number[]): void {
    try {
      this.vibrate?.(pattern);
    } catch {
      // Blocked before the first tap, or unsupported: ignore.
    }
  }
}

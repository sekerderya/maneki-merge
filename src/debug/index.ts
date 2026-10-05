import type { UrlFlags } from '../core/urlFlags';
import type { ScreenId } from '../ui/screenManager';

/**
 * Test hooks on `window.__game` (TECH_SPEC §11), installed only with `?debug=1`.
 * The debug panel and the run helpers (dropAt, addCoins, …) arrive with the game in M5.
 */
export interface GameHooks {
  readonly flags: UrlFlags;
  screen(): ScreenId;
  /** Pretends a new service worker is waiting, to test the update badge policy. */
  simulateUpdateReady(): void;
}

declare global {
  interface Window {
    __game?: GameHooks;
  }
}

export function installDebugHooks(hooks: GameHooks): void {
  window.__game = hooks;
}

/** The parts of `window.history` the back stack needs (a fake one is used in tests). */
export interface HistoryLike {
  pushState(data: unknown, unused: string): void;
  back(): void;
}

/** The parts of `window` the back stack needs. */
export interface PopStateTarget {
  addEventListener(type: 'popstate', listener: () => void): void;
  removeEventListener(type: 'popstate', listener: () => void): void;
}

export type BackHandler = () => void;

/**
 * Maps the Android back button (and the iOS swipe-back gesture) onto app layers.
 *
 * Opening a layer (game screen, later pause and panels) pushes a history entry plus a handler.
 * Pressing back pops the entry and runs the topmost handler. Closing a layer from the UI calls
 * `release`, which removes the entry again so the history never grows. With no layers open,
 * back falls through to the system default (leaving the app).
 */
export class BackStack {
  private readonly handlers: { token: number; onBack: BackHandler }[] = [];
  private nextToken = 1;
  /** `history.back()` calls we made ourselves; their popstate events must not run handlers. */
  private ignoredPops = 0;

  constructor(
    private readonly history: HistoryLike,
    private readonly target: PopStateTarget,
  ) {
    target.addEventListener('popstate', this.onPopState);
  }

  /** Number of open layers. */
  get depth(): number {
    return this.handlers.length;
  }

  /** Opens a layer. Returns a token for `release`. */
  push(onBack: BackHandler): number {
    const token = this.nextToken++;
    this.handlers.push({ token, onBack });
    this.history.pushState({ manekiLayer: token }, '');
    return token;
  }

  /**
   * Closes a layer from the UI (not via the back button). Only the topmost layer can be
   * released; releasing a token that is already gone does nothing.
   */
  release(token: number): void {
    const top = this.handlers[this.handlers.length - 1];
    if (!top || top.token !== token) return;
    this.handlers.pop();
    this.ignoredPops++;
    this.history.back();
  }

  dispose(): void {
    this.target.removeEventListener('popstate', this.onPopState);
  }

  private readonly onPopState = (): void => {
    if (this.ignoredPops > 0) {
      this.ignoredPops--;
      return;
    }
    this.handlers.pop()?.onBack();
  };
}

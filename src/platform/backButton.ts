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
  /**
   * Layers opened while one of our `history.back()` calls was still on its way (it lands
   * asynchronously): their entries are pushed once it has landed, or a push made first would be
   * the entry it takes away (a Scenes row closes the panel and opens the game at once).
   */
  private pendingPushes: number[] = [];

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
    if (this.ignoredPops > 0) this.pendingPushes.push(token);
    else this.history.pushState({ manekiLayer: token }, '');
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
    // A layer whose entry isn't pushed yet has nothing to take back.
    const pending = this.pendingPushes.indexOf(token);
    if (pending >= 0) {
      this.pendingPushes.splice(pending, 1);
      return;
    }
    this.ignoredPops++;
    this.history.back();
  }

  dispose(): void {
    this.target.removeEventListener('popstate', this.onPopState);
  }

  private readonly onPopState = (): void => {
    if (this.ignoredPops > 0) {
      this.ignoredPops--;
      if (this.ignoredPops === 0) {
        for (const token of this.pendingPushes) this.history.pushState({ manekiLayer: token }, '');
        this.pendingPushes = [];
      }
      return;
    }
    this.handlers.pop()?.onBack();
  };
}

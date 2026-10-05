export interface UpdateGateDeps {
  /** Tells the waiting service worker to take over (`skipWaiting`). */
  activate(): void | Promise<void>;
  /** Reloads the page into the new version. */
  reload(): void;
  /** Shows or hides the "Update ready" badge. */
  onReadyChange(ready: boolean): void;
}

/**
 * Enforces the update policy (TECH_SPEC §9): a new version is applied only when the player taps
 * the badge on the main menu, never during a run.
 *
 * Flow: the service worker reports a waiting version → `markReady` → the badge appears →
 * the player taps it → `apply` → the new worker takes control → `onControllerChanged` → reload.
 * If another window of the app activates the update first, this window just shows the badge
 * and reloads when the player taps it.
 */
export class UpdateGate {
  private ready = false;
  private applying = false;
  /** The new worker already controls this page; the running code is stale. */
  private controllerChanged = false;
  private menuActive = true;

  constructor(private readonly deps: UpdateGateDeps) {}

  get isReady(): boolean {
    return this.ready;
  }

  /** The main menu is (or isn't) the visible screen. */
  setMenuActive(active: boolean): void {
    this.menuActive = active;
  }

  /** A new service worker is installed and waiting. */
  markReady(): void {
    if (this.ready) return;
    this.ready = true;
    this.deps.onReadyChange(true);
  }

  /** The player tapped the badge. Ignored outside the menu or when nothing is waiting. */
  async apply(): Promise<void> {
    if (!this.menuActive || !this.ready || this.applying) return;
    this.applying = true;
    if (this.controllerChanged) {
      this.deps.reload();
      return;
    }
    await this.deps.activate();
  }

  /** The new service worker took control of this page. */
  onControllerChanged(): void {
    this.controllerChanged = true;
    if (this.applying && this.menuActive) {
      this.deps.reload();
      return;
    }
    this.markReady();
  }
}

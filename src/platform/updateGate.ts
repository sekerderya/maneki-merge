import { UPDATE_APPLY_DELAY_MS } from '../config/platform';

export interface UpdateGateDeps {
  /** Tells the waiting service worker to take over (`skipWaiting`). */
  activate(): void | Promise<void>;
  /** Reloads the page into the new version. */
  reload(): void;
  /** Runs `run` after `delayMs` (`setTimeout`). */
  schedule(run: () => void, delayMs: number): void;
  /** Shows or hides the "Updating…" badge. */
  onReadyChange(ready: boolean): void;
}

/**
 * Enforces the update policy (TECH_SPEC §9): a new version installs itself once the main menu
 * has been idle (no run, no panel open) for `UPDATE_APPLY_DELAY_MS`, never during a run.
 *
 * Flow: the service worker reports a waiting version → `markReady` → the menu stays idle for the
 * delay → `activate` → the new worker takes control → `onControllerChanged` → reload. A version
 * that arrives during a run waits until the player is back on the menu. If another window of the
 * app activates the update first, this window reloads the next time its menu is idle.
 */
export class UpdateGate {
  private ready = false;
  private activating = false;
  /** The new worker already controls this page; the running code is stale. */
  private controllerChanged = false;
  private menuIdle = true;
  private reloading = false;
  /** Bumped whenever the menu stops being idle, so a scheduled apply from before is dropped. */
  private idleEpoch = 0;
  private scheduled = false;

  constructor(private readonly deps: UpdateGateDeps) {}

  get isReady(): boolean {
    return this.ready;
  }

  /** The main menu is the visible screen with no panel over it (or it isn't). */
  setMenuActive(idle: boolean): void {
    if (!idle) this.idleEpoch++;
    this.menuIdle = idle;
    this.scheduleApply();
  }

  /** A new service worker is installed and waiting. */
  markReady(): void {
    if (!this.ready) {
      this.ready = true;
      this.deps.onReadyChange(true);
    }
    this.scheduleApply();
  }

  /** The player tapped the badge: applies now, retrying an activation that stalled. */
  async apply(): Promise<void> {
    this.activating = false;
    await this.tryApply();
  }

  /** The new service worker took control of this page. */
  onControllerChanged(): void {
    this.controllerChanged = true;
    this.markReady();
  }

  private scheduleApply(): void {
    if (!this.menuIdle || !this.ready || this.scheduled) return;
    this.scheduled = true;
    const epoch = this.idleEpoch;
    this.deps.schedule(() => {
      this.scheduled = false;
      if (epoch === this.idleEpoch) void this.tryApply();
      else this.scheduleApply();
    }, UPDATE_APPLY_DELAY_MS);
  }

  private async tryApply(): Promise<void> {
    if (!this.menuIdle || !this.ready || this.reloading) return;
    if (this.controllerChanged) {
      this.reloading = true;
      this.deps.reload();
      return;
    }
    if (this.activating) return;
    this.activating = true;
    await this.deps.activate();
  }
}

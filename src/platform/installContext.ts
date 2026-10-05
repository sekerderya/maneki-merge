/**
 * What install hint the menu shows:
 * - `installed`: running as a home-screen app, no hint.
 * - `ios-browser`: an iOS browser tab, show "Share → Add to Home Screen".
 * - `browser`: any other browser tab, show an Install button once `beforeinstallprompt` fires.
 */
export type InstallContext = 'installed' | 'ios-browser' | 'browser';

export interface InstallEnvironment {
  readonly userAgent: string;
  readonly platform: string;
  readonly maxTouchPoints: number;
  /** `navigator.standalone` (iOS) or a matching `display-mode` media query. */
  readonly standalone: boolean;
}

export function isIos(env: Pick<InstallEnvironment, 'userAgent' | 'platform' | 'maxTouchPoints'>) {
  if (/iPhone|iPad|iPod/.test(env.userAgent)) return true;
  // iPadOS 13+ reports itself as a Mac; real Macs have no touch screen.
  return env.platform === 'MacIntel' && env.maxTouchPoints > 1;
}

export function detectInstallContext(env: InstallEnvironment): InstallContext {
  if (env.standalone) return 'installed';
  return isIos(env) ? 'ios-browser' : 'browser';
}

/** Reads the environment from the browser. */
export function readInstallEnvironment(): InstallEnvironment {
  const nav = navigator as Navigator & { standalone?: boolean };
  const displayMode = ['fullscreen', 'standalone', 'minimal-ui'].some(
    (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
  );
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints,
    standalone: nav.standalone === true || displayMode,
  };
}

/** Chrome's install prompt event (not in the DOM typings). */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Captures Chrome's `beforeinstallprompt` so the menu can offer its own Install button.
 * `onAvailable(true)` when the prompt can be shown, `onAvailable(false)` after install.
 */
export class InstallPrompt {
  private deferred: BeforeInstallPromptEvent | null = null;

  constructor(private readonly onAvailable: (available: boolean) => void) {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
      this.onAvailable(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.onAvailable(false);
    });
  }

  get available(): boolean {
    return this.deferred !== null;
  }

  /** Shows the browser's install dialog. The event can only be used once. */
  async prompt(): Promise<void> {
    const event = this.deferred;
    if (!event) return;
    this.deferred = null;
    this.onAvailable(false);
    await event.prompt();
    await event.userChoice;
  }
}

import { registerSW } from 'virtual:pwa-register';
import { UPDATE_CHECK_INTERVAL_MS } from '../config/platform';
import type { UpdateGate } from './updateGate';

export interface ServiceWorkerControls {
  /** Activates the waiting service worker. */
  activate(): Promise<void>;
}

/**
 * Registers the service worker (prompt-style updates). Every update decision goes through the
 * gate, which only reloads from the main menu. Does nothing in the dev server.
 */
export function registerServiceWorker(gate: UpdateGate): ServiceWorkerControls {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => gate.markReady(),
    // Without this hook the plugin reloads on its own as soon as the new worker takes control.
    onNeedReload: () => gate.onControllerChanged(),
    onRegisteredSW: (_url, registration) => {
      if (!registration) return;
      // Home-screen apps can stay open for days: check for a new version now and then.
      const check = (): void => {
        if (navigator.onLine) void registration.update().catch(() => undefined);
      };
      window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
    onRegisterError: (error: unknown) => {
      console.warn('Service worker registration failed', error);
    },
  });
  return { activate: () => updateSW(true) };
}

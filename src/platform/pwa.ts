import { registerSW } from 'virtual:pwa-register';
import {
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_LAUNCH_CHECK_MS,
  UPDATE_LAUNCH_INSTALL_MS,
} from '../config/platform';
import type { UpdateGate } from './updateGate';

export interface ServiceWorkerControls {
  /** Activates the waiting service worker. */
  activate(): Promise<void>;
  /**
   * The loading screen's update check (TECH_SPEC §9): asks the server for a new version and lets
   * one it finds install, calling `onInstalling` meanwhile. Resolves true when a new version is
   * waiting. Never takes longer than the launch limits in config/platform.ts.
   */
  launchUpdate(onInstalling: () => void): Promise<boolean>;
}

/** Whether a service worker already controls the page (any launch after the first visit). */
export function controlledByServiceWorker(): boolean {
  return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
}

/**
 * Registers the service worker (prompt-style updates). Every update decision goes through the
 * gate, which only reloads from the loading screen or the main menu. Does nothing in the dev
 * server.
 */
export function registerServiceWorker(gate: UpdateGate): ServiceWorkerControls {
  let registered: (registration: ServiceWorkerRegistration | undefined) => void = () => {};
  const registration = new Promise<ServiceWorkerRegistration | undefined>((resolve) => {
    registered = resolve;
  });
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => gate.markReady(),
    // Without this hook the plugin reloads on its own as soon as the new worker takes control.
    onNeedReload: () => gate.onControllerChanged(),
    onRegisteredSW: (_url, registration) => {
      registered(registration);
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
      registered(undefined);
      console.warn('Service worker registration failed', error);
    },
  });
  return {
    activate: () => updateSW(true),
    launchUpdate: (onInstalling) => launchUpdate(registration, onInstalling),
  };
}

async function launchUpdate(
  registering: Promise<ServiceWorkerRegistration | undefined>,
  onInstalling: () => void,
): Promise<boolean> {
  // The dev server registers nothing, and a first visit has no older version to replace.
  if (import.meta.env.DEV || !controlledByServiceWorker()) return false;
  const registration = await within(registering, UPDATE_LAUNCH_CHECK_MS);
  if (!registration) return false;
  if (!registration.waiting && !registration.installing && navigator.onLine) {
    // Resolves once the server answered; a new version is `installing` by then.
    await within(
      registration.update().catch(() => undefined),
      UPDATE_LAUNCH_CHECK_MS,
    );
  }
  const worker = registration.installing;
  if (worker) {
    onInstalling();
    await within(installed(worker), UPDATE_LAUNCH_INSTALL_MS);
  }
  return registration.waiting !== null;
}

/** Resolves once `worker` has installed (or failed to). */
function installed(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve) => {
    const check = (): void => {
      if (worker.state !== 'installing') resolve();
    };
    worker.addEventListener('statechange', check);
    check();
  });
}

/** `promise`'s value, or undefined if it takes longer than `ms`. */
function within<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), ms)),
  ]);
}

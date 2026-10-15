/**
 * The online check (TECH_SPEC §16). The game itself never needs the network; only the Android
 * app's ads do, and their options never show offline. The app asks Capacitor's Network plugin
 * (`platform/native/`); the web build reads `navigator.onLine` behind the same interface.
 */
export interface Network {
  /** Whether the device has a connection right now. */
  readonly online: boolean;
  /** Called with the new state whenever it changes; returns the unsubscribe. */
  onChange(listener: (online: boolean) => void): () => void;
}

/** A network that reports the state it is told; the two real ones build on it. */
export class NetworkState implements Network {
  private readonly listeners = new Set<(online: boolean) => void>();

  constructor(private current: boolean) {}

  get online(): boolean {
    return this.current;
  }

  onChange(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Sets the state; the listeners hear only a real change. */
  set(online: boolean): void {
    if (online === this.current) return;
    this.current = online;
    for (const listener of [...this.listeners]) listener(online);
  }
}

/** The parts of `window` the browser's online check needs. */
export interface OnlineEvents {
  addEventListener(type: 'online' | 'offline', listener: () => void): void;
}

/** The browser's own check: `navigator.onLine` and the `online` / `offline` events. */
export function browserNetwork(
  nav: { readonly onLine: boolean } = navigator,
  target: OnlineEvents = window,
): Network {
  const network = new NetworkState(nav.onLine);
  target.addEventListener('online', () => network.set(true));
  target.addEventListener('offline', () => network.set(false));
  return network;
}

/** The parts of Capacitor's Network plugin the app uses. */
export interface NetworkPluginLike {
  getStatus(): Promise<{ readonly connected: boolean }>;
  addListener(
    event: 'networkStatusChange',
    listener: (status: { readonly connected: boolean }) => void,
  ): Promise<unknown>;
}

/** The Android app's check, through Capacitor's Network plugin. Offline if it can't tell. */
export async function pluginNetwork(plugin: NetworkPluginLike): Promise<Network> {
  const network = new NetworkState(false);
  await plugin.addListener('networkStatusChange', (status) => network.set(status.connected));
  const status = await plugin.getStatus().catch(() => ({ connected: false }));
  network.set(status.connected);
  return network;
}

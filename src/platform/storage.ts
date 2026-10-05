import { STORAGE_PREFIX } from '../config/app';
import { MemoryStorage, WebStorageAdapter } from '../core/save';
import type { StorageAdapter } from '../core/save';

export interface OpenedStorage {
  readonly adapter: StorageAdapter;
  /** False when localStorage is blocked or broken and the game only keeps data in memory. */
  readonly persistent: boolean;
}

const PROBE_KEY = `${STORAGE_PREFIX}probe`;

/**
 * localStorage behind the StorageAdapter interface. Accessing it can throw (blocked site data,
 * some private modes), and a write can fail at quota 0, so it's probed once; on failure the game
 * still runs, with an in-memory store.
 */
export function openStorage(): OpenedStorage {
  try {
    const storage = window.localStorage;
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return { adapter: new WebStorageAdapter(storage), persistent: true };
  } catch {
    return { adapter: new MemoryStorage(), persistent: false };
  }
}

/** Asks the browser not to evict our storage under pressure. Best effort, called once. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

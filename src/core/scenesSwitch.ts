/**
 * The Scenes button's switch (GAME_DESIGN §2.6): off by default, on for this device once the
 * owner turns it on (`?scenes=1`, or seven taps on the version in Settings). It lives under its own
 * key, outside the save, and a storage that throws only means it isn't remembered.
 */
import { SCENES_KEY } from '../config/app';
import type { StorageAdapter } from './save';

export class ScenesSwitch {
  private value: boolean;

  constructor(private readonly storage: StorageAdapter) {
    try {
      this.value = storage.getItem(SCENES_KEY) === '1';
    } catch {
      this.value = false;
    }
  }

  get on(): boolean {
    return this.value;
  }

  set(on: boolean): void {
    this.value = on;
    try {
      if (on) this.storage.setItem(SCENES_KEY, '1');
      else this.storage.removeItem(SCENES_KEY);
    } catch {
      // Not remembered; it still holds until the page closes.
    }
  }

  /** Flips it and returns the new state. */
  toggle(): boolean {
    this.set(!this.value);
    return this.value;
  }
}

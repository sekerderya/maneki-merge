import { describe, expect, it } from 'vitest';
import { SCENES_KEY } from '../../src/config/app';
import { MemoryStorage } from '../../src/core/save';
import type { StorageAdapter } from '../../src/core/save';
import { ScenesSwitch } from '../../src/core/scenesSwitch';

describe('ScenesSwitch (GAME_DESIGN §2.6)', () => {
  it('is off on a fresh device and remembers when it is turned on and off', () => {
    const storage = new MemoryStorage();
    const scenes = new ScenesSwitch(storage);
    expect(scenes.on).toBe(false);
    scenes.set(true);
    expect(storage.getItem(SCENES_KEY)).toBe('1');
    expect(new ScenesSwitch(storage).on).toBe(true);
    scenes.set(false);
    expect(storage.getItem(SCENES_KEY)).toBeNull();
    expect(new ScenesSwitch(storage).on).toBe(false);
  });

  it('still works for the session when the storage throws', () => {
    const broken: StorageAdapter = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
      keys: () => [],
    };
    const scenes = new ScenesSwitch(broken);
    expect(scenes.on).toBe(false);
    scenes.set(true);
    expect(scenes.on).toBe(true);
  });
});

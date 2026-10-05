import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage, WebStorageAdapter } from '../../src/core/save';
import { openStorage, requestPersistentStorage } from '../../src/platform/storage';

const fakeLocalStorage = (failWrites = false): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failWrites) throw new Error('QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k: string) => void map.delete(k),
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openStorage', () => {
  it('uses localStorage when it works, and leaves no probe behind', () => {
    const ls = fakeLocalStorage();
    vi.stubGlobal('window', { localStorage: ls });
    const opened = openStorage();
    expect(opened.persistent).toBe(true);
    expect(opened.adapter).toBeInstanceOf(WebStorageAdapter);
    expect(ls.length).toBe(0);
  });

  it('falls back to memory when writes fail', () => {
    vi.stubGlobal('window', { localStorage: fakeLocalStorage(true) });
    const opened = openStorage();
    expect(opened.persistent).toBe(false);
    expect(opened.adapter).toBeInstanceOf(MemoryStorage);
  });

  it('falls back to memory when localStorage access throws', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('SecurityError');
      },
    });
    expect(openStorage().persistent).toBe(false);
  });
});

describe('requestPersistentStorage', () => {
  it('asks once and reports the answer', async () => {
    const persist = vi.fn(async () => true);
    vi.stubGlobal('navigator', { storage: { persist } });
    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).toHaveBeenCalledOnce();
  });

  it('returns false when the API is missing or fails', async () => {
    vi.stubGlobal('navigator', {});
    await expect(requestPersistentStorage()).resolves.toBe(false);
    vi.stubGlobal('navigator', {
      storage: {
        persist: async () => {
          throw new Error('nope');
        },
      },
    });
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });
});

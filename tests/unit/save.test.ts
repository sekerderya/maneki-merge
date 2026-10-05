import { describe, expect, it } from 'vitest';
import { SAVE_BACKUP_PREFIX, SAVE_KEY } from '../../src/config/app';
import { UPGRADE_IDS } from '../../src/config/upgrades';
import {
  decodeSave,
  defaultSave,
  MemoryStorage,
  migrate,
  sanitize,
  SAVE_VERSION,
  SaveStore,
  WebStorageAdapter,
} from '../../src/core/save';
import type { Migration, SaveData, StorageAdapter, WebStorageLike } from '../../src/core/save';

const envelope = (data: unknown, version = SAVE_VERSION): string =>
  JSON.stringify({ version, data });

const sampleSave = (): SaveData => {
  const s = defaultSave();
  s.wallet.coins = 1234;
  s.upgrades.luckyPaw = 3;
  s.upgrades.shrineExpansion = 1;
  s.records = { bestScore: 5678, bestStage: 3, highestTier: 9 };
  s.stats = { runsPlayed: 4, totalMerges: 321, totalCoinsEarned: 2000, jackpots: 1 };
  s.settings = { sound: false, haptics: true };
  s.flags.hintsSeen.aim = true;
  return s;
};

/** Storage whose calls throw, like a blocked or full localStorage. */
class BrokenStorage implements StorageAdapter {
  constructor(private readonly broken: { read?: boolean; write?: boolean; keys?: boolean }) {}
  readonly inner = new MemoryStorage();
  getItem(key: string): string | null {
    if (this.broken.read) throw new Error('SecurityError');
    return this.inner.getItem(key);
  }
  setItem(key: string, value: string): void {
    if (this.broken.write) throw new Error('QuotaExceededError');
    this.inner.setItem(key, value);
  }
  removeItem(key: string): void {
    this.inner.removeItem(key);
  }
  keys(): string[] {
    if (this.broken.keys) throw new Error('SecurityError');
    return this.inner.keys();
  }
}

describe('defaultSave (GAME_DESIGN §11)', () => {
  it('starts with nothing earned and everything on', () => {
    const s = defaultSave();
    expect(s.wallet.coins).toBe(0);
    expect(Object.keys(s.upgrades)).toEqual([...UPGRADE_IDS]);
    expect(Object.values(s.upgrades).every((l) => l === 0)).toBe(true);
    expect(s.records).toEqual({ bestScore: 0, bestStage: 1, highestTier: 0 });
    expect(s.stats).toEqual({ runsPlayed: 0, totalMerges: 0, totalCoinsEarned: 0, jackpots: 0 });
    expect(s.settings).toEqual({ sound: true, haptics: true });
    expect(s.flags.hintsSeen).toEqual({ aim: false, merge: false });
  });

  it('returns a fresh object every time', () => {
    const a = defaultSave();
    a.wallet.coins = 5;
    a.upgrades.luckyPaw = 1;
    expect(defaultSave().wallet.coins).toBe(0);
    expect(defaultSave().upgrades.luckyPaw).toBe(0);
  });
});

describe('decodeSave and migrate', () => {
  it('gives defaults when nothing is stored', () => {
    expect(decodeSave(null)).toEqual({
      data: defaultSave(),
      status: 'empty',
      fromVersion: null,
      issues: [],
    });
  });

  it('round-trips a valid save unchanged', () => {
    const result = decodeSave(envelope(sampleSave()));
    expect(result.status).toBe('ok');
    expect(result.fromVersion).toBe(1);
    expect(result.data).toEqual(sampleSave());
  });

  it.each([
    ['invalid JSON', '{"version":1,'],
    ['a non-object', '42'],
    ['an array', '[1,2]'],
    ['null', 'null'],
    ['a missing version', JSON.stringify({ data: {} })],
    ['a zero version', JSON.stringify({ version: 0, data: {} })],
    ['a string version', JSON.stringify({ version: '1', data: {} })],
    ['missing data', JSON.stringify({ version: 1 })],
    ['non-object data', JSON.stringify({ version: 1, data: 'coins' })],
  ])('treats %s as corrupt and starts from defaults', (_label, text) => {
    const result = decodeSave(text);
    expect(result.status).toBe('corrupt');
    expect(result.data).toEqual(defaultSave());
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('runs migrations in order from the stored version', () => {
    const migrations: Record<number, Migration> = {
      // v1 stored coins at the top level; v2 nested them.
      1: (d) => {
        const old = d as { coins: number };
        return { wallet: { coins: old.coins }, legacy: true };
      },
      // v3 dropped the "legacy" flag.
      2: (d) => {
        const copy = { ...(d as Record<string, unknown>) };
        delete copy['legacy'];
        return copy;
      },
    };
    const result = migrate({ version: 1, data: { coins: 77 } }, { version: 3, migrations });
    expect(result.status).toBe('migrated');
    expect(result.fromVersion).toBe(1);
    expect(result.data.wallet.coins).toBe(77);

    const fromTwo = migrate(
      { version: 2, data: { wallet: { coins: 5 } } },
      { version: 3, migrations },
    );
    expect(fromTwo.data.wallet.coins).toBe(5);
  });

  it('treats a missing or failing migration as corrupt', () => {
    expect(migrate({ version: 1, data: {} }, { version: 2, migrations: {} }).status).toBe(
      'corrupt',
    );
    const throwing: Record<number, Migration> = {
      1: () => {
        throw new Error('boom');
      },
    };
    const result = migrate({ version: 1, data: {} }, { version: 2, migrations: throwing });
    expect(result.status).toBe('corrupt');
    expect(result.issues[0]).toContain('boom');
  });

  it('keeps what it knows from a save written by a newer version', () => {
    const data = { ...sampleSave(), somethingNew: { x: 1 } };
    const result = migrate({ version: SAVE_VERSION + 1, data });
    expect(result.status).toBe('future');
    expect(result.data).toEqual(sampleSave());
  });
});

describe('sanitize', () => {
  it('fills missing fields with defaults silently', () => {
    const result = sanitize({ wallet: { coins: 10 } });
    expect(result.issues).toEqual([]);
    expect(result.data).toEqual({ ...defaultSave(), wallet: { coins: 10 } });
  });

  it('repairs invalid fields and reports each one', () => {
    const result = sanitize({
      wallet: { coins: -5 },
      upgrades: { luckyPaw: 99, bigCatch: 2.7, quickGrowth: 'max', goldenTouch: null },
      records: { bestScore: Number.NaN, bestStage: 0, highestTier: 40 },
      stats: 'lots',
      settings: { sound: 'yes', haptics: false },
      flags: { hintsSeen: { aim: 1, merge: true } },
    });
    expect(result.issues).toEqual([
      'wallet.coins',
      'upgrades.luckyPaw',
      'upgrades.bigCatch',
      'upgrades.quickGrowth',
      'upgrades.goldenTouch',
      'records.bestScore',
      'records.bestStage',
      'records.highestTier',
      'stats',
      'settings.sound',
      'flags.hintsSeen.aim',
    ]);
    const d = result.data;
    expect(d.wallet.coins).toBe(0);
    expect(d.upgrades.luckyPaw).toBe(10); // clamped to max
    expect(d.upgrades.bigCatch).toBe(2); // floored
    expect(d.upgrades.quickGrowth).toBe(0);
    expect(d.upgrades.goldenTouch).toBe(0);
    expect(d.records).toEqual({ bestScore: 0, bestStage: 1, highestTier: 15 });
    expect(d.stats).toEqual(defaultSave().stats);
    expect(d.settings).toEqual({ sound: true, haptics: false });
    expect(d.flags.hintsSeen).toEqual({ aim: false, merge: true });
  });

  it('drops unknown fields and upgrade ids', () => {
    const result = sanitize({ upgrades: { luckyPaw: 1, removedUpgrade: 4 }, extra: true });
    expect(result.data.upgrades).toEqual({ ...defaultSave().upgrades, luckyPaw: 1 });
    expect(result.data).not.toHaveProperty('extra');
  });
});

describe('SaveStore', () => {
  it('writes { version, data } under maneki-merge:save and reads it back', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    expect(store.load().status).toBe('empty');
    expect(store.save(sampleSave())).toBe(true);
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toEqual({ version: 1, data: sampleSave() });
    expect(new SaveStore(storage).load()).toMatchObject({ status: 'ok', data: sampleSave() });
    expect(store.backups()).toEqual([]);
  });

  it('backs up a corrupt save, then replaces it with defaults', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, 'garbage{');
    const store = new SaveStore(storage, { now: () => 1000 });
    const result = store.load();
    expect(result.status).toBe('corrupt');
    expect(result.data).toEqual(defaultSave());
    expect(storage.getItem(`${SAVE_BACKUP_PREFIX}1000`)).toBe('garbage{');
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).data).toEqual(defaultSave());
    // The next launch reads the clean save and makes no new backup.
    expect(store.load().status).toBe('ok');
    expect(store.backups()).toHaveLength(1);
  });

  it('backs up a repaired save and keeps the valid parts', () => {
    const storage = new MemoryStorage();
    const raw = envelope({ wallet: { coins: 500 }, upgrades: { luckyPaw: 'x' } });
    storage.setItem(SAVE_KEY, raw);
    const result = new SaveStore(storage, { now: () => 5 }).load();
    expect(result.status).toBe('repaired');
    expect(result.data.wallet.coins).toBe(500);
    expect(storage.getItem(`${SAVE_BACKUP_PREFIX}5`)).toBe(raw);
  });

  it('rewrites a migrated save in the new format without a backup', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, data: { coins: 9 } }));
    const store = new SaveStore(storage, {
      migrate: {
        version: 2,
        migrations: { 1: (d) => ({ wallet: { coins: (d as { coins: number }).coins } }) },
      },
    });
    expect(store.load()).toMatchObject({ status: 'migrated', data: { wallet: { coins: 9 } } });
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).version).toBe(2);
    expect(store.backups()).toEqual([]);
  });

  it('keeps only the newest backups', () => {
    const storage = new MemoryStorage();
    let clock = 100;
    const store = new SaveStore(storage, { now: () => clock, backupLimit: 3 });
    for (let i = 0; i < 5; i++) {
      storage.setItem(SAVE_KEY, `bad-${i}`);
      store.load();
      clock += 100;
    }
    expect(store.backups()).toEqual([300, 400, 500].map((t) => `${SAVE_BACKUP_PREFIX}${t}`));
    expect(storage.getItem(`${SAVE_BACKUP_PREFIX}500`)).toBe('bad-4');
  });

  it('never overwrites an earlier backup made in the same millisecond', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage, { now: () => 7 });
    storage.setItem(SAVE_KEY, 'one');
    store.load();
    storage.setItem(SAVE_KEY, 'two');
    store.load();
    expect(store.backups()).toEqual([`${SAVE_BACKUP_PREFIX}7`, `${SAVE_BACKUP_PREFIX}7-1`]);
    expect(storage.getItem(`${SAVE_BACKUP_PREFIX}7-1`)).toBe('two');
  });

  it('falls back to defaults when storage can’t be read', () => {
    const result = new SaveStore(new BrokenStorage({ read: true })).load();
    expect(result.status).toBe('unavailable');
    expect(result.data).toEqual(defaultSave());
  });

  it('reports a failed write instead of throwing', () => {
    const broken = new BrokenStorage({ write: true });
    broken.inner.setItem(SAVE_KEY, 'garbage');
    const store = new SaveStore(broken);
    expect(store.save(sampleSave())).toBe(false);
    expect(store.load().status).toBe('corrupt'); // backup and rewrite fail quietly
  });

  it('lists no backups when the keys can’t be read', () => {
    expect(new SaveStore(new BrokenStorage({ keys: true })).backups()).toEqual([]);
  });

  it('uses Date.now for backup names by default', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, 'x');
    const before = Date.now();
    const store = new SaveStore(storage);
    store.load();
    const stamp = Number(store.backups()[0]!.slice(SAVE_BACKUP_PREFIX.length));
    expect(stamp).toBeGreaterThanOrEqual(before);
  });
});

describe('WebStorageAdapter', () => {
  it('wraps the Web Storage API', () => {
    const map = new Map<string, string>();
    const web: WebStorageLike = {
      get length() {
        return map.size;
      },
      key: (i) => [...map.keys()][i] ?? null,
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    };
    const adapter = new WebStorageAdapter(web);
    adapter.setItem('a', '1');
    adapter.setItem('b', '2');
    expect(adapter.getItem('a')).toBe('1');
    expect(adapter.keys()).toEqual(['a', 'b']);
    adapter.removeItem('a');
    expect(adapter.getItem('a')).toBeNull();

    const store = new SaveStore(adapter);
    store.save(sampleSave());
    expect(store.load().data).toEqual(sampleSave());
  });
});

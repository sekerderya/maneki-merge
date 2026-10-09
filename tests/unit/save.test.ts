import { describe, expect, it } from 'vitest';
import { SAVE_BACKUP_PREFIX, SAVE_KEY } from '../../src/config/app';
import { UPGRADE_IDS } from '../../src/config/upgrades';
import {
  decodeSave,
  defaultSave,
  endStageLoop,
  MemoryStorage,
  migrate,
  FORTUNE_TELLER_PRICES,
  GOLDEN_MERGE_PRICES,
  retireGoldenMerge,
  retireUpgrades,
  QUICK_GROWTH_PRICES,
  sanitize,
  SAVE_VERSION,
  SaveStore,
  SHRINE_EXPANSION_PRICES,
  shrinkStages,
  WebStorageAdapter,
} from '../../src/core/save';
import type { Migration, SaveData, StorageAdapter, WebStorageLike } from '../../src/core/save';

const envelope = (data: unknown, version = SAVE_VERSION): string =>
  JSON.stringify({ version, data });

const sampleSave = (): SaveData => {
  const s = defaultSave();
  s.wallet.coins = 1234;
  s.upgrades.luckyPaw = 3;
  s.upgrades.comboCharm = 1;
  s.records = { bestScore: 5678, bestStage: 3, highestTier: 9 };
  s.stats = { runsPlayed: 4, totalMerges: 321, totalCoinsEarned: 2000, jackpots: 1 };
  s.settings = { sound: false, haptics: true, reduceMotion: true };
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
    expect(s.settings).toEqual({ sound: true, haptics: true, reduceMotion: false });
    expect(s.flags.hintsSeen).toEqual({ aim: false, merge: false, magnet: false });
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
    expect(result.fromVersion).toBe(SAVE_VERSION);
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
      upgrades: { luckyPaw: 99, bigCatch: 2.7, comboCharm: null, secondChance: 'max' },
      records: { bestScore: Number.NaN, bestStage: 0, highestTier: 99 },
      stats: 'lots',
      settings: { sound: 'yes', haptics: false },
      flags: { hintsSeen: { aim: 1, merge: true } },
    });
    expect(result.issues).toEqual([
      'wallet.coins',
      'upgrades.luckyPaw',
      'upgrades.bigCatch',
      'upgrades.comboCharm',
      'upgrades.secondChance',
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
    expect(d.upgrades.comboCharm).toBe(0);
    expect(d.upgrades.secondChance).toBe(0);
    expect(d.records).toEqual({ bestScore: 0, bestStage: 1, highestTier: 45 });
    expect(d.stats).toEqual(defaultSave().stats);
    expect(d.settings).toEqual({ sound: true, haptics: false, reduceMotion: false });
    expect(d.flags.hintsSeen).toEqual({ aim: false, merge: true, magnet: false });
  });

  it('gives a save from before v0.11 the Reduce motion setting, off, without an issue', () => {
    const result = sanitize({ settings: { sound: false, haptics: true } });
    expect(result.issues).toEqual([]);
    expect(result.data.settings).toEqual({ sound: false, haptics: true, reduceMotion: false });
    const bad = sanitize({ settings: { reduceMotion: 'on' } });
    expect(bad.issues).toEqual(['settings.reduceMotion']);
    expect(bad.data.settings.reduceMotion).toBe(false);
  });

  it('keeps scores beyond 2^53 (later stages score in the quadrillions)', () => {
    const result = sanitize({ records: { bestScore: 2 ** 56, bestStage: 5, highestTier: 45 } });
    expect(result.issues).toEqual([]);
    expect(result.data.records.bestScore).toBe(2 ** 56);
  });

  it('drops unknown fields and upgrade ids', () => {
    const result = sanitize({ upgrades: { luckyPaw: 1, removedUpgrade: 4 }, extra: true });
    expect(result.data.upgrades).toEqual({ ...defaultSave().upgrades, luckyPaw: 1 });
    expect(result.data).not.toHaveProperty('extra');
  });
});

describe('v1 → v2: Quick Growth refund (v0.10)', () => {
  const v1 = (quickGrowth: unknown, coins: unknown = 100) => ({
    version: 1,
    data: {
      wallet: { coins },
      upgrades: { luckyPaw: 2, quickGrowth },
      records: { bestScore: 900, bestStage: 2, highestTier: 7 },
    },
  });

  it.each([
    [0, 0],
    [1, 150],
    [3, 1050],
    [5, 4650],
  ])('gives back the coins spent on %i levels (%i)', (level, refund) => {
    const result = migrate(v1(level));
    expect(result.status).toBe('migrated');
    expect(result.issues).toEqual([]);
    expect(result.data.wallet.coins).toBe(100 + refund);
    expect(result.data.upgrades).toEqual({ ...defaultSave().upgrades, luckyPaw: 2 });
    expect(result.data.upgrades).not.toHaveProperty('quickGrowth');
    expect(result.data.records).toEqual({ bestScore: 900, bestStage: 2, highestTier: 7 });
  });

  it('refunds at most the five levels there were, and nothing for a broken level', () => {
    const all = QUICK_GROWTH_PRICES.reduce((a, b) => a + b, 0);
    expect(migrate(v1(9)).data.wallet.coins).toBe(100 + all);
    expect(migrate(v1('max')).data.wallet.coins).toBe(100);
    expect(migrate(v1(undefined)).data.wallet.coins).toBe(100);
    // A broken wallet stays broken for the repair to report.
    const broken = migrate(v1(2, 'lots'));
    expect(broken.status).toBe('repaired');
    expect(broken.issues).toEqual(['wallet.coins']);
  });

  it('rewrites the save in the current version when it loads', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify(v1(2)));
    expect(new SaveStore(storage).load()).toMatchObject({
      status: 'migrated',
      data: { wallet: { coins: 550 } },
    });
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).version).toBe(SAVE_VERSION);
  });
});

describe('v2 → v3: Shrine Expansion and Fortune Teller refunds, Golden Merge (v0.12)', () => {
  const v2 = (upgrades: Record<string, unknown>, coins: unknown = 100, highestTier = 7) => ({
    version: 2,
    data: {
      wallet: { coins },
      upgrades: { luckyPaw: 2, ...upgrades },
      records: { bestScore: 900, bestStage: 3, highestTier },
    },
  });

  it.each([
    [0, 0],
    [1, 1500],
    [2, 11_500],
    [3, 71_500],
  ])('gives back the coins spent on %i Shrine Expansion levels (%i)', (level, refund) => {
    const result = migrate(v2({ shrineExpansion: level }));
    expect(result.status).toBe('migrated');
    expect(result.issues).toEqual([]);
    expect(result.data.wallet.coins).toBe(100 + refund);
    expect(result.data.upgrades).toEqual({ ...defaultSave().upgrades, luckyPaw: 2 });
    expect(result.data.upgrades).not.toHaveProperty('shrineExpansion');
    expect(result.data.records).toEqual({ bestScore: 900, bestStage: 3, highestTier: 7 });
  });

  it('gives back Fortune Teller and adds up both refunds', () => {
    expect(migrate(v2({ fortuneTeller: 1 })).data.wallet.coins).toBe(500);
    const both = migrate(v2({ shrineExpansion: 1, fortuneTeller: 1 }));
    expect(both.data.wallet.coins).toBe(100 + 1500 + 400);
    expect(both.data.upgrades).not.toHaveProperty('fortuneTeller');
  });

  it('carries Golden Touch levels over to Golden Merge, which v4 → v5 refunds', () => {
    const moved = retireUpgrades(v2({ goldenTouch: 4, bigCatch: 1 }).data) as {
      upgrades: Record<string, unknown>;
    };
    expect(moved.upgrades).toEqual({ luckyPaw: 2, bigCatch: 1, goldenMerge: 4 });
    const result = migrate(v2({ goldenTouch: 4, bigCatch: 1 }));
    expect(result.status).toBe('migrated');
    expect(result.data.wallet.coins).toBe(100 + 120 + 240 + 480 + 960);
    expect(result.data.upgrades).toEqual({ ...defaultSave().upgrades, luckyPaw: 2, bigCatch: 1 });
    expect(result.data.upgrades).not.toHaveProperty('goldenTouch');
  });

  it('caps a record tier from the 12-cat stages at the 11-cat stages’ last tier', () => {
    const capped = retireUpgrades(v2({}, 100, 56).data) as { records: { highestTier: number } };
    expect(capped.records.highestTier).toBe(51);
    // Then v3 → v4 and v5 → v6 cap it again, at today's last tier.
    expect(migrate(v2({}, 100, 56)).data.records.highestTier).toBe(45);
    expect(migrate(v2({}, 100, 23)).data.records.highestTier).toBe(23);
    expect(migrate(v2({}, 100, 56)).status).toBe('migrated');
  });

  it('refunds at most the levels there were, and nothing for a broken level', () => {
    const all = SHRINE_EXPANSION_PRICES.reduce((a, b) => a + b, 0);
    expect(migrate(v2({ shrineExpansion: 9 })).data.wallet.coins).toBe(100 + all);
    expect(migrate(v2({ fortuneTeller: 7 })).data.wallet.coins).toBe(
      100 + FORTUNE_TELLER_PRICES[0]!,
    );
    expect(migrate(v2({ shrineExpansion: 'max', fortuneTeller: null })).data.wallet.coins).toBe(
      100,
    );
    // A broken wallet stays broken for the repair to report.
    const broken = migrate(v2({ shrineExpansion: 2 }, 'lots'));
    expect(broken.status).toBe('repaired');
    expect(broken.issues).toEqual(['wallet.coins']);
  });
});

describe('v3 → v4: 10 cats per stage (v0.15)', () => {
  const v3 = (highestTier: unknown) => ({
    version: 3,
    data: {
      wallet: { coins: 100 },
      upgrades: { luckyPaw: 2 },
      records: { bestScore: 900, bestStage: 4, highestTier },
    },
  });

  // v5 → v6 caps the record again, at 45 (v0.24).
  it.each([
    [51, 45],
    [47, 45],
    [46, 45],
    [23, 23],
    [0, 0],
  ])('turns a record tier of %i into %i', (before, after) => {
    expect(shrinkStages(v3(before).data)).toMatchObject({
      records: { highestTier: Math.min(before, 46) },
    });
    const result = migrate(v3(before));
    expect(result.status).toBe('migrated');
    expect(result.issues).toEqual([]);
    expect(result.data.records).toEqual({ bestScore: 900, bestStage: 4, highestTier: after });
    expect(result.data.wallet.coins).toBe(100);
    expect(result.data.upgrades).toEqual({ ...defaultSave().upgrades, luckyPaw: 2 });
  });

  it('leaves malformed data for the repair', () => {
    expect(shrinkStages(null)).toBeNull();
    expect(shrinkStages({ records: 'none' })).toEqual({ records: 'none' });
    expect(shrinkStages({ records: { highestTier: '51' } })).toEqual({
      records: { highestTier: '51' },
    });
    const broken = migrate(v3(99));
    expect(broken.status).toBe('repaired');
    expect(broken.issues).toEqual(['records.highestTier']);
  });
});

describe('v4 → v5: Golden Merge refund (v0.21)', () => {
  const v4 = (goldenMerge: unknown, coins: unknown = 100) => ({
    version: 4,
    data: {
      wallet: { coins },
      upgrades: { luckyPaw: 2, goldenMerge },
      records: { bestScore: 900, bestStage: 4, highestTier: 30 },
    },
  });

  it.each([
    [0, 0],
    [1, 120],
    [3, 840],
    [5, 3700],
  ])('gives back the coins spent on %i levels (%i)', (level, refund) => {
    const result = migrate(v4(level));
    expect(result.status).toBe('migrated');
    expect(result.issues).toEqual([]);
    expect(result.data.wallet.coins).toBe(100 + refund);
    expect(result.data.upgrades).toEqual({ ...defaultSave().upgrades, luckyPaw: 2 });
    expect(result.data.upgrades).not.toHaveProperty('goldenMerge');
    expect(result.data.records).toEqual({ bestScore: 900, bestStage: 4, highestTier: 30 });
  });

  it('refunds at most the five levels there were, and nothing for a broken level', () => {
    const all = GOLDEN_MERGE_PRICES.reduce((a, b) => a + b, 0);
    expect(migrate(v4(8)).data.wallet.coins).toBe(100 + all);
    expect(migrate(v4('max')).data.wallet.coins).toBe(100);
    expect(retireGoldenMerge(null)).toBeNull();
    expect(retireGoldenMerge({ upgrades: 'none' })).toEqual({ upgrades: 'none' });
    // A broken wallet stays broken for the repair to report.
    const broken = migrate(v4(2, 'lots'));
    expect(broken.status).toBe('repaired');
    expect(broken.issues).toEqual(['wallet.coins']);
  });
});

describe('v5 → v6: 9 cats per stage, no loop (v0.24)', () => {
  const v5 = (highestTier: unknown) => ({
    version: 5,
    data: {
      wallet: { coins: 100 },
      upgrades: { luckyPaw: 2 },
      records: { bestScore: 900, bestStage: 4, highestTier },
    },
  });

  it('is the current version', () => {
    expect(SAVE_VERSION).toBe(6);
  });

  it.each([
    [46, 45],
    [45, 45],
    [19, 19],
    [0, 0],
  ])('turns a record tier of %i into %i', (before, after) => {
    const result = migrate(v5(before));
    expect(result.status).toBe('migrated');
    expect(result.issues).toEqual([]);
    expect(result.data.records).toEqual({ bestScore: 900, bestStage: 4, highestTier: after });
    expect(result.data.wallet.coins).toBe(100);
  });

  it('leaves malformed data for the repair', () => {
    expect(endStageLoop(null)).toBeNull();
    expect(endStageLoop({ records: 'none' })).toEqual({ records: 'none' });
    const broken = migrate(v5(99));
    expect(broken.status).toBe('repaired');
    expect(broken.issues).toEqual(['records.highestTier']);
  });
});

describe('SaveStore', () => {
  it('writes { version, data } under maneki-merge:save and reads it back', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    expect(store.load().status).toBe('empty');
    expect(store.save(sampleSave())).toBe(true);
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toEqual({
      version: SAVE_VERSION,
      data: sampleSave(),
    });
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

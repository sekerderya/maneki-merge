import { describe, expect, it } from 'vitest';
import { SAVE_KEY, SAVE_THROTTLE_MS } from '../../src/config/app';
import { newRecords, Profile } from '../../src/core/profile';
import type { ProfileStore, Scheduler } from '../../src/core/profile';
import { defaultSave, MemoryStorage, SaveStore } from '../../src/core/save';
import type { SaveData } from '../../src/core/save';

/** A hand-driven clock with timers, so the throttle can be checked to the millisecond. */
class FakeScheduler implements Scheduler {
  time = 0;
  private nextId = 1;
  private readonly timers = new Map<number, { at: number; fn: () => void }>();

  now(): number {
    return this.time;
  }
  setTimeout(fn: () => void, ms: number): number {
    const id = this.nextId++;
    this.timers.set(id, { at: this.time + ms, fn });
    return id;
  }
  clearTimeout(handle: number): void {
    this.timers.delete(handle);
  }
  get pendingTimers(): number {
    return this.timers.size;
  }
  advance(ms: number): void {
    const end = this.time + ms;
    for (;;) {
      const due = [...this.timers.entries()]
        .filter(([, t]) => t.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.timers.delete(due[0]);
      this.time = due[1].at;
      due[1].fn();
    }
    this.time = end;
  }
}

class CountingStore implements ProfileStore {
  writes: SaveData[] = [];
  refuse = false;
  save(data: SaveData): boolean {
    if (this.refuse) return false;
    this.writes.push(structuredClone(data));
    return true;
  }
  get last(): SaveData | undefined {
    return this.writes[this.writes.length - 1];
  }
}

const setup = (data = defaultSave()) => {
  const scheduler = new FakeScheduler();
  const store = new CountingStore();
  const profile = new Profile(store, data, { scheduler });
  return { scheduler, store, profile };
};

describe('Profile: wallet, records and stats (GAME_DESIGN §5, §11)', () => {
  it('starts from the loaded save without sharing it', () => {
    const data = defaultSave();
    data.wallet.coins = 40;
    data.upgrades.luckyPaw = 2;
    const { profile } = setup(data);
    data.wallet.coins = 999;
    expect(profile.coins).toBe(40);
    expect(profile.upgrades.luckyPaw).toBe(2);
    const snap = profile.snapshot();
    snap.wallet.coins = 1;
    expect(profile.coins).toBe(40);
  });

  it('banks earned coins into the wallet and the total earned', () => {
    const { profile } = setup();
    profile.earn(5);
    profile.earn(12);
    expect(profile.coins).toBe(17);
    expect(profile.stats.totalCoinsEarned).toBe(17);
  });

  it('grants debug coins to the wallet only', () => {
    const { profile } = setup();
    profile.grant(1000);
    expect(profile.coins).toBe(1000);
    expect(profile.stats.totalCoinsEarned).toBe(0);
  });

  it('ignores zero, negative and fractional amounts', () => {
    const { profile, store } = setup();
    profile.earn(0);
    profile.earn(-3);
    profile.earn(2.5);
    profile.grant(Number.NaN);
    expect(profile.coins).toBe(0);
    expect(store.writes).toHaveLength(0);
  });

  it('counts runs, merges and jackpots and keeps the highest tier', () => {
    const { profile } = setup();
    profile.runStarted();
    profile.merged(2);
    profile.merged(5);
    profile.merged(3);
    profile.jackpot();
    expect(profile.stats).toEqual({
      runsPlayed: 1,
      totalMerges: 3,
      totalCoinsEarned: 0,
      jackpots: 1,
    });
    expect(profile.records.highestTier).toBe(5);
  });

  it('raises the best score and stage, never lowers them', () => {
    const { profile } = setup();
    profile.recordProgress(800, 2);
    profile.recordProgress(300, 1);
    expect(profile.records).toMatchObject({ bestScore: 800, bestStage: 2 });
    profile.recordProgress(900, 1);
    expect(profile.records).toMatchObject({ bestScore: 900, bestStage: 2 });
  });

  it('clamps upgrade levels to their range', () => {
    const { profile } = setup();
    profile.setUpgrade('fortuneTeller', 5);
    profile.setUpgrade('luckyPaw', -2);
    profile.setUpgrade('bigCatch', 2.6);
    profile.setUpgrade('goldenTouch', Number.NaN);
    expect(profile.upgrades.fortuneTeller).toBe(1);
    expect(profile.upgrades.luckyPaw).toBe(0);
    expect(profile.upgrades.bigCatch).toBe(3);
    expect(profile.upgrades.goldenTouch).toBe(0);
  });

  it('keeps settings and hint flags', () => {
    const { profile } = setup();
    expect(profile.settings).toEqual({ sound: true, haptics: true });
    profile.setSetting('sound', false);
    profile.setSetting('haptics', false);
    expect(profile.settings).toEqual({ sound: false, haptics: false });
    expect(profile.hintSeen('aim')).toBe(false);
    profile.markHintSeen('aim');
    expect(profile.hintSeen('aim')).toBe(true);
    expect(profile.hintSeen('merge')).toBe(false);
  });

  it('resets to defaults and writes at once', () => {
    const { profile, store, scheduler } = setup();
    profile.earn(50);
    scheduler.advance(10);
    profile.earn(1);
    profile.reset();
    expect(profile.coins).toBe(0);
    expect(store.last).toEqual(defaultSave());
    expect(scheduler.pendingTimers).toBe(0);
  });
});

describe('Profile: throttled writes (TECH_SPEC §8)', () => {
  it('writes the first change right away and batches the rest into one write a second', () => {
    const { profile, store, scheduler } = setup();
    profile.earn(1);
    expect(store.writes).toHaveLength(1);
    for (let i = 0; i < 20; i++) {
      scheduler.advance(40);
      profile.earn(1);
    }
    expect(store.writes).toHaveLength(1);
    expect(profile.pending).toBe(true);
    scheduler.advance(SAVE_THROTTLE_MS);
    expect(store.writes).toHaveLength(2);
    expect(store.last?.wallet.coins).toBe(21);
    expect(profile.pending).toBe(false);
  });

  it('never writes more than once per interval under a steady stream of changes', () => {
    const { profile, store, scheduler } = setup();
    const times: number[] = [];
    const save = store.save.bind(store);
    store.save = (data) => {
      times.push(scheduler.now());
      return save(data);
    };
    for (let t = 0; t < 10_000; t += 16) {
      profile.earn(1);
      scheduler.advance(16);
    }
    for (let i = 1; i < times.length; i++) {
      expect((times[i] ?? 0) - (times[i - 1] ?? 0)).toBeGreaterThanOrEqual(SAVE_THROTTLE_MS);
    }
    expect(times.length).toBeGreaterThanOrEqual(9);
  });

  it('flush writes pending changes now and cancels the timer', () => {
    const { profile, store, scheduler } = setup();
    profile.earn(3);
    profile.earn(4);
    expect(store.writes).toHaveLength(1);
    expect(profile.flush()).toBe(true);
    expect(store.writes).toHaveLength(2);
    expect(store.last?.wallet.coins).toBe(7);
    expect(scheduler.pendingTimers).toBe(0);
    // Nothing pending: no extra write.
    profile.flush();
    expect(store.writes).toHaveLength(2);
  });

  it('a no-op change does not write', () => {
    const { profile, store } = setup();
    profile.setSetting('sound', true);
    profile.markHintSeen('aim');
    profile.markHintSeen('aim');
    profile.recordProgress(0, 1);
    profile.setUpgrade('luckyPaw', 0);
    expect(store.writes).toHaveLength(1);
  });

  it('retries after the storage refuses a write', () => {
    const { profile, store, scheduler } = setup();
    store.refuse = true;
    profile.earn(5);
    expect(profile.lastWriteOk).toBe(false);
    expect(profile.pending).toBe(true);
    store.refuse = false;
    scheduler.advance(SAVE_THROTTLE_MS);
    profile.earn(1);
    expect(profile.lastWriteOk).toBe(true);
    expect(store.last?.wallet.coins).toBe(6);
    store.refuse = true;
    profile.earn(1);
    expect(profile.flush()).toBe(false);
  });

  it('round-trips through a real SaveStore', () => {
    const storage = new MemoryStorage();
    const store = new SaveStore(storage);
    const scheduler = new FakeScheduler();
    const profile = new Profile(store, store.load().data, { scheduler });
    profile.earn(123);
    profile.merged(6);
    profile.setSetting('haptics', false);
    profile.flush();
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
    const loaded = new SaveStore(storage).load();
    expect(loaded.status).toBe('ok');
    expect(loaded.data.wallet.coins).toBe(123);
    expect(loaded.data.records.highestTier).toBe(6);
    expect(loaded.data.settings.haptics).toBe(false);
  });
});

describe('newRecords (Game Over badges, GAME_DESIGN §2.3)', () => {
  const before = { bestScore: 1000, bestStage: 2, highestTier: 7 };

  it('flags each record the run beat', () => {
    expect(newRecords(before, { score: 1200, stage: 3, highestTier: 8 })).toEqual({
      score: true,
      stage: true,
      highestTier: true,
    });
  });

  it('equal is not a record', () => {
    expect(newRecords(before, { score: 1000, stage: 2, highestTier: 7 })).toEqual({
      score: false,
      stage: false,
      highestTier: false,
    });
  });

  it('a first run that scored nothing breaks nothing', () => {
    const fresh = defaultSave().records;
    expect(newRecords(fresh, { score: 0, stage: 1, highestTier: 0 })).toEqual({
      score: false,
      stage: false,
      highestTier: false,
    });
  });
});

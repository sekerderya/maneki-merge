/**
 * The payout pipeline end to end (ROADMAP M7): physics merges → RunEconomy → the wallet in the
 * profile → storage. Every number is worked out from GAME_DESIGN §5 by hand.
 */
import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../../src/config/app';
import { stageInfo } from '../../src/config/stages';
import { sizeRadius } from '../../src/config/tiers';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { Profile } from '../../src/core/profile';
import type { Scheduler } from '../../src/core/profile';
import { defaultSave, MemoryStorage, SaveStore } from '../../src/core/save';
import type { SaveData } from '../../src/core/save';
import type { UpgradeLevels } from '../../src/core/upgrades';
import { startProfileRun } from '../../src/run/profileRun';
import type { RunController } from '../../src/run/RunController';
import { upgrades } from './fixtures';

/** Time never moves: after the first write, everything waits for a flush. */
const frozen: Scheduler = { now: () => 0, setTimeout: () => 1, clearTimeout: () => {} };

function setup(levels: Partial<UpgradeLevels> = {}, instantExpansion = false) {
  const storage = new MemoryStorage();
  const store = new SaveStore(storage);
  const data: SaveData = defaultSave();
  data.upgrades = { ...upgrades(levels) };
  const profile = new Profile(store, data, { scheduler: frozen });
  const events = new EventBus<GameEvents>();
  const coins: number[] = [];
  events.on('merged', (e) => coins.push(e.coins));
  events.on('jackpot', (e) => coins.push(e.coins));
  events.on('catPopped', (e) => coins.push(e.coins));
  const run = startProfileRun(profile, { seed: 3, events, instantExpansion });
  const stored = (): SaveData => new SaveStore(storage).load().data;
  return { run, profile, coins, storage, stored };
}

/** Two same-tier cats resting side by side on the floor, overlapping by 2 units. */
function spawnPair(run: RunController, tier: number, centre: number, golden = false): void {
  const r = run.radiusOf(tier);
  run.spawnBall(tier, centre - r + 1, -r, golden);
  run.spawnBall(tier, centre + r - 1, -r);
}

describe('payout pipeline (GAME_DESIGN §5, §9)', () => {
  it('banks merges with Lucky Paw, combo and golden into the wallet', () => {
    const { run, profile, coins } = setup({ luckyPaw: 4, comboCharm: 3 });
    expect(profile.stats.runsPlayed).toBe(1);
    spawnPair(run, 3, -200);
    run.tick();
    spawnPair(run, 3, 200);
    run.tick();
    spawnPair(run, 4, 0, true);
    run.tick();
    expect(run.combo).toBe(3);
    // coinMultiplier 1.6; comboBonus 0.08 × 3 × (combo − 1).
    // 3 × 1.6 = 4.8 → 5 · 3 × 1.6 × 1.24 = 5.95 → 6 · 5 × 1.6 × 1.48 × 3 = 35.5 → 36
    expect(coins).toEqual([5, 6, 36]);
    expect(run.coins).toBe(47);
    expect(profile.coins).toBe(47);
    expect(profile.stats).toMatchObject({ totalMerges: 3, totalCoinsEarned: 47, jackpots: 0 });
    expect(profile.records).toEqual({ bestScore: 32, bestStage: 1, highestTier: 5 });
  });

  it('pays a Jackpot of two last cats: 5 × C(last) with multipliers', () => {
    const { run, profile, coins } = setup({ luckyPaw: 1 });
    const last = stageInfo(1).lastTier;
    const r = sizeRadius(12);
    run.spawnBall(last, 0, -r, true);
    run.spawnBall(last, 0, -3 * r + 2);
    run.tick();
    // 5 × 343 × 1.15 × 3 = 5916.75 → 5917
    expect(coins).toEqual([5917]);
    expect(profile.coins).toBe(5917);
    expect(profile.stats).toMatchObject({ jackpots: 1, totalMerges: 0 });
    expect(profile.records.bestScore).toBe(8192);
  });

  it('pays every stage clear and records the stage reached', () => {
    const { run, profile, coins } = setup({ shrineExpansion: 1, luckyPaw: 2 }, true);
    run.spawnBall(1, -270, -28, true);
    run.spawnBall(1, 270, -28);
    run.spawnBall(2, -265, -100, true);
    for (let i = 0; i < 60; i++) run.tick();
    // Two 11s, one on the other: they merge into the stage's last cat and clear the stage.
    run.spawnBall(11, 0, -205);
    run.spawnBall(11, 0, -614);
    run.tick();
    expect(run.stage).toBe(2);
    // The merge: 202 × 1.3 = 262.6 → 263. Then each cat pays its value, half of C(t), oldest
    // first: golden 1 → 0.5 × 1.3 × 3 = 1.95 → 2; 1 → 0.65 → 1; golden 2 → 1 × 1.3 × 3 = 3.9 → 4.
    expect(coins).toEqual([263, 2, 1, 4]);
    expect(profile.coins).toBe(270);
    expect(profile.records).toEqual({ bestScore: 2048, bestStage: 2, highestTier: 12 });
    expect(profile.stats.totalMerges).toBe(1);

    // The next clear pops the 12, now stage 2's smallest cat: 343 / 2 × 1.3 = 222.95 → 223.
    run.jumpToStage(3);
    expect(run.stage).toBe(3);
    expect(coins.slice(4)).toEqual([223]);
    expect(profile.records.bestStage).toBe(3);
  });

  it('pays Lucky Save pops, then a forced timeout without saves ends the run', () => {
    const { run, profile, coins, stored } = setup({ secondChance: 1 });
    for (const x of [-220, -80, 80, 220]) run.spawnBall(2, x, -33);
    for (let i = 0; i < 60; i++) run.tick(); // landed and past the landing grace
    run.forceDangerTimeout();
    expect(run.luckySavesLeft).toBe(0);
    expect(run.state).toBe('playing');
    // Each tier-2 cat pays its value: half of C(2) = 2.
    expect(coins).toEqual([1, 1, 1, 1]);
    expect(profile.coins).toBe(4);

    run.forceDangerTimeout();
    expect(run.state).toBe('over');
    // The run's end wrote everything.
    expect(stored().wallet.coins).toBe(4);
    expect(stored().stats.runsPlayed).toBe(1);
  });

  it('a forced timeout outside play does nothing', () => {
    const { run } = setup({ secondChance: 1 });
    run.pause();
    run.forceDangerTimeout();
    expect(run.luckySavesLeft).toBe(1);
    expect(run.state).toBe('paused');
  });

  it('keeps coins banked mid-run when the page goes away before the run ends', () => {
    const { run, profile, storage } = setup();
    spawnPair(run, 4, -150);
    run.tick();
    spawnPair(run, 2, 150);
    run.tick();
    // The run start was written at once; both payouts wait for the throttle (time is frozen).
    const before = JSON.parse(storage.getItem(SAVE_KEY) ?? '{}') as { data: SaveData };
    expect(before.data.stats.runsPlayed).toBe(1);
    expect(before.data.wallet.coins).toBe(0);
    expect(profile.pending).toBe(true);
    // Backgrounding or pagehide: the session flushes.
    profile.flush();
    const reloaded = new SaveStore(storage).load();
    expect(reloaded.status).toBe('ok');
    expect(reloaded.data.wallet.coins).toBe(7);
    expect(reloaded.data.wallet.coins).toBe(run.coins);
  });
});

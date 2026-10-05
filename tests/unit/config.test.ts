import { describe, expect, it } from 'vitest';
import { HINT_IDS, SAVE_BACKUP_PREFIX, SAVE_KEY, STORAGE_PREFIX } from '../../src/config/app';
import {
  BASE_DENSITY,
  densityForTier,
  gravityForScale,
  PHYSICS_STEP_MS,
  WALL_THICKNESS,
} from '../../src/config/physics';
import {
  BASE_JAR_HEIGHT,
  BASE_JAR_WIDTH,
  DROP_POOL_WEIGHTS,
  isStage,
  STAGE_COUNT,
  stageInfo,
  STAGES,
} from '../../src/config/stages';
import { isTier, TIER_COUNT, tierInfo, tierRadius, TIERS } from '../../src/config/tiers';
import * as timings from '../../src/config/timings';
import { UPGRADE_IDS, UPGRADES } from '../../src/config/upgrades';

describe('tiers (GAME_DESIGN §4)', () => {
  // Tier, radius, score S(t), coins C(t), smallest stage that drops it (null: never dropped).
  const TABLE: readonly [number, number, number, number, number | null][] = [
    [1, 27, 2, 1, 1],
    [2, 33, 4, 2, 1],
    [3, 40, 8, 3, 1],
    [4, 49, 16, 5, 1],
    [5, 60, 32, 8, 2],
    [6, 73, 64, 14, 3],
    [7, 89, 128, 24, 4],
    [8, 109, 256, 41, 5],
    [9, 133, 512, 70, null],
    [10, 162, 1_024, 119, null],
    [11, 197, 2_048, 202, null],
    [12, 241, 4_096, 343, null],
    [13, 294, 8_192, 583, null],
    [14, 358, 16_384, 990, null],
    [15, 437, 32_768, 1_684, null],
  ];

  it('has 15 tiers', () => {
    expect(TIER_COUNT).toBe(15);
    expect(TIERS).toHaveLength(15);
  });

  it.each(TABLE)('tier %i: radius %i, score %i, coins %i', (tier, radius, score, coins) => {
    expect(tierInfo(tier)).toEqual({ tier, radius, score, coins });
  });

  it.each(TABLE)('tier %i is first dropped from stage %s', (tier, _r, _s, _c, firstStage) => {
    const stage = STAGES.find((s) => s.dropPool.includes(tier));
    expect(stage?.stage ?? null).toBe(firstStage);
  });

  it('rejects unknown tiers', () => {
    expect(isTier(0)).toBe(false);
    expect(isTier(16)).toBe(false);
    expect(isTier(2.5)).toBe(false);
    expect(() => tierInfo(0)).toThrow(RangeError);
    expect(() => tierInfo(16)).toThrow(RangeError);
  });
});

describe('stages (GAME_DESIGN §7)', () => {
  // Stage, scale, width, height, tier cap, drop pool, threshold.
  const TABLE: readonly [number, number, number, number, number, [number, number], number][] = [
    [1, 1.0, 600, 870, 7, [1, 4], 0],
    [2, 1.3, 780, 1131, 9, [1, 5], 500],
    [3, 1.69, 1014, 1470, 11, [2, 6], 3_000],
    [4, 2.197, 1318, 1911, 13, [3, 7], 12_000],
    [5, 2.856, 1714, 2485, 15, [4, 8], 40_000],
  ];

  it('has 5 stages', () => {
    expect(STAGE_COUNT).toBe(5);
    expect(STAGES).toHaveLength(5);
  });

  it.each(TABLE)(
    'stage %i: scale %f, jar %i × %i, cap %i, pool %j, threshold %i',
    (stage, scale, width, height, tierCap, [min, max], threshold) => {
      const info = stageInfo(stage);
      expect(info.stage).toBe(stage);
      expect(info.scale).toBeCloseTo(scale, 3);
      expect(info.width).toBe(width);
      expect(info.height).toBe(height);
      expect(info.tierCap).toBe(tierCap);
      expect(info.dropPool).toEqual(Array.from({ length: max - min + 1 }, (_, i) => min + i));
      expect(info.threshold).toBe(threshold);
    },
  );

  it('keeps the 1 : 1.45 aspect ratio and a 600 × 870 stage-1 jar', () => {
    expect(BASE_JAR_WIDTH).toBe(600);
    expect(BASE_JAR_HEIGHT).toBe(870);
    for (const s of STAGES) expect(s.height / s.width).toBeCloseTo(1.45, 2);
  });

  it('has base weights for every pool size, and every dropped tier stays below the cap', () => {
    for (const s of STAGES) {
      expect(DROP_POOL_WEIGHTS[s.dropPool.length]).toBeDefined();
      expect(Math.max(...s.dropPool)).toBeLessThan(s.tierCap);
      expect(s.tierCap).toBeLessThanOrEqual(TIER_COUNT);
    }
  });

  it('has thresholds that only go up', () => {
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i]!.threshold).toBeGreaterThan(STAGES[i - 1]!.threshold);
    }
  });

  it('rejects unknown stages', () => {
    expect(isStage(0)).toBe(false);
    expect(isStage(6)).toBe(false);
    expect(() => stageInfo(6)).toThrow(RangeError);
  });
});

describe('upgrades (GAME_DESIGN §10)', () => {
  // Id, name, max level, prices.
  const TABLE: readonly [string, string, number, number[]][] = [
    ['luckyPaw', 'Lucky Paw', 10, [50, 80, 125, 200, 320, 500, 800, 1250, 2000, 3200]],
    ['bigCatch', 'Big Catch', 5, [100, 250, 600, 1500, 3500]],
    ['shrineExpansion', 'Shrine Expansion', 3, [1500, 10000, 60000]],
    ['quickGrowth', 'Quick Growth', 5, [150, 300, 600, 1200, 2400]],
    ['goldenTouch', 'Golden Touch', 5, [120, 240, 480, 960, 1900]],
    ['comboCharm', 'Combo Charm', 5, [80, 160, 320, 640, 1280]],
    ['secondChance', 'Second Chance', 2, [500, 4000]],
    ['fortuneTeller', 'Fortune Teller', 1, [400]],
  ];

  it('lists the 8 upgrades in shop order', () => {
    expect([...UPGRADE_IDS]).toEqual(TABLE.map(([id]) => id));
  });

  it.each(TABLE)('%s (%s): max %i, prices %j', (id, name, maxLevel, prices) => {
    const def = UPGRADES[id as (typeof UPGRADE_IDS)[number]];
    expect(def.id).toBe(id);
    expect(def.name).toBe(name);
    expect(def.maxLevel).toBe(maxLevel);
    expect(def.prices).toEqual(prices);
    expect(def.prices).toHaveLength(def.maxLevel);
    expect(def.description.length).toBeGreaterThan(0);
  });

  it('has per-level effects matching the table', () => {
    expect(UPGRADES.luckyPaw.perLevel).toBe(0.15);
    expect(UPGRADES.bigCatch.perLevel).toBe(0.12);
    expect(UPGRADES.shrineExpansion.perLevel).toBe(1);
    expect(UPGRADES.quickGrowth.perLevel).toBe(0.06);
    expect(UPGRADES.goldenTouch.perLevel).toBe(0.03);
    expect(UPGRADES.comboCharm.perLevel).toBe(0.08);
    expect(UPGRADES.secondChance.perLevel).toBe(1);
    expect(UPGRADES.fortuneTeller.perLevel).toBe(1);
  });

  it('has prices that only go up', () => {
    for (const id of UPGRADE_IDS) {
      const prices = UPGRADES[id].prices;
      for (let i = 1; i < prices.length; i++) expect(prices[i]).toBeGreaterThan(prices[i - 1]!);
    }
  });
});

describe('timings (GAME_DESIGN §3, §5, §6, §7.1)', () => {
  it('matches the design', () => {
    expect(timings.DROP_COOLDOWN_MS).toBe(450);
    expect(timings.COMBO_WINDOW_MS).toBe(1000);
    expect(timings.MERGE_GROW_MS).toBe(120);
    expect(timings.LANDING_GRACE_MS).toBe(500);
    expect(timings.DANGER_TIMEOUT_MS).toBe(2500);
    expect(timings.LUCKY_SAVE_GRACE_MS).toBe(2000);
    expect(timings.EXPANSION_DURATION_MS).toBe(1600);
    expect(timings.EXPANSION_ZOOM_MS).toBeLessThan(timings.EXPANSION_DURATION_MS);
  });
});

describe('physics tunables (TECH_SPEC §5)', () => {
  it('steps at 120 Hz with thick walls', () => {
    expect(PHYSICS_STEP_MS).toBeCloseTo(1000 / 120, 10);
    expect(WALL_THICKNESS).toBeGreaterThanOrEqual(300);
  });

  it('makes mass grow like r^1.5', () => {
    expect(densityForTier(1)).toBe(BASE_DENSITY);
    for (let t = 2; t <= TIER_COUNT; t++) {
      const r = tierRadius(t);
      const mass = densityForTier(t) * Math.PI * r * r;
      const mass1 = BASE_DENSITY * Math.PI * tierRadius(1) ** 2;
      expect(mass / mass1).toBeCloseTo((r / tierRadius(1)) ** 1.5, 6);
    }
  });

  it('scales gravity with the stage', () => {
    expect(gravityForScale(stageInfo(1).scale)).toBe(1);
    expect(gravityForScale(stageInfo(5).scale)).toBeCloseTo(2.8561, 4);
  });
});

describe('storage keys', () => {
  it('prefixes every key', () => {
    expect(SAVE_KEY).toBe('maneki-merge:save');
    expect(SAVE_BACKUP_PREFIX.startsWith(STORAGE_PREFIX)).toBe(true);
    expect(HINT_IDS.length).toBeGreaterThan(0);
  });
});

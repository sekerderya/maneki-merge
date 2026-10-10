import { describe, expect, it } from 'vitest';
import { HINT_IDS, SAVE_BACKUP_PREFIX, SAVE_KEY, STORAGE_PREFIX } from '../../src/config/app';
import {
  BALL_INERTIA_SCALE,
  BALL_RESTITUTION,
  BASE_DENSITY,
  CAT_FRICTION,
  densityForSize,
  GROWTH_NEIGHBOUR_MAX_SPEED_BASE,
  FLOOR_RESTITUTION,
  GRAVITY_BASE,
  JAR_FRICTION,
  MAX_ANGULAR_SPEED,
  MAX_SPEED_BASE,
  MERGE_SPIN_RIM_SPEED,
  PHYSICS_STEP_MS,
  WALL_HEIGHT_FACTOR,
  WALL_THICKNESS,
} from '../../src/config/physics';
import { TIER_COLORS, tierColor } from '../../src/config/skin';
import {
  catRadius,
  clearGrowsJar,
  DROP_SIZES,
  DROP_WEIGHTS,
  DROPPER_HEADROOM_RATIO,
  isStage,
  JAR_HEIGHT,
  JAR_WIDTH,
  JAR_GROWTH_STAGES,
  stageHoldsTier,
  stageInfo,
  stageJar,
  tierSize,
} from '../../src/config/stages';
import {
  isSize,
  isTier,
  SIZE_COUNT,
  sizeRadius,
  STAGE_TIER_STEP,
  SIZE_BASE_RADIUS,
  SIZE_RADIUS_GROWTH,
  tierInfo,
} from '../../src/config/tiers';
import * as timings from '../../src/config/timings';
import { UPGRADE_IDS, UPGRADES } from '../../src/config/upgrades';

describe('cat sizes (GAME_DESIGN §4)', () => {
  // Size and radius: every stage holds these 9 sizes.
  const SIZES: readonly [number, number][] = [
    [1, 41],
    [2, 49],
    [3, 58],
    [4, 69],
    [5, 82],
    [6, 98],
    [7, 116],
    [8, 139],
    [9, 165],
  ];

  it('has 9 sizes per stage, and the next stage starts after its last one', () => {
    expect(SIZE_COUNT).toBe(9);
    expect(STAGE_TIER_STEP).toBe(9);
  });

  it.each(SIZES)('size %i: radius %i', (size, radius) => {
    expect(sizeRadius(size)).toBe(radius);
  });

  it('makes every cat 20% bigger than in v0.23, with the same step (v0.24)', () => {
    // v0.19.3 to v0.23: r(s) = round(34 × 1.19^(s−1)), 10 sizes.
    const old = (size: number) => Math.round(34 * 1.19 ** (size - 1));
    for (let size = 1; size <= SIZE_COUNT; size++) {
      expect(sizeRadius(size) / old(size)).toBeGreaterThan(1.18);
      expect(sizeRadius(size) / old(size)).toBeLessThan(1.23);
    }
    expect(SIZE_RADIUS_GROWTH).toBe(1.19);
    // The last cat is as big as the old last cat (size 10, 163).
    expect(SIZE_BASE_RADIUS * SIZE_RADIUS_GROWTH ** 8).toBeCloseTo(old(10), -1);
    // Sizes 1–8 cover as much of the jar as the old sizes 1–9 did, within 2%.
    const area = (r: (s: number) => number, n: number) =>
      Array.from({ length: n }, (_, i) => r(i + 1) ** 2).reduce((a, b) => a + b, 0);
    expect(area(sizeRadius, 8) / area(old, 9)).toBeCloseTo(1, 1);
  });

  it('rejects unknown sizes', () => {
    expect(isSize(0)).toBe(false);
    expect(isSize(10)).toBe(false);
    expect(isSize(1.5)).toBe(false);
    expect(isSize(9)).toBe(true);
  });
});

describe('tiers (GAME_DESIGN §4)', () => {
  // Tier, score S(t), coins C(t).
  const TABLE: readonly [number, number, number][] = [
    [1, 2, 1],
    [2, 4, 2],
    [3, 8, 3],
    [4, 16, 5],
    [5, 32, 8],
    [6, 64, 14],
    [7, 128, 24],
    [8, 256, 41],
    [9, 512, 70],
    [10, 1_024, 119],
    [18, 262_144, 8_272],
    [27, 134_217_728, 981_007],
    [36, 68_719_476_736, 116_335_497],
    [45, 35_184_372_088_832, 13_795_979_509],
  ];

  it('has no last tier: tier 9n ends stage n', () => {
    expect(stageInfo(5).lastTier).toBe(45);
    expect(stageInfo(20).lastTier).toBe(180);
    expect(tierInfo(100)).toEqual({ tier: 100, score: 2 ** 100, coins: Math.round(1.7 ** 99) });
  });

  it.each(TABLE)('tier %i: score %i, coins %i', (tier, score, coins) => {
    expect(tierInfo(tier)).toEqual({ tier, score, coins });
  });

  it('rejects unknown tiers', () => {
    expect(isTier(0)).toBe(false);
    expect(isTier(46)).toBe(true);
    expect(isTier(2.5)).toBe(false);
    expect(isTier(Infinity)).toBe(false);
    expect(() => tierInfo(0)).toThrow(RangeError);
    expect(() => tierInfo(-1)).toThrow(RangeError);
  });

  it('repeats the colours with the sizes, so every stage looks the same', () => {
    expect(TIER_COLORS).toHaveLength(STAGE_TIER_STEP);
    expect(new Set(TIER_COLORS).size).toBe(TIER_COLORS.length);
    for (let stage = 1; stage <= 12; stage++) {
      const info = stageInfo(stage);
      for (let size = 1; size <= SIZE_COUNT; size++) {
        expect(tierColor(info.firstTier + size - 1)).toBe(tierColor(size));
      }
    }
    // The next stage's first cat looks like this stage's first.
    expect(tierColor(10)).toBe(tierColor(1));
  });
});

describe('stages (GAME_DESIGN §7)', () => {
  // Stage, first tier, last tier, drop pool.
  const TABLE: readonly [number, number, number, [number, number]][] = [
    [1, 1, 9, [1, 4]],
    [2, 10, 18, [10, 13]],
    [3, 19, 27, [19, 22]],
    [4, 28, 36, [28, 31]],
    [5, 37, 45, [37, 40]],
    [6, 46, 54, [46, 49]],
    [11, 91, 99, [91, 94]],
  ];

  it('grows the jar every 5 stages', () => {
    expect(JAR_GROWTH_STAGES).toBe(5);
    expect([1, 4, 5, 6, 10, 11, 15].map(clearGrowsJar)).toEqual([
      false,
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
    expect([1, 5, 6, 10, 11, 16, 100].map(stageJar)).toEqual([1, 1, 2, 2, 3, 4, 20]);
    expect(clearGrowsJar(0)).toBe(false);
  });

  it.each(TABLE)('stage %i: tiers %i–%i, pool %j', (stage, firstTier, lastTier, [min, max]) => {
    const info = stageInfo(stage);
    expect(info).toEqual({
      stage,
      firstTier,
      lastTier,
      dropPool: Array.from({ length: max - min + 1 }, (_, i) => min + i),
    });
    expect(tierSize(firstTier, stage)).toBe(1);
    expect(tierSize(lastTier, stage)).toBe(SIZE_COUNT);
    expect(stageHoldsTier(stage, firstTier - 1)).toBe(false);
    expect(stageHoldsTier(stage, lastTier + 1)).toBe(false);
    expect(catRadius(lastTier, stage)).toBe(sizeRadius(SIZE_COUNT));
    expect(() => catRadius(lastTier + 1, stage)).toThrow(RangeError);
  });

  it('has the same 600 × 870 jar (1 : 1.45) at every stage', () => {
    expect(JAR_WIDTH).toBe(600);
    expect(JAR_HEIGHT).toBe(870);
  });

  it('drops the four smallest sizes with weights for each', () => {
    expect(DROP_SIZES).toBe(4);
    expect(DROP_WEIGHTS).toEqual([40, 30, 20, 10]);
  });

  it('rejects unknown stages', () => {
    expect(isStage(0)).toBe(false);
    expect(isStage(6)).toBe(true);
    expect(isStage(1.5)).toBe(false);
    expect(() => stageInfo(0)).toThrow(RangeError);
    expect(() => stageJar(0)).toThrow(RangeError);
  });
});

describe('upgrades (GAME_DESIGN §10)', () => {
  // Id, name, max level, prices.
  const TABLE: readonly [string, string, number, number[]][] = [
    ['luckyPaw', 'Lucky Paw', 10, [50, 80, 125, 200, 320, 500, 800, 1250, 2000, 3200]],
    ['bigCatch', 'Big Catch', 5, [100, 250, 600, 1500, 3500]],
    ['comboCharm', 'Combo Charm', 5, [80, 160, 320, 640, 1280]],
    ['secondChance', 'Second Chance', 2, [500, 4000]],
  ];

  it('lists the 4 upgrades in shop order', () => {
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
    expect(UPGRADES.bigCatch.perLevel).toBe(0.03);
    expect(UPGRADES.comboCharm.perLevel).toBe(0.08);
    expect(UPGRADES.secondChance.perLevel).toBe(1);
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
    expect(timings.EXPANSION_CLEAR_MS).toBe(500);
    expect(timings.EXPANSION_ZOOM_MS).toBe(1200);
    expect(timings.EXPANSION_REVEAL_MS).toBe(400);
    expect(timings.EXPANSION_DURATION_MS).toBe(2100);
  });
});

describe('physics tunables (TECH_SPEC §5)', () => {
  it('steps at 120 Hz with thick walls', () => {
    expect(PHYSICS_STEP_MS).toBeCloseTo(1000 / 120, 10);
    expect(WALL_THICKNESS).toBeGreaterThanOrEqual(300);
  });

  it('makes mass grow like r', () => {
    expect(densityForSize(1)).toBe(BASE_DENSITY);
    for (let s = 2; s <= SIZE_COUNT; s++) {
      const r = sizeRadius(s);
      const mass = densityForSize(s) * Math.PI * r * r;
      const mass1 = BASE_DENSITY * Math.PI * sizeRadius(1) ** 2;
      expect(mass / mass1).toBeCloseTo(r / sizeRadius(1), 6);
    }
  });

  it('leaves room for the dropper above the rim (TECH_SPEC §4)', () => {
    expect(DROPPER_HEADROOM_RATIO).toBe(0.44);
    expect(WALL_HEIGHT_FACTOR).toBeGreaterThan(1);
  });

  it('caps speeds above a natural fall', () => {
    // Free fall (no air friction) from the dropper to the floor, in units per second.
    const g = GRAVITY_BASE * 1000;
    const fall = Math.sqrt(2 * g * 930);
    expect(MAX_SPEED_BASE).toBeGreaterThan(fall);
    expect(GROWTH_NEIGHBOUR_MAX_SPEED_BASE).toBeLessThan(MAX_SPEED_BASE);
    // At the speed cap, the smallest cat (size 1, at every stage) moves less than its radius per
    // step: no tunnelling.
    const perStep = (MAX_SPEED_BASE * PHYSICS_STEP_MS) / 1000;
    expect(perStep).toBeLessThan(sizeRadius(1));
  });

  it('keeps gravity at 2150 units/s² (the same at every stage)', () => {
    expect(GRAVITY_BASE).toBe(2.15);
  });

  it('lets cats roll over each other, bounce off each other and land dead on the floor', () => {
    expect(CAT_FRICTION).toBe(0.8);
    expect(JAR_FRICTION).toBe(0.4);
    expect(BALL_RESTITUTION).toBe(0.25);
    expect(BALL_INERTIA_SCALE).toBe(1);
    expect(FLOOR_RESTITUTION).toBe(0);
  });

  it('turns a merged cat gently: slower the bigger it is, far below the spin cap', () => {
    const fastest = MERGE_SPIN_RIM_SPEED / sizeRadius(1);
    expect(fastest).toBeLessThan(MAX_ANGULAR_SPEED / 5);
    expect(MERGE_SPIN_RIM_SPEED / sizeRadius(SIZE_COUNT)).toBeLessThan(fastest);
  });
});

describe('storage keys', () => {
  it('prefixes every key', () => {
    expect(SAVE_KEY).toBe('maneki-merge:save');
    expect(SAVE_BACKUP_PREFIX.startsWith(STORAGE_PREFIX)).toBe(true);
    expect(HINT_IDS.length).toBeGreaterThan(0);
  });
});

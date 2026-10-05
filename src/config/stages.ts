/** Jar stages and drop pools (GAME_DESIGN §7 and §8). */

export const STAGE_COUNT = 5;
export const FIRST_STAGE = 1;

/** The stage-1 jar in world units. Every stage scales it, so the aspect ratio stays 1 : 1.45. */
export const BASE_JAR_WIDTH = 600;
export const BASE_JAR_HEIGHT = 870;
export const STAGE_SCALE_STEP = 1.3;

/** Stages 1 and 2 are always open; each Shrine Expansion level opens one more. */
export const BASE_MAX_STAGE = 2;

/**
 * Base drop weights by position in a stage's pool, smallest tier first.
 * Keyed by pool size; every pool in STAGE_RULES has an entry here.
 */
export const DROP_POOL_WEIGHTS: Readonly<Record<number, readonly number[]>> = {
  4: [40, 30, 20, 10],
  5: [36, 28, 20, 10, 6],
};

/** The first drops of a run are always the pool's smallest tier. */
export const FIRST_DROPS_SMALLEST_COUNT = 2;

interface StageRule {
  /** Largest tier that can exist; two cap-tier cats make a Jackpot. */
  readonly tierCap: number;
  /** Smallest and largest tier the dropper can produce. */
  readonly dropMin: number;
  readonly dropMax: number;
  /** Cumulative run score that expands the jar into this stage (before Quick Growth). */
  readonly threshold: number;
}

const STAGE_RULES: readonly StageRule[] = [
  { tierCap: 7, dropMin: 1, dropMax: 4, threshold: 0 },
  { tierCap: 9, dropMin: 1, dropMax: 5, threshold: 500 },
  { tierCap: 11, dropMin: 2, dropMax: 6, threshold: 3_000 },
  { tierCap: 13, dropMin: 3, dropMax: 7, threshold: 12_000 },
  { tierCap: 15, dropMin: 4, dropMax: 8, threshold: 40_000 },
];

export interface StageInfo {
  readonly stage: number;
  /** STAGE_SCALE_STEP^(stage−1), unrounded. */
  readonly scale: number;
  /** Jar size in world units, rounded. */
  readonly width: number;
  readonly height: number;
  readonly tierCap: number;
  /** Tiers the dropper can produce, smallest first. */
  readonly dropPool: readonly number[];
  /** Base expansion threshold (0 for stage 1, where every run starts). */
  readonly threshold: number;
}

/** Index 0 is stage 1. */
export const STAGES: readonly StageInfo[] = STAGE_RULES.map((rule, i) => {
  const scale = STAGE_SCALE_STEP ** i;
  return {
    stage: i + 1,
    scale,
    width: Math.round(BASE_JAR_WIDTH * scale),
    height: Math.round(BASE_JAR_HEIGHT * scale),
    tierCap: rule.tierCap,
    dropPool: Array.from({ length: rule.dropMax - rule.dropMin + 1 }, (_, t) => rule.dropMin + t),
    threshold: rule.threshold,
  };
});

export function isStage(value: number): boolean {
  return Number.isInteger(value) && value >= FIRST_STAGE && value <= STAGE_COUNT;
}

export function stageInfo(stage: number): StageInfo {
  const info = isStage(stage) ? STAGES[stage - 1] : undefined;
  if (!info) throw new RangeError(`Unknown stage: ${stage}`);
  return info;
}

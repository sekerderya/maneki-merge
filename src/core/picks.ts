/**
 * Trials and blessings (GAME_DESIGN §15): the run's pick levels, the queue odds they give, the
 * options a stage clear offers, and what each card shows. Pure functions.
 */
import {
  BIG_DROPS_TILT_PER_LEVEL,
  BOULDER_BASE_CHANCE,
  BOULDER_BASE_HITS,
  BOULDER_BASE_SIZE,
  BOULDER_FIRST_STAGE,
  MAGNET_BASE_CHANCE,
  MAX_DROP_TILT_LEVEL,
  PICK_IDS,
  PICK_OPTIONS,
  pickIds,
  PICKS,
} from '../config/picks';
import type { PickId, PickKind } from '../config/picks';
import { dropWeights } from './dropQueue';
import type { DropOdds } from './dropQueue';
import { roundStable } from './math';
import type { Rng } from './rng';

export type PickLevels = Readonly<Record<PickId, number>>;

export function defaultPickLevels(): Record<PickId, number> {
  const levels = {} as Record<PickId, number>;
  for (const id of PICK_IDS) levels[id] = 0;
  return levels;
}

export function isPickId(value: unknown): value is PickId {
  return typeof value === 'string' && (PICK_IDS as readonly string[]).includes(value);
}

/** The drop weights' tilt: Big Catch plus Big Drops, at most MAX_DROP_TILT_LEVEL. */
export function tiltLevel(levels: PickLevels, bigCatchLevel: number): number {
  return Math.min(MAX_DROP_TILT_LEVEL, bigCatchLevel + BIG_DROPS_TILT_PER_LEVEL * levels.bigDrops);
}

/** The boulder chance at a stage: none before BOULDER_FIRST_STAGE. */
export function boulderChance(levels: PickLevels, stage: number): number {
  if (stage < BOULDER_FIRST_STAGE) return 0;
  return BOULDER_BASE_CHANCE + PICKS.moreBoulders.perLevel * levels.moreBoulders;
}

/** What the queue rolls at `stage` with these pick levels (GAME_DESIGN §15.1). */
export function dropOdds(levels: PickLevels, stage: number, bigCatchLevel: number): DropOdds {
  return {
    tiltLevel: tiltLevel(levels, bigCatchLevel),
    magnetChance: MAGNET_BASE_CHANCE + PICKS.moreMagnets.perLevel * levels.moreMagnets,
    boulderChance: boulderChance(levels, stage),
    goldenChance: PICKS.goldenCats.perLevel * levels.goldenCats,
    boulderSize: BOULDER_BASE_SIZE + PICKS.bigBoulders.perLevel * levels.bigBoulders,
    boulderHits: BOULDER_BASE_HITS + PICKS.ironBands.perLevel * levels.ironBands,
  };
}

/** True when the option can't go higher; Big Drops also stops once the tilt is at its most. */
export function pickMaxed(id: PickId, levels: PickLevels, bigCatchLevel: number): boolean {
  if (levels[id] >= PICKS[id].maxLevel) return true;
  return id === 'bigDrops' && tiltLevel(levels, bigCatchLevel) >= MAX_DROP_TILT_LEVEL;
}

/**
 * The cards of a pick: up to PICK_OPTIONS different options of `kind` that aren't maxed, drawn at
 * random in random order. Empty when every option is maxed (the pick is skipped).
 */
export function drawOffer(
  kind: PickKind,
  levels: PickLevels,
  bigCatchLevel: number,
  rng: Rng,
): PickId[] {
  const open = pickIds(kind).filter((id) => !pickMaxed(id, levels, bigCatchLevel));
  // Fisher–Yates: each option lands on each place equally often.
  for (let i = open.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [open[i], open[j]] = [open[j] as PickId, open[i] as PickId];
  }
  return open.slice(0, PICK_OPTIONS);
}

/** What a pick card shows (GAME_DESIGN §15.5), like a shop card. */
export interface PickCard {
  readonly id: PickId;
  readonly kind: PickKind;
  readonly name: string;
  readonly description: string;
  readonly statLabel: string;
  readonly level: number;
  readonly maxLevel: number;
  /** The value at the current level and after this pick. */
  readonly current: string;
  readonly next: string;
}

export function pickCard(id: PickId, levels: PickLevels, bigCatchLevel: number): PickCard {
  const def = PICKS[id];
  const level = levels[id];
  return {
    id,
    kind: def.kind,
    name: def.name,
    description: def.description,
    statLabel: def.statLabel,
    level,
    maxLevel: def.maxLevel,
    current: pickValue(id, levels, bigCatchLevel),
    next: pickValue(id, { ...levels, [id]: level + 1 }, bigCatchLevel),
  };
}

/** The value one option changes, at these levels, formatted for its card. */
export function pickValue(id: PickId, levels: PickLevels, bigCatchLevel: number): string {
  const odds = dropOdds(levels, BOULDER_FIRST_STAGE, bigCatchLevel);
  switch (id) {
    case 'moreBoulders':
      return percent(odds.boulderChance);
    case 'ironBands':
      return String(odds.boulderHits);
    case 'bigBoulders':
      return `Size ${odds.boulderSize}`;
    case 'moreMagnets':
      return percent(odds.magnetChance);
    case 'bigDrops': {
      const weights = dropWeights(odds.tiltLevel);
      return percent(weights[weights.length - 1] ?? 0);
    }
    case 'goldenCats':
      return percent(odds.goldenChance);
  }
}

function percent(fraction: number): string {
  return `${roundStable(fraction * 100)}%`;
}

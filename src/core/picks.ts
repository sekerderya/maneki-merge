/**
 * Trials, rules and blessings (GAME_DESIGN §15): the run's pick levels, the queue odds they give,
 * the options a stage clear offers, and what each card shows. Pure functions.
 */
import {
  BIG_DROPS_TILT_PER_LEVEL,
  BOULDER_BASE_CHANCE,
  BOULDER_BASE_HITS,
  BOULDER_BASE_SIZE,
  BOULDER_FIRST_STAGE,
  CURSE_DROPS,
  CURSE_INTERVALS,
  DICE_FIZZLE_CHANCE,
  DICE_LUCKY_CHANCE,
  HEAVY_DROP_FALL_TIMES,
  HUBRIS_PAIR_WAIT_MS,
  MAGNET_BASE_CHANCE,
  MAX_DROP_TILT_LEVEL,
  PICK_IDS,
  PICK_OPTIONS,
  pickIds,
  PICKS,
  WIND_NAMES,
} from '../config/picks';
import type { DiceRoll, PickId, PickKind, WindDirection } from '../config/picks';
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

/**
 * The highest level some picks can reach in this run (GAME_DESIGN §10, v0.36): each blessing's
 * shop card. A pick that isn't listed goes up to its own max level.
 */
export type PickCaps = Readonly<Partial<Record<PickId, number>>>;

/** The drop weights' tilt: Big Catch's tilt plus Big Drops, at most MAX_DROP_TILT_LEVEL. */
export function tiltLevel(levels: PickLevels, bigCatchTilt: number): number {
  return Math.min(MAX_DROP_TILT_LEVEL, bigCatchTilt + BIG_DROPS_TILT_PER_LEVEL * levels.bigDrops);
}

/** The boulder chance at a stage: none before BOULDER_FIRST_STAGE. */
export function boulderChance(levels: PickLevels, stage: number): number {
  if (stage < BOULDER_FIRST_STAGE) return 0;
  return BOULDER_BASE_CHANCE + PICKS.moreBoulders.perLevel * levels.moreBoulders;
}

/** What the queue rolls at `stage` with these pick levels (GAME_DESIGN §15.1). */
export function dropOdds(levels: PickLevels, stage: number, bigCatchTilt: number): DropOdds {
  return {
    tiltLevel: tiltLevel(levels, bigCatchTilt),
    magnetChance: MAGNET_BASE_CHANCE + PICKS.moreMagnets.perLevel * levels.moreMagnets,
    boulderChance: boulderChance(levels, stage),
    goldenChance: PICKS.goldenCats.perLevel * levels.goldenCats,
    hanabiChance: PICKS.hanabi.perLevel * levels.hanabi,
    jokerChance: PICKS.joker.perLevel * levels.joker,
    boulderSize: BOULDER_BASE_SIZE + PICKS.bigBoulders.perLevel * levels.bigBoulders,
    boulderHits: BOULDER_BASE_HITS + PICKS.ironBands.perLevel * levels.ironBands,
  };
}

/**
 * True when the option can't go higher: at its max level or its cap in this run (`caps`, the
 * blessings' shop cards); Big Drops also stops once the tilt is at its most.
 */
export function pickMaxed(
  id: PickId,
  levels: PickLevels,
  bigCatchTilt: number,
  caps: PickCaps = {},
): boolean {
  if (levels[id] >= Math.min(PICKS[id].maxLevel, caps[id] ?? Infinity)) return true;
  return id === 'bigDrops' && tiltLevel(levels, bigCatchTilt) >= MAX_DROP_TILT_LEVEL;
}

/**
 * True when a pick may offer the option: it isn't maxed, and a follow-up's pick has been taken
 * (Quick Curse and More Curses need Cursed Bell, GAME_DESIGN §15.5).
 */
export function pickOpen(
  id: PickId,
  levels: PickLevels,
  bigCatchTilt: number,
  caps: PickCaps = {},
): boolean {
  const needs = PICKS[id].requires;
  if (needs !== undefined && levels[needs] <= 0) return false;
  return !pickMaxed(id, levels, bigCatchTilt, caps);
}

/**
 * The cards of a pick: up to PICK_OPTIONS different open options of `kind` (`pickOpen`), drawn at
 * random in random order. Empty when none is open (the pick is skipped).
 */
export function drawOffer(
  kind: PickKind,
  levels: PickLevels,
  bigCatchTilt: number,
  rng: Rng,
  caps: PickCaps = {},
): PickId[] {
  const open = pickIds(kind).filter((id) => pickOpen(id, levels, bigCatchTilt, caps));
  // Fisher–Yates: each option lands on each place equally often.
  for (let i = open.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [open[i], open[j]] = [open[j] as PickId, open[i] as PickId];
  }
  return open.slice(0, PICK_OPTIONS);
}

/**
 * Dice (GAME_DESIGN §15.14): one merge's die, one draw from `rng`: lucky with DICE_LUCKY_CHANCE,
 * a fizzle with DICE_FIZZLE_CHANCE, else null (a normal merge).
 */
export function diceRoll(rng: Rng): DiceRoll {
  const roll = rng.next();
  if (roll < DICE_LUCKY_CHANCE) return 'lucky';
  return roll < DICE_LUCKY_CHANCE + DICE_FIZZLE_CHANCE ? 'fizzle' : null;
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
  /** Its picture faces the other way: the Wind's carp streamer when the run's wind blows left. */
  readonly mirror: boolean;
}

/** A card of `id` at these levels; the Wind's card names the run's wind (`windDirection`). */
export function pickCard(
  id: PickId,
  levels: PickLevels,
  bigCatchTilt: number,
  windDirection: WindDirection = 1,
): PickCard {
  const def = PICKS[id];
  const level = levels[id];
  const left = id === 'wind' && windDirection < 0;
  return {
    id,
    kind: def.kind,
    name: def.name,
    description: left ? def.description.replace('right', 'left') : def.description,
    statLabel: def.statLabel,
    level,
    maxLevel: def.maxLevel,
    current: pickValue(id, levels, bigCatchTilt),
    next: pickValue(id, { ...levels, [id]: level + 1 }, bigCatchTilt),
    mirror: left,
  };
}

/** The value one option changes, at these levels, formatted for its card. */
export function pickValue(id: PickId, levels: PickLevels, bigCatchTilt: number): string {
  const odds = dropOdds(levels, BOULDER_FIRST_STAGE, bigCatchTilt);
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
    case 'hanabi':
      return percent(odds.hanabiChance);
    case 'joker':
      return percent(odds.jokerChance);
    case 'wind':
      return WIND_NAMES[levels.wind] ?? '';
    case 'heavyDrop':
      return seconds(HEAVY_DROP_FALL_TIMES[levels.heavyDrop] ?? 0);
    case 'porcelain':
      return percent(PICKS.porcelain.perLevel * levels.porcelain);
    case 'hubris':
      return levels.hubris > 0 ? `After ${HUBRIS_PAIR_WAIT_MS / 1000} s` : 'At once';
    case 'echo':
    case 'cursedBell':
      return levels[id] > 0 ? 'On' : 'Off';
    case 'quickCurse':
      return String(CURSE_DROPS[levels.quickCurse] ?? '');
    case 'moreCurses':
      return String(CURSE_INTERVALS[levels.moreCurses] ?? '');
    case 'copycat':
      return levels.copycat > 0 ? 'Copied' : 'Random';
    case 'dice':
      return levels.dice > 0 ? 'Rolled' : 'Sure';
  }
}

/** A time with at least one decimal: 1.0 s, 0.65 s. */
function seconds(s: number): string {
  return `${Number.isInteger(s * 10) ? s.toFixed(1) : String(s)} s`;
}

/** A chance as a percentage with at most one decimal: 3%, 2.5%. */
function percent(fraction: number): string {
  return `${roundStable(fraction * 1000) / 10}%`;
}

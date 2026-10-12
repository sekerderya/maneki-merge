/**
 * The balance bot (`npm run sim`, TECH_SPEC §11): plays a whole run headless. It drops every ball
 * the moment it can, uses every magnet on a random ball that has landed, and takes the first card
 * of every pick. It aims at a seeded random x (`random`), or, more like a player (`match`), at the
 * highest cat of the dropped cat's size, else at a random x. A run ends at game over, after
 * `stages` stage clears, or after `capSeconds` of play time.
 *
 * The `smart` bot (v0.39) plays more like a person: it waits a moment before each drop, looks
 * where the ball will land, keeps the big cats towards the left wall and the small ones to the
 * right, aims into the wind, takes the topmost ball with a magnet, spreads its trials and prefers
 * the stronger blessings. A fresh profile's runs end at stage 2–3 with it, like a new player's.
 *
 * It imports the headless layers only (config → core → physics → run), so it runs in Node
 * (tools/simulate.ts) and in Vitest (tests/unit/sim.test.ts).
 */
import { PICK_IDS, WIND_ACCEL_PER_LEVEL } from '../../src/config/picks';
import type { PickId } from '../../src/config/picks';
import { Rng } from '../../src/core/rng';
import { UPGRADE_IDS, UPGRADES } from '../../src/config/upgrades';
import type { UpgradeId } from '../../src/config/upgrades';
import { defaultUpgradeLevels, maxUpgradeLevels } from '../../src/core/upgrades';
import type { UpgradeLevels } from '../../src/core/upgrades';
import { GRAVITY_BASE } from '../../src/config/physics';
import { tierSize } from '../../src/config/stages';
import type { BallView } from '../../src/physics/balls';
import { RunController } from '../../src/run/RunController';

/** Pick levels a run starts with (the rest at 0). */
export type ArmLevels = Partial<Record<PickId, number>>;

export interface BotOptions {
  readonly seed: number;
  readonly levels?: ArmLevels;
  readonly upgrades?: UpgradeLevels;
  /** Stage clears before the run stops (1: stage 1 only). */
  readonly stages?: number;
  /** Play time before the run stops, in seconds. */
  readonly capSeconds?: number;
  /**
   * Where it drops: at a random x, on a cat of the dropped cat's size (`match`, the default), or
   * where a person would (`smart`).
   */
  readonly aim?: BotAim;
  /** The smart bot's pause before each drop, in ms (a person aiming). */
  readonly thinkMs?: number | undefined;
  /**
   * Lucky Saves on top of the shop's: a stand-in for a player who gets out of a full jar more
   * often than the bot does (`npm run sim -- --meta`).
   */
  readonly extraSaves?: number | undefined;
}

export type BotAim = 'random' | 'match' | 'smart';

export const DEFAULT_THINK_MS = 400;

/** What one run did. */
export interface BotRun {
  readonly seed: number;
  readonly stagesCleared: number;
  readonly lost: boolean;
  readonly playSeconds: number;
  readonly drops: number;
  readonly merges: number;
  readonly threes: number;
  readonly echoes: number;
  readonly breaks: number;
  readonly curses: number;
  readonly lifted: number;
  readonly taken: number;
  readonly stones: number;
  readonly lucky: number;
  readonly fizzles: number;
  readonly copies: number;
  /** The run's score and coins when it ended. */
  readonly score: number;
  readonly coins: number;
  /** The run's score, coins and play time at each stage clear, in order. */
  readonly clears: readonly ClearMark[];
}

/** Where a run stood when it cleared a stage. */
export interface ClearMark {
  readonly score: number;
  readonly coins: number;
  readonly seconds: number;
}

/** The bot's own aim, apart from the run's streams, so it never moves a roll. */
const AIM_SALT = 0x51ed2701;

export const DEFAULT_STAGES = 1;
export const DEFAULT_CAP_SECONDS = 240;

/**
 * The levels a run plays with: the shop's, and `extraSaves` more Lucky Saves. They come from Second
 * Chance's level (core/upgrades.ts), which isn't capped there.
 */
export function botUpgrades(upgrades: UpgradeLevels, extraSaves = 0): UpgradeLevels {
  return { ...upgrades, secondChance: upgrades.secondChance + extraSaves };
}

export function playBot(options: BotOptions): BotRun {
  const run = new RunController({
    seed: options.seed,
    upgrades: botUpgrades(options.upgrades ?? defaultUpgradeLevels(), options.extraSaves),
    instantExpansion: true,
  });
  const smart = options.aim === 'smart';
  const thinkMs = options.thinkMs ?? DEFAULT_THINK_MS;
  for (const [id, level] of Object.entries(options.levels ?? {})) {
    if ((PICK_IDS as readonly string[]).includes(id)) run.setPickLevel(id as PickId, level);
  }
  const stages = options.stages ?? DEFAULT_STAGES;
  const capMs = (options.capSeconds ?? DEFAULT_CAP_SECONDS) * 1000;
  const count = {
    stagesCleared: 0,
    drops: 0,
    merges: 0,
    threes: 0,
    echoes: 0,
    breaks: 0,
    curses: 0,
    lifted: 0,
    taken: 0,
    stones: 0,
    lucky: 0,
    fizzles: 0,
    copies: 0,
  };
  const clears: ClearMark[] = [];
  const on = run.events.on.bind(run.events);
  on('stageCleared', () => {
    count.stagesCleared++;
    clears.push({ score: run.score, coins: run.coins, seconds: run.playTimeMs / 1000 });
  });
  on('catDropped', () => count.drops++);
  on('merged', (e) => {
    count.merges++;
    if (e.parts === 3) count.threes++;
    if (e.dice === 'lucky') count.lucky++;
    if (e.dice === 'fizzle') count.fizzles++;
  });
  on('echoed', () => count.echoes++);
  on('catBroken', () => count.breaks++);
  on('curseBegan', () => count.curses++);
  on('curseEnded', (e) => {
    if (e.reason === 'lifted') count.lifted++;
    if (e.reason === 'taken') count.taken++;
    if (e.reason === 'stone') count.stones++;
  });
  on('nextChanged', () => count.copies++);

  const aim = new Rng((Math.trunc(options.seed) ^ AIM_SALT) >>> 0);
  // When the paw got its ball (the smart bot thinks before it drops), −1 while it can't drop.
  let readyAt = -1;
  // Safety net: a run that neither ends nor plays on (it can't happen) stops after this many ticks.
  const maxTicks = Math.ceil(capMs / 1000) * 120 * 4;
  for (let t = 0; t < maxTicks; t++) {
    if (run.state === 'over' || count.stagesCleared >= stages || run.playTimeMs >= capMs) break;
    const offer = run.pickOffer;
    if (run.state === 'choosing' && offer) {
      run.choose(smart ? smartPick(run) : (offer.options[0] as PickId));
      continue;
    }
    if (run.canTake) {
      const landed = run.balls.filter((ball) => run.takeable(ball));
      const ball = smart ? topmost(landed) : landed[Math.floor(aim.next() * landed.length)];
      if (ball) run.take(ball.id);
    } else if (run.canDrop) {
      if (readyAt < 0) readyAt = run.playTimeMs;
      if (!smart) {
        const random = (aim.next() * 2 - 1) * run.geometry.halfWidth;
        run.drop(options.aim === 'random' ? random : (matchX(run) ?? random));
      } else if (run.playTimeMs - readyAt >= thinkMs) {
        run.drop(smartX(run));
        readyAt = -1;
      }
    } else readyAt = -1;
    run.tick();
  }
  return {
    seed: options.seed,
    ...count,
    lost: run.state === 'over',
    playSeconds: run.playTimeMs / 1000,
    score: run.score,
    coins: run.coins,
    clears,
  };
}

/**
 * The x of the highest landed cat of the dropper's tier (for a joker: of any cat), or null when
 * there is none or the dropper holds a boulder or a hanabi.
 */
function matchX(run: RunController): number | null {
  const { kind, tier } = run.current;
  if (kind !== 'cat' && kind !== 'joker') return null;
  let best: { x: number; top: number } | null = null;
  for (const ball of run.balls) {
    if (ball.kind !== 'cat' || ball.landedMs < 0) continue;
    if (kind === 'cat' && ball.tier !== tier) continue;
    const top = ball.y - ball.radius;
    if (!best || top < best.top) best = { x: ball.x, top };
  }
  return best?.x ?? null;
}

// ── The smart bot ─────────────────────────────────────────────────────────

/** The trials it takes first (after the ones at the lowest level), the rules, the blessings. */
const SMART_TRIALS: readonly PickId[] = [
  'moreBoulders',
  'ironBands',
  'porcelain',
  'bigBoulders',
  'heavyDrop',
  'wind',
  'cursedBell',
  'moreCurses',
  'quickCurse',
];
const SMART_RULES: readonly PickId[] = ['hubris', 'echo', 'dice', 'copycat'];
const SMART_BLESSINGS: readonly PickId[] = [
  'bigDrops',
  'goldenCats',
  'joker',
  'hanabi',
  'moreMagnets',
];

/** A trial at its lowest level (spread out, as they multiply), else the first in its list. */
function smartPick(run: RunController): PickId {
  const { kind, options } = run.pickOffer!;
  const order =
    kind === 'blessing' ? SMART_BLESSINGS : kind === 'rule' ? SMART_RULES : SMART_TRIALS;
  const rank = (id: PickId): number =>
    (kind === 'trial' ? run.levelOf(id) * 100 : 0) + order.indexOf(id);
  return [...options].sort((a, b) => rank(a) - rank(b))[0] as PickId;
}

/** The ball whose top is highest in the jar. */
function topmost(balls: readonly BallView[]): BallView | undefined {
  let best: BallView | undefined;
  for (const ball of balls) {
    if (!best || ball.y - ball.radius < best.y - best.radius) best = ball;
  }
  return best;
}

/**
 * Where a ball of radius `r` dropped straight down at `x` first touches: the ball it lands on
 * (null for the floor) and the y of its centre then.
 */
function landing(balls: readonly BallView[], x: number, r: number) {
  let on: BallView | null = null;
  let y = -r;
  for (const ball of balls) {
    const reach = ball.radius + r;
    const dx = Math.abs(ball.x - x);
    if (dx >= reach) continue;
    const top = ball.y - Math.sqrt(reach * reach - dx * dx);
    if (top < y) {
      y = top;
      on = ball;
    }
  }
  return { on, y };
}

/** The smart bot's weights: how much a lower landing and its place in the size order count. */
const SMART_LOW = 0.6;
const SMART_ORDER = 0.8;
/** The candidate spots across the jar, this far apart. */
const SMART_STEP = 8;

/**
 * Scores spots across the jar for the ball in the paw and returns the best x: a cat goes onto a
 * cat of its tier or next to one, never onto a smaller cat, low, and where its size belongs (big
 * cats left, small ones right); a joker onto the biggest cat it can reach; a hanabi among small
 * cats and boulders; a boulder low and out of the way. Then it aims into the wind.
 */
function smartX(run: RunController): number {
  const { halfWidth, dropY } = run.geometry;
  const item = run.current;
  const r = run.radiusOf(item.tier);
  const balls = run.balls;
  const sizeInStage = tierSize(item.tier, run.stage);
  let bestX = 0;
  let bestScore = -Infinity;
  for (let x = -halfWidth + r; x <= halfWidth - r; x += SMART_STEP) {
    const { on, y } = landing(balls, x, r);
    let score = y * SMART_LOW;
    if (item.kind === 'cat') {
      if (on?.kind === 'cat') {
        if (on.tier === item.tier) score += 1000 + on.size * 10;
        else if (on.tier === item.tier + 1) score += 60;
        else if (on.tier < item.tier) score -= 120 * (item.tier - on.tier);
        else score -= 15 * (on.tier - item.tier - 1);
      } else if (on) score -= 80;
      for (const ball of balls) {
        if (ball === on || ball.kind !== 'cat' || ball.tier !== item.tier) continue;
        if (Math.hypot(ball.x - x, ball.y - y) - ball.radius - r < 25) score += 300;
      }
      const place = halfWidth - r - ((sizeInStage - 1) / 7) * (2 * halfWidth - 2 * r);
      score -= SMART_ORDER * Math.abs(x - place);
    } else if (item.kind === 'joker') {
      if (on?.kind === 'cat') score += 200 + on.size * 60;
    } else if (item.kind === 'hanabi') {
      for (const ball of balls) {
        const near = Math.hypot(ball.x - x, ball.y - y) - ball.radius < 200;
        if (near && ball.kind === 'boulder') score += 150;
        if (near && ball.kind === 'cat' && ball.size <= 4) score += 40;
      }
    } else {
      score += Math.abs(x) * 0.3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestX = x;
    }
  }
  // The wind pushes a falling ball sideways by ½·a·t² until it lands (Heavy Drop falls too fast
  // to bother).
  const wind = run.levelOf('wind');
  if (wind > 0 && run.levelOf('heavyDrop') === 0) {
    const fall = Math.max(0, landing(balls, bestX, r).y - dropY);
    const t2 = (2 * fall) / (GRAVITY_BASE * 1000);
    bestX -= run.windDirection * 0.5 * WIND_ACCEL_PER_LEVEL * wind * t2;
  }
  return Math.max(-halfWidth + r, Math.min(halfWidth - r, bestX));
}

/**
 * Shop cards from the command line (`--upgrades`): `max`, every card at its max level, or
 * `id=level,…` on top of a fresh profile.
 */
export function upgradeLevels(text: string): Record<UpgradeId, number> {
  if (text === 'max') return maxUpgradeLevels();
  const levels = defaultUpgradeLevels();
  for (const part of text.split(',').filter(Boolean)) {
    const [id, level] = part.split('=');
    if (!(UPGRADE_IDS as readonly string[]).includes(id as string)) {
      throw new Error(`Unknown upgrade: ${id}`);
    }
    const def = UPGRADES[id as UpgradeId];
    levels[def.id] = Math.max(def.startLevel, Math.min(def.maxLevel, Number(level)));
  }
  return levels;
}

/** One arm of a comparison: a name and the pick levels its runs start with. */
export interface Arm {
  readonly name: string;
  readonly levels: ArmLevels;
}

/** What an arm's runs did together. */
export interface ArmSummary {
  readonly name: string;
  readonly runs: number;
  /** Runs that cleared all their stages, ran out of time, or were lost. */
  readonly cleared: number;
  readonly timedOut: number;
  readonly lost: number;
  readonly medianSeconds: number;
  /** Totals over every run. */
  readonly totals: Omit<BotRun, 'seed' | 'lost' | 'playSeconds' | 'stagesCleared' | 'clears'> & {
    readonly stagesCleared: number;
  };
  /** The mean score, coins and play time at each stage clear, over the runs that got there. */
  readonly clears: readonly (ClearMark & { readonly runs: number })[];
}

export function summarize(name: string, runs: readonly BotRun[], stages = DEFAULT_STAGES) {
  const cleared = runs.filter((r) => r.stagesCleared >= stages).length;
  const lost = runs.filter((r) => r.lost).length;
  const times = runs.map((r) => r.playSeconds).sort((a, b) => a - b);
  const mid = times.length / 2;
  const medianSeconds =
    times.length === 0
      ? 0
      : times.length % 2 === 1
        ? (times[Math.floor(mid)] as number)
        : ((times[mid - 1] as number) + (times[mid] as number)) / 2;
  const totals = {
    stagesCleared: 0,
    drops: 0,
    merges: 0,
    threes: 0,
    echoes: 0,
    breaks: 0,
    curses: 0,
    lifted: 0,
    taken: 0,
    stones: 0,
    lucky: 0,
    fizzles: 0,
    copies: 0,
    score: 0,
    coins: 0,
  };
  for (const run of runs) {
    for (const key of Object.keys(totals) as (keyof typeof totals)[]) totals[key] += run[key];
  }
  const most = Math.max(0, ...runs.map((r) => r.clears.length));
  const clears = Array.from({ length: most }, (_, i) => {
    const marks = runs.flatMap((r) => r.clears[i] ?? []);
    const mean = (pick: (m: ClearMark) => number): number =>
      marks.reduce((sum, m) => sum + pick(m), 0) / marks.length;
    return {
      runs: marks.length,
      score: mean((m) => m.score),
      coins: mean((m) => m.coins),
      seconds: mean((m) => m.seconds),
    };
  });
  const summary: ArmSummary = {
    name,
    runs: runs.length,
    cleared,
    timedOut: runs.length - cleared - lost,
    lost,
    medianSeconds,
    totals,
    clears,
  };
  return summary;
}

/** Plays `seeds` runs (seeds 1…n) of an arm. */
export function playArm(arm: Arm, seeds: number, options: Omit<BotOptions, 'seed'> = {}) {
  const runs: BotRun[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    runs.push(playBot({ ...options, seed, levels: arm.levels }));
  }
  return summarize(arm.name, runs, options.stages);
}

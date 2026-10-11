/**
 * The balance bot (`npm run sim`, TECH_SPEC §11): plays a whole run headless. It drops every ball
 * the moment it can, uses every magnet on a random ball that has landed, and takes the first card
 * of every pick. It aims at a seeded random x (`random`), or, more like a player (`match`), at the
 * highest cat of the dropped cat's size, else at a random x. A run ends at game over, after
 * `stages` stage clears, or after `capSeconds` of play time.
 *
 * It imports the headless layers only (config → core → physics → run), so it runs in Node
 * (tools/simulate.ts) and in Vitest (tests/unit/sim.test.ts).
 */
import { PICK_IDS } from '../../src/config/picks';
import type { PickId } from '../../src/config/picks';
import { Rng } from '../../src/core/rng';
import { UPGRADE_IDS, UPGRADES } from '../../src/config/upgrades';
import type { UpgradeId } from '../../src/config/upgrades';
import { defaultUpgradeLevels, maxUpgradeLevels } from '../../src/core/upgrades';
import type { UpgradeLevels } from '../../src/core/upgrades';
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
  /** Where it drops: at a random x, or on a cat of the dropped cat's size (`match`, the default). */
  readonly aim?: BotAim;
}

export type BotAim = 'random' | 'match';

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

export function playBot(options: BotOptions): BotRun {
  const run = new RunController({
    seed: options.seed,
    upgrades: options.upgrades ?? defaultUpgradeLevels(),
    instantExpansion: true,
  });
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
  // Safety net: a run that neither ends nor plays on (it can't happen) stops after this many ticks.
  const maxTicks = Math.ceil(capMs / 1000) * 120 * 4;
  for (let t = 0; t < maxTicks; t++) {
    if (run.state === 'over' || count.stagesCleared >= stages || run.playTimeMs >= capMs) break;
    const offer = run.pickOffer;
    if (run.state === 'choosing' && offer) {
      run.choose(offer.options[0] as PickId);
      continue;
    }
    if (run.canTake) {
      const landed = run.balls.filter((ball) => run.takeable(ball));
      const ball = landed[Math.floor(aim.next() * landed.length)];
      if (ball) run.take(ball.id);
    } else if (run.canDrop) {
      const random = (aim.next() * 2 - 1) * run.geometry.halfWidth;
      run.drop(options.aim === 'random' ? random : (matchX(run) ?? random));
    }
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

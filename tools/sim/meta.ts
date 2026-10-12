/**
 * The meta bot (`npm run sim -- --meta <minutes>`, TECH_SPEC §11, v0.39): a player from a fresh
 * profile who plays run after run with the balance bot (tools/sim/bot.ts) and, after every run,
 * buys the cheapest card it can until nothing is left that it can afford. It times the first clear
 * of a goal stage (stage 5: the owner wants most players there within their first 15 minutes) and
 * notes how far the runs go as the shop fills up.
 *
 * Time counts the play time plus a fixed allowance for what the bot skips: each stage clear's
 * banners, doors and picks, and the menu and the shop between runs.
 */
import { UPGRADE_IDS, UPGRADES } from '../../src/config/upgrades';
import type { UpgradeId } from '../../src/config/upgrades';
import { buy, canBuy, defaultUpgradeLevels } from '../../src/core/upgrades';
import type { UpgradeLevels } from '../../src/core/upgrades';
import { playBot } from './bot';
import type { BotAim, BotOptions, BotRun } from './bot';

/** Seconds a stage clear takes outside play: the last cat's shine, the banners, doors and picks. */
export const CLEAR_OVERHEAD_SECONDS = 15;
/** Seconds between two runs: Game Over, the menu and the shop. */
export const RUN_OVERHEAD_SECONDS = 20;

export interface MetaOptions {
  /** The player's number: its runs play seeds player × 1000 + 1, + 2, … */
  readonly player: number;
  /** It stops starting runs after this many minutes. */
  readonly minutes: number;
  /** The stage whose first clear is timed. */
  readonly goal: number;
  readonly aim?: BotAim;
  readonly thinkMs?: number | undefined;
  readonly extraSaves?: number;
}

/** One run of a player. */
export interface MetaRun {
  /** Minutes since the player started, when the run ended. */
  readonly minute: number;
  /** The stage it reached (its clears + 1). */
  readonly stage: number;
  readonly coins: number;
  /** Shop levels bought so far, after the shopping that followed the run. */
  readonly levelsBought: number;
}

export interface MetaPlayer {
  readonly player: number;
  /** When the goal stage was first cleared, in minutes, or null. */
  readonly goalMinute: number | null;
  /** When the last card level was bought, in minutes, or null. */
  readonly maxedMinute: number | null;
  readonly runs: readonly MetaRun[];
}

/** Every shop level above the start levels. */
const ALL_LEVELS = UPGRADE_IDS.reduce(
  (sum, id) => sum + UPGRADES[id].maxLevel - UPGRADES[id].startLevel,
  0,
);

/** Plays the player's runs with `play` (the balance bot; tests hand in made-up runs). */
export function playMeta(
  options: MetaOptions,
  play: (options: BotOptions) => BotRun = playBot,
): MetaPlayer {
  let levels: UpgradeLevels = defaultUpgradeLevels();
  let wallet = 0;
  let best = 1;
  let seconds = 0;
  let goalMinute: number | null = null;
  let maxedMinute: number | null = null;
  const runs: MetaRun[] = [];
  for (let k = 1; seconds < options.minutes * 60; k++) {
    const run = play({
      seed: options.player * 1000 + k,
      upgrades: levels,
      aim: options.aim ?? 'smart',
      thinkMs: options.thinkMs,
      extraSaves: options.extraSaves,
      stages: Number.MAX_SAFE_INTEGER,
      capSeconds: 3600,
    });
    const start = seconds + RUN_OVERHEAD_SECONDS;
    const goal = run.clears[options.goal - 1];
    if (goalMinute === null && goal) {
      goalMinute = (start + goal.seconds + options.goal * CLEAR_OVERHEAD_SECONDS) / 60;
    }
    seconds = start + run.playSeconds + run.stagesCleared * CLEAR_OVERHEAD_SECONDS;
    wallet += run.coins;
    best = Math.max(best, run.stagesCleared + 1);
    // The cheapest card it can buy, again and again.
    for (;;) {
      let cheapest: UpgradeId | null = null;
      let price = Infinity;
      for (const id of UPGRADE_IDS) {
        const check = canBuy(id, levels, wallet, best);
        if (check.ok && check.price < price) {
          price = check.price;
          cheapest = id;
        }
      }
      const result = cheapest && buy(cheapest, levels, wallet, best);
      if (!result || !result.ok) break;
      levels = result.levels;
      wallet = result.coins;
    }
    const levelsBought = UPGRADE_IDS.reduce(
      (sum, id) => sum + levels[id] - UPGRADES[id].startLevel,
      0,
    );
    if (maxedMinute === null && levelsBought === ALL_LEVELS) maxedMinute = seconds / 60;
    runs.push({
      minute: seconds / 60,
      stage: run.stagesCleared + 1,
      coins: run.coins,
      levelsBought,
    });
  }
  return { player: options.player, goalMinute, maxedMinute, runs };
}

function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return sorted.length % 2 === 1
    ? (sorted[Math.floor(mid)] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

const minutes = (m: number): string => (Number.isFinite(m) ? `${m.toFixed(1)} min` : 'never');

/** The players' report: the goal clear, the first run, and how far the runs go over time. */
export function metaReport(players: readonly MetaPlayer[], limit: number, goal: number): string {
  const n = players.length;
  const goals = players.map((p) => p.goalMinute ?? Infinity);
  const within = (m: number): number => goals.filter((g) => g <= m).length;
  const lines = [
    `- Stage ${goal} cleared ` +
      [...new Set([15, 30, limit].filter((m) => m <= limit))]
        .map((m, i) => `within ${m} min: ${within(m)}${i === 0 ? ` of ${n}` : ''}`)
        .join('; ') +
      `. Median: ${minutes(median(goals))}.`,
    `- The first run reaches stage ${median(players.map((p) => p.runs[0]?.stage ?? 1))} (median).`,
    `- Every card bought: ${minutes(median(players.map((p) => p.maxedMinute ?? Infinity)))}.`,
    '',
    '| Minute | Runs reach stage (best of the last 20 min, median) | Levels bought (median) |',
    '| --: | --: | --: |',
  ];
  for (const mark of [15, 30, 60, 120, 240, 480].filter((m) => m <= limit)) {
    const reached = players.flatMap((p) => {
      const recent = p.runs.filter((r) => r.minute <= mark && r.minute > mark - 20);
      return recent.length > 0 ? [Math.max(...recent.map((r) => r.stage))] : [];
    });
    const bought = players.map(
      (p) => p.runs.filter((r) => r.minute <= mark).at(-1)?.levelsBought ?? 0,
    );
    lines.push(`| ${mark} | ${median(reached)} | ${median(bought)} |`);
  }
  return lines.join('\n');
}

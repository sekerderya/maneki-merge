/**
 * Headless balance simulator (`npm run sim`, TECH_SPEC §11). Plays seeded runs with the balance
 * bot (tools/sim/bot.ts) for each arm, a set of pick levels, and prints a Markdown table: how many
 * runs cleared their stages, ran out of time or were lost, the median run length and what the
 * picks did.
 *
 *   npm run sim                                   the default table (Batch 19's picks)
 *   npm run sim -- dice copycat=1                 arms: a pick at level 1, or id=level
 *   npm run sim -- "curse max:cursedBell=1,quickCurse=3,moreCurses=3"
 *   npm run sim -- --seeds 30 --cap 240 --stages 1 --workers 4 --aim random
 *   npm run sim -- base --upgrades max --stages 5 --cap 900   shop cards: max, or id=level,…
 *   npm run sim -- base --aim smart --think 400 --extra-saves 1      a more human bot (v0.39)
 *   npm run sim -- --meta 30 --seeds 24 --extra-saves 1 --goal 5     players from a fresh profile
 *
 * `--meta <minutes>` plays each seed as a player who starts from a fresh profile and buys the
 * cheapest card after every run (tools/sim/meta.ts), with the smart bot unless `--aim` says
 * otherwise, and reports when the goal stage is first cleared.
 *
 * An arm is `[name:]id=level,id=level`; a bare id means level 1, and `base` is no picks. Seeds run
 * 1…n, the same for every arm, so arms differ only by their picks. The run code loads through
 * Vite's module runner, so it is the game's own TypeScript, unbundled.
 */
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { runnerImport } from 'vite';
import type * as BotModuleNs from './sim/bot.ts';
import type { Arm, ArmSummary, BotAim, BotOptions, BotRun } from './sim/bot.ts';
import type * as MetaModuleNs from './sim/meta.ts';
import type { MetaOptions, MetaPlayer } from './sim/meta.ts';

type BotModule = typeof BotModuleNs;
type MetaModule = typeof MetaModuleNs;

const BOT = fileURLToPath(new URL('./sim/bot.ts', import.meta.url));
const META = fileURLToPath(new URL('./sim/meta.ts', import.meta.url));

async function loadBot(): Promise<BotModule> {
  const { module } = await runnerImport<BotModule>(BOT, { configFile: false, logLevel: 'error' });
  return module;
}

async function loadMeta(): Promise<MetaModule> {
  const { module } = await runnerImport<MetaModule>(META, { configFile: false, logLevel: 'error' });
  return module;
}

/** The table Batch 19 shipped with (docs/plans/batch-19.md §5.6). */
const DEFAULT_ARMS = [
  'base',
  'hubris',
  'echo',
  'cursedBell',
  'curse max:cursedBell=1,quickCurse=3,moreCurses=3',
  'copycat',
  'dice',
];

/** A run of an arm, or a whole player of `--meta`. */
type Job =
  | { readonly kind: 'run'; readonly arm: number; readonly options: BotOptions }
  | { readonly kind: 'meta'; readonly arm: number; readonly options: MetaOptions };

function parseArm(text: string): Arm {
  const colon = text.indexOf(':');
  const name = colon >= 0 ? text.slice(0, colon) : text;
  const body = colon >= 0 ? text.slice(colon + 1) : text;
  const levels: Record<string, number> = {};
  if (body !== 'base') {
    for (const part of body.split(',').filter(Boolean)) {
      const [id, level] = part.split('=');
      levels[id as string] = level === undefined ? 1 : Number(level);
    }
  }
  return { name, levels };
}

function parseArgs(argv: readonly string[]) {
  const flags: Record<string, number> = {
    seeds: 30,
    cap: 240,
    stages: 1,
    workers: 0,
    meta: 0,
    goal: 5,
    'extra-saves': 0,
  };
  const arms: string[] = [];
  let aim: BotAim | undefined;
  let upgrades: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === '--aim') {
      const value = argv[++i];
      aim = value === 'random' || value === 'smart' ? value : 'match';
    } else if (arg === '--upgrades') upgrades = argv[++i] ?? '';
    else if (arg.startsWith('--')) flags[arg.slice(2)] = Number(argv[++i]);
    else arms.push(arg);
  }
  const workers = flags['workers'] || Math.max(1, Math.min(4, availableParallelism() - 1));
  return {
    arms: (arms.length > 0 ? arms : DEFAULT_ARMS).map(parseArm),
    seeds: flags['seeds'] as number,
    capSeconds: flags['cap'] as number,
    stages: flags['stages'] as number,
    workers,
    // The meta bot plays like a person unless told otherwise.
    aim: aim ?? (flags['meta'] ? 'smart' : 'match'),
    upgrades,
    meta: flags['meta'] as number,
    goal: flags['goal'] as number,
    thinkMs: flags['think'],
    extraSaves: flags['extra-saves'] as number,
  };
}

const per = (total: number, runs: number): string => (runs > 0 ? (total / runs).toFixed(1) : '0');

/** What the picks did, per run, for the table's last column. */
function notes(s: ArmSummary): string {
  const t = s.totals;
  const parts: string[] = [];
  if (t.curses > 0) {
    parts.push(
      `${per(t.curses, s.runs)} curses: ${per(t.lifted, s.runs)} lifted, ` +
        `${per(t.taken, s.runs)} taken, ${per(t.stones, s.runs)} stone`,
    );
  }
  if (t.lucky + t.fizzles > 0) {
    parts.push(`${per(t.lucky, s.runs)} lucky, ${per(t.fizzles, s.runs)} fizzles`);
  }
  if (t.copies > 0) parts.push(`${per(t.copies, s.runs)} NEXT copies`);
  if (t.threes > 0) parts.push(`${per(t.threes, s.runs)} threes`);
  if (t.echoes > 0) parts.push(`${per(t.echoes, s.runs)} echoes`);
  if (t.breaks > 0) parts.push(`${per(t.breaks, s.runs)} breaks`);
  return parts.join('; ') || '–';
}

function table(summaries: readonly ArmSummary[], stages: number, cap: number): string {
  const head =
    `| Arm | Runs | Cleared ${stages === 1 ? 'stage 1' : `${stages} stages`} | ` +
    `Out of time (${cap} s) | Lost | Median run | Drops/run | Merges/run | Coins/run | ` +
    `Per run |`;
  const rule = '| --- | --: | --: | --: | --: | --: | --: | --: | --: | --- |';
  const rows = summaries.map(
    (s) =>
      `| ${s.name} | ${s.runs} | ${s.cleared} | ${s.timedOut} | ${s.lost} | ` +
      `${s.medianSeconds.toFixed(0)} s | ${per(s.totals.drops, s.runs)} | ` +
      `${per(s.totals.merges, s.runs)} | ${per(s.totals.coins, s.runs)} | ${notes(s)} |`,
  );
  return [head, rule, ...rows].join('\n');
}

/** Each arm's mean score, coins and play time at each stage clear (GAME_DESIGN §4, §9). */
function clearsTable(summaries: readonly ArmSummary[]): string {
  const head = '| Arm | Clear | Runs | Score | Coins | Play time |';
  const rule = '| --- | --: | --: | --: | --: | --: |';
  const rows = summaries.flatMap((s) =>
    s.clears.map(
      (c, i) =>
        `| ${s.name} | ${i + 1} | ${c.runs} | ${c.score.toFixed(0)} | ${c.coins.toFixed(0)} | ` +
        `${c.seconds.toFixed(0)} s |`,
    ),
  );
  return [head, rule, ...rows].join('\n');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { arms, seeds, capSeconds, stages, workers, aim, thinkMs, extraSaves } = args;
  const bot = await loadBot();
  const meta = await loadMeta();
  const upgrades = args.upgrades === undefined ? undefined : bot.upgradeLevels(args.upgrades);
  const jobs: Job[] = [];
  if (args.meta > 0) {
    for (let player = 1; player <= seeds; player++) {
      const options = { player, minutes: args.meta, goal: args.goal, aim, thinkMs, extraSaves };
      jobs.push({ kind: 'meta', arm: 0, options });
    }
  } else {
    arms.forEach((arm, index) => {
      for (let seed = 1; seed <= seeds; seed++) {
        const options: BotOptions = {
          seed,
          levels: arm.levels,
          stages,
          capSeconds,
          aim,
          thinkMs,
          extraSaves,
        };
        jobs.push({
          kind: 'run',
          arm: index,
          options: upgrades ? { ...options, upgrades } : options,
        });
      }
    });
  }
  const play = (job: Job): BotRun | MetaPlayer =>
    job.kind === 'run' ? bot.playBot(job.options) : meta.playMeta(job.options);
  const started = performance.now();
  const results: (BotRun | MetaPlayer)[][] = arms.map(() => []);
  let done = 0;
  const report = (): void => {
    process.stderr.write(`\r${++done}/${jobs.length} runs`);
  };

  if (workers <= 1) {
    for (const job of jobs) {
      results[job.arm]!.push(play(job));
      report();
    }
  } else {
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(workers, jobs.length) }, async () => {
        const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { worker: true } });
        const playThere = (job: Job): Promise<BotRun | MetaPlayer> =>
          new Promise((resolve, reject) => {
            worker.once('message', resolve);
            worker.once('error', reject);
            worker.postMessage(job);
          });
        while (next < jobs.length) {
          const job = jobs[next++] as Job;
          results[job.arm]!.push(await playThere(job));
          report();
        }
        await worker.terminate();
      }),
    );
  }

  const seconds = ((performance.now() - started) / 1000).toFixed(0);
  process.stderr.write(`\r${jobs.length} ${args.meta > 0 ? 'players' : 'runs'} in ${seconds} s\n`);
  const how =
    `Bot aim: ${aim}${aim === 'smart' ? `, ${thinkMs ?? bot.DEFAULT_THINK_MS} ms before each drop` : ''}` +
    (extraSaves > 0 ? `, ${extraSaves} extra Lucky Save${extraSaves > 1 ? 's' : ''}` : '');
  if (args.meta > 0) {
    const players = (results[0] as MetaPlayer[]).sort((a, b) => a.player - b.player);
    console.log(`${how}; ${seeds} players from a fresh profile, ${args.meta} min each.\n`);
    console.log(meta.metaReport(players, args.meta, args.goal));
    return;
  }
  const summaries = arms.map((arm, i) =>
    bot.summarize(
      arm.name,
      (results[i] as BotRun[]).sort((a, b) => a.seed - b.seed),
      stages,
    ),
  );
  console.log(`${how}, seeds 1–${seeds} per arm.
`);
  console.log(table(summaries, stages, capSeconds));
  console.log(`\nShop cards: ${upgrades ? 'as given' : 'a fresh profile'}.\n`);
  console.log(clearsTable(summaries));
}

if (isMainThread) {
  await main();
} else if ((workerData as { worker?: boolean } | null)?.worker) {
  const bot = await loadBot();
  const meta = await loadMeta();
  parentPort?.on('message', (job: Job) => {
    parentPort?.postMessage(
      job.kind === 'run' ? bot.playBot(job.options) : meta.playMeta(job.options),
    );
  });
}

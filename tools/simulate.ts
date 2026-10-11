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

type BotModule = typeof BotModuleNs;

const BOT = fileURLToPath(new URL('./sim/bot.ts', import.meta.url));

async function loadBot(): Promise<BotModule> {
  const { module } = await runnerImport<BotModule>(BOT, { configFile: false, logLevel: 'error' });
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

interface Job {
  readonly arm: number;
  readonly options: BotOptions;
}

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
  const flags: Record<string, number> = { seeds: 30, cap: 240, stages: 1, workers: 0 };
  const arms: string[] = [];
  let aim: BotAim = 'match';
  let upgrades: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === '--aim') aim = argv[++i] === 'random' ? 'random' : 'match';
    else if (arg === '--upgrades') upgrades = argv[++i] ?? '';
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
    aim,
    upgrades,
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
  const { arms, seeds, capSeconds, stages, workers, aim } = args;
  const bot = await loadBot();
  const upgrades = args.upgrades === undefined ? undefined : bot.upgradeLevels(args.upgrades);
  const jobs: Job[] = [];
  arms.forEach((arm, index) => {
    for (let seed = 1; seed <= seeds; seed++) {
      const options: BotOptions = { seed, levels: arm.levels, stages, capSeconds, aim };
      jobs.push({ arm: index, options: upgrades ? { ...options, upgrades } : options });
    }
  });
  const started = performance.now();
  const results: BotRun[][] = arms.map(() => []);
  let done = 0;
  const report = (): void => {
    process.stderr.write(`\r${++done}/${jobs.length} runs`);
  };

  if (workers <= 1) {
    for (const job of jobs) {
      results[job.arm]!.push(bot.playBot(job.options));
      report();
    }
  } else {
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(workers, jobs.length) }, async () => {
        const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { worker: true } });
        const play = (job: Job): Promise<BotRun> =>
          new Promise((resolve, reject) => {
            worker.once('message', resolve);
            worker.once('error', reject);
            worker.postMessage(job.options);
          });
        while (next < jobs.length) {
          const job = jobs[next++] as Job;
          results[job.arm]!.push(await play(job));
          report();
        }
        await worker.terminate();
      }),
    );
  }

  const summaries = arms.map((arm, i) =>
    bot.summarize(
      arm.name,
      [...results[i]!].sort((a, b) => a.seed - b.seed),
      stages,
    ),
  );
  const seconds = ((performance.now() - started) / 1000).toFixed(0);
  process.stderr.write(`\r${jobs.length} runs in ${seconds} s\n`);
  console.log(`Bot aim: ${aim}, seeds 1–${seeds} per arm.
`);
  console.log(table(summaries, stages, capSeconds));
  console.log(`\nShop cards: ${upgrades ? 'as given' : 'a fresh profile'}.\n`);
  console.log(clearsTable(summaries));
}

if (isMainThread) {
  await main();
} else if ((workerData as { worker?: boolean } | null)?.worker) {
  const bot = await loadBot();
  parentPort?.on('message', (options: BotOptions) => {
    parentPort?.postMessage(bot.playBot(options));
  });
}

/**
 * Play statistics for a run (TECH_SPEC §17): maps the run's events to the statistics' events, a
 * stage's coins added up by source, and its frame rate sampled while it plays. Composition only,
 * like feedback.ts; scenes (GAME_DESIGN §2.6) are never reported.
 */
import { FPS_SAMPLE_MS } from './config/analytics';
import { CoinTally, FpsSamples } from './core/analytics';
import type { EventBus, GameEvents } from './core/events';
import type { RunState } from './run/RunController';
import type { Analytics } from './platform/analytics';

/** What the statistics read from the run. */
export interface RunAnalyticsSource {
  readonly state: RunState;
  readonly stage: number;
  readonly score: number;
  readonly coins: number;
  /** Play time: pauses and the stage clear's time stop don't count. */
  readonly playTimeMs: number;
}

/** The page around the run: the frame rate, whether it shows, and the sampling timer. */
export interface RunAnalyticsEnv {
  fps(): number;
  visible(): boolean;
  setInterval(fn: () => void, ms: number): number;
  clearInterval(handle: number): void;
}

/** How the run began: a new one (with the profile's run count) or one the app was closed in. */
export type RunAnalyticsStart =
  { readonly fresh: true; readonly runsPlayed: number } | { readonly fresh: false };

export interface RunAnalytics {
  /** The player went back to the menu before the run was over. */
  quit(): void;
  /** Stops listening and sampling (the run is gone). */
  dispose(): void;
}

export function connectRunAnalytics(
  events: EventBus<GameEvents>,
  run: RunAnalyticsSource,
  out: Analytics,
  env: RunAnalyticsEnv,
  start: RunAnalyticsStart,
): RunAnalytics {
  const coins = new CoinTally();
  const fps = new FpsSamples();
  let stageStartMs = run.playTimeMs;
  let ended = false;

  /** A stage's coins by source and its frame rate, sent when it is cleared or the run ends. */
  const flushStage = (stage: number): void => {
    for (const { source, amount } of coins.take()) {
      out.track({ type: 'coinsEarned', source, amount, stage });
    }
    const frames = fps.take();
    if (frames) out.track({ type: 'performance', stage, ...frames });
  };
  const end = (reason: 'gameOver' | 'quit', stage: number, score: number, total: number): void => {
    if (ended) return;
    ended = true;
    flushStage(stage);
    out.track({
      type: 'runEnded',
      reason,
      stage,
      score,
      coins: total,
      seconds: run.playTimeMs / 1000,
    });
  };

  if (start.fresh) {
    out.track({ type: 'runStarted', runsPlayed: start.runsPlayed });
    out.track({ type: 'stageStarted', stage: run.stage });
  }

  const offs = [
    events.on('merged', (e) => coins.add('merge', e.coins)),
    events.on('jackpot', (e) => coins.add('merge', e.coins)),
    events.on('catPopped', (e) => coins.add('pop', e.coins)),
    events.on('luckyGift', (e) => coins.add('gift', e.coins)),
    events.on('stageCleared', (e) => {
      const seconds = (run.playTimeMs - stageStartMs) / 1000;
      flushStage(e.stage);
      out.track({ type: 'stageCleared', stage: e.stage, score: run.score, seconds });
    }),
    // The next stage opens with its jar empty (after the picks and, when the jar grows, the zoom).
    events.on('expansionRevealed', (e) => {
      stageStartMs = run.playTimeMs;
      out.track({ type: 'stageStarted', stage: e.stage });
    }),
    events.on('pickChosen', (e) =>
      out.track({ type: 'pick', kind: e.kind, id: e.id, level: e.level }),
    ),
    events.on('luckySave', () => out.track({ type: 'luckySave', stage: run.stage })),
    events.on('gameOver', (e) => {
      end('gameOver', e.stage, e.score, e.coins);
      out.track({ type: 'screen', screen: 'gameOver' });
    }),
  ];
  // Sampled only while the stage is played and the page shows: a pause or the background isn't a
  // slow frame.
  const timer = env.setInterval(() => {
    if (run.state === 'playing' && env.visible()) fps.add(env.fps());
  }, FPS_SAMPLE_MS);

  return {
    quit() {
      end('quit', run.stage, run.score, run.coins);
    },
    dispose() {
      env.clearInterval(timer);
      for (const off of offs) off();
    },
  };
}

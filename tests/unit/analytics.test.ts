import { describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_ERROR_MESSAGE_MAX,
  ANALYTICS_ERRORS_PER_LAUNCH,
  ANALYTICS_PENDING_MAX,
  FPS_SAMPLE_MS,
} from '../../src/config/analytics';
import {
  CoinTally,
  describeError,
  ErrorFilter,
  FpsSamples,
  parseStack,
  stageLabel,
} from '../../src/core/analytics';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import {
  AnalyticsHub,
  CrashlyticsSink,
  errorText,
  FakeAnalyticsSink,
  FirebaseAnalyticsSink,
  GameAnalyticsSink,
} from '../../src/platform/analytics';
import type {
  AnalyticsEvent,
  AnalyticsSink,
  CrashlyticsApi,
  FirebaseAnalyticsApi,
  GameAnalyticsApi,
} from '../../src/platform/analytics';
import { connectRunAnalytics } from '../../src/runAnalytics';
import type { RunAnalyticsEnv, RunAnalyticsSource } from '../../src/runAnalytics';

/** Lets the hub's pending starts (dynamic imports in the app) settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the statistics helpers (TECH_SPEC §17)', () => {
  it('names stages so they sort', () => {
    expect(stageLabel(1)).toBe('stage01');
    expect(stageLabel(12)).toBe('stage12');
    expect(stageLabel(120)).toBe('stage120');
    expect(stageLabel(Number.NaN)).toBe('stage00');
  });

  it('adds a stage’s coins by source and starts over', () => {
    const tally = new CoinTally();
    tally.add('pop', 5);
    tally.add('merge', 10);
    tally.add('merge', 2.5);
    tally.add('gift', 0);
    tally.add('ad', -3);
    tally.add('ad', Number.NaN);
    expect(tally.take()).toEqual([
      { source: 'merge', amount: 12.5 },
      { source: 'pop', amount: 5 },
    ]);
    expect(tally.take()).toEqual([]);
  });

  it('averages frame-rate samples and keeps the lowest', () => {
    const fps = new FpsSamples();
    expect(fps.take()).toBeNull();
    for (const sample of [60, 58.6, 30.2, 0, Number.NaN]) fps.add(sample);
    expect(fps.take()).toEqual({ average: 50, low: 30 });
    expect(fps.take()).toBeNull();
  });

  it('reads V8 and WebKit stacks into frames', () => {
    const v8 = [
      'TypeError: x is undefined',
      '    at drop (https://localhost/assets/index-ab12.js:1:2345)',
      '    at https://localhost/assets/index-ab12.js:3:10',
      '    at <anonymous>',
    ].join('\n');
    expect(parseStack(v8)).toEqual([
      { functionName: 'drop', fileName: 'https://localhost/assets/index-ab12.js', lineNumber: 1 },
      { fileName: 'https://localhost/assets/index-ab12.js', lineNumber: 3 },
    ]);
    const webkit = 'drop@https://x.test/a.js:7:1\n@https://x.test/a.js:9:2\nnothing here';
    expect(parseStack(webkit)).toEqual([
      { functionName: 'drop', fileName: 'https://x.test/a.js', lineNumber: 7 },
      { fileName: 'https://x.test/a.js', lineNumber: 9 },
    ]);
    expect(parseStack(null)).toEqual([]);
    expect(parseStack(v8, 1)).toHaveLength(1);
  });

  it('describes anything thrown', () => {
    const error = new RangeError('bad tier');
    expect(describeError(error)).toEqual({
      message: 'RangeError: bad tier',
      stack: error.stack ?? null,
    });
    expect(describeError('plain')).toEqual({ message: 'plain', stack: null });
    expect(describeError({ code: 3 })).toEqual({ message: '{"code":3}', stack: null });
    expect(describeError(undefined)).toEqual({ message: 'undefined', stack: null });
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    expect(describeError(cyclic).message).toBe('[object Object]');
  });

  it('sends each error message once, a few a launch, cut short', () => {
    const filter = new ErrorFilter(2);
    expect(filter.accept('a')).toBe('a');
    expect(filter.accept(' a ')).toBeNull();
    expect(filter.accept('')).toBe('Unknown error');
    expect(filter.accept('c')).toBeNull();
    const long = new ErrorFilter();
    expect(long.accept('x'.repeat(1000))).toHaveLength(ANALYTICS_ERROR_MESSAGE_MAX);
    const many = new ErrorFilter();
    const sent = Array.from({ length: 30 }, (_, i) => many.accept(`e${i}`)).filter(Boolean);
    expect(sent).toHaveLength(ANALYTICS_ERRORS_PER_LAUNCH);
  });
});

/** A service that records what the hub does with it. */
class SpySink implements AnalyticsSink {
  readonly log: string[] = [];
  readonly events: AnalyticsEvent[] = [];
  constructor(
    readonly name: string,
    private readonly fail = false,
  ) {}
  start(): Promise<void> {
    this.log.push('start');
    return this.fail ? Promise.reject(new Error('no SDK')) : Promise.resolve();
  }
  setEnabled(on: boolean): void {
    this.log.push(on ? 'on' : 'off');
  }
  track(event: AnalyticsEvent): void {
    this.events.push(event);
  }
  suspend(): void {
    this.log.push('suspend');
  }
  resume(): void {
    this.log.push('resume');
  }
}

const screen = (name: 'menu' | 'game'): AnalyticsEvent => ({ type: 'screen', screen: name });

describe('AnalyticsHub (TECH_SPEC §17)', () => {
  it('has nothing to ask about without a service', () => {
    const hub = new AnalyticsHub([], 'none');
    expect(hub.available).toBe(false);
    hub.setConsent(true);
    hub.track(screen('menu'));
    expect(hub.status()).toEqual({
      mode: 'none',
      consent: 'unknown',
      sinks: [],
      sent: 0,
      pending: 0,
    });
  });

  it('keeps events until the yes, then starts the services and sends them', async () => {
    const sink = new SpySink('A');
    const hub = new AnalyticsHub([sink], 'test');
    hub.track(screen('menu'));
    hub.track(screen('game'));
    expect(sink.log).toEqual([]);
    expect(hub.status().pending).toBe(2);
    hub.setConsent(true);
    // Events while the service loads wait too.
    hub.track({ type: 'stageStarted', stage: 1 });
    await settle();
    expect(sink.log).toEqual(['start', 'on']);
    expect(sink.events.map((e) => e.type)).toEqual(['screen', 'screen', 'stageStarted']);
    hub.track(screen('menu'));
    expect(sink.events).toHaveLength(4);
    expect(hub.status()).toMatchObject({ consent: 'granted', sinks: ['A: on'], sent: 4 });
  });

  it('drops what waited on a no, and sends nothing after it', async () => {
    const sink = new SpySink('A');
    const hub = new AnalyticsHub([sink], 'live');
    hub.track(screen('menu'));
    hub.setConsent(false);
    hub.track(screen('game'));
    await settle();
    expect(sink.log).toEqual([]);
    expect(hub.status()).toMatchObject({ consent: 'denied', pending: 0, sent: 0 });
  });

  it('turns the services off and on again with the Settings row', async () => {
    const sink = new SpySink('A');
    const hub = new AnalyticsHub([sink], 'live');
    hub.setConsent(true);
    await settle();
    hub.setConsent(false);
    hub.track(screen('menu'));
    hub.suspend();
    hub.setConsent(true);
    hub.track(screen('game'));
    hub.suspend();
    hub.resume();
    expect(sink.log).toEqual(['start', 'on', 'off', 'on', 'suspend', 'resume']);
    expect(sink.events).toEqual([screen('game')]);
  });

  it('keeps only the newest events while the player hasn’t answered', async () => {
    const sink = new SpySink('A');
    const hub = new AnalyticsHub([sink], 'live');
    for (let stage = 1; stage <= ANALYTICS_PENDING_MAX + 5; stage++) {
      hub.track({ type: 'stageStarted', stage });
    }
    hub.setConsent(true);
    await settle();
    expect(sink.events).toHaveLength(ANALYTICS_PENDING_MAX);
    expect(sink.events[0]).toEqual({ type: 'stageStarted', stage: 6 });
  });

  it('leaves a service out when it can’t start, and never throws into the game', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const broken = new SpySink('Broken', true);
    const throwing = new SpySink('Throwing');
    throwing.track = () => {
      throw new Error('SDK bug');
    };
    const good = new SpySink('Good');
    const hub = new AnalyticsHub([broken, throwing, good], 'live');
    hub.setConsent(true);
    await settle();
    expect(() => hub.track(screen('menu'))).not.toThrow();
    expect(broken.events).toEqual([]);
    expect(good.events).toEqual([screen('menu')]);
    expect(hub.status().sinks).toEqual(['Broken: failed', 'Throwing: on', 'Good: on']);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('reports each error once, with its frames', async () => {
    const sink = new SpySink('A');
    const hub = new AnalyticsHub([sink], 'live');
    hub.setConsent(true);
    await settle();
    const error = new TypeError('boom');
    error.stack = 'TypeError: boom\n    at f (https://x.test/a.js:2:3)';
    hub.error(error);
    hub.error(error);
    hub.error('a rejection');
    expect(sink.events).toEqual([
      {
        type: 'error',
        message: 'TypeError: boom',
        frames: [{ functionName: 'f', fileName: 'https://x.test/a.js', lineNumber: 2 }],
      },
      { type: 'error', message: 'a rejection', frames: [] },
    ]);
  });

  it('keeps every event in the fake service', async () => {
    const fake = new FakeAnalyticsSink();
    const hub = new AnalyticsHub([fake], 'fake');
    hub.setConsent(true);
    await settle();
    hub.track(screen('menu'));
    hub.suspend();
    hub.resume();
    expect(fake).toMatchObject({ started: true, enabled: true, events: [screen('menu')] });
  });
});

/** Every call the services make, as text. */
function recorder() {
  const calls: string[] = [];
  const ga: GameAnalyticsApi = {
    configure: (build, currencies, itemTypes) =>
      calls.push(`configure ${build} ${currencies.join()} ${itemTypes.join()}`),
    initialize: (key, secret) => calls.push(`initialize ${key} ${secret}`),
    progression: (status, p1, score) =>
      calls.push(`progression ${status} ${p1}${score === undefined ? '' : ` ${score}`}`),
    resource: (flow, currency, amount, type, id) =>
      calls.push(`resource ${flow} ${currency} ${amount} ${type} ${id}`),
    design: (id, value) => calls.push(`design ${id}${value === undefined ? '' : ` ${value}`}`),
    error: (message) => calls.push(`error ${message}`),
    setEnabled: (on) => calls.push(`enabled ${on}`),
    onStop: () => calls.push('stop'),
    onResume: () => calls.push('resume'),
  };
  const firebase: FirebaseAnalyticsApi = {
    setEnabled: (on) => {
      calls.push(`enabled ${on}`);
      return Promise.reject(new Error('ignored'));
    },
    setScreen: (name) => {
      calls.push(`screen ${name}`);
    },
    logEvent: (name, params) => {
      calls.push(`${name} ${JSON.stringify(params)}`);
    },
  };
  const crashlytics: CrashlyticsApi = {
    setEnabled: (on) => Promise.resolve(void calls.push(`enabled ${on}`)),
    recordException: (message, frames) =>
      Promise.resolve(void calls.push(`exception ${message} ${frames.length}`)),
    log: (message) => Promise.resolve(void calls.push(`log ${message}`)),
    setCustomKey: (key, value) => Promise.resolve(void calls.push(`key ${key}=${value}`)),
  };
  return { calls, ga, firebase, crashlytics };
}

/** One of each event the game sends. */
const ALL_EVENTS: readonly AnalyticsEvent[] = [
  { type: 'screen', screen: 'shop' },
  { type: 'runStarted', runsPlayed: 3 },
  { type: 'stageStarted', stage: 2 },
  { type: 'stageCleared', stage: 2, score: 1234.6, seconds: 95.4 },
  { type: 'runEnded', reason: 'quit', stage: 3, score: 5e12, coins: 40, seconds: 300.2 },
  { type: 'coinsEarned', source: 'merge', amount: 25, stage: 3 },
  { type: 'coinsSpent', upgrade: 'luckyPaw', level: 2, amount: 150 },
  { type: 'pick', kind: 'trial', id: 'wind', level: 1 },
  { type: 'luckySave', stage: 3 },
  { type: 'ad', placement: 'luckySave', outcome: 'rewarded' },
  { type: 'performance', stage: 3, average: 58, low: 41 },
  {
    type: 'error',
    message: 'TypeError: boom',
    frames: [{ functionName: 'f', fileName: 'a.js', lineNumber: 2 }],
  },
];

describe('the services’ events (TECH_SPEC §17)', () => {
  it('GameAnalytics: progression, resources and design events', async () => {
    const { calls, ga } = recorder();
    const sink = new GameAnalyticsSink(
      () => Promise.resolve(ga),
      { gameKey: 'k', secretKey: 's' },
      'web 1.0.0',
    );
    sink.track(ALL_EVENTS[0] as AnalyticsEvent); // before start: nothing
    await sink.start();
    sink.setEnabled(true);
    for (const event of ALL_EVENTS) sink.track(event);
    sink.suspend();
    sink.resume();
    expect(calls).toEqual([
      'configure web 1.0.0 coins merge,pop,gift,ad,upgrade',
      'initialize k s',
      'enabled true',
      'design screen:shop',
      'design run:start 3',
      'progression start stage02',
      'progression complete stage02 1235',
      'design stage:time:stage02 95',
      'progression fail stage03 2147483647',
      'design run:quit:stage03 300',
      'resource source coins 25 merge stage03',
      'resource sink coins 150 upgrade luckyPaw',
      'design upgrade:luckyPaw 2',
      'design pick:trial:wind 1',
      'design luckySave:stage03',
      'design ad:luckySave:rewarded',
      'design performance:fps:average 58',
      'design performance:fps:low 41',
      'error TypeError: boom at f (a.js:2)',
      'stop',
      'resume',
    ]);
  });

  it('Firebase Analytics: screens and Google’s game events, never an error', async () => {
    const { calls, firebase } = recorder();
    const sink = new FirebaseAnalyticsSink(() => Promise.resolve(firebase));
    await sink.start();
    sink.setEnabled(true);
    for (const event of ALL_EVENTS) sink.track(event);
    sink.suspend();
    sink.resume();
    await settle();
    expect(calls).toEqual([
      'enabled true',
      'screen shop',
      'run_start {"runs_played":3}',
      'level_start {"level_name":"stage02"}',
      'level_end {"level_name":"stage02","success":true,"score":1235,"seconds":95}',
      'level_end {"level_name":"stage03","success":false,"reason":"quit"}',
      'post_score {"score":2147483647,"level":3,"reason":"quit","seconds":300}',
      'earn_virtual_currency {"virtual_currency_name":"coins","value":25,"source":"merge","level_name":"stage03"}',
      'spend_virtual_currency {"virtual_currency_name":"coins","value":150,"item_name":"luckyPaw","level":2}',
      'pick_chosen {"kind":"trial","pick":"wind","level":1}',
      'lucky_save {"level_name":"stage03"}',
      'ad_offer {"placement":"luckySave","outcome":"rewarded"}',
      'performance {"level_name":"stage03","fps_average":58,"fps_low":41}',
    ]);
  });

  it('Crashlytics: errors, with screens and stages as breadcrumbs', async () => {
    const { calls, crashlytics } = recorder();
    const sink = new CrashlyticsSink(() => Promise.resolve(crashlytics));
    sink.track(ALL_EVENTS[11] as AnalyticsEvent); // before start: nothing
    await sink.start();
    sink.setEnabled(true);
    for (const event of ALL_EVENTS) sink.track(event);
    sink.suspend();
    sink.resume();
    await settle();
    expect(calls).toEqual([
      'enabled true',
      'log screen shop',
      'key stage=2',
      'log stage 2 started',
      'log run ended (quit) at stage 3',
      'exception TypeError: boom 1',
    ]);
  });

  it('writes an error for a text-only service with its top frames', () => {
    expect(errorText('E', [])).toBe('E');
    expect(errorText('E', [{ lineNumber: 4 }, { functionName: 'g', fileName: 'b.js' }])).toBe(
      'E at ? (?:4) < g (b.js:?)',
    );
  });
});

/** A run as the statistics read it, moved by hand. */
function fakeRun(): RunAnalyticsSource & {
  state: RunAnalyticsSource['state'];
  stage: number;
  score: number;
  coins: number;
  playTimeMs: number;
} {
  return { state: 'playing', stage: 1, score: 0, coins: 0, playTimeMs: 0 };
}

function fakeEnv(fps = 60, visible = true) {
  let tick: (() => void) | null = null;
  const env: RunAnalyticsEnv & { visible: () => boolean } = {
    fps: () => fps,
    visible: () => visible,
    setInterval: (fn, ms) => {
      expect(ms).toBe(FPS_SAMPLE_MS);
      tick = fn;
      return 7;
    },
    clearInterval: (handle) => {
      expect(handle).toBe(7);
      tick = null;
    },
  };
  return {
    env,
    sample: () => tick?.(),
    get sampling() {
      return tick !== null;
    },
    setFps: (value: number) => (fps = value),
    setVisible: (value: boolean) => (visible = value),
  };
}

const at = { x: 0, y: 0 };

describe('a run’s statistics (TECH_SPEC §17)', () => {
  it('reports a run: its stages, their coins and frame rate, and its end', () => {
    const events = new EventBus<GameEvents>();
    const run = fakeRun();
    const page = fakeEnv();
    const sent: AnalyticsEvent[] = [];
    const stats = connectRunAnalytics(
      events,
      run,
      { track: (e) => sent.push(e), error: () => undefined },
      page.env,
      { fresh: true, runsPlayed: 4 },
    );
    expect(sent).toEqual([
      { type: 'runStarted', runsPlayed: 4 },
      { type: 'stageStarted', stage: 1 },
    ]);
    sent.length = 0;

    events.emit('merged', {
      id: 1,
      tier: 1,
      newTier: 2,
      newSize: 2,
      golden: false,
      joker: false,
      parts: 2,
      kintsugi: false,
      dice: null,
      curseLifted: false,
      at,
      score: 10,
      coins: 3,
      combo: 1,
    });
    events.emit('jackpot', { tier: 9, at, score: 1, coins: 2, combo: 1 });
    events.emit('catPopped', { id: 2, tier: 1, at, coins: 4, reason: 'cashOut' });
    events.emit('luckyGift', { stage: 1, coins: 6 });
    page.sample();
    page.setFps(40);
    page.sample();
    // Paused or hidden: no sample.
    run.state = 'paused';
    page.sample();
    run.state = 'playing';
    page.setVisible(false);
    page.sample();
    page.setVisible(true);
    run.playTimeMs = 90_000;
    run.score = 500;
    events.emit('stageCleared', { stage: 1, tier: 11, grows: false });
    events.emit('pickChosen', { kind: 'blessing', id: 'lightning', level: 1 });
    run.stage = 2;
    events.emit('expansionRevealed', { stage: 2, newTiers: [12] });
    run.playTimeMs = 120_000;
    events.emit('luckySave', { savesLeft: 0 });
    events.emit('gameOver', { score: 800, stage: 2, coins: 20, highestTier: 12 });
    // Back to the menu after game over: already reported.
    stats.quit();
    stats.dispose();
    expect(page.sampling).toBe(false);
    events.emit('merged', {
      id: 3,
      tier: 1,
      newTier: 2,
      newSize: 2,
      golden: false,
      joker: false,
      parts: 2,
      kintsugi: false,
      dice: null,
      curseLifted: false,
      at,
      score: 10,
      coins: 3,
      combo: 1,
    });
    expect(sent).toEqual([
      { type: 'coinsEarned', source: 'merge', amount: 5, stage: 1 },
      { type: 'coinsEarned', source: 'pop', amount: 4, stage: 1 },
      { type: 'coinsEarned', source: 'gift', amount: 6, stage: 1 },
      { type: 'performance', stage: 1, average: 50, low: 40 },
      { type: 'stageCleared', stage: 1, score: 500, seconds: 90 },
      { type: 'pick', kind: 'blessing', id: 'lightning', level: 1 },
      { type: 'stageStarted', stage: 2 },
      { type: 'luckySave', stage: 2 },
      { type: 'runEnded', reason: 'gameOver', stage: 2, score: 800, coins: 20, seconds: 120 },
      { type: 'screen', screen: 'gameOver' },
    ]);
  });

  it('reports a quit once, and nothing at the start of a run that comes back', () => {
    const events = new EventBus<GameEvents>();
    const run = fakeRun();
    run.stage = 4;
    run.score = 77;
    run.coins = 9;
    run.playTimeMs = 61_000;
    const sent: AnalyticsEvent[] = [];
    const stats = connectRunAnalytics(
      events,
      run,
      { track: (e) => sent.push(e), error: () => undefined },
      fakeEnv().env,
      { fresh: false },
    );
    expect(sent).toEqual([]);
    stats.quit();
    stats.quit();
    expect(sent).toEqual([
      { type: 'runEnded', reason: 'quit', stage: 4, score: 77, coins: 9, seconds: 61 },
    ]);
  });
});

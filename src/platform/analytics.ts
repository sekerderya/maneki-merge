/**
 * Play statistics (TECH_SPEC §17, GAME_DESIGN §2.8). The game only talks to `Analytics`:
 * `track(event)` and `error(error)`. `AnalyticsHub` sends them on to the services this build has
 * (`AnalyticsSink`s), and only after the player's yes: until they answer the statistics card a few
 * events wait (`ANALYTICS_PENDING_MAX`), and a no drops them. The services:
 * - `GameAnalyticsSink`: GameAnalytics, both builds (stage progression, coins, picks, ads, errors).
 * - `FirebaseAnalyticsSink`: Firebase Analytics, the web app (Firebase's JS SDK) and the Android
 *   app (its native SDK, `platform/native/`): screens, sessions, retention.
 * - `CrashlyticsSink`: Firebase Crashlytics, the Android app: native crashes on its own, the
 *   page's errors from here.
 * - `FakeAnalyticsSink`: `?analytics=fake`, keeps the events for the debug panel and Playwright.
 * Every SDK loads on the first yes (a dynamic import), so the first launch never waits for one,
 * and a service that can't start is left out. Nothing here ever throws into the game.
 */
import type { AdPlacement } from '../config/ads';
import {
  ANALYTICS_CURRENCY,
  ANALYTICS_ITEM_TYPES,
  ANALYTICS_PENDING_MAX,
} from '../config/analytics';
import type { CoinSource } from '../config/analytics';
import type { PickId, PickKind } from '../config/picks';
import type { UpgradeId } from '../config/upgrades';
import { describeError, ErrorFilter, parseStack, stageLabel } from '../core/analytics';
import type { StackFrame } from '../core/analytics';
import type { AdResult } from './ads';

export type { StackFrame } from '../core/analytics';

export type AnalyticsScreen = 'menu' | 'game' | 'shop' | 'settings' | 'gameOver';

/** A rewarded ad's card was offered, declined, or the ad ran and ended so. */
export type AdOutcome = 'offered' | 'declined' | AdResult;

export type AnalyticsEvent =
  | { readonly type: 'screen'; readonly screen: AnalyticsScreen }
  | { readonly type: 'runStarted'; readonly runsPlayed: number }
  | { readonly type: 'stageStarted'; readonly stage: number }
  | {
      readonly type: 'stageCleared';
      readonly stage: number;
      readonly score: number;
      /** The stage's play time (pauses and the stage clear's time stop don't count). */
      readonly seconds: number;
    }
  | {
      readonly type: 'runEnded';
      /** Game over, or the player went back to the menu. */
      readonly reason: 'gameOver' | 'quit';
      readonly stage: number;
      readonly score: number;
      readonly coins: number;
      readonly seconds: number;
    }
  | {
      readonly type: 'coinsEarned';
      readonly source: CoinSource;
      readonly amount: number;
      readonly stage: number;
    }
  | {
      readonly type: 'coinsSpent';
      readonly upgrade: UpgradeId;
      readonly level: number;
      readonly amount: number;
    }
  | { readonly type: 'pick'; readonly kind: PickKind; readonly id: PickId; readonly level: number }
  | { readonly type: 'luckySave'; readonly stage: number }
  | { readonly type: 'ad'; readonly placement: AdPlacement; readonly outcome: AdOutcome }
  | {
      readonly type: 'performance';
      readonly stage: number;
      /** Frames per second: the stage's average and its lowest sample. */
      readonly average: number;
      readonly low: number;
    }
  | { readonly type: 'error'; readonly message: string; readonly frames: readonly StackFrame[] };

/** What the game reports to. */
export interface Analytics {
  track(event: AnalyticsEvent): void;
  /** An uncaught error or rejection: each message once, a few a launch. */
  error(error: unknown): void;
}

/** One statistics service. */
export interface AnalyticsSink {
  readonly name: string;
  /** Loads and starts the service; called once, on the first yes. */
  start(): Promise<void>;
  /** Sending on (after the yes) or off (a later no in Settings). */
  setEnabled(on: boolean): void;
  track(event: AnalyticsEvent): void;
  /** The app went to the background, or came back (GameAnalytics' sessions). */
  suspend(): void;
  resume(): void;
}

export type AnalyticsConsent = 'unknown' | 'granted' | 'denied';

/** What the debug panel shows. */
export interface AnalyticsStatus {
  /** `none` (no keys in this build), `fake`, `test` (debug, the dev app) or `live`. */
  readonly mode: AnalyticsMode;
  readonly consent: AnalyticsConsent;
  /** Each service and its state: idle, starting, on, off, failed. */
  readonly sinks: readonly string[];
  /** Events sent on so far, and the ones waiting for the answer. */
  readonly sent: number;
  readonly pending: number;
}

export type AnalyticsMode = 'none' | 'fake' | 'test' | 'live';

type SinkState = 'idle' | 'starting' | 'ready' | 'on' | 'off' | 'failed';

export class AnalyticsHub implements Analytics {
  private consentState: AnalyticsConsent = 'unknown';
  private pending: AnalyticsEvent[] = [];
  private readonly states = new Map<AnalyticsSink, SinkState>();
  private starting: Promise<void> | null = null;
  private ready = false;
  private readonly errors = new ErrorFilter();
  private sent = 0;

  constructor(
    private readonly sinks: readonly AnalyticsSink[],
    readonly mode: AnalyticsMode,
  ) {
    for (const sink of sinks) this.states.set(sink, 'idle');
  }

  /** This build has a service to send to: the card and the Settings row show only then. */
  get available(): boolean {
    return this.sinks.length > 0;
  }

  get consent(): AnalyticsConsent {
    return this.consentState;
  }

  /** The player's answer (the card, Settings, or the one saved). */
  setConsent(granted: boolean): void {
    if (!this.available) return;
    this.consentState = granted ? 'granted' : 'denied';
    if (!granted) this.pending = [];
    if (granted) this.starting ??= this.startAll();
    if (this.ready) this.apply();
  }

  track(event: AnalyticsEvent): void {
    if (!this.available || this.consentState === 'denied') return;
    if (this.consentState === 'unknown' || !this.ready) {
      this.pending.push(event);
      if (this.pending.length > ANALYTICS_PENDING_MAX) this.pending.shift();
      return;
    }
    this.send(event);
  }

  error(error: unknown): void {
    try {
      const { message, stack } = describeError(error);
      const text = this.errors.accept(message);
      if (text !== null) this.track({ type: 'error', message: text, frames: parseStack(stack) });
    } catch {
      // A statistics bug never becomes the game's.
    }
  }

  suspend(): void {
    this.each((sink) => sink.suspend());
  }

  resume(): void {
    this.each((sink) => sink.resume());
  }

  status(): AnalyticsStatus {
    return {
      mode: this.mode,
      consent: this.consentState,
      sinks: this.sinks.map((sink) => `${sink.name}: ${this.states.get(sink) ?? 'idle'}`),
      sent: this.sent,
      pending: this.pending.length,
    };
  }

  private async startAll(): Promise<void> {
    await Promise.all(
      this.sinks.map(async (sink) => {
        this.states.set(sink, 'starting');
        try {
          await sink.start();
          this.states.set(sink, 'ready');
        } catch (error) {
          this.states.set(sink, 'failed');
          console.warn(`${sink.name} could not start.`, error);
        }
      }),
    );
    this.ready = true;
    this.apply();
  }

  /** Turns the started services on or off for the answer, and sends what waited for a yes. */
  private apply(): void {
    const on = this.consentState === 'granted';
    for (const sink of this.sinks) {
      const state = this.states.get(sink);
      if (state !== 'ready' && state !== 'on' && state !== 'off') continue;
      try {
        sink.setEnabled(on);
      } catch {
        // Ignored: the service stays as it was.
      }
      this.states.set(sink, on ? 'on' : 'off');
    }
    if (!on) return;
    const waiting = this.pending;
    this.pending = [];
    for (const event of waiting) this.send(event);
  }

  private send(event: AnalyticsEvent): void {
    this.sent++;
    this.each((sink) => sink.track(event));
  }

  /** Calls `fn` on every service that is on; a service's error is swallowed. */
  private each(fn: (sink: AnalyticsSink) => void): void {
    if (!this.ready || this.consentState !== 'granted') return;
    for (const sink of this.sinks) {
      if (this.states.get(sink) !== 'on') continue;
      try {
        fn(sink);
      } catch {
        // A statistics bug never becomes the game's.
      }
    }
  }
}

/** A score as the services take it: a whole number, at most a 32-bit integer. */
function scoreValue(score: number): number {
  return Math.min(Math.max(0, Math.round(score)), 2_147_483_647);
}

/** A promise from a service is never waited for, and its failure ignored. */
function quietly(result: Promise<unknown> | void): void {
  if (result) result.catch(() => undefined);
}

// ── GameAnalytics ──────────────────────────────────────────────────────────

/** The part of GameAnalytics' SDK the game uses (`platform/analyticsSdks.ts` loads it). */
export interface GameAnalyticsApi {
  configure(build: string, currencies: readonly string[], itemTypes: readonly string[]): void;
  initialize(gameKey: string, secretKey: string): void;
  progression(status: 'start' | 'complete' | 'fail', progression01: string, score?: number): void;
  resource(
    flow: 'source' | 'sink',
    currency: string,
    amount: number,
    itemType: string,
    itemId: string,
  ): void;
  design(eventId: string, value?: number): void;
  error(message: string): void;
  setEnabled(on: boolean): void;
  onStop(): void;
  onResume(): void;
}

export interface GameAnalyticsKeys {
  readonly gameKey: string;
  readonly secretKey: string;
}

/**
 * GameAnalytics (both builds): a stage is a progression (`stage05` started, completed or failed,
 * with the score), coins are resource events (sources by kind, upgrades as the sink), and the rest
 * are design events: where runs end (`run:gameOver:stage05`, `run:quit:stage05`, valued in seconds),
 * stage times, picks, Lucky Saves, the ads' cards, the frame rate and the screens.
 */
export class GameAnalyticsSink implements AnalyticsSink {
  readonly name = 'GameAnalytics';
  private api: GameAnalyticsApi | null = null;

  constructor(
    private readonly load: () => Promise<GameAnalyticsApi>,
    private readonly keys: GameAnalyticsKeys,
    /** `web 0.57.0` or `android 0.57.0`. */
    private readonly build: string,
  ) {}

  async start(): Promise<void> {
    const api = await this.load();
    api.configure(this.build, [ANALYTICS_CURRENCY], ANALYTICS_ITEM_TYPES);
    api.initialize(this.keys.gameKey, this.keys.secretKey);
    this.api = api;
  }

  setEnabled(on: boolean): void {
    this.api?.setEnabled(on);
  }

  track(event: AnalyticsEvent): void {
    const api = this.api;
    if (!api) return;
    switch (event.type) {
      case 'screen':
        api.design(`screen:${event.screen}`);
        break;
      case 'runStarted':
        api.design('run:start', event.runsPlayed);
        break;
      case 'stageStarted':
        api.progression('start', stageLabel(event.stage));
        break;
      case 'stageCleared':
        api.progression('complete', stageLabel(event.stage), scoreValue(event.score));
        api.design(`stage:time:${stageLabel(event.stage)}`, Math.round(event.seconds));
        break;
      case 'runEnded':
        api.progression('fail', stageLabel(event.stage), scoreValue(event.score));
        api.design(`run:${event.reason}:${stageLabel(event.stage)}`, Math.round(event.seconds));
        break;
      case 'coinsEarned':
        api.resource(
          'source',
          ANALYTICS_CURRENCY,
          event.amount,
          event.source,
          stageLabel(event.stage),
        );
        break;
      case 'coinsSpent':
        api.resource('sink', ANALYTICS_CURRENCY, event.amount, 'upgrade', event.upgrade);
        api.design(`upgrade:${event.upgrade}`, event.level);
        break;
      case 'pick':
        api.design(`pick:${event.kind}:${event.id}`, event.level);
        break;
      case 'luckySave':
        api.design(`luckySave:${stageLabel(event.stage)}`);
        break;
      case 'ad':
        api.design(`ad:${event.placement}:${event.outcome}`);
        break;
      case 'performance':
        api.design('performance:fps:average', event.average);
        api.design('performance:fps:low', event.low);
        break;
      case 'error':
        api.error(errorText(event.message, event.frames));
        break;
    }
  }

  suspend(): void {
    this.api?.onStop();
  }

  resume(): void {
    this.api?.onResume();
  }
}

/** An error for a text-only service: the message and the top frames. */
export function errorText(message: string, frames: readonly StackFrame[]): string {
  const top = frames
    .slice(0, 3)
    .map((f) => `${f.functionName ?? '?'} (${f.fileName ?? '?'}:${f.lineNumber ?? '?'})`);
  return top.length > 0 ? `${message} at ${top.join(' < ')}` : message;
}

// ── Firebase Analytics ─────────────────────────────────────────────────────

export type FirebaseParams = Readonly<Record<string, string | number | boolean>>;

/**
 * Firebase Analytics as the game uses it: the web app's JS SDK (`platform/analyticsSdks.ts`) or the
 * Android app's native SDK (`platform/native/`).
 */
export interface FirebaseAnalyticsApi {
  setEnabled(on: boolean): Promise<void> | void;
  setScreen(name: AnalyticsScreen): Promise<void> | void;
  logEvent(name: string, params: FirebaseParams): Promise<void> | void;
}

/**
 * Firebase Analytics: its own sessions, engagement time and retention, the screens, and Google's
 * recommended game events (`level_start`, `level_end`, `post_score`, `earn_virtual_currency`,
 * `spend_virtual_currency`) with a few of the game's own. Errors go to Crashlytics and GameAnalytics.
 */
export class FirebaseAnalyticsSink implements AnalyticsSink {
  readonly name = 'Firebase Analytics';
  private api: FirebaseAnalyticsApi | null = null;

  constructor(private readonly load: () => Promise<FirebaseAnalyticsApi>) {}

  async start(): Promise<void> {
    this.api = await this.load();
  }

  setEnabled(on: boolean): void {
    if (this.api) quietly(this.api.setEnabled(on));
  }

  track(event: AnalyticsEvent): void {
    const api = this.api;
    if (!api) return;
    const log = (name: string, params: FirebaseParams): void => quietly(api.logEvent(name, params));
    switch (event.type) {
      case 'screen':
        quietly(api.setScreen(event.screen));
        break;
      case 'runStarted':
        log('run_start', { runs_played: event.runsPlayed });
        break;
      case 'stageStarted':
        log('level_start', { level_name: stageLabel(event.stage) });
        break;
      case 'stageCleared':
        log('level_end', {
          level_name: stageLabel(event.stage),
          success: true,
          score: scoreValue(event.score),
          seconds: Math.round(event.seconds),
        });
        break;
      case 'runEnded':
        log('level_end', {
          level_name: stageLabel(event.stage),
          success: false,
          reason: event.reason,
        });
        log('post_score', {
          score: scoreValue(event.score),
          level: event.stage,
          reason: event.reason,
          seconds: Math.round(event.seconds),
        });
        break;
      case 'coinsEarned':
        log('earn_virtual_currency', {
          virtual_currency_name: ANALYTICS_CURRENCY,
          value: event.amount,
          source: event.source,
          level_name: stageLabel(event.stage),
        });
        break;
      case 'coinsSpent':
        log('spend_virtual_currency', {
          virtual_currency_name: ANALYTICS_CURRENCY,
          value: event.amount,
          item_name: event.upgrade,
          level: event.level,
        });
        break;
      case 'pick':
        log('pick_chosen', { kind: event.kind, pick: event.id, level: event.level });
        break;
      case 'luckySave':
        log('lucky_save', { level_name: stageLabel(event.stage) });
        break;
      case 'ad':
        log('ad_offer', { placement: event.placement, outcome: event.outcome });
        break;
      case 'performance':
        log('performance', {
          level_name: stageLabel(event.stage),
          fps_average: event.average,
          fps_low: event.low,
        });
        break;
      case 'error':
        break;
    }
  }

  suspend(): void {}

  resume(): void {}
}

// ── Crashlytics ────────────────────────────────────────────────────────────

/** Firebase Crashlytics in the Android app (`platform/native/`). */
export interface CrashlyticsApi {
  setEnabled(on: boolean): Promise<void>;
  recordException(message: string, frames: readonly StackFrame[]): Promise<void>;
  log(message: string): Promise<void>;
  setCustomKey(key: string, value: string | number): Promise<void>;
}

/**
 * Crashlytics (the Android app): it catches the app's native crashes on its own; the page's errors
 * come from here as non-fatal reports, with the screens and stages as breadcrumbs and the stage as
 * a key, so a report tells where in the game it happened.
 */
export class CrashlyticsSink implements AnalyticsSink {
  readonly name = 'Crashlytics';
  private api: CrashlyticsApi | null = null;

  constructor(private readonly load: () => Promise<CrashlyticsApi>) {}

  async start(): Promise<void> {
    this.api = await this.load();
  }

  setEnabled(on: boolean): void {
    if (this.api) quietly(this.api.setEnabled(on));
  }

  track(event: AnalyticsEvent): void {
    const api = this.api;
    if (!api) return;
    switch (event.type) {
      case 'error':
        quietly(api.recordException(event.message, event.frames));
        break;
      case 'screen':
        quietly(api.log(`screen ${event.screen}`));
        break;
      case 'stageStarted':
        quietly(api.setCustomKey('stage', event.stage));
        quietly(api.log(`stage ${event.stage} started`));
        break;
      case 'runEnded':
        quietly(api.log(`run ended (${event.reason}) at stage ${event.stage}`));
        break;
      default:
        break;
    }
  }

  suspend(): void {}

  resume(): void {}
}

// ── Fake ───────────────────────────────────────────────────────────────────

/** `?analytics=fake`: keeps every event it gets, for the debug panel and Playwright. */
export class FakeAnalyticsSink implements AnalyticsSink {
  readonly name = 'Fake';
  readonly events: AnalyticsEvent[] = [];
  enabled = false;
  started = false;

  start(): Promise<void> {
    this.started = true;
    return Promise.resolve();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  track(event: AnalyticsEvent): void {
    this.events.push(event);
  }

  suspend(): void {}

  resume(): void {}
}

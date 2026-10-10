/**
 * Typed event bus. The run emits, and the presentation layers (HUD, FX, audio, haptics, save)
 * listen; `game` and `ui` only talk to each other through it (TECH_SPEC §3).
 */
import type { PickId, PickKind } from '../config/picks';
import type { UpgradeId } from '../config/upgrades';
import type { DropKind } from './dropQueue';

export type Handler<P> = (payload: P) => void;

/**
 * Handler lists are copy-on-write: subscribing or unsubscribing replaces the list, so `emit`
 * allocates nothing and a handler may (un)subscribe safely while an event is being delivered.
 */
export class EventBus<Events extends object> {
  private readonly handlers = new Map<keyof Events, readonly Handler<never>[]>();

  /** Subscribes and returns the matching unsubscribe function. */
  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    const list = this.handlers.get(type) ?? [];
    this.handlers.set(type, [...list, handler as Handler<never>]);
    return () => this.off(type, handler);
  }

  /** Subscribes for a single delivery. */
  once<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    const off = this.on(type, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off<K extends keyof Events>(type: K, handler: Handler<Events[K]>): void {
    const list = this.handlers.get(type);
    if (!list) return;
    const index = list.indexOf(handler as Handler<never>);
    if (index < 0) return;
    const next = list.filter((_, i) => i !== index);
    if (next.length > 0) this.handlers.set(type, next);
    else this.handlers.delete(type);
  }

  /** Delivers to the handlers subscribed when the call started, in subscription order. */
  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const list = this.handlers.get(type) as readonly Handler<Events[K]>[] | undefined;
    if (!list) return;
    for (const handler of list) handler(payload);
  }

  listenerCount(type: keyof Events): number {
    return this.handlers.get(type)?.length ?? 0;
  }

  /** Removes every handler, or every handler of one type. */
  clear(type?: keyof Events): void {
    if (type === undefined) this.handlers.clear();
    else this.handlers.delete(type);
  }
}

/** A position in world units (origin at the centre of the jar floor, y down). */
export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * The game's events. Payload coins are already banked in the wallet by the time the event fires.
 * RunController (src/run) is the producer.
 */
export interface GameEvents {
  runStarted: { readonly seed: number; readonly stage: number };
  /** A ball left the dropper: a cat, a boulder, a hanabi or a joker. */
  catDropped: {
    readonly kind: Exclude<DropKind, 'magnet'>;
    readonly tier: number;
    readonly golden: boolean;
    readonly x: number;
  };
  /**
   * The cooldown is over and the dropper holds the next ball (also after an expansion, and after a
   * magnet took a ball): a cat or a boulder to drop, or a magnet to use.
   */
  dropReady: { readonly kind: DropKind; readonly tier: number };
  /** The magnet took a ball out of the jar (GAME_DESIGN §15.2): it is now in the dropper. */
  ballTaken: {
    readonly id: number;
    readonly kind: Exclude<DropKind, 'magnet'>;
    readonly tier: number;
    readonly golden: boolean;
    readonly at: WorldPoint;
  };
  /** A merge next to a boulder knocked a band off; it breaks after `hitsLeft` more. */
  boulderHit: { readonly id: number; readonly hitsLeft: number; readonly at: WorldPoint };
  /**
   * A boulder crumbled: its last hit, a hanabi's blast, or it went with a stage clear's pops or a
   * Lucky Save. It pays nothing.
   */
  boulderBroken: {
    readonly id: number;
    readonly tier: number;
    readonly at: WorldPoint;
    readonly reason: 'hits' | 'hanabi' | 'cashOut' | 'luckySave';
  };
  /**
   * A hanabi went off (GAME_DESIGN §15.6): the small cats within `reach` of `at` pop
   * (`catPopped`, reason `hanabi`), boulders there break, bigger cats get pushed away.
   */
  hanabiExploded: { readonly id: number; readonly at: WorldPoint; readonly reach: number };
  /**
   * A hanabi or a joker vanished without doing anything (a stage clear's pops, a Lucky Save). It
   * pays nothing.
   */
  specialPopped: {
    readonly id: number;
    readonly kind: 'hanabi' | 'joker';
    readonly tier: number;
    readonly at: WorldPoint;
    readonly reason: 'cashOut' | 'luckySave';
  };
  merged: {
    /** The new cat's id (BallView.id), so the scene can pop its sprite. */
    readonly id: number;
    readonly tier: number;
    readonly newTier: number;
    /** The new cat's size at the current stage (1–9), for effects that grow with the cat. */
    readonly newSize: number;
    /** A golden cat merged (GAME_DESIGN §15.4): the new cat skipped a tier. */
    readonly golden: boolean;
    /** A joker merged with a cat of `tier` (GAME_DESIGN §15.7). */
    readonly joker: boolean;
    readonly at: WorldPoint;
    readonly score: number;
    readonly coins: number;
    readonly combo: number;
  };
  /** Two of a stage's last cat met (only at the last stage): both vanished. */
  jackpot: {
    readonly tier: number;
    readonly at: WorldPoint;
    readonly score: number;
    readonly coins: number;
    readonly combo: number;
  };
  /**
   * A single cat popped into coins: its value (half of C(t)), at a stage clear, a Lucky Save or a
   * hanabi's blast.
   */
  catPopped: {
    /** The cat's id (BallView.id), so the scene can pop the cat's own sprite. */
    readonly id: number;
    readonly tier: number;
    readonly at: WorldPoint;
    readonly coins: number;
    readonly reason: 'cashOut' | 'luckySave' | 'hanabi';
  };
  scoreChanged: { readonly score: number };
  runCoinsChanged: { readonly coins: number };
  comboChanged: { readonly combo: number };
  dangerChanged: { readonly active: boolean; readonly remainingMs: number };
  /** The danger countdown reached a new whole second (3, 2, 1 for a 2.5 s timeout). */
  dangerTick: { readonly secondsLeft: number };
  /**
   * A stage's last cat was made (GAME_DESIGN §7): every other cat has just popped (`catPopped`,
   * reason `cashOut`). `next` says what follows: the jar grows (the run is now `expanding`), or
   * this is the last stage and play goes on.
   */
  stageCleared: {
    readonly stage: number;
    readonly tier: number;
    readonly next: 'expand' | 'final';
  };
  /** The stage clear is over and the camera starts zooming out (whoosh, rim sparks). */
  expansionStarted: { readonly from: number; readonly to: number };
  /**
   * The zoom has ended: the world is rescaled to the new stage (its last cat is now the new
   * stage's first) and the drop pool is the new stage's. Physics stays paused until
   * `expansionFinished`. `newTiers`: the tiers the new stage adds.
   */
  expansionRevealed: { readonly stage: number; readonly newTiers: readonly number[] };
  expansionFinished: { readonly stage: number; readonly newTiers: readonly number[] };
  luckySave: { readonly savesLeft: number };
  /**
   * A stage clear's pick (GAME_DESIGN §15.5): the run waits (state `choosing`) until one of
   * `options` is chosen. A trial comes first, then a blessing.
   */
  pickOffered: { readonly kind: PickKind; readonly options: readonly PickId[] };
  /** An option was chosen: its level for the rest of the run is now `level`. */
  pickChosen: { readonly kind: PickKind; readonly id: PickId; readonly level: number };
  paused: Record<string, never>;
  resumed: Record<string, never>;
  gameOver: {
    readonly score: number;
    readonly stage: number;
    readonly coins: number;
    readonly highestTier: number;
  };
  walletChanged: { readonly coins: number };
  upgradePurchased: { readonly id: UpgradeId; readonly level: number; readonly price: number };
}

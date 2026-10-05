/**
 * Typed event bus. The run emits, and the presentation layers (HUD, FX, audio, haptics, save)
 * listen; `game` and `ui` only talk to each other through it (TECH_SPEC §3).
 */
import type { UpgradeId } from '../config/upgrades';

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
 * M4 (RunController) is the main producer and may extend this list.
 */
export interface GameEvents {
  runStarted: { readonly seed: number; readonly stage: number };
  catDropped: { readonly tier: number; readonly golden: boolean; readonly x: number };
  merged: {
    readonly tier: number;
    readonly newTier: number;
    readonly golden: boolean;
    readonly at: WorldPoint;
    readonly score: number;
    readonly coins: number;
    readonly combo: number;
  };
  jackpot: {
    readonly tier: number;
    readonly golden: boolean;
    readonly at: WorldPoint;
    readonly score: number;
    readonly coins: number;
    readonly combo: number;
  };
  /** A single cat popped into coins (cash-out or Lucky Save). */
  catPopped: {
    readonly tier: number;
    readonly golden: boolean;
    readonly at: WorldPoint;
    readonly coins: number;
    readonly reason: 'cashOut' | 'luckySave';
  };
  scoreChanged: { readonly score: number };
  runCoinsChanged: { readonly coins: number };
  comboChanged: { readonly combo: number };
  dangerChanged: { readonly active: boolean; readonly remainingMs: number };
  expansionStarted: { readonly from: number; readonly to: number };
  expansionFinished: { readonly stage: number; readonly newTiers: readonly number[] };
  expansionLocked: { readonly stage: number };
  luckySave: { readonly savesLeft: number };
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

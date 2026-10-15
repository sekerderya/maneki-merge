/**
 * Typed event bus. The run emits, and the presentation layers (HUD, FX, audio, haptics, save)
 * listen; `game` and `ui` only talk to each other through it (TECH_SPEC §3).
 */
import type { DiceRoll, PickId, PickKind, WindDirection } from '../config/picks';
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
  /** A ball left the dropper: a cat, a boulder, a hanabi, a joker or a lightning ball. */
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
   * A boulder crumbled: its last hit, a hanabi's blast, a lightning strike, or it went with a stage
   * clear's pops or a Lucky Save. It pays nothing.
   */
  boulderBroken: {
    readonly id: number;
    readonly tier: number;
    readonly at: WorldPoint;
    readonly reason: 'hits' | 'hanabi' | 'lightning' | 'cashOut' | 'luckySave';
  };
  /**
   * A hanabi went off (GAME_DESIGN §15.6): the small cats within `reach` of `at` pop
   * (`catPopped`, reason `hanabi`), boulders there break, bigger cats get pushed away.
   */
  hanabiExploded: { readonly id: number; readonly at: WorldPoint; readonly reach: number };
  /**
   * A lightning ball (GAME_DESIGN §15.15) touched the ball `struck`: it strikes `targets` (`struck`
   * first), every cat of that tier (`kind` cat) or every boulder. Time stands still for `holdMs`
   * while the lightning chains through them (RunController.lightning); then they pop (`catPopped`,
   * `boulderBroken`, reason `lightning`) and `lightningDischarged` follows.
   */
  lightningStruck: {
    readonly id: number;
    readonly struck: number;
    readonly kind: 'cat' | 'boulder';
    readonly tier: number;
    readonly targets: readonly number[];
    readonly at: WorldPoint;
    readonly holdMs: number;
  };
  /** The strike is over: the struck balls have popped and the lightning ball `id` is gone. */
  lightningDischarged: {
    readonly id: number;
    readonly tier: number;
    readonly at: WorldPoint;
    /** How many balls it struck. */
    readonly count: number;
  };
  /**
   * A hanabi, a joker or a lightning ball vanished without doing anything (a stage clear's pops, a
   * Lucky Save). It pays nothing.
   */
  specialPopped: {
    readonly id: number;
    readonly kind: 'hanabi' | 'joker' | 'lightning';
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
    /** Two cats merged, or three (Hubris, GAME_DESIGN §15.11). */
    readonly parts: 2 | 3;
    /** A cracked cat merged (Porcelain, §15.10): gold seams flash on the whole new cat. */
    readonly kintsugi: boolean;
    /** Dice (§15.14): the merge was lucky (a size more) or fizzled (no size up); null otherwise. */
    readonly dice: DiceRoll;
    /**
     * The cursed cat merged (Cursed Bell, §15.12): the curse is lifted and `coins` includes the
     * bonus (`curseEnded` follows).
     */
    readonly curseLifted: boolean;
    readonly at: WorldPoint;
    readonly score: number;
    readonly coins: number;
    readonly combo: number;
  };
  /** Two of a stage's last cat met (only the debug tools make that): both vanished. */
  jackpot: {
    readonly tier: number;
    readonly at: WorldPoint;
    readonly score: number;
    readonly coins: number;
    readonly combo: number;
  };
  /**
   * A single cat popped into coins: its value (half of C(t)), at a stage clear, a Lucky Save, a
   * hanabi's blast or a lightning strike.
   */
  catPopped: {
    /** The cat's id (BallView.id), so the scene can pop the cat's own sprite. */
    readonly id: number;
    readonly tier: number;
    readonly at: WorldPoint;
    readonly coins: number;
    readonly reason: 'cashOut' | 'luckySave' | 'hanabi' | 'lightning';
  };
  scoreChanged: { readonly score: number };
  runCoinsChanged: { readonly coins: number };
  comboChanged: { readonly combo: number };
  dangerChanged: { readonly active: boolean; readonly remainingMs: number };
  /** The danger countdown reached a new whole second (3, 2, 1 for a 2.5 s timeout). */
  dangerTick: { readonly secondsLeft: number };
  /**
   * A stage's last cat was made (GAME_DESIGN §7): every other cat has just popped (`catPopped`,
   * reason `cashOut`), and the run is now `expanding`. `grows`: the jar grows into the next stage
   * (every JAR_GROWTH_STAGES stages); else the next stage plays in the same jar.
   */
  stageCleared: {
    readonly stage: number;
    readonly tier: number;
    readonly grows: boolean;
  };
  /**
   * The stage's jar has its first cat of `size` (dropped, merged or spawned): the goal strip lights
   * up to it (GAME_DESIGN §2.3). Only when the stage's biggest size grows; never at a new stage.
   */
  stageBestChanged: { readonly stage: number; readonly size: number };
  /** The stage clear is over and the camera starts zooming out (whoosh, rim sparks). */
  expansionStarted: { readonly from: number; readonly to: number };
  /**
   * The run moved on to the next stage (after the zoom when the jar grew, else right after the
   * picks): the jar is empty and the drop pool is the new stage's. Physics stays paused until
   * `expansionFinished`. `newTiers`: the tiers the new stage adds.
   */
  expansionRevealed: { readonly stage: number; readonly newTiers: readonly number[] };
  expansionFinished: { readonly stage: number; readonly newTiers: readonly number[] };
  luckySave: { readonly savesLeft: number };
  /**
   * A stage clear's blessing pick had nothing open: a Lucky gift of `coins` (run coins, already
   * counted; GAME_DESIGN §15.5). `stage` is the stage cleared.
   */
  luckyGift: { readonly stage: number; readonly coins: number };
  /**
   * A stage clear's pick (GAME_DESIGN §15.5): the run waits (state `choosing`) until one of
   * `options` is chosen. A trial comes first, then a blessing.
   */
  pickOffered: { readonly kind: PickKind; readonly options: readonly PickId[] };
  /** An option was chosen: its level for the rest of the run is now `level`. */
  pickChosen: { readonly kind: PickKind; readonly id: PickId; readonly level: number };
  /**
   * A ball dropped with Heavy Drop on (GAME_DESIGN §15.9) touched something for the first time:
   * `level` is Heavy Drop's level (a fireball's landing at the top level).
   */
  heavyLanded: { readonly id: number; readonly level: number; readonly at: WorldPoint };
  /**
   * Porcelain (GAME_DESIGN §15.10): a merge beside the cat cracked it. It pays nothing; the next
   * crack breaks it.
   */
  catCracked: { readonly id: number; readonly tier: number; readonly at: WorldPoint };
  /**
   * A cracked cat cracked again and broke: `pieces` are the two cats of the size below that took
   * its place (none for a size-1 cat, which shatters). It pays nothing.
   */
  catBroken: {
    readonly id: number;
    readonly tier: number;
    readonly at: WorldPoint;
    readonly pieces: readonly number[];
  };
  /**
   * Echo (GAME_DESIGN §15.11): the merge that made the cat `from` left a cat of its size, `id`,
   * beside it. It pays nothing and isn't a merge.
   */
  echoed: {
    readonly id: number;
    readonly tier: number;
    readonly from: number;
    readonly at: WorldPoint;
  };
  /**
   * Cursed Bell (GAME_DESIGN §15.12): the cat `id` is cursed; it turns to stone at the drop after
   * its bell shows 0. `dropsLeft`: what the bell shows now.
   */
  curseBegan: {
    readonly id: number;
    readonly tier: number;
    readonly dropsLeft: number;
    readonly at: WorldPoint;
  };
  /** A drop took one off the cursed cat's bell. */
  curseTicked: { readonly id: number; readonly dropsLeft: number };
  /**
   * The curse on `id` is over: `lifted` by a merge (which paid `bonus` coins more), `taken` by
   * the magnet, `gone` with the cat (a hanabi, a lightning strike, a Lucky Save, a break, a stage
   * clear), or `stone`.
   */
  curseEnded: {
    readonly id: number;
    readonly reason: 'lifted' | 'taken' | 'gone' | 'stone';
    readonly bonus: number;
  };
  /**
   * The cursed cat `id` turned to stone: the boulder `boulder` of its size, needing one merge to
   * break, took its place (its sprite fades into the boulder's).
   */
  catPetrified: {
    readonly id: number;
    readonly boulder: number;
    readonly tier: number;
    readonly at: WorldPoint;
  };
  /** Copycat (GAME_DESIGN §15.13): the cat in NEXT took the size of the latest merge. */
  nextChanged: { readonly kind: DropKind; readonly tier: number; readonly golden: boolean };
  /** The wind (GAME_DESIGN §15.8) changed: its level (0: none) or, with the debug tools, its way. */
  windChanged: { readonly level: number; readonly direction: WindDirection };
  /**
   * A rewarded ad's bonus ball (GAME_DESIGN §2.7) went into the dropper; the ball that was there
   * waits and comes back after it.
   */
  adBallGiven: { readonly kind: DropKind; readonly tier: number };
  /**
   * The danger timer ran out with no Lucky Save left, and one more can be had for an ad
   * (GAME_DESIGN §2.7): time stands still until `takeLastChance` or `declineLastChance`.
   */
  lastChanceOffered: Record<string, never>;
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

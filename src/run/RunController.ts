/**
 * One run, headless (TECH_SPEC §3–§5): dropping cats, the cooldown and queue, merges and their
 * payouts, the combo timer, stage clears and the expansion timeline, the danger line, Lucky Saves
 * and game over; and the special balls, trials and blessings of GAME_DESIGN §15 (magnets taking a
 * ball out of the jar, boulders breaking, golden cats, a trial at every stage clear and a blessing
 * at every level up of the run's XP). The game scene renders it and forwards input; the HUD, FX,
 * audio and save listen to its events.
 *
 * Time comes in fixed ticks of PHYSICS_STEP_MS. `update(frameMs)` only decides how many ticks a
 * frame runs, and every timer counts ticks, so a run is a pure function of its seed and of the
 * tick at which each input arrives: the same inputs replay the same run at any frame rate.
 *
 * Tick pipeline while playing: physics step → merges (payouts, XP and events, oldest first) →
 * boulder hits → combo expiry → stage clear → level-up picks → drop ready → danger. The stage clear
 * goes first, so making the stage's last cat saves the jar even on the step the danger timer would
 * run out.
 */
import { PHYSICS_STEP_MS, stepsFor } from '../config/physics';
import { MAGNET_SIZE, PICKS } from '../config/picks';
import type { PickId, PickKind } from '../config/picks';
import { catRadius, STAGE_COUNT, stageHoldsTier, stageInfo } from '../config/stages';
import {
  DROP_COOLDOWN_MS,
  EXPANSION_CLEAR_MS,
  EXPANSION_DURATION_MS,
  EXPANSION_ZOOM_MS,
  LUCKY_SAVE_GRACE_MS,
  MAGNET_TAKE_MS,
} from '../config/timings';
import { XP_JACKPOT_MERGES } from '../config/xp';
import type { Drop, DropOdds } from '../core/dropQueue';
import { DropQueue } from '../core/dropQueue';
import { RunEconomy } from '../core/economy';
import { EventBus } from '../core/events';
import type { GameEvents } from '../core/events';
import { StateHasher } from '../core/hash';
import { defaultPickLevels, drawOffer, dropOdds } from '../core/picks';
import type { PickLevels } from '../core/picks';
import { nextStage, stageProgress } from '../core/progression';
import type { StageProgress } from '../core/progression';
import { Rng } from '../core/rng';
import { defaultUpgradeLevels, deriveStats } from '../core/upgrades';
import type { DerivedStats, UpgradeLevels } from '../core/upgrades';
import { mergeXp, XpTracker } from '../core/xp';
import type { Ball, BallKind, BallView } from '../physics/balls';
import { DangerMonitor, luckySaveVictims } from '../physics/danger';
import { clampDropX, dropStartY } from '../physics/geometry';
import type { JarGeometry } from '../physics/geometry';
import { MergeResolver } from '../physics/merges';
import { FixedStepper, PhysicsWorld } from '../physics/PhysicsWorld';

/** `choosing`: a pick waits for `choose` (GAME_DESIGN §15.5); time stands still. */
export type RunState = 'playing' | 'paused' | 'expanding' | 'choosing' | 'over';

/** A pick (a stage clear's trial or a level up's blessing): the options on its cards. */
export interface PickOffer {
  readonly kind: PickKind;
  readonly options: readonly PickId[];
}

export interface RunOptions {
  readonly seed: number;
  /** Upgrade levels for this run; all 0 by default. */
  readonly upgrades?: UpgradeLevels;
  /** Subscribe before passing it in: the constructor already emits `runStarted`. */
  readonly events?: EventBus<GameEvents>;
  /** Receives every payout before its event fires (M7 puts the coins in the wallet). */
  readonly bank?: (coins: number) => void;
  /**
   * Runs each whole expansion sequence inside one tick (tests, balance simulator), up to a pick:
   * after the last `choose` the rest runs at once too.
   */
  readonly instantExpansion?: boolean;
}

/** Debug and test balls (`spawnBall`): a cat by default. */
export interface SpawnOptions {
  readonly kind?: BallKind;
  readonly golden?: boolean;
  /** A boulder's merges to break (1 by default). */
  readonly hits?: number;
}

/**
 * The stage-clear sequence (GAME_DESIGN §7.1). `clear`: the other cats have popped and the last
 * cat settles alone, then pops too (the picks come at its end); `zoom`: time stops and the camera
 * zooms out while the jar grows; `reveal`: the world is the new stage's ("New cats unlocked!").
 * At the last stage (`to` equals `from`) the jar doesn't grow: play goes on after the clear and
 * the picks. The scene derives camera and jar visuals from it.
 */
export interface ExpansionView {
  readonly from: number;
  /** The next stage, or `from` at the last stage (no zoom, no reveal). */
  readonly to: number;
  readonly elapsedMs: number;
  /** 0 → 1 over the whole sequence (EXPANSION_DURATION_MS). */
  readonly progress: number;
  /** 0 → 1 over the camera zoom, wall slide and rim rise (EXPANSION_ZOOM_MS). */
  readonly zoomProgress: number;
  readonly phase: 'clear' | 'zoom' | 'reveal';
}

interface Expansion {
  from: number;
  to: number;
  /** The picks come between the clear and the zoom (a debug jump skips them). */
  picks: boolean;
  elapsedSteps: number;
  elapsedMs: number;
  progress: number;
  zoomProgress: number;
  phase: 'clear' | 'zoom' | 'reveal';
}

const COOLDOWN_STEPS = stepsFor(DROP_COOLDOWN_MS);
const CLEAR_STEPS = stepsFor(EXPANSION_CLEAR_MS);
const ZOOM_STEPS = stepsFor(EXPANSION_ZOOM_MS);
const EXPANSION_STEPS = stepsFor(EXPANSION_DURATION_MS);
const TAKE_STEPS = stepsFor(MAGNET_TAKE_MS);
/**
 * The special balls' rolls and the picks' draws use their own generators, seeded from the run seed
 * with these salts, so the tiers a seed drops never depend on the picks.
 */
const SPECIAL_SEED_SALT = 0x9e3779b9;
const PICK_SEED_SALT = 0x7f4a7c15;

export class RunController {
  readonly events: EventBus<GameEvents>;
  readonly seed: number;
  readonly stats: DerivedStats;

  private readonly world: PhysicsWorld;
  private readonly rng: Rng;
  /** Rolls each queued item's kind and golden (always two draws, whatever the chances). */
  private readonly specialRng: Rng;
  /** Draws the stage clears' cards. */
  private readonly pickRng: Rng;
  private readonly queue: DropQueue;
  private readonly economy: RunEconomy;
  private readonly merges = new MergeResolver();
  private readonly danger = new DangerMonitor();
  private readonly stepper = new FixedStepper();
  private readonly hasher = new StateHasher();
  private readonly bankCoins: (coins: number) => void;
  private readonly instant: boolean;
  private readonly tickFn = (): void => this.tick();

  private runState: RunState = 'playing';
  private resumeTo: RunState = 'playing';
  private tickCount = 0;
  /** The world step from which the next drop is allowed. */
  private dropAllowedAt = 0;
  private dropAnnounced = false;
  private shownCombo = 0;
  private dangerShown = false;
  /** The whole seconds left on the danger countdown that were last announced (0: none). */
  private dangerSecond = 0;
  private savesLeft: number;
  private expansionState: Expansion | null = null;
  /** Debug only (`jumpToStage`): the stage the jump keeps clearing towards. */
  private debugTargetStage = 0;
  /** The trials' and blessings' levels this run (GAME_DESIGN §15). */
  private readonly levels = defaultPickLevels();
  /** The pick waiting for `choose`, and the kinds still to come before play goes on. */
  private offer: PickOffer | null = null;
  private pickQueue: PickKind[] = [];
  /** The run's XP and level (GAME_DESIGN §15.6), and the level ups whose blessing still waits. */
  private readonly xpTracker = new XpTracker();
  private pendingBlessings = 0;

  constructor(options: RunOptions) {
    if (!Number.isFinite(options.seed)) throw new RangeError(`Invalid seed: ${options.seed}`);
    this.seed = options.seed;
    this.stats = deriveStats(options.upgrades ?? defaultUpgradeLevels());
    this.events = options.events ?? new EventBus<GameEvents>();
    this.bankCoins = options.bank ?? (() => {});
    this.instant = options.instantExpansion ?? false;
    this.savesLeft = this.stats.luckySaves;
    this.world = new PhysicsWorld();
    this.rng = new Rng(options.seed);
    this.specialRng = new Rng((Math.trunc(options.seed) ^ SPECIAL_SEED_SALT) >>> 0);
    this.pickRng = new Rng((Math.trunc(options.seed) ^ PICK_SEED_SALT) >>> 0);
    this.queue = new DropQueue({
      rng: this.rng,
      specialRng: this.specialRng,
      stage: this.world.stage,
      odds: this.odds(),
    });
    this.economy = new RunEconomy(this.stats);
    this.events.emit('runStarted', { seed: this.seed, stage: this.world.stage });
    this.announceDropIfReady();
  }

  // ── State ──────────────────────────────────────────────────────────────────

  get state(): RunState {
    return this.runState;
  }

  get stage(): number {
    return this.world.stage;
  }

  get geometry(): JarGeometry {
    return this.world.geometry;
  }

  /** Every ball in the jar (cats and boulders), oldest first. */
  get balls(): readonly BallView[] {
    return this.world.balls;
  }

  get score(): number {
    return this.economy.score;
  }

  /** Coins earned this run (already banked). */
  get coins(): number {
    return this.economy.coins;
  }

  /** The highest tier a merge made this run (0 before the first merge). */
  get highestTier(): number {
    return this.economy.highestTier;
  }

  /** The combo as it stands now: 0 once the combo window has passed. */
  get combo(): number {
    return this.economy.comboAt(this.world.timeMs);
  }

  /** Play time: physics steps × PHYSICS_STEP_MS. Pauses and the expansion's time stop don't count. */
  get playTimeMs(): number {
    return this.world.timeMs;
  }

  /** Ticks run so far, including the ones spent in expansions. Inputs are keyed to this. */
  get ticks(): number {
    return this.tickCount;
  }

  /** The ball in the dropper: a cat or a boulder to drop, or a magnet to use. */
  get current(): Drop {
    return this.queue.current;
  }

  /** The ball after the one in the dropper (the HUD's "Next"). */
  get next(): Drop {
    return this.queue.next;
  }

  /** The dropper holds a cat or a boulder and the cooldown is over. */
  get canDrop(): boolean {
    return this.ready && this.queue.current.kind !== 'magnet';
  }

  /** The dropper holds a magnet and the cooldown is over: `take` works. */
  get canTake(): boolean {
    return this.ready && this.queue.current.kind === 'magnet';
  }

  get cooldownRemainingMs(): number {
    return Math.max(0, this.dropAllowedAt - this.world.steps) * PHYSICS_STEP_MS;
  }

  get dangerActive(): boolean {
    return this.danger.active;
  }

  /** Time left on the danger countdown (the full timeout while safe). */
  get dangerRemainingMs(): number {
    return this.danger.remainingMs;
  }

  get luckySavesLeft(): number {
    return this.savesLeft;
  }

  /** The pick waiting for `choose`, or null. */
  get pickOffer(): PickOffer | null {
    return this.offer;
  }

  /** The trials' and blessings' levels this run. */
  get pickLevels(): PickLevels {
    return { ...this.levels };
  }

  /** The run's level (GAME_DESIGN §15.6): 1 at the start, one more per level up. */
  get level(): number {
    return this.xpTracker.level;
  }

  /** XP gathered towards the next level. */
  get xp(): number {
    return this.xpTracker.xp;
  }

  /** XP from this level to the next. */
  get xpToNext(): number {
    return this.xpTracker.toNext;
  }

  /** The HUD's progress bar: the biggest cat in the jar against the stage's last cat. */
  get progress(): StageProgress {
    let biggest = 0;
    for (const ball of this.world.balls) {
      if (ball.kind === 'cat') biggest = Math.max(biggest, ball.tier);
    }
    return stageProgress(biggest, this.world.stage);
  }

  /** The radius of a `tier` ball at the current stage, in world units. */
  radiusOf(tier: number): number {
    return catRadius(tier, this.world.stage);
  }

  /** Whether the magnet can take this ball: any ball that has landed (GAME_DESIGN §15.2). */
  takeable(ball: BallView): boolean {
    return ball.landedMs >= 0;
  }

  /** The running expansion sequence, or null. */
  get expansion(): ExpansionView | null {
    return this.expansionState;
  }

  /**
   * How far the current frame is between two ticks (0–1). Rendering only: the scene uses it to
   * move the expansion's camera smoothly at any refresh rate. It never affects the run.
   */
  get renderAlpha(): number {
    return this.stepper.alpha;
  }

  /** The dropper's cooldown is over while playing (whatever it holds). */
  private get ready(): boolean {
    return this.runState === 'playing' && this.world.steps >= this.dropAllowedAt;
  }

  /** Time runs while playing or expanding; a pause, a pick and game over stop it. */
  private get ticking(): boolean {
    return this.runState === 'playing' || this.runState === 'expanding';
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Drops the cat or boulder in the dropper at `x` (clamped so it starts inside the jar; a ball
   * bigger than the biggest drop starts higher, `dropStartY`). Ignored, and returns false, while
   * the dropper holds a magnet, during the cooldown, a pause, an expansion or a pick, or after game
   * over.
   */
  drop(x: number): boolean {
    if (!this.canDrop || !Number.isFinite(x)) return false;
    const item = this.queue.take();
    const geo = this.world.geometry;
    const radius = this.radiusOf(item.tier);
    const at = clampDropX(x, radius, geo);
    const kind = item.kind === 'boulder' ? 'boulder' : 'cat';
    this.world.addBall({
      kind,
      tier: item.tier,
      golden: item.golden,
      hits: item.hits,
      x: at,
      y: dropStartY(radius, geo),
    });
    this.dropAllowedAt = this.world.steps + COOLDOWN_STEPS;
    this.dropAnnounced = false;
    this.events.emit('catDropped', { kind, tier: item.tier, golden: item.golden, x: at });
    return true;
  }

  /**
   * The magnet in the dropper takes the ball `id` out of the jar (GAME_DESIGN §15.2): it becomes
   * the dropper's ball, with its tier and golden glow or, for a boulder, its size and the hits it
   * still needs, and can be dropped MAGNET_TAKE_MS later. NEXT stays. Returns false when the
   * dropper holds no ready magnet, or the ball isn't in the jar or hasn't landed.
   */
  take(id: number): boolean {
    if (!this.canTake) return false;
    const ball = this.world.balls.find((b) => b.id === id);
    if (!ball || !this.takeable(ball)) return false;
    const at = { x: ball.x, y: ball.y };
    this.world.removeBall(ball);
    const { kind, tier, golden, hitsLeft } = ball;
    this.queue.replaceCurrent({ kind, tier, golden, hits: hitsLeft });
    this.dropAllowedAt = this.world.steps + TAKE_STEPS;
    this.dropAnnounced = false;
    this.events.emit('ballTaken', { id, kind, tier, golden, at });
    return true;
  }

  /**
   * Chooses one of the waiting pick's options (GAME_DESIGN §15.5): its level goes up for the rest
   * of the run and applies to the balls queued from now on. The next pick follows, then the zoom
   * (after a level up, or at the last stage: play). Returns false when no pick waits or `id` isn't
   * one of its options.
   */
  choose(id: PickId): boolean {
    const offer = this.offer;
    if (this.runState !== 'choosing' || !offer || !offer.options.includes(id)) return false;
    this.levels[id]++;
    this.offer = null;
    this.queue.setOdds(this.odds());
    this.events.emit('pickChosen', { kind: offer.kind, id, level: this.levels[id] });
    if (!this.offerNextPick()) this.afterPicks();
    return true;
  }

  pause(): void {
    if (!this.ticking && this.runState !== 'choosing') return;
    this.resumeTo = this.runState;
    this.runState = 'paused';
    this.events.emit('paused', {});
  }

  resume(): void {
    if (this.runState !== 'paused') return;
    this.runState = this.resumeTo;
    this.stepper.reset();
    this.events.emit('resumed', {});
  }

  /** Runs as many fixed ticks as the frame's time covers (at most PHYSICS_MAX_SUBSTEPS). */
  update(frameMs: number): void {
    if (!this.ticking) return;
    this.stepper.advance(frameMs, this.tickFn);
  }

  /** One fixed tick. */
  tick(): void {
    if (!this.ticking) return;
    this.tickCount++;
    if (this.runState === 'expanding') this.expansionTick();
    else this.playStep();
  }

  // ── Debug and test hooks (`?debug=1`, TECH_SPEC §11) ──────────────────────

  /**
   * Puts a ball into the jar, ignoring the queue and the cooldown: a cat (golden if asked) or a
   * boulder. The current stage must hold its tier (its first to its last tier).
   */
  spawnBall(tier: number, x: number, y?: number, options: SpawnOptions = {}): BallView {
    if (!stageHoldsTier(this.world.stage, tier)) {
      throw new RangeError(`Stage ${this.world.stage} can't hold tier ${tier}`);
    }
    const geo = this.world.geometry;
    const at = clampDropX(x, this.radiusOf(tier), geo);
    return this.world.addBall({ ...options, tier, x: at, y: y ?? geo.dropY });
  }

  /**
   * Puts a magnet, a boulder (with the current trials' size and hits) or a golden cat (of the
   * stage's smallest tier) in the dropper instead of its ball.
   */
  giveSpecial(kind: 'magnet' | 'boulder' | 'golden'): void {
    if (this.runState === 'over') return;
    const first = stageInfo(this.world.stage).firstTier;
    const odds = this.odds();
    this.queue.replaceCurrent(
      kind === 'magnet'
        ? { kind, tier: first + MAGNET_SIZE - 1, golden: false, hits: 0 }
        : kind === 'boulder'
          ? { kind, tier: first + odds.boulderSize - 1, golden: false, hits: odds.boulderHits }
          : { kind: 'cat', tier: first, golden: true, hits: 0 },
    );
    this.dropAnnounced = false;
    this.announceDropIfReady();
  }

  /** Sets a trial's or blessing's level (clamped to 0…max); it applies to the balls queued next. */
  setPickLevel(id: PickId, level: number): void {
    if (!Number.isFinite(level)) return;
    this.levels[id] = Math.max(0, Math.min(PICKS[id].maxLevel, Math.round(level)));
    this.queue.setOdds(this.odds());
  }

  /** Opens a stage clear's trial now (and any waiting blessings): play goes on after them. */
  offerPicks(): void {
    if (this.runState !== 'playing') return;
    this.beginPicks(['trial']);
  }

  /** Adds XP as a merge would (no combo); a level up opens its blessing at once. */
  addXp(amount: number): void {
    if (this.runState !== 'playing' || !Number.isFinite(amount)) return;
    this.gainXp(Math.round(amount));
    if (this.pendingBlessings > 0) this.beginPicks([]);
  }

  /** Sets the run score (it only counts for records). */
  setScore(score: number): void {
    this.economy.setScore(score);
    this.events.emit('scoreChanged', { score });
  }

  /**
   * Clears the current stage as if its last cat had just been made, skipping the picks. Each
   * expansion then plays in turn, one stage at a time, until the run reaches `stage`.
   */
  jumpToStage(stage: number): void {
    if (!Number.isInteger(stage) || stage <= this.world.stage || stage > STAGE_COUNT) return;
    this.debugTargetStage = Math.max(this.debugTargetStage, stage);
    if (this.runState === 'playing') this.debugClear();
  }

  forceGameOver(): void {
    if (this.runState === 'over') return;
    this.gameOver();
  }

  /** Acts as if the danger timer just ran out: a Lucky Save if one is left, else game over. */
  forceDangerTimeout(): void {
    if (this.runState !== 'playing') return;
    if (this.savesLeft > 0) this.luckySave();
    else this.gameOver();
  }

  /** A digest of everything that decides the rest of the run; equal digests replay equally. */
  stateHash(): string {
    const h = this.hasher.reset();
    h.number(this.tickCount).string(this.runState).string(this.resumeTo);
    h.number(this.economy.score).number(this.economy.coins).number(this.economy.combo);
    h.number(this.economy.merges).number(this.economy.jackpots).number(this.economy.highestTier);
    for (const value of this.rng.state()) h.number(value);
    for (const value of this.specialRng.state()) h.number(value);
    for (const value of this.pickRng.state()) h.number(value);
    for (const item of [this.queue.current, this.queue.next]) {
      h.string(item.kind).number(item.tier).bool(item.golden).number(item.hits);
    }
    h.number(this.queue.dropsThisStage);
    for (const value of Object.values(this.levels)) h.number(value);
    h.string(this.offer ? `${this.offer.kind}:${this.offer.options.join(',')}` : '');
    h.string(this.pickQueue.join(','));
    h.number(this.xpTracker.level).number(this.xpTracker.xp).number(this.pendingBlessings);
    h.number(this.dropAllowedAt).number(this.savesLeft).number(this.debugTargetStage);
    h.number(this.danger.remainingMs).bool(this.danger.inGrace);
    const e = this.expansionState;
    if (e) h.number(e.from).number(e.to).bool(e.picks).number(e.elapsedSteps).string(e.phase);
    this.world.hashInto(h);
    return h.digest();
  }

  // ── Tick pipeline ──────────────────────────────────────────────────────────

  private playStep(): void {
    const world = this.world;
    world.step();
    const now = world.timeMs;
    const last = stageInfo(world.stage).lastTier;

    const outcomes = this.merges.resolve(world, last);
    /** The first cat this step made of the stage's last tier: it clears the stage. */
    let cleared: Ball | null = null;
    let xp = 0;
    for (const o of outcomes) {
      const at = { x: o.x, y: o.y };
      if (o.kind === 'merge') {
        const p = this.economy.merge(o.tier, now, o.newTier);
        this.bankCoins(p.coins);
        if (o.ball && o.ball.tier === last) cleared ??= o.ball;
        const newSize = o.ball?.size ?? world.sizeOf(o.newTier);
        xp += mergeXp(newSize, p.combo);
        this.events.emit('merged', {
          id: o.ball?.id ?? -1,
          tier: o.tier,
          newTier: o.newTier,
          newSize,
          golden: o.golden,
          at,
          ...p,
        });
      } else {
        const p = this.economy.jackpot(last, now);
        this.bankCoins(p.coins);
        xp += XP_JACKPOT_MERGES * mergeXp(world.sizeOf(last), p.combo);
        this.events.emit('jackpot', { tier: o.tier, at, ...p });
      }
    }
    if (outcomes.length > 0) {
      this.events.emit('scoreChanged', { score: this.economy.score });
      this.events.emit('runCoinsChanged', { coins: this.economy.coins });
      this.gainXp(xp);
    }
    this.hitBoulders(this.merges.hits);
    const combo = this.economy.comboAt(now);
    if (combo !== this.shownCombo) {
      this.shownCombo = combo;
      this.events.emit('comboChanged', { combo });
    }
    if (cleared) {
      this.clearStage(cleared);
      if (this.runState !== 'playing') return;
    }
    // A level up's blessing comes at once (time stands still); a clear's comes after its trial.
    if (this.pendingBlessings > 0 && this.beginPicks([])) return;
    this.announceDropIfReady();
    this.updateDanger(now);
  }

  /** Adds XP (GAME_DESIGN §15.6); each level it gains owes a blessing pick. */
  private gainXp(amount: number): void {
    if (amount <= 0) return;
    const levelsGained = this.xpTracker.add(amount);
    this.pendingBlessings += levelsGained;
    this.events.emit('xpChanged', {
      gained: amount,
      xp: this.xpTracker.xp,
      toNext: this.xpTracker.toNext,
      level: this.xpTracker.level,
      levelsGained,
    });
  }

  private announceDropIfReady(): void {
    if (this.dropAnnounced || !this.ready) return;
    this.dropAnnounced = true;
    const { kind, tier } = this.queue.current;
    this.events.emit('dropReady', { kind, tier });
  }

  /**
   * Each boulder a merge hit loses a band (GAME_DESIGN §15.3); at its last hit it crumbles, paying
   * nothing. `hits` lists a boulder once per merge that hit it.
   */
  private hitBoulders(hits: readonly Ball[]): void {
    for (const boulder of hits) {
      if (boulder.removed) continue;
      boulder.hitsLeft--;
      const at = { x: boulder.x, y: boulder.y };
      if (boulder.hitsLeft > 0) {
        this.events.emit('boulderHit', { id: boulder.id, hitsLeft: boulder.hitsLeft, at });
        continue;
      }
      this.world.removeBall(boulder);
      this.events.emit('boulderBroken', { id: boulder.id, tier: boulder.tier, at, reason: 'hits' });
    }
  }

  /** What the queue rolls now: the stage and the picks so far. */
  private odds(): DropOdds {
    return dropOdds(this.levels, this.world.stage, this.stats.bigCatchLevel);
  }

  /**
   * The stage's last cat exists (GAME_DESIGN §7): every other ball pops into its value (boulders
   * crumble), oldest first, and the last cat pops after it settles, so the next stage starts with
   * an empty jar. The picks come then, before the jar grows into the next stage; at the last stage
   * play goes on after them in the same jar. A queued magnet becomes a cat (`DropQueue.newStage`).
   */
  private clearStage(last: Ball, picks = true): void {
    const stage = this.world.stage;
    this.pop(
      this.world.balls.filter((ball) => ball !== last),
      'cashOut',
    );
    this.queue.newStage();
    const next = nextStage(stage);
    this.events.emit('stageCleared', { stage, tier: last.tier, next: next.kind });
    this.startExpansion(next.kind === 'expand' ? next.stage : stage, picks);
  }

  /** Debug: puts the stage's last cat on the floor and clears the stage with it, without picks. */
  private debugClear(): void {
    const tier = stageInfo(this.world.stage).lastTier;
    this.clearStage(this.spawnBall(tier, 0, -this.radiusOf(tier)) as Ball, false);
  }

  private updateDanger(now: number): void {
    const status = this.danger.update(this.world.balls, this.world.geometry.rimY, now);
    this.showDanger();
    if (status !== 'timeout') return;
    if (this.savesLeft > 0) this.luckySave();
    else this.gameOver();
  }

  private showDanger(): void {
    const active = this.danger.active;
    const second = active ? Math.max(1, Math.ceil(this.danger.remainingMs / 1000)) : 0;
    if (active !== this.dangerShown) {
      this.dangerShown = active;
      this.events.emit('dangerChanged', { active, remainingMs: this.danger.remainingMs });
    }
    if (second === this.dangerSecond) return;
    this.dangerSecond = second;
    if (second > 0) this.events.emit('dangerTick', { secondsLeft: second });
  }

  private luckySave(): void {
    this.savesLeft--;
    this.events.emit('luckySave', { savesLeft: this.savesLeft });
    const victims = luckySaveVictims(this.world.balls, this.world.geometry.rimY);
    this.pop(victims, 'luckySave');
    this.danger.reset(LUCKY_SAVE_GRACE_MS);
    this.showDanger();
  }

  private gameOver(): void {
    this.runState = 'over';
    this.expansionState = null;
    this.offer = null;
    this.world.pause();
    this.events.emit('gameOver', {
      score: this.economy.score,
      stage: this.world.stage,
      coins: this.economy.coins,
      highestTier: this.economy.highestTier,
    });
  }

  /**
   * Pops cats into their value in coins (stage clear, Lucky Save): no score, no combo. Boulders
   * crumble and pay nothing.
   */
  private pop(balls: readonly Ball[], reason: 'cashOut' | 'luckySave'): void {
    if (balls.length === 0) return;
    for (const ball of balls) {
      const at = { x: ball.x, y: ball.y };
      this.world.removeBall(ball);
      if (ball.kind === 'boulder') {
        this.events.emit('boulderBroken', { id: ball.id, tier: ball.tier, at, reason });
        continue;
      }
      const { coins } = this.economy.pop(ball.tier);
      this.bankCoins(coins);
      this.events.emit('catPopped', {
        id: ball.id,
        tier: ball.tier,
        at,
        coins,
        reason,
      });
    }
    this.events.emit('runCoinsChanged', { coins: this.economy.coins });
  }

  // ── Trials and blessings (GAME_DESIGN §15.5) ───────────────────────────────

  /**
   * Starts the picks: `first` (a stage clear's trial), then a blessing for every level up still
   * waiting. Returns false when none has an option left (nothing to pick).
   */
  private beginPicks(first: readonly PickKind[]): boolean {
    const blessings: PickKind[] = Array.from({ length: this.pendingBlessings }, () => 'blessing');
    this.pendingBlessings = 0;
    this.pickQueue = [...first, ...blessings];
    return this.offerNextPick();
  }

  /** Offers the next pick that has options; the run waits in `choosing`. False when none is left. */
  private offerNextPick(): boolean {
    for (let kind = this.pickQueue.shift(); kind; kind = this.pickQueue.shift()) {
      const options = drawOffer(kind, this.levels, this.stats.bigCatchLevel, this.pickRng);
      if (options.length === 0) continue;
      this.offer = { kind, options };
      this.runState = 'choosing';
      this.world.pause();
      this.events.emit('pickOffered', { kind, options });
      return true;
    }
    this.offer = null;
    return false;
  }

  /**
   * The picks are done: after a stage clear the expansion's zoom starts (at the last stage play goes
   * on); after a level up play goes on where it stopped, the danger timer too.
   */
  private afterPicks(): void {
    const e = this.expansionState;
    if (e) {
      this.runState = 'expanding';
      this.afterClear(e);
      if (this.instant) this.runExpansionToEnd();
      return;
    }
    this.runState = 'playing';
    this.world.resume();
    this.dropAnnounced = false;
    this.announceDropIfReady();
  }

  // ── Expansion timeline (GAME_DESIGN §7.1) ─────────────────────────────────

  private startExpansion(to: number, picks: boolean): void {
    const from = this.world.stage;
    this.runState = 'expanding';
    this.danger.reset();
    this.showDanger();
    this.expansionState = {
      from,
      to,
      picks,
      elapsedSteps: 0,
      elapsedMs: 0,
      progress: 0,
      zoomProgress: 0,
      phase: 'clear',
    };
    if (this.instant) this.runExpansionToEnd();
  }

  /** Instant expansions (tests): the rest of the sequence in one go, up to a pick if one comes. */
  private runExpansionToEnd(): void {
    const running = this.expansionState;
    while (this.expansionState === running && this.runState === 'expanding') this.expansionTick();
  }

  private expansionTick(): void {
    const e = this.expansionState;
    if (!e) return;
    e.elapsedSteps++;
    e.elapsedMs = (e.elapsedSteps / EXPANSION_STEPS) * EXPANSION_DURATION_MS;
    e.progress = e.elapsedSteps / EXPANSION_STEPS;
    e.zoomProgress = Math.min(1, Math.max(0, (e.elapsedSteps - CLEAR_STEPS) / ZOOM_STEPS));
    if (e.phase === 'clear') {
      // Only the last cat is left: it finishes growing and settles while the jar holds still.
      this.world.step();
      if (e.elapsedSteps >= CLEAR_STEPS) {
        // The last cat pops too: the next stage starts with an empty jar.
        this.world.pause();
        this.pop([...this.world.balls], 'cashOut');
        // The trial comes first (time stands still), then any blessings the clear's merges
        // earned; `choose` goes on after the last one.
        if (e.picks && this.beginPicks(['trial'])) return;
        this.afterClear(e);
        return;
      }
    } else if (e.phase === 'zoom' && e.elapsedSteps >= CLEAR_STEPS + ZOOM_STEPS) {
      e.phase = 'reveal';
      this.reveal(e);
    }
    if (e.elapsedSteps >= EXPANSION_STEPS) this.finishExpansion(e);
  }

  /** After the clear and its picks: the zoom, or at the last stage straight back to play. */
  private afterClear(e: Expansion): void {
    if (e.to === e.from) this.finishExpansion(e);
    else this.startZoom(e);
  }

  /** Time stops and the camera starts zooming out. */
  private startZoom(e: Expansion): void {
    e.phase = 'zoom';
    this.world.pause();
    this.events.emit('expansionStarted', { from: e.from, to: e.to });
  }

  /**
   * At the end of the zoom the grown jar becomes the new stage's jar, empty, and the dropper
   * switches to the new stage's pool.
   */
  private reveal(e: Expansion): void {
    // The jar should be empty; anything in it (a debug spawn) pops.
    this.pop([...this.world.balls], 'cashOut');
    this.world.setStage(e.to);
    this.queue.setStage(e.to);
    // Boulders come from stage 2 on (GAME_DESIGN §15.1).
    this.queue.setOdds(this.odds());
    this.events.emit('expansionRevealed', { stage: e.to, newTiers: newTiers(e.from, e.to) });
  }

  private finishExpansion(e: Expansion): void {
    this.expansionState = null;
    this.runState = 'playing';
    this.world.resume();
    this.danger.reset();
    this.events.emit('expansionFinished', { stage: e.to, newTiers: newTiers(e.from, e.to) });
    // The dropper comes back with the new stage's cats.
    this.dropAnnounced = false;
    this.announceDropIfReady();
    if (this.world.stage < this.debugTargetStage) this.debugClear();
  }
}

/** The tiers a stage adds ("New cats unlocked!"), up to its last cat; none at the last stage. */
function newTiers(from: number, to: number): number[] {
  const fromLast = stageInfo(from).lastTier;
  const toLast = stageInfo(to).lastTier;
  return Array.from({ length: toLast - fromLast }, (_, i) => fromLast + 1 + i);
}

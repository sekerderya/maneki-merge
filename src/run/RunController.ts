/**
 * One run, headless (TECH_SPEC §3–§5): dropping cats, the cooldown and queue, merges and their
 * payouts, the combo timer, the expansion timeline with its cash-out, the danger line, Lucky
 * Saves and game over. The game scene renders it and forwards input; the HUD, FX, audio and save
 * listen to its events.
 *
 * Time comes in fixed ticks of PHYSICS_STEP_MS. `update(frameMs)` only decides how many ticks a
 * frame runs, and every timer counts ticks, so a run is a pure function of its seed and of the
 * tick at which each input arrives: the same inputs replay the same run at any frame rate.
 *
 * Tick pipeline while playing: physics step → merges (payouts and events, oldest first) → combo
 * expiry → drop ready → expansion check → danger. The expansion check goes first, so a merge that
 * reaches the next threshold saves the jar even on the step the danger timer would run out.
 */
import { PHYSICS_STEP_MS, stepsFor } from '../config/physics';
import { STAGE_COUNT, stageInfo } from '../config/stages';
import { tierRadius } from '../config/tiers';
import {
  DROP_COOLDOWN_MS,
  EXPANSION_DURATION_MS,
  EXPANSION_ZOOM_MS,
  LUCKY_SAVE_GRACE_MS,
} from '../config/timings';
import type { Drop } from '../core/dropQueue';
import { DropQueue } from '../core/dropQueue';
import { cashOutBelow, RunEconomy } from '../core/economy';
import { EventBus } from '../core/events';
import type { GameEvents } from '../core/events';
import { StateHasher } from '../core/hash';
import { nextExpansion, stageProgress, stageThreshold } from '../core/progression';
import type { ProgressionStats, StageProgress } from '../core/progression';
import { Rng } from '../core/rng';
import { defaultUpgradeLevels, deriveStats } from '../core/upgrades';
import type { DerivedStats, UpgradeLevels } from '../core/upgrades';
import type { Ball, BallView } from '../physics/balls';
import { DangerMonitor, luckySaveVictims } from '../physics/danger';
import { clampDropX } from '../physics/geometry';
import type { JarGeometry } from '../physics/geometry';
import { MergeResolver } from '../physics/merges';
import { FixedStepper, PhysicsWorld } from '../physics/PhysicsWorld';

export type RunState = 'playing' | 'paused' | 'expanding' | 'over';

export interface RunOptions {
  readonly seed: number;
  /** Upgrade levels for this run; all 0 by default. */
  readonly upgrades?: UpgradeLevels;
  /** Subscribe before passing it in: the constructor already emits `runStarted`. */
  readonly events?: EventBus<GameEvents>;
  /** Receives every payout before its event fires (M7 puts the coins in the wallet). */
  readonly bank?: (coins: number) => void;
  /** Runs each whole expansion sequence inside one tick (tests, balance simulator). */
  readonly instantExpansion?: boolean;
}

/** The expansion sequence (GAME_DESIGN §7.1); the scene derives camera and jar visuals from it. */
export interface ExpansionView {
  readonly from: number;
  readonly to: number;
  readonly elapsedMs: number;
  /** 0 → 1 over the whole sequence (EXPANSION_DURATION_MS). */
  readonly progress: number;
  /** 0 → 1 over the camera zoom, wall slide and rim rise (EXPANSION_ZOOM_MS). */
  readonly zoomProgress: number;
  /** 'zoom' until the cash-out at the end of the zoom, then 'reveal' ("New cats unlocked!"). */
  readonly phase: 'zoom' | 'reveal';
}

interface Expansion {
  from: number;
  to: number;
  elapsedSteps: number;
  elapsedMs: number;
  progress: number;
  zoomProgress: number;
  phase: 'zoom' | 'reveal';
}

const COOLDOWN_STEPS = stepsFor(DROP_COOLDOWN_MS);
const ZOOM_STEPS = stepsFor(EXPANSION_ZOOM_MS);
const EXPANSION_STEPS = stepsFor(EXPANSION_DURATION_MS);

export class RunController {
  readonly events: EventBus<GameEvents>;
  readonly seed: number;
  readonly stats: DerivedStats;

  private readonly world: PhysicsWorld;
  private readonly rng: Rng;
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
  private lockedAnnounced = false;
  private expansionState: Expansion | null = null;
  /** Debug only (`jumpToStage`): stages up to this one open regardless of Shrine Expansion. */
  private debugMaxStage = 0;

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
    this.queue = new DropQueue({
      rng: this.rng,
      stage: this.world.stage,
      bigCatchLevel: this.stats.bigCatchLevel,
      goldenChance: this.stats.goldenChance,
      previewCount: this.stats.previewCount,
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

  /** Every cat in the jar, oldest first. */
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

  /** Play time: physics steps × PHYSICS_STEP_MS. Pauses and expansions don't count. */
  get playTimeMs(): number {
    return this.world.timeMs;
  }

  /** Ticks run so far, including the ones spent in expansions. Inputs are keyed to this. */
  get ticks(): number {
    return this.tickCount;
  }

  /** The cat in the dropper. */
  get current(): Drop {
    return this.queue.current;
  }

  /** The next one or two cats (Fortune Teller), next first. */
  get preview(): readonly Drop[] {
    return this.queue.preview;
  }

  get canDrop(): boolean {
    return this.runState === 'playing' && this.world.steps >= this.dropAllowedAt;
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

  /** The HUD progress bar towards the next stage. */
  get progress(): StageProgress {
    return stageProgress(this.economy.score, this.world.stage, this.progression);
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

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Drops the cat in the dropper at `x` (clamped so it starts inside the jar). Ignored, and
   * returns false, during the cooldown, a pause, an expansion or after game over.
   */
  drop(x: number): boolean {
    if (!this.canDrop || !Number.isFinite(x)) return false;
    const cat = this.queue.take();
    const geo = this.world.geometry;
    const at = clampDropX(x, tierRadius(cat.tier), geo);
    this.world.addBall({ tier: cat.tier, golden: cat.golden, x: at, y: geo.dropY });
    this.dropAllowedAt = this.world.steps + COOLDOWN_STEPS;
    this.dropAnnounced = false;
    this.events.emit('catDropped', { tier: cat.tier, golden: cat.golden, x: at });
    return true;
  }

  pause(): void {
    if (this.runState !== 'playing' && this.runState !== 'expanding') return;
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
    if (this.runState === 'paused' || this.runState === 'over') return;
    this.stepper.advance(frameMs, this.tickFn);
  }

  /** One fixed tick. */
  tick(): void {
    if (this.runState === 'paused' || this.runState === 'over') return;
    this.tickCount++;
    if (this.runState === 'expanding') this.advanceExpansion(1);
    else this.playStep();
  }

  // ── Debug and test hooks (`?debug=1`, TECH_SPEC §11) ──────────────────────

  /** Puts a cat into the jar, ignoring the queue and the cooldown. */
  spawnBall(tier: number, x: number, y?: number, golden = false): BallView {
    const geo = this.world.geometry;
    const at = clampDropX(x, tierRadius(tier), geo);
    return this.world.addBall({ tier, golden, x: at, y: y ?? geo.dropY });
  }

  /** Sets the run score; an expansion it unlocks starts on the next tick. */
  setScore(score: number): void {
    this.economy.setScore(score);
    this.events.emit('scoreChanged', { score });
  }

  /**
   * Opens every stage up to `stage` for this run, whatever the Shrine Expansion level, and raises
   * the score to that stage's threshold. Each expansion then plays in turn, one stage at a time.
   */
  jumpToStage(stage: number): void {
    if (!Number.isInteger(stage) || stage <= this.world.stage || stage > STAGE_COUNT) return;
    this.debugMaxStage = Math.max(this.debugMaxStage, stage);
    const threshold = stageThreshold(stage, this.stats.thresholdFactor);
    if (this.economy.score < threshold) this.setScore(threshold);
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
    h.number(this.queue.current.tier).bool(this.queue.current.golden);
    for (const next of this.queue.preview) h.number(next.tier).bool(next.golden);
    h.number(this.dropAllowedAt).number(this.savesLeft).bool(this.lockedAnnounced);
    h.number(this.debugMaxStage);
    h.number(this.danger.remainingMs).bool(this.danger.inGrace);
    const e = this.expansionState;
    if (e) h.number(e.from).number(e.to).number(e.elapsedSteps);
    this.world.hashInto(h);
    return h.digest();
  }

  // ── Tick pipeline ──────────────────────────────────────────────────────────

  private playStep(): void {
    const world = this.world;
    world.step();
    const now = world.timeMs;
    const cap = stageInfo(world.stage).tierCap;

    const outcomes = this.merges.resolve(world, cap);
    for (const o of outcomes) {
      const at = { x: o.x, y: o.y };
      if (o.kind === 'merge') {
        const p = this.economy.merge(o.tier, o.golden, now);
        this.bankCoins(p.coins);
        this.events.emit('merged', {
          id: o.ball?.id ?? -1,
          tier: o.tier,
          newTier: o.tier + 1,
          golden: o.golden,
          at,
          ...p,
        });
      } else {
        const p = this.economy.jackpot(cap, o.golden, now);
        this.bankCoins(p.coins);
        this.events.emit('jackpot', { tier: o.tier, golden: o.golden, at, ...p });
      }
    }
    if (outcomes.length > 0) {
      this.events.emit('scoreChanged', { score: this.economy.score });
      this.events.emit('runCoinsChanged', { coins: this.economy.coins });
    }
    const combo = this.economy.comboAt(now);
    if (combo !== this.shownCombo) {
      this.shownCombo = combo;
      this.events.emit('comboChanged', { combo });
    }
    this.announceDropIfReady();
    if (this.checkExpansion()) return;
    this.updateDanger(now);
  }

  private announceDropIfReady(): void {
    if (this.dropAnnounced || !this.canDrop) return;
    this.dropAnnounced = true;
    const { tier, golden } = this.queue.current;
    this.events.emit('dropReady', { tier, golden });
  }

  /** Thresholds and the stage lock, including the debug override. */
  private get progression(): ProgressionStats {
    if (this.debugMaxStage <= this.stats.maxStage) return this.stats;
    return { thresholdFactor: this.stats.thresholdFactor, maxStage: this.debugMaxStage };
  }

  /** Starts the next expansion if the score allows it; returns whether one started. */
  private checkExpansion(): boolean {
    const next = nextExpansion(this.economy.score, this.world.stage, this.progression);
    if (next.kind === 'expand') {
      this.startExpansion(next.stage);
      return true;
    }
    if (next.kind === 'locked' && !this.lockedAnnounced) {
      this.lockedAnnounced = true;
      this.events.emit('expansionLocked', { stage: next.stage });
    }
    return false;
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
    this.world.pause();
    this.events.emit('gameOver', {
      score: this.economy.score,
      stage: this.world.stage,
      coins: this.economy.coins,
      highestTier: this.economy.highestTier,
    });
  }

  /** Pops cats into coins (cash-out, Lucky Save): no score, no combo. */
  private pop(cats: readonly Ball[], reason: 'cashOut' | 'luckySave'): void {
    if (cats.length === 0) return;
    for (const cat of cats) {
      const at = { x: cat.x, y: cat.y };
      this.world.removeBall(cat);
      const { coins } = this.economy.pop(cat.tier, cat.golden);
      this.bankCoins(coins);
      this.events.emit('catPopped', {
        id: cat.id,
        tier: cat.tier,
        golden: cat.golden,
        at,
        coins,
        reason,
      });
    }
    this.events.emit('runCoinsChanged', { coins: this.economy.coins });
  }

  // ── Expansion timeline (GAME_DESIGN §7.1) ─────────────────────────────────

  private startExpansion(to: number): void {
    const from = this.world.stage;
    this.runState = 'expanding';
    this.world.pause();
    this.danger.reset();
    this.showDanger();
    this.expansionState = {
      from,
      to,
      elapsedSteps: 0,
      elapsedMs: 0,
      progress: 0,
      zoomProgress: 0,
      phase: 'zoom',
    };
    this.events.emit('expansionStarted', { from, to });
    if (this.instant) this.advanceExpansion(EXPANSION_STEPS);
  }

  private advanceExpansion(steps: number): void {
    const e = this.expansionState;
    if (!e) return;
    e.elapsedSteps = Math.min(e.elapsedSteps + steps, EXPANSION_STEPS);
    e.elapsedMs = (e.elapsedSteps / EXPANSION_STEPS) * EXPANSION_DURATION_MS;
    e.progress = e.elapsedSteps / EXPANSION_STEPS;
    e.zoomProgress = Math.min(1, e.elapsedSteps / ZOOM_STEPS);
    if (e.phase === 'zoom' && e.elapsedSteps >= ZOOM_STEPS) {
      e.phase = 'reveal';
      this.cashOut(e.to);
      this.events.emit('expansionRevealed', { stage: e.to, newTiers: newTiers(e.from, e.to) });
    }
    if (e.elapsedSteps >= EXPANSION_STEPS) this.finishExpansion(e);
  }

  /** At the end of the zoom: pop the cats too small for the new stage, then grow the jar. */
  private cashOut(to: number): void {
    const below = cashOutBelow(to);
    this.pop(
      this.world.balls.filter((cat) => cat.tier < below),
      'cashOut',
    );
    this.world.setStage(to);
    this.queue.setStage(to);
  }

  private finishExpansion(e: Expansion): void {
    this.expansionState = null;
    this.runState = 'playing';
    this.world.resume();
    this.danger.reset();
    this.events.emit('expansionFinished', { stage: e.to, newTiers: newTiers(e.from, e.to) });
    // The dropper comes back, maybe with a re-rolled cat.
    this.dropAnnounced = false;
    this.announceDropIfReady();
    this.checkExpansion();
  }
}

/** The tiers a stage's cap allows that the previous stage's didn't ("New cats unlocked!"). */
function newTiers(from: number, to: number): number[] {
  const fromCap = stageInfo(from).tierCap;
  const toCap = stageInfo(to).tierCap;
  return Array.from({ length: toCap - fromCap }, (_, i) => fromCap + 1 + i);
}

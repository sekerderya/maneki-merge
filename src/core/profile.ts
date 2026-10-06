/**
 * The player's persistent profile in play (GAME_DESIGN §5, §9, §11; TECH_SPEC §8): wallet,
 * upgrades, records, stats, settings and hint flags on top of the save data, with throttled
 * writes. Headless: the store and the clock are passed in.
 *
 * Every change lands in memory at once and marks the profile dirty. The first change after a
 * quiet second is written right away, later ones at most once per SAVE_THROTTLE_MS; `flush()`
 * (run end, backgrounding, page hide) writes whatever is pending immediately. Coins are banked
 * the moment a run pays them, so quitting or reloading never loses them.
 */
import { SAVE_THROTTLE_MS } from '../config/app';
import type { HintId } from '../config/app';
import { UPGRADES } from '../config/upgrades';
import type { UpgradeId } from '../config/upgrades';
import { defaultSave } from './save';
import type { SaveData } from './save';
import { buy } from './upgrades';
import type { BuyResult, UpgradeLevels } from './upgrades';

/** Timers for the write throttle (window timers in the browser, fakes in tests). */
export interface Scheduler {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(handle: number): void;
}

/** Where the profile is written; `SaveStore` fits. Returns false when the write failed. */
export interface ProfileStore {
  save(data: SaveData): boolean;
}

export type Records = SaveData['records'];
export type Settings = SaveData['settings'];
export type Stats = SaveData['stats'];

/** What a run achieved, compared against the records from before it started. */
export interface RunResult {
  readonly score: number;
  readonly stage: number;
  readonly highestTier: number;
}

export interface NewRecords {
  readonly score: boolean;
  readonly stage: boolean;
  readonly highestTier: boolean;
}

/** Which records a run broke. A run that scored nothing breaks none. */
export function newRecords(before: Records, run: RunResult): NewRecords {
  return {
    score: run.score > before.bestScore,
    stage: run.stage > before.bestStage,
    highestTier: run.highestTier > before.highestTier,
  };
}

export interface ProfileOptions {
  readonly scheduler: Scheduler;
  readonly throttleMs?: number;
}

export class Profile {
  private state: SaveData;
  private readonly scheduler: Scheduler;
  private readonly throttleMs: number;
  private dirty = false;
  private timer: number | null = null;
  private lastWriteMs = Number.NEGATIVE_INFINITY;
  private writeOk = true;

  constructor(
    private readonly store: ProfileStore,
    data: SaveData,
    options: ProfileOptions,
  ) {
    this.state = structuredClone(data);
    this.scheduler = options.scheduler;
    this.throttleMs = options.throttleMs ?? SAVE_THROTTLE_MS;
  }

  // ── Reading ────────────────────────────────────────────────────────────────

  /** A copy of everything, as it would be written now. */
  snapshot(): SaveData {
    return structuredClone(this.state);
  }

  get coins(): number {
    return this.state.wallet.coins;
  }

  get upgrades(): UpgradeLevels {
    return { ...this.state.upgrades };
  }

  get records(): Records {
    return { ...this.state.records };
  }

  get stats(): Stats {
    return { ...this.state.stats };
  }

  get settings(): Settings {
    return { ...this.state.settings };
  }

  hintSeen(id: HintId): boolean {
    return this.state.flags.hintsSeen[id];
  }

  /** Changes are waiting for a write. */
  get pending(): boolean {
    return this.dirty;
  }

  /** False after a write that the storage refused (full or blocked); the next change retries. */
  get lastWriteOk(): boolean {
    return this.writeOk;
  }

  // ── Changes ────────────────────────────────────────────────────────────────

  /** Coins a run paid out: into the wallet, and counted as earned. */
  earn(coins: number): void {
    if (!validAmount(coins) || coins === 0) return;
    this.state.wallet.coins += coins;
    this.state.stats.totalCoinsEarned += coins;
    this.touch();
  }

  /** Coins from outside play (debug): into the wallet only. */
  grant(coins: number): void {
    if (!validAmount(coins) || coins === 0) return;
    this.state.wallet.coins += coins;
    this.touch();
  }

  /**
   * Buys the next level of an upgrade with wallet coins (GAME_DESIGN §2.2, §10) and writes the
   * save at once (TECH_SPEC §8). Nothing changes when it is maxed or too expensive.
   */
  buy(id: UpgradeId): BuyResult {
    const result = buy(id, this.state.upgrades, this.state.wallet.coins);
    if (!result.ok) return result;
    this.state.wallet.coins = result.coins;
    this.state.upgrades[id] = result.levels[id];
    this.dirty = true;
    this.flush();
    return result;
  }

  /** Sets an upgrade level (clamped to 0…max), for debug. */
  setUpgrade(id: UpgradeId, level: number): void {
    const clamped = Math.max(0, Math.min(UPGRADES[id].maxLevel, Math.round(level)));
    if (!Number.isFinite(clamped) || this.state.upgrades[id] === clamped) return;
    this.state.upgrades[id] = clamped;
    this.touch();
  }

  runStarted(): void {
    this.state.stats.runsPlayed++;
    this.touch();
  }

  /** A merge made a cat of `newTier`. */
  merged(newTier: number): void {
    this.state.stats.totalMerges++;
    if (newTier > this.state.records.highestTier) this.state.records.highestTier = newTier;
    this.touch();
  }

  jackpot(): void {
    this.state.stats.jackpots++;
    this.touch();
  }

  /** Raises the best score and best stage while a run is going, so a crash keeps them. */
  recordProgress(score: number, stage: number): void {
    const r = this.state.records;
    if (score <= r.bestScore && stage <= r.bestStage) return;
    r.bestScore = Math.max(r.bestScore, score);
    r.bestStage = Math.max(r.bestStage, stage);
    this.touch();
  }

  setSetting(key: keyof Settings, on: boolean): void {
    if (this.state.settings[key] === on) return;
    this.state.settings[key] = on;
    this.touch();
  }

  markHintSeen(id: HintId): void {
    if (this.state.flags.hintsSeen[id]) return;
    this.state.flags.hintsSeen[id] = true;
    this.touch();
  }

  /** "How to play" in the settings: every first-run hint shows again in the next run. */
  resetHints(): void {
    const hints = this.state.flags.hintsSeen;
    if (!Object.values(hints).some(Boolean)) return;
    for (const id of Object.keys(hints) as HintId[]) hints[id] = false;
    this.touch();
  }

  /** Back to a fresh save (debug "Reset save"), written at once. */
  reset(): void {
    this.state = defaultSave();
    this.dirty = true;
    this.flush();
  }

  // ── Writing ────────────────────────────────────────────────────────────────

  /** Writes pending changes now. Returns false when the storage refused the write. */
  flush(): boolean {
    this.cancelTimer();
    if (!this.dirty) return this.writeOk;
    return this.write();
  }

  private touch(): void {
    this.dirty = true;
    if (this.timer !== null) return;
    const wait = this.lastWriteMs + this.throttleMs - this.scheduler.now();
    if (wait <= 0) {
      this.write();
      return;
    }
    this.timer = this.scheduler.setTimeout(() => {
      this.timer = null;
      if (this.dirty) this.write();
    }, wait);
  }

  private write(): boolean {
    this.lastWriteMs = this.scheduler.now();
    this.writeOk = this.store.save(this.state);
    // A refused write stays dirty, so the next change or flush tries again.
    this.dirty = !this.writeOk;
    return this.writeOk;
  }

  private cancelTimer(): void {
    if (this.timer === null) return;
    this.scheduler.clearTimeout(this.timer);
    this.timer = null;
  }
}

function validAmount(coins: number): boolean {
  return Number.isInteger(coins) && coins >= 0;
}

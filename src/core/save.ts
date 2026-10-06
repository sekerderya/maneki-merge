/**
 * Versioned save data (GAME_DESIGN §11, TECH_SPEC §8): schema, defaults, migrations, repair of
 * damaged data, and a store on top of a StorageAdapter. Headless: the browser's localStorage is
 * passed in by the platform layer.
 */
import { HINT_IDS, SAVE_BACKUP_LIMIT, SAVE_BACKUP_PREFIX, SAVE_KEY } from '../config/app';
import type { HintId } from '../config/app';
import { FIRST_STAGE, STAGE_COUNT } from '../config/stages';
import { TIER_COUNT } from '../config/tiers';
import { UPGRADE_IDS, UPGRADES } from '../config/upgrades';
import type { UpgradeId } from '../config/upgrades';

/** Bump when the shape changes, and add MIGRATIONS[old] that converts old data to the new one. */
export const SAVE_VERSION = 3;

export interface SaveData {
  wallet: { coins: number };
  upgrades: Record<UpgradeId, number>;
  records: {
    bestScore: number;
    /** 1 until a run reaches stage 2. */
    bestStage: number;
    /** Highest tier ever made by a merge; 0 before the first merge. */
    highestTier: number;
  };
  stats: {
    runsPlayed: number;
    totalMerges: number;
    totalCoinsEarned: number;
    jackpots: number;
  };
  settings: { sound: boolean; haptics: boolean; reduceMotion: boolean };
  flags: { hintsSeen: Record<HintId, boolean> };
}

export interface SaveEnvelope {
  readonly version: number;
  readonly data: SaveData;
}

export function defaultSave(): SaveData {
  const upgrades = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_IDS) upgrades[id] = 0;
  const hintsSeen = {} as Record<HintId, boolean>;
  for (const id of HINT_IDS) hintsSeen[id] = false;
  return {
    wallet: { coins: 0 },
    upgrades,
    records: { bestScore: 0, bestStage: FIRST_STAGE, highestTier: 0 },
    stats: { runsPlayed: 0, totalMerges: 0, totalCoinsEarned: 0, jackpots: 0 },
    settings: { sound: true, haptics: true, reduceMotion: false },
    flags: { hintsSeen },
  };
}

// ---------------------------------------------------------------------------------------------
// Migration and repair

/** Turns data of version n into data of version n + 1. Receives untrusted data. */
export type Migration = (data: unknown) => unknown;

/**
 * Prices of the levels of Quick Growth, the upgrade v0.10 removed (score thresholds made way for
 * stage clears). Frozen here: the config no longer knows it.
 */
export const QUICK_GROWTH_PRICES: readonly number[] = [150, 300, 600, 1200, 2400];

/**
 * v1 → v2 (v0.10): Quick Growth is gone. The coins spent on its levels go back into the wallet,
 * and its level is dropped. Anything malformed is left for `sanitize` to repair.
 */
export function refundQuickGrowth(data: unknown): unknown {
  if (!isRecord(data) || !isRecord(data['upgrades'])) return data;
  const { quickGrowth, ...upgrades } = data['upgrades'];
  return withRefund({ ...data, upgrades }, spent(QUICK_GROWTH_PRICES, quickGrowth));
}

/**
 * Prices of the levels of the upgrades v0.12 removed: Shrine Expansion (every stage is open now)
 * and Fortune Teller. Frozen here: the config no longer knows them.
 */
export const SHRINE_EXPANSION_PRICES: readonly number[] = [1500, 10_000, 60_000];
export const FORTUNE_TELLER_PRICES: readonly number[] = [400];

/** The highest tier before v0.12, when stages held 12 cats (stage 5 ended at tier 56). */
const V2_TIER_COUNT = 56;

/**
 * v2 → v3 (v0.12): Shrine Expansion and Fortune Teller are gone, and the coins spent on their
 * levels go back into the wallet. Golden Touch became Golden Merge: its level carries over. Stages
 * hold 11 cats now (tiers up to 51), so a higher record tier is capped. Anything malformed is left
 * for `sanitize` to repair.
 */
export function retireUpgrades(data: unknown): unknown {
  if (!isRecord(data) || !isRecord(data['upgrades'])) return data;
  const { shrineExpansion, fortuneTeller, goldenTouch, ...upgrades } = data['upgrades'];
  if (goldenTouch !== undefined && upgrades['goldenMerge'] === undefined) {
    upgrades['goldenMerge'] = goldenTouch;
  }
  const refund =
    spent(SHRINE_EXPANSION_PRICES, shrineExpansion) + spent(FORTUNE_TELLER_PRICES, fortuneTeller);
  let out: Record<string, unknown> = { ...data, upgrades };
  const records = data['records'];
  if (isRecord(records)) {
    const tier = records['highestTier'];
    if (typeof tier === 'number' && tier > TIER_COUNT && tier <= V2_TIER_COUNT) {
      out = { ...out, records: { ...records, highestTier: TIER_COUNT } };
    }
  }
  return withRefund(out, refund);
}

/** The coins spent on `level` levels of an upgrade with these prices (0 for a bad level). */
function spent(prices: readonly number[], level: unknown): number {
  const levels =
    typeof level === 'number' && Number.isInteger(level)
      ? Math.min(Math.max(level, 0), prices.length)
      : 0;
  return prices.slice(0, levels).reduce((sum, price) => sum + price, 0);
}

/** Adds `refund` coins to the wallet, unless it is malformed (`sanitize` repairs it). */
function withRefund(data: Record<string, unknown>, refund: number): Record<string, unknown> {
  const wallet = data['wallet'];
  const coins = isRecord(wallet) ? wallet['coins'] : undefined;
  if (refund === 0 || !isRecord(wallet) || typeof coins !== 'number' || !Number.isFinite(coins)) {
    return data;
  }
  return { ...data, wallet: { ...wallet, coins: coins + refund } };
}

/** MIGRATIONS[n] upgrades version n to n + 1. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: refundQuickGrowth,
  2: retireUpgrades,
};

export type LoadStatus =
  /** Nothing stored yet: defaults. */
  | 'empty'
  /** Current version, every field valid. */
  | 'ok'
  /** An older version, converted to the current one. */
  | 'migrated'
  /** Readable, but some fields were invalid and reset to defaults (listed in `issues`). */
  | 'repaired'
  /** Written by a newer version of the app; the fields this version knows were kept. */
  | 'future'
  /** Unreadable: defaults. */
  | 'corrupt'
  /** Storage can't be read (blocked or unavailable): defaults, in memory only. */
  | 'unavailable';

export interface LoadResult {
  readonly data: SaveData;
  readonly status: LoadStatus;
  /** The version found in storage, or null when there was none or it was unreadable. */
  readonly fromVersion: number | null;
  /** Paths of fields that were invalid, or the reason the save was unreadable. */
  readonly issues: readonly string[];
}

export interface MigrateOptions {
  readonly version?: number;
  readonly migrations?: Readonly<Record<number, Migration>>;
}

/** Parses the stored text (null when nothing is stored) into current, valid save data. */
export function decodeSave(text: string | null, options: MigrateOptions = {}): LoadResult {
  if (text === null) return { data: defaultSave(), status: 'empty', fromVersion: null, issues: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return corrupt(null, 'invalid JSON');
  }
  return migrate(parsed, options);
}

/** Brings a parsed `{ version, data }` envelope up to the current version and repairs it. */
export function migrate(raw: unknown, options: MigrateOptions = {}): LoadResult {
  const target = options.version ?? SAVE_VERSION;
  const migrations = options.migrations ?? MIGRATIONS;

  if (!isRecord(raw)) return corrupt(null, 'not an object');
  const version = raw['version'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return corrupt(null, 'missing or invalid version');
  }
  if (!('data' in raw)) return corrupt(version, 'missing data');

  let data: unknown = raw['data'];
  if (version < target) {
    for (let v = version; v < target; v++) {
      const step = migrations[v];
      if (!step) return corrupt(version, `no migration from version ${v}`);
      try {
        data = step(data);
      } catch (error) {
        return corrupt(version, `migration from version ${v} failed: ${String(error)}`);
      }
    }
  }

  if (!isRecord(data)) return corrupt(version, 'data is not an object');
  const { data: clean, issues } = sanitize(data);
  const status: LoadStatus =
    version > target
      ? 'future'
      : issues.length > 0
        ? 'repaired'
        : version < target
          ? 'migrated'
          : 'ok';
  return { data: clean, status, fromVersion: version, issues };
}

function corrupt(fromVersion: number | null, reason: string): LoadResult {
  return { data: defaultSave(), status: 'corrupt', fromVersion, issues: [reason] };
}

/**
 * Copies every known field of current-version data onto the defaults. A missing field takes its
 * default silently (fields added later need no migration); a present but invalid field takes
 * its default and is reported. Unknown fields are dropped.
 */
export function sanitize(data: Record<string, unknown>): { data: SaveData; issues: string[] } {
  const out = defaultSave();
  const issues: string[] = [];
  const r = new Reader(issues);

  const wallet = r.section(data, 'wallet');
  out.wallet.coins = r.count(wallet, 'wallet.coins', out.wallet.coins);

  const upgrades = r.section(data, 'upgrades');
  for (const id of UPGRADE_IDS) {
    out.upgrades[id] = r.count(upgrades, `upgrades.${id}`, 0, UPGRADES[id].maxLevel);
  }

  const records = r.section(data, 'records');
  out.records.bestScore = r.count(records, 'records.bestScore', 0);
  out.records.bestStage = r.count(
    records,
    'records.bestStage',
    FIRST_STAGE,
    STAGE_COUNT,
    FIRST_STAGE,
  );
  out.records.highestTier = r.count(records, 'records.highestTier', 0, TIER_COUNT);

  const stats = r.section(data, 'stats');
  for (const key of ['runsPlayed', 'totalMerges', 'totalCoinsEarned', 'jackpots'] as const) {
    out.stats[key] = r.count(stats, `stats.${key}`, 0);
  }

  const settings = r.section(data, 'settings');
  out.settings.sound = r.bool(settings, 'settings.sound', out.settings.sound);
  out.settings.haptics = r.bool(settings, 'settings.haptics', out.settings.haptics);
  out.settings.reduceMotion = r.bool(settings, 'settings.reduceMotion', out.settings.reduceMotion);

  const flags = r.section(data, 'flags');
  const hints = r.section(flags, 'flags.hintsSeen');
  for (const id of HINT_IDS) {
    out.flags.hintsSeen[id] = r.bool(hints, `flags.hintsSeen.${id}`, false);
  }

  return { data: out, issues };
}

class Reader {
  constructor(private readonly issues: string[]) {}

  /** A nested object, or an empty one (reported if present but not an object). */
  section(parent: Record<string, unknown>, path: string): Record<string, unknown> {
    const key = lastKey(path);
    const value = parent[key];
    if (value === undefined) return {};
    if (isRecord(value)) return value;
    this.issues.push(path);
    return {};
  }

  /**
   * A non-negative integer in [min, max]. Scores of later stages pass 2^53, so the default max
   * is the largest finite number (every double that big is an integer).
   */
  count(
    parent: Record<string, unknown>,
    path: string,
    fallback: number,
    max = Number.MAX_VALUE,
    min = 0,
  ): number {
    const value = parent[lastKey(path)];
    if (value === undefined) return fallback;
    if (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max) {
      return value;
    }
    this.issues.push(path);
    // Keep what can be kept: a too-high level becomes the max, 12.7 coins become 12.
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.min(max, Math.max(min, Math.floor(value)));
    }
    return fallback;
  }

  bool(parent: Record<string, unknown>, path: string, fallback: boolean): boolean {
    const value = parent[lastKey(path)];
    if (value === undefined) return fallback;
    if (typeof value === 'boolean') return value;
    this.issues.push(path);
    return fallback;
  }
}

function lastKey(path: string): string {
  return path.slice(path.lastIndexOf('.') + 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------------------------
// Storage

/** Key-value string storage. `setItem` may throw (quota exceeded, storage blocked). */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

/** In-memory storage for tests, the simulator, and browsers where storage is blocked. */
export class MemoryStorage implements StorageAdapter {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  keys(): string[] {
    return [...this.map.keys()];
  }
}

/** The subset of the Web Storage API the adapter uses (window.localStorage fits). */
export interface WebStorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Adapts localStorage (handed in by the platform layer) to StorageAdapter. */
export class WebStorageAdapter implements StorageAdapter {
  constructor(private readonly storage: WebStorageLike) {}

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  keys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key !== null) keys.push(key);
    }
    return keys;
  }
}

export interface SaveStoreOptions {
  readonly key?: string;
  readonly backupPrefix?: string;
  readonly backupLimit?: number;
  /** Clock for backup names. */
  readonly now?: () => number;
  readonly migrate?: MigrateOptions;
}

/**
 * Loads and writes the save. Never throws: storage errors fall back to defaults on load and make
 * `save` return false. A damaged, migrated or newer-version save is backed up (when it wasn't a
 * clean read) and rewritten in the current format right away.
 */
export class SaveStore {
  private readonly key: string;
  private readonly backupPrefix: string;
  private readonly backupLimit: number;
  private readonly now: () => number;
  private readonly migrateOptions: MigrateOptions;

  constructor(
    private readonly storage: StorageAdapter,
    options: SaveStoreOptions = {},
  ) {
    this.key = options.key ?? SAVE_KEY;
    this.backupPrefix = options.backupPrefix ?? SAVE_BACKUP_PREFIX;
    this.backupLimit = options.backupLimit ?? SAVE_BACKUP_LIMIT;
    this.now = options.now ?? (() => Date.now());
    this.migrateOptions = options.migrate ?? {};
  }

  load(): LoadResult {
    let text: string | null;
    try {
      text = this.storage.getItem(this.key);
    } catch (error) {
      return {
        data: defaultSave(),
        status: 'unavailable',
        fromVersion: null,
        issues: [String(error)],
      };
    }

    const result = decodeSave(text, this.migrateOptions);
    if (text !== null && result.status !== 'ok') {
      if (result.status !== 'migrated') this.backup(text);
      this.save(result.data);
    }
    return result;
  }

  /** Writes the save. Returns false when the storage refused (full or blocked). */
  save(data: SaveData): boolean {
    const envelope: SaveEnvelope = {
      version: this.migrateOptions.version ?? SAVE_VERSION,
      data,
    };
    try {
      this.storage.setItem(this.key, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }

  /** Keys of the kept backups, oldest first. */
  backups(): string[] {
    try {
      return this.storage
        .keys()
        .filter((key) => key.startsWith(this.backupPrefix))
        .sort((a, b) => this.backupTime(a) - this.backupTime(b) || a.localeCompare(b));
    } catch {
      return [];
    }
  }

  private backup(text: string): void {
    try {
      const stamp = this.now();
      let key = `${this.backupPrefix}${stamp}`;
      for (let n = 1; this.storage.getItem(key) !== null; n++)
        key = `${this.backupPrefix}${stamp}-${n}`;
      this.storage.setItem(key, text);
      const kept = this.backups();
      for (const old of kept.slice(0, Math.max(0, kept.length - this.backupLimit))) {
        this.storage.removeItem(old);
      }
    } catch {
      // Best effort: a full or blocked storage just means no backup.
    }
  }

  private backupTime(key: string): number {
    const time = Number.parseInt(key.slice(this.backupPrefix.length), 10);
    return Number.isFinite(time) ? time : 0;
  }
}

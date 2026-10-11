/**
 * The run in progress, saved (GAME_DESIGN §11, TECH_SPEC §8): closing the app keeps the jar, the
 * stage and everything else of the run, and the next launch goes straight back into it. The run
 * writes a `RunSnapshot` (`RunController.snapshot`) and is rebuilt from one
 * (`RunController.restore`); this file holds its shape, its validation and its store. Headless.
 *
 * It lives under its own key, apart from the profile: a snapshot that can't be read, or one of
 * another RUN_SAVE_VERSION, is dropped (the run is lost, the profile never is). Migrations would
 * cost more than an unfinished run is worth. Additions that older snapshots can do without (a new
 * trial or blessing, which starts at level 0) don't bump the version.
 */
import { RUN_SAVE_KEY } from '../config/app';
import { PICK_IDS } from '../config/picks';
import type { PickId, PickKind, WindDirection } from '../config/picks';
import { UPGRADE_IDS } from '../config/upgrades';
import type { UpgradeId } from '../config/upgrades';
import type { DropKind } from './dropQueue';
import type { RngState } from './rng';
import type { SaveData, StorageAdapter } from './save';

/** Bump whenever the snapshot's shape or meaning changes: older snapshots are then dropped. */
export const RUN_SAVE_VERSION = 1;

/** A ball in the dropper or in NEXT. */
export interface SavedDrop {
  readonly kind: DropKind;
  readonly tier: number;
  readonly golden: boolean;
  readonly hits: number;
}

export interface QueueSnapshot {
  readonly current: SavedDrop;
  readonly next: SavedDrop;
  /** Items rolled so far (the first ones are always the smallest cat). */
  readonly generated: number;
  readonly stageDrops: number;
}

export interface EconomySnapshot {
  readonly score: number;
  readonly coins: number;
  readonly merges: number;
  readonly jackpots: number;
  readonly highestTier: number;
  readonly combo: number;
  /** Play time of the last merge that counted for the combo, or null before the first one. */
  readonly comboAtMs: number | null;
}

export interface DangerSnapshot {
  readonly overSteps: number;
  readonly graceSteps: number;
}

/**
 * A ball with its matter-js body as it stands between two steps: position and the previous
 * position (the Verlet integrator's velocity), angle, velocity, the last step's length and the
 * position solver's warm start, and its growth after a merge. Velocities in matter-js units.
 */
export interface SavedBall {
  readonly id: number;
  /** Any kind but the magnet, which never goes into the jar. */
  readonly kind: Exclude<DropKind, 'magnet'>;
  readonly tier: number;
  readonly golden: boolean;
  readonly hitsLeft: number;
  /** A joker's boulders hit so far (empty for other balls; missing before v0.28). */
  readonly struck: readonly number[];
  /** Porcelain: a cracked cat (false when missing, before Batch 18). */
  readonly cracked: boolean;
  /** A broken cat's piece: the other piece's id (null when missing, before Batch 18). */
  readonly mate: number | null;
  readonly x: number;
  readonly y: number;
  readonly prevX: number;
  readonly prevY: number;
  readonly angle: number;
  readonly anglePrev: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly deltaTime: number;
  readonly impulseX: number;
  readonly impulseY: number;
  readonly radius: number;
  readonly growFrom: number;
  readonly growMs: number;
  readonly landedMs: number;
}

export interface WorldSnapshot {
  readonly stage: number;
  readonly steps: number;
  readonly nextId: number;
  readonly paused: boolean;
  /** Oldest first. */
  readonly balls: readonly SavedBall[];
}

export interface ExpansionSnapshot {
  readonly from: number;
  readonly to: number;
  readonly picks: boolean;
  readonly elapsedSteps: number;
  readonly phase: 'clear' | 'zoom' | 'reveal';
}

/** The run states a snapshot comes back to (paused, until the player resumes). */
export type SavedRunState = 'playing' | 'expanding' | 'choosing';

export interface RunSnapshot {
  readonly seed: number;
  /** The upgrade levels the run started with. */
  readonly upgrades: Readonly<Record<UpgradeId, number>>;
  /** Where play goes on after the pause the run comes back in. */
  readonly state: SavedRunState;
  readonly ticks: number;
  readonly dropAllowedAt: number;
  readonly savesLeft: number;
  readonly levels: Readonly<Record<PickId, number>>;
  /** Which way the run's wind blows (missing before Batch 18: the seed's, RunController). */
  readonly windDirection?: WindDirection;
  readonly offer: { readonly kind: PickKind; readonly options: readonly PickId[] } | null;
  readonly pickQueue: readonly PickKind[];
  readonly expansion: ExpansionSnapshot | null;
  readonly rng: RngState;
  readonly specialRng: RngState;
  readonly pickRng: RngState;
  /** Porcelain's cracks and Echo's sides (missing before Batch 18: fresh from the seed). */
  readonly porcelainRng?: RngState;
  readonly echoRng?: RngState;
  readonly queue: QueueSnapshot;
  readonly economy: EconomySnapshot;
  readonly danger: DangerSnapshot;
  readonly world: WorldSnapshot;
}

/** What the store keeps: the run, and the records from before it (the Game Over badges). */
export interface RunSave {
  readonly run: RunSnapshot;
  readonly recordsBefore: SaveData['records'];
}

export interface RunSaveEnvelope {
  readonly version: number;
  readonly save: RunSave;
}

// ---------------------------------------------------------------------------------------------
// Validation

/** Thrown by the readers below; `decodeRunSave` turns it into a dropped snapshot. */
class InvalidRunSave extends Error {}

/**
 * Parses stored text into a run save, or explains why it can't be used. Only the shape is checked
 * here; the rules (a tier the stage can't hold, …) are checked when the run is rebuilt.
 */
export function decodeRunSave(
  text: string,
  version = RUN_SAVE_VERSION,
): { save: RunSave } | { error: string } {
  try {
    const raw: unknown = JSON.parse(text);
    const envelope = record(raw, 'envelope');
    if (envelope['version'] !== version) {
      return { error: `version ${String(envelope['version'])}, expected ${version}` };
    }
    const save = record(envelope['save'], 'save');
    return {
      save: { run: runSnapshot(save['run']), recordsBefore: records(save['recordsBefore']) },
    };
  } catch (error) {
    return { error: error instanceof SyntaxError ? 'invalid JSON' : String(error) };
  }
}

function runSnapshot(value: unknown): RunSnapshot {
  const r = record(value, 'run');
  const offer = r['offer'] === null ? null : record(r['offer'], 'offer');
  return {
    seed: int(r['seed'], 'seed'),
    upgrades: levelsOf(r['upgrades'], UPGRADE_IDS, 'upgrades'),
    state: oneOf(r['state'], ['playing', 'expanding', 'choosing'] as const, 'state'),
    ticks: count(r['ticks'], 'ticks'),
    dropAllowedAt: count(r['dropAllowedAt'], 'dropAllowedAt'),
    savesLeft: count(r['savesLeft'], 'savesLeft'),
    // A trial or blessing added since the snapshot was written starts at level 0.
    levels: levelsOf(r['levels'], PICK_IDS, 'levels', 0),
    ...(r['windDirection'] === undefined ? {} : { windDirection: wind(r['windDirection']) }),
    offer: offer && {
      kind: oneOf(offer['kind'], PICK_KINDS, 'offer.kind'),
      options: list(offer['options'], 'offer.options').map((id) => oneOf(id, PICK_IDS, 'option')),
    },
    pickQueue: list(r['pickQueue'], 'pickQueue').map((kind) => oneOf(kind, PICK_KINDS, 'kind')),
    expansion: r['expansion'] === null ? null : expansion(r['expansion']),
    rng: rngState(r['rng'], 'rng'),
    specialRng: rngState(r['specialRng'], 'specialRng'),
    pickRng: rngState(r['pickRng'], 'pickRng'),
    ...(r['porcelainRng'] === undefined
      ? {}
      : { porcelainRng: rngState(r['porcelainRng'], 'porcelainRng') }),
    ...(r['echoRng'] === undefined ? {} : { echoRng: rngState(r['echoRng'], 'echoRng') }),
    queue: queue(r['queue']),
    economy: economy(r['economy']),
    danger: danger(r['danger']),
    world: world(r['world']),
  };
}

const PICK_KINDS = ['trial', 'blessing', 'rule'] as const;
const DROP_KINDS = ['cat', 'magnet', 'boulder', 'hanabi', 'joker'] as const;
const BALL_KINDS = ['cat', 'boulder', 'hanabi', 'joker'] as const;

function wind(value: unknown): WindDirection {
  if (value === 1 || value === -1) return value;
  throw new InvalidRunSave('windDirection');
}

function expansion(value: unknown): ExpansionSnapshot {
  const e = record(value, 'expansion');
  return {
    from: int(e['from'], 'expansion.from'),
    to: int(e['to'], 'expansion.to'),
    picks: bool(e['picks'], 'expansion.picks'),
    elapsedSteps: count(e['elapsedSteps'], 'expansion.elapsedSteps'),
    phase: oneOf(e['phase'], ['clear', 'zoom', 'reveal'] as const, 'expansion.phase'),
  };
}

function drop(value: unknown, path: string): SavedDrop {
  const d = record(value, path);
  return {
    kind: oneOf(d['kind'], DROP_KINDS, `${path}.kind`),
    tier: int(d['tier'], `${path}.tier`),
    golden: bool(d['golden'], `${path}.golden`),
    hits: count(d['hits'], `${path}.hits`),
  };
}

function queue(value: unknown): QueueSnapshot {
  const q = record(value, 'queue');
  return {
    current: drop(q['current'], 'queue.current'),
    next: drop(q['next'], 'queue.next'),
    generated: count(q['generated'], 'queue.generated'),
    stageDrops: count(q['stageDrops'], 'queue.stageDrops'),
  };
}

function economy(value: unknown): EconomySnapshot {
  const e = record(value, 'economy');
  return {
    score: count(e['score'], 'economy.score'),
    coins: count(e['coins'], 'economy.coins'),
    merges: count(e['merges'], 'economy.merges'),
    jackpots: count(e['jackpots'], 'economy.jackpots'),
    highestTier: count(e['highestTier'], 'economy.highestTier'),
    combo: count(e['combo'], 'economy.combo'),
    comboAtMs: e['comboAtMs'] === null ? null : finite(e['comboAtMs'], 'economy.comboAtMs'),
  };
}

function danger(value: unknown): DangerSnapshot {
  const d = record(value, 'danger');
  return {
    overSteps: count(d['overSteps'], 'danger.overSteps'),
    graceSteps: count(d['graceSteps'], 'danger.graceSteps'),
  };
}

function world(value: unknown): WorldSnapshot {
  const w = record(value, 'world');
  return {
    stage: int(w['stage'], 'world.stage'),
    steps: count(w['steps'], 'world.steps'),
    nextId: count(w['nextId'], 'world.nextId'),
    paused: bool(w['paused'], 'world.paused'),
    balls: list(w['balls'], 'world.balls').map(ball),
  };
}

function ball(value: unknown): SavedBall {
  const b = record(value, 'ball');
  const n = (key: string): number => finite(b[key], `ball.${key}`);
  return {
    id: count(b['id'], 'ball.id'),
    kind: oneOf(b['kind'], BALL_KINDS, 'ball.kind'),
    tier: int(b['tier'], 'ball.tier'),
    golden: bool(b['golden'], 'ball.golden'),
    hitsLeft: count(b['hitsLeft'], 'ball.hitsLeft'),
    x: n('x'),
    y: n('y'),
    prevX: n('prevX'),
    prevY: n('prevY'),
    angle: n('angle'),
    anglePrev: n('anglePrev'),
    vx: n('vx'),
    vy: n('vy'),
    spin: n('spin'),
    deltaTime: n('deltaTime'),
    impulseX: n('impulseX'),
    impulseY: n('impulseY'),
    radius: n('radius'),
    growFrom: n('growFrom'),
    growMs: n('growMs'),
    landedMs: n('landedMs'),
    struck:
      b['struck'] === undefined
        ? []
        : list(b['struck'], 'ball.struck').map((id) => count(id, 'ball.struck')),
    cracked: b['cracked'] === undefined ? false : bool(b['cracked'], 'ball.cracked'),
    mate: b['mate'] === undefined || b['mate'] === null ? null : count(b['mate'], 'ball.mate'),
  };
}

function records(value: unknown): SaveData['records'] {
  const r = record(value, 'recordsBefore');
  return {
    bestScore: count(r['bestScore'], 'recordsBefore.bestScore'),
    bestStage: count(r['bestStage'], 'recordsBefore.bestStage'),
    highestTier: count(r['highestTier'], 'recordsBefore.highestTier'),
  };
}

/** Levels by id; with `missing`, an id the record lacks gets that level instead of failing. */
function levelsOf<K extends string>(
  value: unknown,
  ids: readonly K[],
  path: string,
  missing?: number,
): Record<K, number> {
  const r = record(value, path);
  const out = {} as Record<K, number>;
  for (const id of ids) {
    out[id] =
      r[id] === undefined && missing !== undefined ? missing : count(r[id], `${path}.${id}`);
  }
  return out;
}

function rngState(value: unknown, path: string): RngState {
  const v = list(value, path);
  if (v.length !== 4) throw new InvalidRunSave(path);
  const [a, b, c, d] = v.map((n) => int(n, path)) as [number, number, number, number];
  return [a, b, c, d];
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new InvalidRunSave(path);
}

function list(value: unknown, path: string): unknown[] {
  if (Array.isArray(value)) return value;
  throw new InvalidRunSave(path);
}

function finite(value: unknown, path: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new InvalidRunSave(path);
}

function int(value: unknown, path: string): number {
  if (Number.isInteger(value)) return value as number;
  throw new InvalidRunSave(path);
}

/** A non-negative integer (scores pass 2^53, where every double is an integer). */
function count(value: unknown, path: string): number {
  const n = finite(value, path);
  if (Number.isInteger(n) && n >= 0) return n;
  throw new InvalidRunSave(path);
}

function bool(value: unknown, path: string): boolean {
  if (typeof value === 'boolean') return value;
  throw new InvalidRunSave(path);
}

function oneOf<T extends string>(value: unknown, options: readonly T[], path: string): T {
  if (options.includes(value as T)) return value as T;
  throw new InvalidRunSave(path);
}

// ---------------------------------------------------------------------------------------------
// Storage

export type RunSaveLoad =
  | { readonly status: 'empty'; readonly save: null }
  | { readonly status: 'ok'; readonly save: RunSave }
  /** Stored but unusable (unreadable, another version, storage error): it was removed. */
  | { readonly status: 'dropped'; readonly save: null; readonly reason: string };

/** Keeps the run in progress under its own key. Never throws. */
export class RunSaveStore {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly key = RUN_SAVE_KEY,
    private readonly version = RUN_SAVE_VERSION,
  ) {}

  load(): RunSaveLoad {
    let text: string | null;
    try {
      text = this.storage.getItem(this.key);
    } catch (error) {
      return { status: 'dropped', save: null, reason: String(error) };
    }
    if (text === null) return { status: 'empty', save: null };
    const decoded = decodeRunSave(text, this.version);
    if ('save' in decoded) return { status: 'ok', save: decoded.save };
    this.clear();
    return { status: 'dropped', save: null, reason: decoded.error };
  }

  /** Returns false when the storage refused the write (full or blocked). */
  save(save: RunSave): boolean {
    const envelope: RunSaveEnvelope = { version: this.version, save };
    try {
      this.storage.setItem(this.key, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }

  /** The run ended (game over, quit) or can't come back. */
  clear(): void {
    try {
      this.storage.removeItem(this.key);
    } catch {
      // Best effort: a blocked storage has nothing to clear that the next launch could read.
    }
  }
}

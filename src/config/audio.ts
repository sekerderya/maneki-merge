/**
 * Audio tunables (GAME_DESIGN §12, TECH_SPEC §2): procedural Web Audio sound effects, no files.
 * Volumes are linear gains before the master limiter.
 */
import type { SoundSetId } from './soundSets';

export type SoundName =
  | 'drop'
  | 'merge'
  | 'coin'
  | 'combo'
  | 'jackpot'
  | 'whoosh'
  | 'chime'
  | 'dangerTick'
  | 'gameOver'
  | 'boom'
  | 'click'
  | 'purchase'
  | 'take'
  | 'clang'
  | 'crunch'
  | 'thud'
  | 'tink'
  | 'shatter'
  | 'echo'
  | 'curse'
  | 'grind'
  | 'clack'
  | 'thunder';

export { DEFAULT_SOUND_SET, SOUND_SETS } from './soundSets';
export type { SoundSetId } from './soundSets';

/**
 * A short generated room reverb (decaying, low-passed noise) that the soft set sends a little of
 * every sound into; it rounds off the attacks. `send` is the share per set (0: no reverb).
 */
export const REVERB = {
  seconds: 1.1,
  /** The impulse falls as (1 - t)^decayPower. */
  decayPower: 3.5,
  /** A one-pole low-pass on the impulse, so the tail is warm, not hissy. */
  lowpassHz: 3200,
  send: { soft: 0.22, classic: 0 },
} as const;

/**
 * Extra gain per sound in a set, on top of its `SOUNDS` volume (which was set for the classic
 * set). The soft set's were measured offline (v0.46: the loudest 50 ms, roughly A-weighted) to sit
 * about 1–2 dB under the classic sound, a little more for the busy merge chain's coin and combo;
 * the low thumps get a little more, since a phone speaker loses their bass. A missing sound takes 1.
 */
export const SET_GAIN: Readonly<Record<SoundSetId, Partial<Record<SoundName, number>>>> = {
  soft: {
    merge: 1.12,
    coin: 0.67,
    combo: 0.63,
    chime: 0.9,
    dangerTick: 0.7,
    gameOver: 0.75,
    purchase: 0.7,
    clang: 1.2,
    crunch: 1.33,
    boom: 0.7,
    thud: 1.33,
    shatter: 0.9,
    curse: 1.4,
    grind: 1.4,
    clack: 0.35,
    thunder: 1.4,
  },
  classic: {},
};

/** The soft set's merge bubble sits this much lower than the classic pop (mergePitch). */
export const SOFT_MERGE_PITCH_SCALE = 0.7;

/** Everything goes through one master gain and a limiter, so stacked sounds never clip. */
export const MASTER_VOLUME = 0.8;
export const LIMITER = {
  thresholdDb: -10,
  kneeDb: 6,
  ratio: 12,
  attackS: 0.003,
  releaseS: 0.15,
} as const;

/** At most this many sounds play at once, whatever their kind. */
export const MAX_VOICES = 14;

/**
 * Per-sound throttling: a sound is skipped if the same sound started less than `minIntervalMs`
 * ago, or if `maxVoices` of it are still playing. `durationMs` is how long one voice lasts.
 * Ten merges in one physics step therefore play a couple of pops, not ten stacked ones.
 */
export interface SoundSpec {
  readonly volume: number;
  readonly durationMs: number;
  readonly minIntervalMs: number;
  readonly maxVoices: number;
}

export const SOUNDS: Readonly<Record<SoundName, SoundSpec>> = {
  drop: { volume: 0.42, durationMs: 140, minIntervalMs: 40, maxVoices: 2 },
  merge: { volume: 0.5, durationMs: 220, minIntervalMs: 28, maxVoices: 4 },
  coin: { volume: 0.16, durationMs: 300, minIntervalMs: 55, maxVoices: 3 },
  combo: { volume: 0.26, durationMs: 220, minIntervalMs: 60, maxVoices: 2 },
  jackpot: { volume: 0.3, durationMs: 1100, minIntervalMs: 400, maxVoices: 1 },
  whoosh: { volume: 0.5, durationMs: 1000, minIntervalMs: 600, maxVoices: 1 },
  chime: { volume: 0.24, durationMs: 1200, minIntervalMs: 400, maxVoices: 1 },
  dangerTick: { volume: 0.22, durationMs: 80, minIntervalMs: 250, maxVoices: 1 },
  gameOver: { volume: 0.32, durationMs: 1300, minIntervalMs: 1000, maxVoices: 1 },
  click: { volume: 0.22, durationMs: 60, minIntervalMs: 40, maxVoices: 2 },
  purchase: { volume: 0.26, durationMs: 450, minIntervalMs: 120, maxVoices: 2 },
  // The special balls (GAME_DESIGN §15): the magnet's catch, a boulder's band, a boulder crumbling.
  take: { volume: 0.34, durationMs: 300, minIntervalMs: 120, maxVoices: 1 },
  clang: { volume: 0.22, durationMs: 380, minIntervalMs: 60, maxVoices: 2 },
  crunch: { volume: 0.4, durationMs: 320, minIntervalMs: 60, maxVoices: 2 },
  // A hanabi goes off (GAME_DESIGN §15.6).
  boom: { volume: 0.45, durationMs: 700, minIntervalMs: 120, maxVoices: 2 },
  // Batch 18 (GAME_DESIGN §15.9–§15.11): Heavy Drop's top level landing, a porcelain cat
  // cracking and breaking, an echo cat appearing.
  thud: { volume: 0.5, durationMs: 260, minIntervalMs: 80, maxVoices: 1 },
  tink: { volume: 0.2, durationMs: 120, minIntervalMs: 50, maxVoices: 2 },
  shatter: { volume: 0.32, durationMs: 320, minIntervalMs: 80, maxVoices: 2 },
  echo: { volume: 0.22, durationMs: 1100, minIntervalMs: 150, maxVoices: 2 },
  // Batch 19 (GAME_DESIGN §15.12, §15.14): a curse begins, a cursed cat turns to stone, a die
  // fizzles a merge.
  curse: { volume: 0.3, durationMs: 900, minIntervalMs: 300, maxVoices: 1 },
  grind: { volume: 0.42, durationMs: 450, minIntervalMs: 200, maxVoices: 1 },
  clack: { volume: 0.3, durationMs: 160, minIntervalMs: 60, maxVoices: 2 },
  // Batch 23 (GAME_DESIGN §15.15): a lightning ball strikes.
  thunder: { volume: 0.5, durationMs: 1100, minIntervalMs: 300, maxVoices: 1 },
};

/**
 * Merge pop pitch (lower for bigger cats): the pop of a merge into size 2 sounds at
 * MERGE_PITCH_TOP_HZ, and every size above that is MERGE_SEMITONES_PER_SIZE lower.
 */
export const MERGE_PITCH_TOP_HZ = 880;
export const MERGE_SEMITONES_PER_SIZE = 1.5;

/** Rising combo notes: a major pentatonic from COMBO_BASE_HZ, one step per combo level. */
export const COMBO_BASE_HZ = 523.25;
export const COMBO_SCALE_SEMITONES = [0, 2, 4, 7, 9] as const;
/** The combo notes stop rising after this level. */
export const COMBO_PITCH_MAX = 12;

/** Danger tick pitch: higher as the countdown runs out (3, 2, 1). */
export const DANGER_TICK_HZ = [1320, 1100, 940] as const;

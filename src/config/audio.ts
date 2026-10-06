/**
 * Audio tunables (GAME_DESIGN §12, TECH_SPEC §2): procedural Web Audio sound effects, no files.
 * Volumes are linear gains before the master limiter.
 */

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
  | 'click'
  | 'purchase';

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

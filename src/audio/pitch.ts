/** Pitches of the procedural sounds (GAME_DESIGN §12). Pure, so they are unit-tested in Node. */
import {
  COMBO_BASE_HZ,
  COMBO_PITCH_MAX,
  COMBO_SCALE_SEMITONES,
  DANGER_TICK_HZ,
  MERGE_PITCH_TOP_HZ,
  MERGE_SEMITONES_PER_TIER,
} from '../config/audio';

/** A frequency shifted by a number of semitones. */
export function semitones(hz: number, steps: number): number {
  return hz * 2 ** (steps / 12);
}

/** The merge pop for a merge into `newTier`: lower for bigger cats. */
export function mergePitch(newTier: number): number {
  return semitones(MERGE_PITCH_TOP_HZ, -MERGE_SEMITONES_PER_TIER * Math.max(0, newTier - 2));
}

/** The note for combo level `combo` (2 is the first combo): a rising pentatonic, capped. */
export function comboPitch(combo: number): number {
  const step = Math.max(0, Math.min(combo, COMBO_PITCH_MAX) - 2);
  const scale = COMBO_SCALE_SEMITONES;
  const octave = Math.floor(step / scale.length);
  const degree = scale[step % scale.length] ?? 0;
  return semitones(COMBO_BASE_HZ, octave * 12 + degree);
}

/** The danger tick for `secondsLeft` on the countdown: higher as it runs out. */
export function dangerTickPitch(secondsLeft: number): number {
  const index = Math.max(0, Math.min(DANGER_TICK_HZ.length - 1, secondsLeft - 1));
  return DANGER_TICK_HZ[index] ?? DANGER_TICK_HZ[0];
}

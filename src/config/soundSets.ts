/**
 * The sound sets (GAME_DESIGN §12): `soft` (v0.46, the default) is sine tones with gentle attacks,
 * a lower register and no reverb; `classic` is the bright synth set of v0.9–v0.45, kept
 * to compare (`?sfx=classic` and the debug sound board). Apart from config/audio.ts so core can
 * parse `?sfx=` (the layer rule keeps core away from any "audio" path).
 */
export const SOUND_SETS = ['soft', 'classic'] as const;
export type SoundSetId = (typeof SOUND_SETS)[number];
export const DEFAULT_SOUND_SET: SoundSetId = 'soft';

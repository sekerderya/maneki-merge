/**
 * The soft sound set (GAME_DESIGN §12, v0.46, the default): the owner found the classic set too
 * "ringing, like an Atari game". These are sine tones only (no square, saw or bright triangle
 * harmonics), with gentle attacks, a lower register, near-harmonic bell partials instead of
 * clanging ones, and noise kept below the hiss range. No reverb: v0.46.0 had a short room reverb
 * under every sound, and the owner heard "a cave" (v0.46.1 removed it).
 */
import { SOFT_MERGE_PITCH_SCALE } from '../config/audio';
import type { SoundName } from '../config/audio';
import { comboPitch, dangerTickPitch, mergePitch, semitones } from './pitch';
import { noise, tone } from './sfx';
import type { Recipe, Voice } from './sfx';

/** A plucked note, like a kalimba: a sine with a faint octave that fades first. */
function pluck(v: Voice, hz: number, delay = 0, gain = 1, decay = 0.4): void {
  tone(v, { from: hz, delay, attack: 0.006, decay, gain });
  tone(v, { from: hz * 2, delay, attack: 0.004, decay: decay * 0.3, gain: 0.16 * gain });
}

/** A music-box ting: a pure high note with a whisper of its twelfth. */
function ting(v: Voice, hz: number, delay = 0, gain = 1, decay = 0.32): void {
  tone(v, { from: hz, delay, attack: 0.003, decay, gain });
  tone(v, { from: hz * 3, delay, attack: 0.002, decay: 0.06, gain: 0.06 * gain });
}

/** A water-drop bubble: a sine that rises quickly as it fades. */
function bubble(v: Voice, hz: number, delay = 0, gain = 1, decay = 0.11): void {
  tone(v, { from: hz, to: hz * 1.6, glide: 0.05, delay, attack: 0.005, decay, gain });
}

/** A small glass wind bell (fūrin): a long sine with soft harmonic partials. */
function softBell(v: Voice, hz: number, delay = 0, gain = 1): void {
  tone(v, { from: hz, delay, attack: 0.005, decay: 1.1, gain });
  tone(v, { from: hz * 2, delay, attack: 0.004, decay: 0.45, gain: 0.16 * gain });
  tone(v, { from: hz * 3, delay, attack: 0.003, decay: 0.18, gain: 0.05 * gain });
}

/** A soft wooden knock (a mallet on a hollow block). */
function knock(v: Voice, hz: number, delay = 0, gain = 1): void {
  tone(v, { from: hz * 1.15, to: hz, glide: 0.03, delay, attack: 0.003, decay: 0.07, gain });
  noise(v, {
    filter: 'bandpass',
    from: hz * 2,
    q: 2,
    delay,
    attack: 0.002,
    decay: 0.02,
    gain: 0.25 * gain,
  });
}

/** C major, for the fanfares. */
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;
const A6 = 1760;
const C7 = 2093;

export const SOFT_RECIPES: Readonly<Record<SoundName, Recipe>> = {
  // A soft "pup" as the cat leaves the paw.
  drop(v) {
    tone(v, { from: 360, to: 220, glide: 0.08, attack: 0.006, decay: 0.12 });
    noise(v, { filter: 'lowpass', from: 600, attack: 0.004, decay: 0.04, gain: 0.15 });
  },
  // A bubble pop, lower for bigger cats (value: the new cat's size): just the bubble and a soft
  // body under it (v0.46.2 dropped the little noise click on top, the owner's call).
  merge(v, size) {
    const hz = mergePitch(size) * SOFT_MERGE_PITCH_SCALE;
    bubble(v, hz);
    tone(v, { from: hz * 0.5, attack: 0.004, decay: 0.09, gain: 0.3 });
  },
  // Two little music-box notes.
  coin(v) {
    ting(v, E6, 0, 0.7, 0.18);
    ting(v, A6, 0.055, 1, 0.28);
  },
  // Rising kalimba notes (value: the combo level).
  combo(v, combo) {
    pluck(v, comboPitch(combo), 0, 1, 0.3);
  },
  // A music-box arpeggio with a held top note and a sprinkle of tings.
  jackpot(v) {
    [C5, E5, G5, C6].forEach((hz, i) => {
      pluck(v, hz, i * 0.09, 1, i === 3 ? 0.9 : 0.25);
    });
    [G6, C7, E6, G6].forEach((hz, i) => ting(v, hz, 0.38 + i * 0.09, 0.35));
  },
  // The shrine grows: a soft, airy swell.
  whoosh(v) {
    noise(v, {
      filter: 'lowpass',
      from: 300,
      to: 1600,
      q: 1,
      attack: 0.45,
      decay: 0.5,
      gain: 0.8,
    });
    tone(v, { from: 220, to: 440, glide: 0.9, attack: 0.3, decay: 0.6, gain: 0.15 });
  },
  // The new stage revealed, Lucky Save: two wind-bell notes.
  chime(v) {
    softBell(v, C6, 0);
    softBell(v, E6, 0.14, 0.8);
  },
  // Danger countdown (value: seconds left): a wooden knock, higher as it runs out.
  dangerTick(v, secondsLeft) {
    knock(v, dangerTickPitch(secondsLeft) * 0.55);
  },
  // Three falling kalimba notes and a low, soft hum.
  gameOver(v) {
    [392, 329.63, 261.63].forEach((hz, i) => {
      pluck(v, hz, i * 0.24, 1, i === 2 ? 1 : 0.3);
    });
    tone(v, {
      from: 130.81,
      to: 110,
      delay: 0.48,
      glide: 0.8,
      attack: 0.03,
      decay: 0.9,
      gain: 0.35,
    });
  },
  // A tiny soft tap.
  click(v) {
    tone(v, { from: 820, to: 560, glide: 0.025, attack: 0.002, decay: 0.035, gain: 0.8 });
  },
  // Two rising kalimba notes and two tings.
  purchase(v) {
    pluck(v, E5, 0, 1, 0.15);
    pluck(v, semitones(E5, 7), 0.08, 1, 0.25);
    ting(v, E6, 0.14, 0.6);
    ting(v, A6, 0.19, 0.5);
  },
  // The magnet catches a ball: a soft rising "fwip" and a little bubble.
  take(v) {
    tone(v, { from: 300, to: 900, glide: 0.14, attack: 0.02, decay: 0.16, gain: 0.7 });
    noise(v, {
      filter: 'bandpass',
      from: 900,
      to: 2200,
      q: 1,
      attack: 0.03,
      decay: 0.1,
      gain: 0.15,
    });
    bubble(v, 880, 0.16, 0.5, 0.06);
  },
  // A boulder loses an iron band: a muffled "tonk".
  clang(v) {
    tone(v, { from: 392, attack: 0.003, decay: 0.18, gain: 0.8 });
    tone(v, { from: 392 * 2.4, attack: 0.003, decay: 0.06, gain: 0.15 });
    noise(v, { filter: 'lowpass', from: 1500, attack: 0.002, decay: 0.02, gain: 0.2 });
  },
  // A boulder crumbles: a soft crumble and a thump.
  crunch(v) {
    noise(v, { filter: 'lowpass', from: 900, to: 250, attack: 0.006, decay: 0.2, gain: 0.8 });
    tone(v, { from: 120, to: 70, glide: 0.15, attack: 0.005, decay: 0.18, gain: 0.5 });
  },
  // A hanabi goes off: a soft "pomf", then a sprinkle of sparks.
  boom(v) {
    tone(v, { from: 90, to: 50, glide: 0.3, attack: 0.01, decay: 0.4, gain: 0.9 });
    noise(v, { filter: 'lowpass', from: 900, to: 200, attack: 0.01, decay: 0.3, gain: 0.6 });
    [C7, 2637, A6, 2349.3].forEach((hz, i) => ting(v, hz, 0.15 + i * 0.075, 0.18, 0.12));
  },
  // Heavy Drop's fireball lands (GAME_DESIGN §15.9): a cushioned thump.
  thud(v) {
    tone(v, { from: 110, to: 55, glide: 0.14, attack: 0.006, decay: 0.18, gain: 0.9 });
    noise(v, { filter: 'lowpass', from: 400, to: 150, attack: 0.004, decay: 0.1, gain: 0.5 });
  },
  // A porcelain cat cracks (GAME_DESIGN §15.10): a small, clear "tik".
  tink(v) {
    tone(v, { from: A6, attack: 0.002, decay: 0.09, gain: 0.5 });
    tone(v, { from: A6 * 1.5, attack: 0.002, decay: 0.04, gain: 0.12 });
  },
  // A cracked cat breaks in two: a light tumble of falling notes.
  shatter(v) {
    noise(v, { filter: 'bandpass', from: 2200, q: 0.9, attack: 0.003, decay: 0.14, gain: 0.35 });
    [C7, A6, G6, E6].forEach((hz, i) => {
      tone(v, { from: hz, delay: i * 0.04, attack: 0.002, decay: 0.1, gain: 0.3 });
    });
  },
  // An echo cat appears (GAME_DESIGN §15.11): a soft bell and its fainter echo.
  echo(v) {
    softBell(v, G5, 0, 0.6);
    softBell(v, G5, 0.2, 0.28);
  },
  // A curse begins (GAME_DESIGN §15.12): a low, dull bell with a slow wobble.
  curse(v) {
    tone(v, { from: 196, attack: 0.01, decay: 0.8, gain: 0.7 });
    tone(v, { from: 199, attack: 0.01, decay: 0.7, gain: 0.45 });
    tone(v, { from: 392, attack: 0.008, decay: 0.3, gain: 0.12 });
    noise(v, { filter: 'lowpass', from: 400, attack: 0.002, decay: 0.04, gain: 0.2 });
  },
  // A cursed cat turns to stone: a low, soft rumble over a sinking hum.
  grind(v) {
    noise(v, { filter: 'lowpass', from: 450, to: 140, attack: 0.05, decay: 0.34, gain: 0.8 });
    tone(v, { from: 70, to: 50, glide: 0.35, attack: 0.03, decay: 0.36, gain: 0.5 });
  },
  // A die fizzles a merge (GAME_DESIGN §15.14): two soft wooden clacks.
  clack(v) {
    for (const delay of [0, 0.08]) knock(v, 420, delay, 0.8);
  },
  // A lightning ball strikes (GAME_DESIGN §15.15): a soft zap, a crack and thunder rolling away.
  thunder(v) {
    tone(v, { from: 1400, to: 300, glide: 0.12, attack: 0.005, decay: 0.14, gain: 0.3 });
    noise(v, { filter: 'bandpass', from: 1800, q: 0.7, attack: 0.002, decay: 0.06, gain: 0.5 });
    noise(v, {
      filter: 'bandpass',
      from: 1500,
      q: 0.7,
      delay: 0.04,
      attack: 0.002,
      decay: 0.06,
      gain: 0.35,
    });
    noise(v, {
      filter: 'lowpass',
      from: 400,
      to: 100,
      delay: 0.05,
      attack: 0.08,
      decay: 0.9,
      gain: 0.9,
    });
    tone(v, { from: 65, to: 40, glide: 0.8, delay: 0.04, attack: 0.04, decay: 0.8, gain: 0.55 });
  },
};

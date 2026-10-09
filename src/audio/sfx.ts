/**
 * The procedural sound recipes (GAME_DESIGN §12): oscillators and filtered noise with short
 * envelopes, built on demand and disconnected when they end. Each recipe plays into `out`, a gain
 * already set to the sound's volume, starting at `t` (AudioContext time).
 */
import type { SoundName } from '../config/audio';
import { comboPitch, dangerTickPitch, mergePitch, semitones } from './pitch';

export interface Voice {
  readonly ctx: AudioContext;
  readonly out: AudioNode;
  readonly t: number;
  /** One second of white noise, shared by every voice. */
  readonly noise: AudioBuffer;
}

interface ToneOptions {
  readonly type?: OscillatorType;
  readonly from: number;
  /** Pitch at the end of `glide` seconds (default: no glide). */
  readonly to?: number;
  readonly glide?: number;
  readonly delay?: number;
  readonly attack?: number;
  readonly decay: number;
  readonly gain?: number;
}

/** One oscillator with an attack and an exponential decay. */
function tone(v: Voice, o: ToneOptions): void {
  const { ctx } = v;
  const start = v.t + (o.delay ?? 0);
  const attack = o.attack ?? 0.004;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from, start);
  if (o.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(o.to, start + (o.glide ?? o.decay));
  }
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(o.gain ?? 1, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, start + attack + o.decay);
  osc.connect(env).connect(v.out);
  osc.start(start);
  osc.stop(start + attack + o.decay + 0.02);
  osc.onended = () => env.disconnect();
}

interface NoiseOptions {
  readonly filter: BiquadFilterType;
  readonly from: number;
  readonly to?: number;
  readonly q?: number;
  readonly delay?: number;
  readonly attack: number;
  readonly decay: number;
  readonly gain?: number;
}

/** Filtered white noise with a swell and a decay (whoosh, plop body). */
function noise(v: Voice, o: NoiseOptions): void {
  const { ctx } = v;
  const start = v.t + (o.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = v.noise;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = o.filter;
  filter.Q.value = o.q ?? 1;
  filter.frequency.setValueAtTime(o.from, start);
  if (o.to !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(o.to, start + o.attack + o.decay);
  }
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(o.gain ?? 1, start + o.attack);
  env.gain.exponentialRampToValueAtTime(0.0001, start + o.attack + o.decay);
  src.connect(filter).connect(env).connect(v.out);
  src.start(start, Math.random() * 0.5);
  src.stop(start + o.attack + o.decay + 0.02);
  src.onended = () => env.disconnect();
}

/** A bright two-note coin ching. */
function ching(v: Voice, delay = 0, gain = 1): void {
  tone(v, { type: 'triangle', from: 1976, delay, decay: 0.12, gain: 0.7 * gain });
  tone(v, { type: 'triangle', from: 2637, delay: delay + 0.05, decay: 0.22, gain });
}

/** A struck bell: a fundamental with inharmonic partials. */
function bell(v: Voice, hz: number, delay: number, gain = 1): void {
  tone(v, { from: hz, delay, decay: 0.9, gain });
  tone(v, { from: hz * 2.76, delay, decay: 0.45, gain: 0.35 * gain });
  tone(v, { from: hz * 5.4, delay, decay: 0.2, gain: 0.15 * gain });
}

export type Recipe = (v: Voice, value: number) => void;

export const RECIPES: Readonly<Record<SoundName, Recipe>> = {
  // A soft plop as the cat leaves the dropper.
  drop(v) {
    tone(v, { from: 540, to: 170, glide: 0.09, decay: 0.12 });
    noise(v, { filter: 'lowpass', from: 900, attack: 0.002, decay: 0.05, gain: 0.25 });
  },
  // A bubbly pop, lower for bigger cats (value: the new cat's size).
  merge(v, size) {
    const hz = mergePitch(size);
    tone(v, { from: hz * 1.7, to: hz, glide: 0.05, decay: 0.16 });
    tone(v, { type: 'triangle', from: hz * 2, to: hz * 1.5, glide: 0.08, decay: 0.08, gain: 0.3 });
    noise(v, { filter: 'bandpass', from: 2400, q: 0.8, attack: 0.001, decay: 0.03, gain: 0.35 });
  },
  coin(v) {
    ching(v);
  },
  // Rising notes (value: the combo level).
  combo(v, combo) {
    const hz = comboPitch(combo);
    tone(v, { type: 'triangle', from: hz, decay: 0.18 });
    tone(v, { from: hz * 2, delay: 0.01, decay: 0.12, gain: 0.3 });
  },
  // A short major arpeggio with a held top note and a shower of chings.
  jackpot(v) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((hz, i) => {
      const last = i === notes.length - 1;
      tone(v, { type: 'square', from: hz, delay: i * 0.085, decay: last ? 0.6 : 0.12, gain: 0.4 });
      tone(v, { type: 'triangle', from: hz, delay: i * 0.085, decay: last ? 0.8 : 0.15 });
    });
    for (let i = 0; i < 4; i++) ching(v, 0.36 + i * 0.09, 0.6);
  },
  // The shrine grows: a rising filtered-noise swell.
  whoosh(v) {
    noise(v, { filter: 'bandpass', from: 260, to: 2600, q: 1.4, attack: 0.45, decay: 0.5 });
    tone(v, { from: 110, to: 220, glide: 0.9, attack: 0.3, decay: 0.6, gain: 0.25 });
  },
  // New cats unlocked, Lucky Save: two bell notes.
  chime(v) {
    bell(v, 1046.5, 0);
    bell(v, 1318.5, 0.14, 0.8);
  },
  // Danger countdown (value: seconds left).
  dangerTick(v, secondsLeft) {
    tone(v, { type: 'square', from: dangerTickPitch(secondsLeft), decay: 0.05, gain: 0.6 });
  },
  // Three falling notes and a low thud.
  gameOver(v) {
    const notes = [392, 329.63, 261.63];
    notes.forEach((hz, i) => {
      tone(v, { type: 'triangle', from: hz, delay: i * 0.22, decay: i === 2 ? 0.8 : 0.26 });
    });
    tone(v, { from: 130.81, to: 65.4, delay: 0.44, glide: 0.6, decay: 0.8, gain: 0.5 });
  },
  click(v) {
    tone(v, { from: 1500, to: 900, glide: 0.03, decay: 0.04 });
  },
  // The magnet catches a ball: a quick rising zip and a click.
  take(v) {
    tone(v, { type: 'triangle', from: 330, to: 1320, glide: 0.16, decay: 0.2, gain: 0.8 });
    noise(v, {
      filter: 'bandpass',
      from: 1800,
      to: 4200,
      q: 2,
      attack: 0.02,
      decay: 0.12,
      gain: 0.3,
    });
    tone(v, { from: 1760, delay: 0.17, decay: 0.05, gain: 0.5 });
  },
  // A boulder loses an iron band: a short metallic ring.
  clang(v) {
    tone(v, { type: 'square', from: 820, decay: 0.08, gain: 0.35 });
    tone(v, { from: 1236, decay: 0.3, gain: 0.5 });
    tone(v, { from: 1907, decay: 0.22, gain: 0.3 });
  },
  // A boulder crumbles: low filtered noise and a dull thud.
  crunch(v) {
    noise(v, { filter: 'lowpass', from: 1400, to: 300, attack: 0.004, decay: 0.22, gain: 0.9 });
    tone(v, { from: 140, to: 70, glide: 0.18, decay: 0.2, gain: 0.6 });
  },
  // A hanabi goes off: a low boom, then a crackle of sparks.
  boom(v) {
    tone(v, { from: 110, to: 45, glide: 0.35, decay: 0.45, gain: 0.9 });
    noise(v, { filter: 'lowpass', from: 2400, to: 400, attack: 0.003, decay: 0.3, gain: 0.8 });
    noise(v, {
      filter: 'bandpass',
      from: 3200,
      to: 5200,
      q: 3,
      delay: 0.12,
      attack: 0.02,
      decay: 0.35,
      gain: 0.35,
    });
  },
  // Two rising notes and a ching.
  purchase(v) {
    const hz = 659.25;
    tone(v, { type: 'triangle', from: hz, decay: 0.1 });
    tone(v, { type: 'triangle', from: semitones(hz, 7), delay: 0.08, decay: 0.2 });
    ching(v, 0.12, 0.8);
  },
};

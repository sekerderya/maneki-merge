/**
 * Audio layer (GAME_DESIGN §12, TECH_SPEC §10): procedural Web Audio SFX through one mixer.
 *
 * - The AudioContext is created on the first user gesture and resumed on every later one until it
 *   runs (iOS starts it suspended and suspends it again after an interruption such as a call).
 * - Every sound goes through a per-sound gain, a master gain and a limiter, and is throttled per
 *   sound and globally (`VoiceThrottle`), so a burst of merges never clips.
 * - Sound off suspends the context; backgrounding suspends it and coming back resumes it.
 * - Two recipe sets (config SOUND_SETS): the soft set (default) also sends each voice into a short
 *   generated reverb; `?sfx=classic` and the debug sound board bring back the classic set.
 */
import {
  DEFAULT_SOUND_SET,
  LIMITER,
  MASTER_VOLUME,
  REVERB,
  SET_GAIN,
  SOUNDS,
} from '../config/audio';
import type { SoundName, SoundSetId } from '../config/audio';
import { CLASSIC_RECIPES } from './sfx';
import type { Recipe } from './sfx';
import { SOFT_RECIPES } from './softSfx';
import { VoiceThrottle } from './throttle';

export type { SoundName, SoundSetId } from '../config/audio';

const RECIPE_SETS: Readonly<Record<SoundSetId, Readonly<Record<SoundName, Recipe>>>> = {
  soft: SOFT_RECIPES,
  classic: CLASSIC_RECIPES,
};

export interface Sfx {
  /** Plays a sound now; `value` is the tier, combo level or seconds left where it matters. */
  play(name: SoundName, value?: number): void;
}

const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const;

export class AudioEngine implements Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private meter: AnalyserNode | null = null;
  private meterData: Float32Array<ArrayBuffer> | null = null;
  /** The shared reverb, built the first time a set with a reverb send plays. */
  private reverb: ConvolverNode | null = null;
  private enabled = true;
  private hidden = false;
  private readonly throttle = new VoiceThrottle();

  constructor(
    private readonly create: () => AudioContext | null = defaultContext,
    private soundSet: SoundSetId = DEFAULT_SOUND_SET,
  ) {}

  /** The recipe set the game plays (`?sfx=`, the debug sound board). */
  get set(): SoundSetId {
    return this.soundSet;
  }

  setSoundSet(set: SoundSetId): void {
    this.soundSet = set;
  }

  /** Unlocks audio on user gestures (call once at boot). */
  listen(target: Window = window): void {
    const unlock = (): void => this.unlock();
    for (const type of GESTURES) target.addEventListener(type, unlock, { capture: true });
  }

  /**
   * The sound setting. Turning it on from a tap also unlocks audio. Re-applying the same setting
   * (boot, any profile change) doesn't, even when the browser still counts a recent gesture.
   */
  setEnabled(on: boolean): void {
    const turningOn = on && !this.enabled;
    this.enabled = on;
    // Only inside a tap (the sound toggle): a context made without one starts blocked and warns.
    if (on && (this.ctx || (turningOn && userActive()))) this.unlock();
    else void this.ctx?.suspend().catch(() => undefined);
  }

  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Creates or resumes the context; must run inside a user gesture on iOS. */
  unlock(): void {
    if (!this.enabled || this.hidden) return;
    if (!this.ctx) this.build();
    const ctx = this.ctx;
    if (!ctx || ctx.state === 'running') return;
    void ctx.resume().catch(() => undefined);
    // iOS only starts output once something plays inside the gesture.
    const silent = ctx.createBufferSource();
    silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    silent.connect(ctx.destination);
    silent.start();
  }

  /** The app went to the background. */
  suspend(): void {
    this.hidden = true;
    void this.ctx?.suspend().catch(() => undefined);
  }

  /** The app is visible again; iOS may still need a tap, which `listen` catches. */
  resume(): void {
    this.hidden = false;
    if (this.enabled && this.ctx) void this.ctx.resume().catch(() => undefined);
  }

  play(name: SoundName, value = 0): void {
    if (!this.enabled || this.ctx?.state !== 'running') return;
    this.schedule(name, value);
  }

  /**
   * Debug only (the sound board): plays a sound from either set now, past the throttle, through
   * the same mixer, so the two sets can be compared.
   */
  preview(set: SoundSetId, name: SoundName, value = 0): void {
    if (!this.enabled || this.ctx?.state !== 'running') return;
    this.schedule(name, value, set, false);
  }

  /**
   * Debug only (`window.__game.renderPeak()`, M9 acceptance): renders sounds that all start at
   * once through the same throttle, mixer and limiter into an OfflineAudioContext, and returns
   * the output's peak (≥ 1 would clip). Deterministic and needs no audio device.
   */
  static async renderPeak(sounds: readonly (readonly [SoundName, number])[]): Promise<number> {
    const rate = 44100;
    const offline = new OfflineAudioContext(1, Math.ceil(rate * 1.5), rate);
    const engine = new AudioEngine(() => offline as unknown as AudioContext);
    engine.build();
    for (const [name, value] of sounds) engine.schedule(name, value);
    const buffer = await offline.startRendering();
    let peak = 0;
    for (const sample of buffer.getChannelData(0)) peak = Math.max(peak, Math.abs(sample));
    return peak;
  }

  private schedule(name: SoundName, value: number, set = this.soundSet, throttled = true): void {
    const ctx = this.ctx;
    const master = this.master;
    const noise = this.noise;
    if (!ctx || !master || !noise) return;
    if (throttled && !this.throttle.allow(name, ctx.currentTime * 1000)) return;
    const out = ctx.createGain();
    out.gain.value = SOUNDS[name].volume * (SET_GAIN[set][name] ?? 1);
    out.connect(master);
    const nodes: AudioNode[] = [out];
    try {
      const send = REVERB.send[set];
      if (send > 0) {
        const wet = ctx.createGain();
        wet.gain.value = send;
        out.connect(wet).connect(this.reverbIn(ctx, master));
        nodes.push(wet);
      }
      RECIPE_SETS[set][name]({ ctx, out, t: ctx.currentTime + 0.005, noise }, value);
    } catch {
      // A broken audio stack never breaks the game.
    }
    window.setTimeout(() => {
      for (const node of nodes) node.disconnect();
    }, SOUNDS[name].durationMs + 500);
  }

  /** The reverb's input: a convolver on a generated impulse, into the master. */
  private reverbIn(ctx: AudioContext, master: GainNode): ConvolverNode {
    if (this.reverb) return this.reverb;
    const reverb = ctx.createConvolver();
    reverb.buffer = reverbImpulse(ctx);
    reverb.connect(master);
    this.reverb = reverb;
    return reverb;
  }

  /**
   * Debug only (`window.__game.audio()`): the context's state and the output's peak over the
   * last ~46 ms. The meter taps the limiter output on first use.
   */
  debugMeter(): { state: string; peak: number } {
    const ctx = this.ctx;
    if (!ctx || !this.limiter) return { state: ctx?.state ?? 'none', peak: 0 };
    if (!this.meter) {
      this.meter = ctx.createAnalyser();
      this.meter.fftSize = 2048;
      this.meterData = new Float32Array(this.meter.fftSize);
      this.limiter.connect(this.meter);
    }
    const data = this.meterData as Float32Array<ArrayBuffer>;
    this.meter.getFloatTimeDomainData(data);
    let peak = 0;
    for (const sample of data) peak = Math.max(peak, Math.abs(sample));
    return { state: ctx.state, peak };
  }

  private build(): void {
    const ctx = this.create();
    if (!ctx) return;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = LIMITER.thresholdDb;
    limiter.knee.value = LIMITER.kneeDb;
    limiter.ratio.value = LIMITER.ratio;
    limiter.attack.value = LIMITER.attackS;
    limiter.release.value = LIMITER.releaseS;
    limiter.connect(ctx.destination);
    const master = ctx.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(limiter);

    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.ctx = ctx;
    this.reverb = null;
    this.limiter = limiter;
    this.master = master;
    this.noise = noise;
    this.throttle.reset();
  }
}

/**
 * The room reverb's impulse (config REVERB): stereo noise falling as (1 - t)^decayPower, through a
 * one-pole low-pass, normalised so the reverb is no louder than the sound sent into it.
 */
function reverbImpulse(ctx: BaseAudioContext): AudioBuffer {
  const length = Math.max(1, Math.round(ctx.sampleRate * REVERB.seconds));
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  const smooth = 1 - Math.exp((-2 * Math.PI * REVERB.lowpassHz) / ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let y = 0;
    let energy = 0;
    for (let i = 0; i < length; i++) {
      y += smooth * (Math.random() * 2 - 1 - y);
      data[i] = y * (1 - i / length) ** REVERB.decayPower;
      energy += (data[i] ?? 0) ** 2;
    }
    const scale = 1 / Math.sqrt(energy || 1);
    for (let i = 0; i < length; i++) data[i] = (data[i] ?? 0) * scale;
  }
  return impulse;
}

/** Whether the page is handling a user gesture right now (unknown counts as no). */
function userActive(): boolean {
  return (
    (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation
      ?.isActive ?? false
  );
}

function defaultContext(): AudioContext | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor({ latencyHint: 'interactive' });
  } catch {
    return null;
  }
}

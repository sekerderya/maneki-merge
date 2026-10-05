/**
 * Voice throttling for the mixer (pure, clock passed in): per-sound minimum interval and voice
 * count, plus a global voice cap, so a burst of merges never stacks into clipping.
 */
import { MAX_VOICES, SOUNDS } from '../config/audio';
import type { SoundName, SoundSpec } from '../config/audio';

export class VoiceThrottle {
  /** End times of the voices still playing, per sound. */
  private readonly playing = new Map<SoundName, number[]>();
  private readonly lastStart = new Map<SoundName, number>();

  constructor(
    private readonly specs: Readonly<Record<SoundName, SoundSpec>> = SOUNDS,
    private readonly maxVoices = MAX_VOICES,
  ) {}

  /** Whether `name` may start at `nowMs`; if so, the voice is counted until it ends. */
  allow(name: SoundName, nowMs: number): boolean {
    const spec = this.specs[name];
    const last = this.lastStart.get(name);
    if (last !== undefined && nowMs - last < spec.minIntervalMs) return false;
    let total = 0;
    for (const [, ends] of this.playing) total += prune(ends, nowMs);
    const ends = this.playing.get(name) ?? [];
    if (ends.length >= spec.maxVoices || total >= this.maxVoices) return false;
    ends.push(nowMs + spec.durationMs);
    this.playing.set(name, ends);
    this.lastStart.set(name, nowMs);
    return true;
  }

  /** Voices still playing at `nowMs`. */
  active(nowMs: number): number {
    let total = 0;
    for (const [, ends] of this.playing) total += prune(ends, nowMs);
    return total;
  }

  reset(): void {
    this.playing.clear();
    this.lastStart.clear();
  }
}

/** Drops the voices that ended by `nowMs` (in place) and returns how many are left. */
function prune(ends: number[], nowMs: number): number {
  let kept = 0;
  for (const end of ends) if (end > nowMs) ends[kept++] = end;
  ends.length = kept;
  return kept;
}

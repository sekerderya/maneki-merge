/**
 * Background music (GAME_DESIGN §12): one looping track on the sound effects' AudioContext.
 *
 * - The file is fetched and decoded only once the context exists and the music is on, so a
 *   player with the music off never pays for the decoded buffer.
 * - The loop is sample-exact (`loopStart`/`loopEnd` on the buffer source); the file plays its
 *   intro once first.
 * - Switching off fades out and stops; switching on again carries on where the track was.
 */
import { MUSIC } from '../config/audio';

export interface MusicLoop {
  readonly loopStartS: number;
  readonly loopEndS: number;
}

/**
 * Where a track started at `startOffsetS` is after playing `elapsedS` seconds: through the intro
 * once, then round the loop.
 */
export function musicPosition(startOffsetS: number, elapsedS: number, loop: MusicLoop): number {
  const at = startOffsetS + Math.max(0, elapsedS);
  if (at < loop.loopEndS) return at;
  const length = loop.loopEndS - loop.loopStartS;
  return loop.loopStartS + ((at - loop.loopStartS) % length);
}

type Loader = (url: string) => Promise<ArrayBuffer>;

const fetchBytes: Loader = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`music: ${response.status}`);
  return response.arrayBuffer();
};

export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private out: AudioNode | null = null;
  private buffer: AudioBuffer | null = null;
  private loading = false;
  private on = false;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private startedAt = 0;
  private startOffset = 0;
  /** Where the track goes on from the next time it starts. */
  private position = 0;

  constructor(
    private readonly url: string,
    private readonly load: Loader = fetchBytes,
  ) {}

  /** The context exists: music goes to `out`. */
  attach(ctx: AudioContext, out: AudioNode): void {
    this.ctx = ctx;
    this.out = out;
    this.update();
  }

  setOn(on: boolean): void {
    if (this.on === on) return;
    this.on = on;
    this.update();
  }

  get playing(): boolean {
    return this.source !== null;
  }

  private update(): void {
    if (this.on) this.start();
    else this.stop();
  }

  private start(): void {
    const { ctx, out } = this;
    if (!ctx || !out || this.source) return;
    if (!this.buffer) {
      this.fetch(ctx);
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = this.buffer;
    source.loop = true;
    source.loopStart = MUSIC.loopStartS;
    source.loopEnd = MUSIC.loopEndS;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(MUSIC.volume, t + MUSIC.fadeInS);
    source.connect(gain);
    gain.connect(out);
    source.start(t, this.position);
    this.source = source;
    this.gain = gain;
    this.startedAt = t;
    this.startOffset = this.position;
  }

  private stop(): void {
    const { ctx, source, gain } = this;
    if (!ctx || !source || !gain) return;
    const t = ctx.currentTime;
    this.position = musicPosition(this.startOffset, t - this.startedAt, MUSIC);
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + MUSIC.fadeOutS);
    source.stop(t + MUSIC.fadeOutS);
    source.onended = () => gain.disconnect();
    this.source = null;
    this.gain = null;
  }

  private fetch(ctx: AudioContext): void {
    if (this.loading) return;
    this.loading = true;
    void this.load(this.url)
      .then((bytes) => ctx.decodeAudioData(bytes))
      .then((buffer) => {
        this.buffer = buffer;
        this.update();
      })
      .catch(() => {
        // No music (a broken file or audio stack) never breaks the game.
      })
      .finally(() => (this.loading = false));
  }
}

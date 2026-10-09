/**
 * Adaptive resolution (TECH_SPEC §6, §13): watches how long frames take while the player plays,
 * and steps the canvas down to fewer device pixels when a phone can't keep up. Pure (no Phaser,
 * no DOM), so it runs in Node.
 *
 * - Frames are judged over windows of RENDER_WATCH_MS. A window is slow when frames average more
 *   than RENDER_SLOW_FRAME_MS and they are uneven: a steady rate (a 30 fps cap from iOS Low Power
 *   Mode or a battery saver) is not stutter, and a lower resolution wouldn't lift a cap anyway.
 * - A slow window steps one level down. The next window checks that frames got at least
 *   RENDER_MIN_GAIN shorter; if not, the phone isn't held back by pixels: the step is undone and
 *   the governor stops for the session. Otherwise it keeps the level, and steps again if play is
 *   still slow.
 * - It never steps back up: a phone that needed fewer pixels once keeps them for the session.
 */
import {
  RENDER_MIN_GAIN,
  RENDER_SETTLE_MS,
  RENDER_SLOW_FRAME_MS,
  RENDER_STALL_MS,
  RENDER_STEADY_MIN_FPS,
  RENDER_STEADY_RATIO,
  RENDER_WATCH_MS,
} from '../config/view';

export interface GovernorOptions {
  readonly watchMs: number;
  readonly slowFrameMs: number;
  readonly steadyRatio: number;
  readonly steadyMaxFrameMs: number;
  readonly minGain: number;
  readonly settleMs: number;
  readonly stallMs: number;
}

export const GOVERNOR_OPTIONS: GovernorOptions = {
  watchMs: RENDER_WATCH_MS,
  slowFrameMs: RENDER_SLOW_FRAME_MS,
  steadyRatio: RENDER_STEADY_RATIO,
  steadyMaxFrameMs: 1000 / RENDER_STEADY_MIN_FPS,
  minGain: RENDER_MIN_GAIN,
  settleMs: RENDER_SETTLE_MS,
  stallMs: RENDER_STALL_MS,
};

/** How a window of frames went: the mean frame time and whether it was steady. */
export interface FrameWindow {
  readonly meanMs: number;
  readonly steady: boolean;
}

/** Sums up a window of frame times (ms). */
export function summarize(frames: readonly number[], options = GOVERNOR_OPTIONS): FrameWindow {
  if (frames.length === 0) return { meanMs: 0, steady: true };
  const sorted = [...frames].sort((a, b) => a - b);
  const at = (q: number): number =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  const meanMs = sorted.reduce((sum, ms) => sum + ms, 0) / sorted.length;
  const steady = at(0.9) <= options.steadyRatio * at(0.1) && meanMs <= options.steadyMaxFrameMs;
  return { meanMs, steady };
}

/**
 * The resolution caps, best first, that `devicePixelRatio` can use: `top` and then each of `steps`
 * below it, without repeats (a 2× phone has nothing between 2.5 and 2).
 */
export function resolutionLevels(
  devicePixelRatio: number,
  top: number,
  steps: readonly number[],
): number[] {
  const levels: number[] = [];
  for (const cap of [top, ...steps]) {
    const value = Math.min(devicePixelRatio, cap);
    const last = levels[levels.length - 1];
    if (last === undefined || value < last) levels.push(value);
  }
  return levels;
}

export class ResolutionGovernor {
  private current = 0;
  /** A step that is being checked: the level it came from and that level's mean frame time. */
  private trial: { readonly from: number; readonly beforeMs: number } | null = null;
  /** Set once a step didn't help: no more changes this session. */
  private done = false;
  private frames: number[] = [];
  private watchedMs = 0;
  private settleMs: number;

  /** `levels`: how many levels there are (0 is the full resolution). */
  constructor(
    private readonly levels: number,
    private readonly options: GovernorOptions = GOVERNOR_OPTIONS,
  ) {
    this.settleMs = options.settleMs;
  }

  /** The level to render at: 0 is the full resolution. */
  get level(): number {
    return this.current;
  }

  /** Whether the governor has stopped for the session (a step down didn't help). */
  get settled(): boolean {
    return this.done;
  }

  /** Play stopped (pause, menu, resize, hidden tab): the frames so far no longer count. */
  reset(): void {
    this.frames = [];
    this.watchedMs = 0;
    this.settleMs = this.options.settleMs;
  }

  /** A frame of play took `ms`. Returns the level to render at. */
  frame(ms: number): number {
    if (this.done || !(ms > 0) || ms > this.options.stallMs) return this.current;
    if (this.settleMs > 0) {
      this.settleMs -= ms;
      return this.current;
    }
    this.frames.push(ms);
    this.watchedMs += ms;
    if (this.watchedMs < this.options.watchMs) return this.current;
    const window = summarize(this.frames, this.options);
    this.frames = [];
    this.watchedMs = 0;
    return this.judge(window);
  }

  private judge(window: FrameWindow): number {
    const trial = this.trial;
    if (trial) {
      this.trial = null;
      const gain = (trial.beforeMs - window.meanMs) / trial.beforeMs;
      if (gain < this.options.minGain) {
        this.current = trial.from;
        this.done = true;
        return this.current;
      }
    }
    const slow = window.meanMs > this.options.slowFrameMs && !window.steady;
    if (!slow || this.current >= this.levels - 1) return this.current;
    this.trial = { from: this.current, beforeMs: window.meanMs };
    this.current++;
    this.settleMs = this.options.settleMs;
    return this.current;
  }
}

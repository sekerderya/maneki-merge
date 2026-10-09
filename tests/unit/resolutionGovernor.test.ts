import { describe, expect, it } from 'vitest';
import {
  MAX_RENDER_RESOLUTION,
  RENDER_RESOLUTION_STEPS,
  RENDER_SETTLE_MS,
  RENDER_STALL_MS,
  RENDER_WATCH_MS,
} from '../../src/config/view';
import { ResolutionGovernor, resolutionLevels, summarize } from '../../src/game/resolutionGovernor';

/** Feeds `ms` of frames of `frameMs` each; returns the level after the last one. */
function play(
  governor: ResolutionGovernor,
  frameMs: number | readonly number[],
  ms: number,
): number {
  const pattern = typeof frameMs === 'number' ? [frameMs] : frameMs;
  let level = governor.level;
  for (let t = 0, i = 0; t < ms; i++) {
    const frame = pattern[i % pattern.length] as number;
    level = governor.frame(frame);
    t += frame;
  }
  return level;
}

/** Long enough for the settle time and one whole window. */
const WINDOW = RENDER_SETTLE_MS + RENDER_WATCH_MS + 50;
/** A phone that drops frames: smooth ones mixed with doubled and tripled ones (about 33 fps). */
const STUTTER = [16.7, 33.3, 16.7, 50, 33.3];
/** The same phone once it draws fewer pixels: mostly smooth (about 50 fps). */
const STUTTER_LESS = [16.7, 16.7, 33.3, 16.7];

describe('resolution levels (TECH_SPEC §6)', () => {
  it('steps a 3× phone down from the cap', () => {
    expect(resolutionLevels(3, MAX_RENDER_RESOLUTION, RENDER_RESOLUTION_STEPS)).toEqual([
      MAX_RENDER_RESOLUTION,
      ...RENDER_RESOLUTION_STEPS,
    ]);
  });

  it('skips caps a phone is already under', () => {
    expect(resolutionLevels(2, 2.5, [2, 1.5])).toEqual([2, 1.5]);
    expect(resolutionLevels(1.75, 2.5, [2, 1.5])).toEqual([1.75, 1.5]);
  });

  it('leaves a 1× screen a single level', () => {
    expect(resolutionLevels(1, 2.5, [2, 1.5])).toEqual([1]);
  });

  it('every step is below the cap and smaller than the one before', () => {
    let previous = MAX_RENDER_RESOLUTION;
    for (const step of RENDER_RESOLUTION_STEPS) {
      expect(step).toBeLessThan(previous);
      expect(step).toBeGreaterThanOrEqual(1);
      previous = step;
    }
  });
});

describe('frame windows', () => {
  it('measures the mean frame time', () => {
    expect(summarize([10, 20, 30]).meanMs).toBe(20);
    expect(summarize([]).meanMs).toBe(0);
  });

  it('calls an even 30 fps steady and dropped frames uneven', () => {
    expect(summarize([33.2, 33.4, 33.3, 33.5, 33.1, 33.3]).steady).toBe(true);
    expect(summarize(STUTTER).steady).toBe(false);
  });

  it('calls even but very slow frames uneven: a lower resolution may help them', () => {
    expect(summarize([50, 50, 50, 50]).steady).toBe(false);
  });
});

describe('resolution governor (TECH_SPEC §13)', () => {
  it('never leaves the full resolution while play keeps up', () => {
    const governor = new ResolutionGovernor(3);
    expect(play(governor, 16.7, 60_000)).toBe(0);
    // A phone that misses a frame now and then still averages well over 45 fps.
    expect(play(governor, [16.7, 16.7, 16.7, 33.3], 60_000)).toBe(0);
    // 120 Hz.
    expect(play(governor, 8.3, 60_000)).toBe(0);
  });

  it('leaves a steady 30 fps cap alone (iOS Low Power Mode)', () => {
    const governor = new ResolutionGovernor(3);
    expect(play(governor, [33.2, 33.4, 33.3], 60_000)).toBe(0);
    expect(governor.settled).toBe(false);
  });

  it('steps down when play stutters, and keeps the step when it helps', () => {
    const governor = new ResolutionGovernor(3);
    expect(play(governor, STUTTER, WINDOW)).toBe(1);
    // Fewer pixels, smoother frames: the step stays, and play is no longer slow.
    expect(play(governor, STUTTER_LESS, 30_000)).toBe(1);
    expect(governor.settled).toBe(false);
  });

  it('steps again while play is still slow, down to the last level', () => {
    const governor = new ResolutionGovernor(3);
    expect(play(governor, STUTTER, WINDOW)).toBe(1);
    // Better, but still under 45 fps.
    expect(play(governor, [16.7, 33.3, 33.3, 16.7], WINDOW)).toBe(2);
    expect(play(governor, [16.7, 16.7, 33.3], 30_000)).toBe(2);
  });

  it('undoes a step that does not help and stops for the session', () => {
    const governor = new ResolutionGovernor(3);
    expect(play(governor, STUTTER, WINDOW)).toBe(1);
    // As slow as before: the phone isn't held back by pixels.
    expect(play(governor, STUTTER, WINDOW)).toBe(0);
    expect(governor.settled).toBe(true);
    expect(play(governor, [50, 16.7, 66.7], 60_000)).toBe(0);
  });

  it('has nothing to do with a single level', () => {
    const governor = new ResolutionGovernor(1);
    expect(play(governor, STUTTER, 60_000)).toBe(0);
  });

  it('ignores stalls and the frames right after a break', () => {
    const governor = new ResolutionGovernor(3);
    // Pauses (a hidden tab, the menu) are not load.
    expect(play(governor, RENDER_STALL_MS + 1, 60_000)).toBe(0);
    expect(governor.frame(Number.NaN)).toBe(0);
    expect(governor.frame(0)).toBe(0);
    // Slow frames that never fill a window, because play keeps stopping.
    for (let i = 0; i < 20; i++) {
      play(governor, STUTTER, RENDER_SETTLE_MS + RENDER_WATCH_MS / 2);
      governor.reset();
    }
    expect(governor.level).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { PHYSICS_STEP_MS, stepsFor } from '../../src/config/physics';
import { sizeRadius } from '../../src/config/tiers';
import { DANGER_TIMEOUT_MS, LANDING_GRACE_MS, LUCKY_SAVE_GRACE_MS } from '../../src/config/timings';
import type { BallView } from '../../src/physics/balls';
import {
  countsForDanger,
  DangerMonitor,
  isOverLine,
  luckySaveVictims,
} from '../../src/physics/danger';

const RIM = -870;
let nextId = 1;

function cat(tier: number, y: number, landedMs = 0): BallView {
  return {
    id: nextId++,
    tier,
    size: tier,
    golden: false,
    x: 0,
    y,
    angle: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    radius: sizeRadius(tier),
    targetRadius: sizeRadius(tier),
    growing: false,
    landedMs,
  };
}

/** Steps a monitor `steps` times from `startStep`; returns the last status. */
function stepMonitor(monitor: DangerMonitor, cats: BallView[], startStep: number, steps: number) {
  let status = monitor.update(cats, RIM, startStep * PHYSICS_STEP_MS);
  for (let i = 1; i < steps; i++) {
    status = monitor.update(cats, RIM, (startStep + i) * PHYSICS_STEP_MS);
  }
  return status;
}

describe('stepsFor', () => {
  it('turns durations into whole steps without floating-point surprises', () => {
    expect(stepsFor(DANGER_TIMEOUT_MS)).toBe(300);
    expect(stepsFor(LUCKY_SAVE_GRACE_MS)).toBe(240);
    expect(stepsFor(450)).toBe(54);
    expect(stepsFor(LANDING_GRACE_MS)).toBe(60);
    expect(stepsFor(1)).toBe(1);
    expect(stepsFor(0)).toBe(0);
    expect(stepsFor(-5)).toBe(0);
  });
});

describe('the danger line (GAME_DESIGN §6)', () => {
  it('puts a cat over the line when its top edge is above the rim', () => {
    const r = sizeRadius(3);
    expect(isOverLine(cat(3, RIM + r - 0.1), RIM)).toBe(true);
    expect(isOverLine(cat(3, RIM + r), RIM)).toBe(false);
  });

  it('ignores a cat until LANDING_GRACE_MS after its first contact', () => {
    const falling = cat(2, -900, -1);
    expect(countsForDanger(falling, 10_000)).toBe(false);
    const landed = cat(2, -900, 100 * PHYSICS_STEP_MS);
    expect(countsForDanger(landed, 159 * PHYSICS_STEP_MS)).toBe(false);
    expect(countsForDanger(landed, 160 * PHYSICS_STEP_MS)).toBe(true);
  });

  it('ends the run after 2.5 s over the line without a break', () => {
    const monitor = new DangerMonitor();
    const cats = [cat(1, -50), cat(4, RIM)];
    expect(monitor.active).toBe(false);
    expect(monitor.remainingMs).toBeCloseTo(DANGER_TIMEOUT_MS, 9);
    expect(stepMonitor(monitor, cats, 100, 299)).toBe('danger');
    expect(monitor.active).toBe(true);
    expect(monitor.remainingMs).toBeCloseTo(PHYSICS_STEP_MS, 9);
    expect(monitor.update(cats, RIM, 399 * PHYSICS_STEP_MS)).toBe('timeout');
  });

  it('starts over when the line clears', () => {
    const monitor = new DangerMonitor();
    const high = cat(4, RIM);
    stepMonitor(monitor, [high], 100, 200);
    expect(monitor.update([cat(4, -100)], RIM, 300 * PHYSICS_STEP_MS)).toBe('safe');
    expect(monitor.active).toBe(false);
    expect(stepMonitor(monitor, [high], 301, 299)).toBe('danger');
  });

  it('does not count a cat over the line that is still falling', () => {
    const monitor = new DangerMonitor();
    expect(stepMonitor(monitor, [cat(4, RIM, -1)], 100, 400)).toBe('safe');
  });

  it('turns the check off for the grace period after a reset', () => {
    const monitor = new DangerMonitor();
    const cats = [cat(4, RIM)];
    stepMonitor(monitor, cats, 100, 250);
    monitor.reset(LUCKY_SAVE_GRACE_MS);
    expect(monitor.active).toBe(false);
    expect(monitor.inGrace).toBe(true);
    expect(stepMonitor(monitor, cats, 350, 240)).toBe('safe');
    expect(monitor.inGrace).toBe(false);
    expect(stepMonitor(monitor, cats, 590, 299)).toBe('danger');
    expect(monitor.update(cats, RIM, 889 * PHYSICS_STEP_MS)).toBe('timeout');
  });

  it('accepts a custom timeout', () => {
    const monitor = new DangerMonitor(100);
    expect(stepMonitor(monitor, [cat(4, RIM)], 100, 12)).toBe('timeout');
  });
});

describe('Lucky Save victims (GAME_DESIGN §6)', () => {
  it('pops every landed cat over the line plus the 6 smallest others, oldest first', () => {
    const over1 = cat(5, RIM);
    const small = [3, 1, 2, 1, 4, 2, 5, 6].map((t) => cat(t, -200));
    const over2 = cat(2, RIM + 10);
    const falling = cat(1, RIM - 100, -1);
    const victims = luckySaveVictims([over1, ...small, over2, falling], RIM);
    // Smallest six of [3, 1, 2, 1, 4, 2, 5, 6]: both 1s, both 2s, the 3 and the 4.
    const expected = [over1, small[0], small[1], small[2], small[3], small[4], small[5], over2];
    expect(victims).toEqual(expected);
    expect(victims).not.toContain(falling);
  });

  it('breaks ties between equal tiers by age and handles small piles', () => {
    const cats = [cat(2, -100), cat(1, -100), cat(1, -100)];
    expect(luckySaveVictims(cats, RIM, 1)).toEqual([cats[1]]);
    expect(luckySaveVictims(cats, RIM)).toEqual(cats);
    expect(luckySaveVictims([], RIM)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { MERGE_PARTICLES, SHAKE } from '../../src/config/view';
import { comboShake, mergeParticleCount, mergeShake, Shake } from '../../src/game/shake';

describe('camera shake (GAME_DESIGN §12)', () => {
  it('shakes only for big merges, more for bigger cats', () => {
    expect(mergeShake(SHAKE.minTier - 1)).toBe(0);
    expect(mergeShake(SHAKE.minTier)).toBe(SHAKE.mergeBase);
    expect(mergeShake(15)).toBeGreaterThan(mergeShake(12));
    expect(mergeShake(15)).toBeLessThan(SHAKE.jackpot * 1.5);
  });

  it('escalates with the combo, capped', () => {
    expect(comboShake(SHAKE.comboMin - 1)).toBe(0);
    expect(comboShake(SHAKE.comboMin)).toBeGreaterThan(0);
    expect(comboShake(SHAKE.comboMin + 1)).toBeGreaterThan(comboShake(SHAKE.comboMin));
    expect(comboShake(99)).toBe(SHAKE.comboMax);
  });

  it('fades out and returns to rest', () => {
    const shake = new Shake();
    const out = { x: 0, y: 0 };
    expect(shake.offset(0, out)).toEqual({ x: 0, y: 0 });
    shake.add(100, 10, 200);
    expect(shake.current(100)).toBe(10);
    expect(shake.current(200)).toBeCloseTo(2.5, 6);
    let max = 0;
    for (let t = 100; t < 300; t += 3) {
      const o = shake.offset(t, out);
      max = Math.max(max, Math.abs(o.x), Math.abs(o.y));
    }
    expect(max).toBeGreaterThan(3);
    expect(max).toBeLessThanOrEqual(10);
    expect(shake.offset(300, out)).toEqual({ x: 0, y: 0 });
  });

  it('keeps a stronger running shake over a weaker one', () => {
    const shake = new Shake();
    shake.add(0, 10, 400);
    shake.add(50, 2, 100);
    expect(shake.current(50)).toBeGreaterThan(2);
    shake.add(60, 20, 100);
    expect(shake.current(60)).toBe(20);
    shake.add(70, 0, 100);
    shake.clear();
    expect(shake.current(70)).toBe(0);
  });

  it('bursts more particles for bigger cats, fewer with reduced motion', () => {
    expect(mergeParticleCount(3, false)).toBeLessThan(mergeParticleCount(9, false));
    expect(mergeParticleCount(15, false)).toBe(MERGE_PARTICLES.max);
    expect(mergeParticleCount(15, true)).toBeLessThan(mergeParticleCount(15, false) / 2);
    expect(mergeParticleCount(1, true)).toBeGreaterThanOrEqual(1);
  });
});

import { describe, expect, it } from 'vitest';
import { COMBO_BASE_HZ, MERGE_PITCH_TOP_HZ, SOUNDS } from '../../src/config/audio';
import type { SoundName, SoundSpec } from '../../src/config/audio';
import { comboPitch, dangerTickPitch, mergePitch, semitones } from '../../src/audio/pitch';
import { VoiceThrottle } from '../../src/audio/throttle';

describe('sound pitches (GAME_DESIGN §12)', () => {
  it('pops lower for bigger cats', () => {
    expect(mergePitch(2)).toBeCloseTo(MERGE_PITCH_TOP_HZ, 6);
    for (let size = 3; size <= 12; size++) {
      expect(mergePitch(size)).toBeLessThan(mergePitch(size - 1));
    }
    expect(mergePitch(12)).toBeGreaterThan(150);
  });

  it('raises the combo notes along a pentatonic scale, then holds', () => {
    expect(comboPitch(2)).toBeCloseTo(COMBO_BASE_HZ, 6);
    expect(comboPitch(3)).toBeCloseTo(semitones(COMBO_BASE_HZ, 2), 6);
    expect(comboPitch(7)).toBeCloseTo(semitones(COMBO_BASE_HZ, 12), 6);
    for (let combo = 3; combo <= 12; combo++) {
      expect(comboPitch(combo)).toBeGreaterThan(comboPitch(combo - 1));
    }
    expect(comboPitch(40)).toBe(comboPitch(12));
  });

  it('ticks higher as the danger countdown runs out', () => {
    expect(dangerTickPitch(2)).toBeGreaterThan(dangerTickPitch(3));
    expect(dangerTickPitch(1)).toBeGreaterThan(dangerTickPitch(2));
    expect(dangerTickPitch(9)).toBe(dangerTickPitch(3));
    expect(dangerTickPitch(0)).toBe(dangerTickPitch(1));
  });
});

describe('VoiceThrottle', () => {
  const spec = (s: Partial<SoundSpec>): SoundSpec => ({
    volume: 1,
    durationMs: 200,
    minIntervalMs: 30,
    maxVoices: 3,
    ...s,
  });
  const specs = { ...SOUNDS, merge: spec({}), coin: spec({ minIntervalMs: 0, maxVoices: 10 }) };

  it('collapses ten simultaneous merges into one voice per interval', () => {
    const throttle = new VoiceThrottle(specs, 20);
    const played = Array.from({ length: 10 }, () => throttle.allow('merge', 1000));
    expect(played.filter(Boolean)).toHaveLength(1);
    expect(throttle.allow('merge', 1029)).toBe(false);
    expect(throttle.allow('merge', 1030)).toBe(true);
  });

  it('caps the voices of one sound until they end', () => {
    const throttle = new VoiceThrottle(specs, 20);
    expect([0, 30, 60, 90].map((t) => throttle.allow('merge', t))).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(throttle.active(90)).toBe(3);
    // The first voice ends at 200.
    expect(throttle.allow('merge', 200)).toBe(true);
  });

  it('caps the voices of all sounds together', () => {
    const throttle = new VoiceThrottle(specs, 4);
    for (let i = 0; i < 3; i++) expect(throttle.allow('merge', i * 30)).toBe(true);
    expect(throttle.allow('coin', 90)).toBe(true);
    expect(throttle.allow('coin', 91)).toBe(false);
    expect(throttle.active(91)).toBe(4);
    throttle.reset();
    expect(throttle.active(91)).toBe(0);
    expect(throttle.allow('coin', 91)).toBe(true);
  });

  it('has a sane spec for every sound', () => {
    for (const name of Object.keys(SOUNDS) as SoundName[]) {
      const s = SOUNDS[name];
      expect(s.volume).toBeGreaterThan(0);
      expect(s.volume).toBeLessThanOrEqual(1);
      expect(s.maxVoices).toBeGreaterThanOrEqual(1);
      expect(s.durationMs).toBeGreaterThan(0);
    }
  });
});

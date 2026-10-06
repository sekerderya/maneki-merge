import { describe, expect, it } from 'vitest';
import { OUTLINE_DARKEN, TIER_COLORS } from '../../src/config/skin';
import { STAGE_TIER_STEP } from '../../src/config/tiers';
import { darken, hexToNumber, lighten, numberToHex } from '../../src/core/color';

describe('colour helpers', () => {
  it('converts between #rrggbb and numbers', () => {
    expect(hexToNumber('#f6c343')).toBe(0xf6c343);
    expect(hexToNumber('#FFFFFF')).toBe(0xffffff);
    expect(numberToHex(0x0000ff)).toBe('#0000ff');
    expect(() => hexToNumber('red')).toThrow(RangeError);
    expect(() => hexToNumber('#fff')).toThrow(RangeError);
  });

  it('darkens and lightens per channel', () => {
    expect(darken('#ffffff', 0.5)).toBe('#808080');
    expect(darken('#123456', 0)).toBe('#123456');
    expect(darken('#123456', 1)).toBe('#000000');
    expect(lighten('#000000', 1)).toBe('#ffffff');
    expect(lighten('#000000', 2)).toBe('#ffffff');
  });
});

describe('placeholder palette (GAME_DESIGN §13.1)', () => {
  it('has one valid, distinct colour per size, repeating every stage', () => {
    expect(TIER_COLORS).toHaveLength(STAGE_TIER_STEP);
    for (const color of TIER_COLORS) expect(() => hexToNumber(color)).not.toThrow();
    expect(new Set(TIER_COLORS).size).toBe(STAGE_TIER_STEP);
  });

  it('gives neighbouring tiers clearly different colours', () => {
    const rgb = (hex: string): number[] => {
      const n = hexToNumber(hex);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    // Size 11 is followed by size 12, which has size 1's colour.
    for (let i = 1; i <= TIER_COLORS.length; i++) {
      const a = rgb(TIER_COLORS[i - 1] as string);
      const b = rgb(TIER_COLORS[i % TIER_COLORS.length] as string);
      expect(Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!)).toBeGreaterThan(90);
    }
  });

  it('outlines are darker than their bodies', () => {
    for (const color of TIER_COLORS) {
      expect(hexToNumber(darken(color, OUTLINE_DARKEN))).not.toBe(hexToNumber(color));
    }
  });
});

import { describe, expect, it } from 'vitest';
import { formatNumber } from '../../src/core/format';

describe('formatNumber (GAME_DESIGN §9)', () => {
  it.each([
    [0, '0'],
    [7, '7'],
    [999, '999'],
    [1000, '1,000'],
    [1684, '1,684'],
    [9999, '9,999'],
    [12.9, '12'],
  ])('writes %f as %s below 10,000', (value, text) => {
    expect(formatNumber(value)).toBe(text);
  });

  it.each([
    [10_000, '10K'],
    [12_500, '12.5K'],
    [12_549, '12.5K'],
    [59_960, '59.9K'],
    [99_999, '99.9K'],
    [100_000, '100K'],
    [125_300, '125K'],
    [999_999, '999K'],
    [1_000_000, '1M'],
    [3_200_000, '3.2M'],
    [3_249_999, '3.2M'],
    [45_000_000, '45M'],
    [1_500_000_000, '1.5B'],
    [2_000_000_000_000, '2T'],
  ])('shortens %i to %s and never rounds up', (value, text) => {
    expect(formatNumber(value)).toBe(text);
  });

  it('handles negatives and non-finite values', () => {
    expect(formatNumber(-1234)).toBe('-1,234');
    expect(formatNumber(-12_500)).toBe('-12.5K');
    expect(formatNumber(Number.NaN)).toBe('0');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

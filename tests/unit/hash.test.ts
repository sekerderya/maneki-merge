import { describe, expect, it } from 'vitest';
import { StateHasher } from '../../src/core/hash';

describe('StateHasher', () => {
  it('is FNV-1a: the empty digest is the offset basis', () => {
    expect(new StateHasher().digest()).toBe('811c9dc5');
  });

  it('gives the same digest for the same numbers', () => {
    const a = new StateHasher().number(1.5).number(-3).bool(true).string('cat').digest();
    const b = new StateHasher().number(1.5).number(-3).bool(true).string('cat').digest();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it('notices the order, the last bit and the sign of zero', () => {
    const digest = (...values: number[]) => {
      const h = new StateHasher();
      for (const v of values) h.number(v);
      return h.digest();
    };
    expect(digest(1, 2)).not.toBe(digest(2, 1));
    expect(digest(0.1 + 0.2)).not.toBe(digest(0.3));
    expect(digest(0)).not.toBe(digest(-0));
    expect(new StateHasher().bool(true).digest()).not.toBe(new StateHasher().bool(false).digest());
  });

  it('starts over after reset', () => {
    const h = new StateHasher().number(42);
    const first = h.digest();
    expect(h.reset().digest()).toBe('811c9dc5');
    expect(h.number(42).digest()).toBe(first);
  });
});

import { describe, expect, it } from 'vitest';
import { parseUrlFlags } from '../../src/core/urlFlags';

describe('parseUrlFlags', () => {
  it('defaults everything off when the query is empty', () => {
    expect(parseUrlFlags('')).toEqual({ debug: false, seed: null, skin: null });
  });

  it('reads all three flags, with or without the leading ?', () => {
    const expected = { debug: true, seed: 42, skin: 'placeholder' };
    expect(parseUrlFlags('?debug=1&seed=42&skin=placeholder')).toEqual(expected);
    expect(parseUrlFlags('debug=1&seed=42&skin=placeholder')).toEqual(expected);
  });

  it.each([
    ['?debug=1', true],
    ['?debug=true', true],
    ['?debug=TRUE', true],
    ['?debug', true],
    ['?debug=0', false],
    ['?debug=false', false],
    ['?debug=yes', false],
  ])('parses %s as debug=%s', (search, debug) => {
    expect(parseUrlFlags(search).debug).toBe(debug);
  });

  it.each([
    ['?seed=0', 0],
    ['?seed=123456', 123456],
    ['?seed=4294967295', 4294967295],
    ['?seed=4294967296', null],
    ['?seed=-1', null],
    ['?seed=1.5', null],
    ['?seed=abc', null],
    ['?seed=', null],
    ['?seed=99999999999999999999', null],
  ])('parses %s as seed=%s', (search, seed) => {
    expect(parseUrlFlags(search).seed).toBe(seed);
  });

  it.each([
    ['?skin=placeholder', 'placeholder'],
    ['?skin=Placeholder', 'placeholder'],
    ['?skin=art', 'art'],
    ['?skin=neon', null],
    ['?skin=', null],
  ])('parses %s as skin=%s', (search, skin) => {
    expect(parseUrlFlags(search).skin).toBe(skin);
  });

  it('ignores unrelated parameters', () => {
    expect(parseUrlFlags('?utm_source=x&debug=1')).toEqual({ debug: true, seed: null, skin: null });
  });
});

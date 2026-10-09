import { describe, expect, it } from 'vitest';
import { MAX_RENDER_RESOLUTION } from '../../src/config/view';
import { parseUrlFlags } from '../../src/core/urlFlags';

describe('parseUrlFlags', () => {
  it('defaults everything off when the query is empty', () => {
    expect(parseUrlFlags('')).toEqual({ debug: false, seed: null, skin: null, resolution: null });
  });

  it('reads all four flags, with or without the leading ?', () => {
    const expected = { debug: true, seed: 42, skin: 'placeholder', resolution: 1.5 };
    expect(parseUrlFlags('?debug=1&seed=42&skin=placeholder&res=1.5')).toEqual(expected);
    expect(parseUrlFlags('debug=1&seed=42&skin=placeholder&res=1.5')).toEqual(expected);
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
    ['?skin=vector', 'vector'],
    ['?skin=neon', null],
    ['?skin=', null],
  ])('parses %s as skin=%s', (search, skin) => {
    expect(parseUrlFlags(search).skin).toBe(skin);
  });

  it('ignores unrelated parameters', () => {
    expect(parseUrlFlags('?utm_source=x&debug=1')).toEqual({
      debug: true,
      seed: null,
      skin: null,
      resolution: null,
    });
  });

  it.each([
    ['?res=1.5', 1.5],
    ['?res=2', 2],
    ['?res=0.5', 0.5],
    [`?res=${MAX_RENDER_RESOLUTION}`, MAX_RENDER_RESOLUTION],
    ['?res=0.4', null],
    ['?res=3', null],
    ['?res=-1', null],
    ['?res=abc', null],
    ['?res=', null],
  ])('parses %s as resolution=%s', (search, resolution) => {
    expect(parseUrlFlags(search).resolution).toBe(resolution);
  });
});

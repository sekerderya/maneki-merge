import { describe, expect, it } from 'vitest';
import { MAX_RENDER_RESOLUTION } from '../../src/config/view';
import { parseUrlFlags } from '../../src/core/urlFlags';

describe('parseUrlFlags', () => {
  it('defaults everything off when the query is empty', () => {
    expect(parseUrlFlags('')).toEqual({
      debug: false,
      seed: null,
      skin: null,
      resolution: null,
      gravity: null,
      interpolate: true,
      scenes: null,
    });
  });

  it('reads all seven flags, with or without the leading ?', () => {
    const expected = {
      debug: true,
      seed: 42,
      skin: 'placeholder',
      resolution: 1.5,
      gravity: 1.2,
      interpolate: false,
      scenes: true,
    };
    const query = 'debug=1&seed=42&skin=placeholder&res=1.5&gravity=1.2&interp=0&scenes=1';
    expect(parseUrlFlags(`?${query}`)).toEqual(expected);
    expect(parseUrlFlags(query)).toEqual(expected);
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

  it.each([
    ['?scenes=1', true],
    ['?scenes', true],
    ['?scenes=true', true],
    ['?scenes=0', false],
    ['?scenes=false', false],
    ['?scenes=maybe', null],
    ['', null],
  ])('parses %s as scenes=%s', (search, scenes) => {
    expect(parseUrlFlags(search).scenes).toBe(scenes);
  });

  it('ignores unrelated parameters', () => {
    expect(parseUrlFlags('?utm_source=x&debug=1')).toEqual({
      debug: true,
      seed: null,
      skin: null,
      resolution: null,
      gravity: null,
      interpolate: true,
      scenes: null,
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

  it.each([
    ['?gravity=1.2', 1.2],
    ['?gravity=0.5', 0.5],
    ['?gravity=2', 2],
    ['?gravity=0.4', null],
    ['?gravity=2.5', null],
    ['?gravity=-1', null],
    ['?gravity=abc', null],
    ['?gravity=', null],
  ])('parses %s as gravity=%s', (search, gravity) => {
    expect(parseUrlFlags(search).gravity).toBe(gravity);
  });

  it.each([
    ['', true],
    ['?interp=1', true],
    ['?interp', true],
    ['?interp=0', false],
    ['?interp=false', false],
    ['?interp=FALSE', false],
  ])('parses %s as interpolate=%s', (search, interpolate) => {
    expect(parseUrlFlags(search).interpolate).toBe(interpolate);
  });
});

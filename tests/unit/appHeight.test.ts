import { describe, expect, it } from 'vitest';
import { TRANSIENT_BARS_MAX_PX } from '../../src/config/platform';
import { AppHeight } from '../../src/platform/appHeight';

describe('app height (TECH_SPEC §10)', () => {
  it('keeps the full height in the installed app while the system bars are swiped in', () => {
    const height = new AppHeight(TRANSIENT_BARS_MAX_PX);
    expect(height.update(412, 915, true)).toBe(915);
    // Status bar and navigation bar shown: the viewport is 92 px shorter for a few seconds.
    expect(height.update(412, 823, true)).toBe(915);
    expect(height.update(412, 870, true)).toBe(915);
    expect(height.update(412, 915, true)).toBe(915);
  });

  it('follows a bigger drop (a split screen) and grows back with it', () => {
    const height = new AppHeight(TRANSIENT_BARS_MAX_PX);
    height.update(412, 915, true);
    expect(height.update(412, 450, true)).toBe(450);
    // The bars over the half-screen app keep its height in turn.
    expect(height.update(412, 400, true)).toBe(450);
    expect(height.update(412, 915, true)).toBe(915);
  });

  it('grows when the app starts with the bars showing', () => {
    const height = new AppHeight(TRANSIENT_BARS_MAX_PX);
    expect(height.update(412, 823, true)).toBe(823);
    expect(height.update(412, 915, true)).toBe(915);
    expect(height.update(412, 823, true)).toBe(915);
  });

  it('starts over at a new width (the phone turned)', () => {
    const height = new AppHeight(TRANSIENT_BARS_MAX_PX);
    height.update(412, 915, true);
    expect(height.update(915, 380, true)).toBe(380);
    expect(height.update(412, 823, true)).toBe(823);
  });

  it('always follows the viewport in a browser tab', () => {
    const height = new AppHeight(TRANSIENT_BARS_MAX_PX);
    expect(height.update(412, 915, false)).toBe(915);
    expect(height.update(412, 823, false)).toBe(823);
    expect(height.update(412, 915, false)).toBe(915);
  });
});

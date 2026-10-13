import { describe, expect, it } from 'vitest';
import { cutoutBandLikely } from '../../src/platform/displayCutout';

describe('camera cutout at launch (TECH_SPEC §10)', () => {
  const app = { android: true, fullscreen: true, screenHeight: 915 };

  it('sees the band when the fullscreen app is shorter than the screen', () => {
    expect(cutoutBandLikely({ ...app, viewportHeight: 873 })).toBe(true);
  });

  it('leaves an app that fills the screen alone', () => {
    expect(cutoutBandLikely({ ...app, viewportHeight: 915 })).toBe(false);
    // Rounding between screen and viewport sizes is no band.
    expect(cutoutBandLikely({ ...app, viewportHeight: 911 })).toBe(false);
  });

  it('only acts on Android in display-mode fullscreen', () => {
    expect(cutoutBandLikely({ ...app, android: false, viewportHeight: 873 })).toBe(false);
    expect(cutoutBandLikely({ ...app, fullscreen: false, viewportHeight: 873 })).toBe(false);
  });
});

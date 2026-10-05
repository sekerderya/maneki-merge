import { describe, expect, it } from 'vitest';
import { detectInstallContext } from '../../src/platform/installContext';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_MODE =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

describe('detectInstallContext', () => {
  it('shows the share hint in an iPhone browser tab', () => {
    expect(
      detectInstallContext({
        userAgent: IPHONE_SAFARI,
        platform: 'iPhone',
        maxTouchPoints: 5,
        standalone: false,
      }),
    ).toBe('ios-browser');
  });

  it('recognizes iPadOS, which reports itself as a Mac', () => {
    expect(
      detectInstallContext({
        userAgent: IPAD_DESKTOP_MODE,
        platform: 'MacIntel',
        maxTouchPoints: 5,
        standalone: false,
      }),
    ).toBe('ios-browser');
  });

  it('treats a real Mac as a regular browser', () => {
    expect(
      detectInstallContext({
        userAgent: IPAD_DESKTOP_MODE,
        platform: 'MacIntel',
        maxTouchPoints: 0,
        standalone: false,
      }),
    ).toBe('browser');
  });

  it('treats Android Chrome as a regular browser (install button)', () => {
    expect(
      detectInstallContext({
        userAgent: ANDROID_CHROME,
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
        standalone: false,
      }),
    ).toBe('browser');
  });

  it('shows no hint inside the installed app', () => {
    for (const userAgent of [IPHONE_SAFARI, ANDROID_CHROME]) {
      expect(
        detectInstallContext({ userAgent, platform: '', maxTouchPoints: 5, standalone: true }),
      ).toBe('installed');
    }
  });
});

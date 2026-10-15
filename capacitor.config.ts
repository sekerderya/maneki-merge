import type { CapacitorConfig } from '@capacitor/cli';
import { APP_NAME, BACKGROUND_COLOR } from './src/config/app.ts';

/**
 * The Android app (TECH_SPEC §16): Capacitor carries the game's `android` build
 * (`npm run build:android`) and the AdMob plugin. The web and iOS builds don't use this file.
 */
const config: CapacitorConfig = {
  appId: 'io.github.sekerderya.manekimerge',
  appName: APP_NAME,
  webDir: 'dist-android',
  // NEVER change the hostname or the scheme: they make the WebView's origin
  // (https://localhost), and every player's save lives in that origin's storage.
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
  },
  android: {
    backgroundColor: BACKGROUND_COLOR,
  },
  plugins: {
    // MainActivity hides the bars (a swipe shows them for a moment) and lets the game into the
    // camera cutout. `native`: WebView 140+ reports the real env(safe-area-inset-*) to the page's
    // CSS; older ones are padded clear of the bars and the cutout and report 0.
    SystemBars: {
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
      style: 'LIGHT',
    },
  },
};

export default config;

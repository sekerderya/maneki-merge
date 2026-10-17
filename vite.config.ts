import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  BACKGROUND_COLOR,
  PRECACHE_HASHED_URL,
  THEME_COLOR,
} from './src/config/app.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

function buildHash(): string {
  const fromCi = process.env['GITHUB_SHA'];
  if (fromCi) return fromCi.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

/** The Android app's two application IDs: Firebase's config must know both (TECH_SPEC §17). */
const ANDROID_APP_IDS = [
  'io.github.sekerderya.manekimerge',
  'io.github.sekerderya.manekimerge.dev',
];

/**
 * The play statistics' keys (TECH_SPEC §17) from the build's environment (CI: the repository
 * secrets; locally: an untracked `.env.local`). A service without its keys is left out, and a
 * build without any never asks the player.
 */
function analyticsKeys(env: Record<string, string>, nativeApp: boolean) {
  const pair = (gameKey?: string, secretKey?: string) =>
    gameKey && secretKey ? { gameKey, secretKey } : null;
  return {
    gameAnalytics: pair(env['GAMEANALYTICS_GAME_KEY'], env['GAMEANALYTICS_SECRET_KEY']),
    gameAnalyticsTest: pair(
      env['GAMEANALYTICS_TEST_GAME_KEY'],
      env['GAMEANALYTICS_TEST_SECRET_KEY'],
    ),
    firebaseWeb: nativeApp ? null : firebaseWebConfig(env['FIREBASE_WEB_CONFIG']),
    firebaseApp: nativeApp && firebaseAppConfigured(),
  };
}

/** Firebase's web config, a JSON object of strings; null when unset or unreadable. */
function firebaseWebConfig(json: string | undefined): Record<string, string> | null {
  if (!json) return null;
  try {
    const config: unknown = JSON.parse(json);
    const valid =
      typeof config === 'object' &&
      config !== null &&
      Object.values(config).every((v) => typeof v === 'string') &&
      'apiKey' in config &&
      'appId' in config &&
      'measurementId' in config;
    if (valid) return config as Record<string, string>;
  } catch {
    // Reported below.
  }
  console.warn('FIREBASE_WEB_CONFIG is not a Firebase web config (JSON); Firebase is left out.');
  return null;
}

/**
 * Whether android/app/google-services.json is there for both app IDs: the Gradle build applies
 * Firebase only then (android/app/build.gradle), so the page must agree.
 */
function firebaseAppConfigured(): boolean {
  const file = new URL('./android/app/google-services.json', import.meta.url);
  if (!existsSync(file)) return false;
  const text = readFileSync(file, 'utf8');
  return ANDROID_APP_IDS.every((id) => text.includes(`"${id}"`));
}

/** Every image the game shows, relative to public/: the loading screen loads them all. */
function preloadImages(): string[] {
  const dirs = ['assets', 'clips'];
  return dirs.flatMap((dir) =>
    readdirSync(new URL(`./public/${dir}/`, import.meta.url), { recursive: true, encoding: 'utf8' })
      .map((file) => `${dir}/${file.replaceAll('\\', '/')}`)
      .filter((file) => /\.(webp|png|jpe?g)$/.test(file))
      .sort(),
  );
}

export default defineConfig(({ mode }) => {
  // `--mode android` (npm run build:android): the game inside the Android app (TECH_SPEC §16),
  // served from the app's own files at https://localhost/, with no service worker.
  const nativeApp = mode === 'android';
  // GitHub Pages serves the app from /<repo-name>/. Override with BASE_PATH if needed.
  const base = nativeApp ? '/' : (process.env['BASE_PATH'] ?? '/maneki-merge/');
  // Every variable, not only VITE_ ones: the keys go into `__ANALYTICS_KEYS__` alone.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_HASH__: JSON.stringify(buildHash()),
      __PRELOAD_IMAGES__: JSON.stringify(preloadImages()),
      __NATIVE_APP__: JSON.stringify(nativeApp),
      __ANALYTICS_KEYS__: JSON.stringify(analyticsKeys(env, nativeApp)),
    },
    build: {
      target: 'es2022',
      outDir: nativeApp ? 'dist-android' : 'dist',
    },
    plugins: [
      VitePWA({
        // The app's files are already on the phone, and Play delivers its updates.
        disable: nativeApp,
        // Updates wait for the player: the menu shows a badge and tapping it reloads (TECH_SPEC §9).
        registerType: 'prompt',
        injectRegister: false,
        strategies: 'generateSW',
        // The glob below already precaches the icons.
        includeManifestIcons: false,
        // Icons come from `npm run icons` (tools/buildAppIcon.ts) and are committed in public/.
        manifest: {
          id: base,
          name: APP_NAME,
          short_name: APP_SHORT_NAME,
          description: APP_DESCRIPTION,
          lang: 'en',
          start_url: base,
          scope: base,
          display: 'fullscreen',
          display_override: ['fullscreen', 'standalone'],
          orientation: 'portrait',
          theme_color: THEME_COLOR,
          background_color: BACKGROUND_COLOR,
          categories: ['games'],
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // The how-it-works clips too (public/clips/, v0.38): the game is offline after one visit.
          globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2,mp4}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          // Only Vite's own output is named by its content; the art gets revisions (v0.23.1).
          dontCacheBustURLsMatching: PRECACHE_HASHED_URL,
          // Phaser alone is larger than Workbox's 2 MiB default.
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    ],
    test: {
      include: ['tests/unit/**/*.test.ts', 'tests/physics/**/*.test.ts'],
      environment: 'node',
      coverage: {
        provider: 'v8',
        include: ['src/config/**', 'src/core/**', 'src/physics/**', 'src/run/**'],
        reporter: ['text', 'html'],
        // The headless layers stay at least 90% covered (ROADMAP M3, M4).
        thresholds: {
          'src/core/**': { lines: 90 },
          'src/physics/**': { lines: 90 },
          'src/run/**': { lines: 90 },
        },
      },
    },
  };
});

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

// GitHub Pages serves the app from /<repo-name>/. Override with BASE_PATH if needed.
const base = process.env['BASE_PATH'] ?? '/maneki-merge/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__: JSON.stringify(buildHash()),
  },
  build: {
    target: 'es2022',
  },
  plugins: [
    VitePWA({
      // Updates wait for the player: the menu shows a badge and tapping it reloads (TECH_SPEC §9).
      registerType: 'prompt',
      injectRegister: false,
      strategies: 'generateSW',
      // The glob below already precaches the icons.
      includeManifestIcons: false,
      // Icons come from `npm run icons` (pwa-assets.config.ts) and are committed in public/.
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
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,woff2}'],
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
});

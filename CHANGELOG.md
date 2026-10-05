# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-10-05

### Added

- M2: installable, offline PWA shell (vite-plugin-pwa, generateSW precache, prompt-style updates).
- Web app manifest (fullscreen, portrait), placeholder lucky-cat icon set generated from one SVG (`npm run icons`), apple-touch-icon and iOS home-screen meta tags.
- Main menu skeleton: title, records, coin balance, PLAY, UPGRADES (disabled until the shop), sound toggle, version.
- Game screen skeleton with an empty play area and a temporary Back control.
- Mobile foundation: safe areas, dynamic viewport height, no zoom/selection/callout/rubber-band, 48 px touch targets, bundled Fredoka font, red/gold theme tokens.
- Rotate-device overlay for phones in landscape.
- Install hints: iOS "Share → Add to Home Screen", Android "Install app" button.
- "Update ready — tap to restart" badge, shown on the menu only; updates never reload during a run.
- Android back button (game → menu), lifecycle hooks for pause/save, URL flags `debug`, `seed`, `skin`.
- Unit tests for URL flags, back stack, update policy and install detection; E2E tests for screens, layout at three phone sizes, rotate overlay, update badge and offline reload.

## [0.1.0] - 2026-10-05

### Added

- M1: project scaffold (Vite, TypeScript strict, Phaser 4, matter-js), folder structure for all layers.
- ESLint with headless-layer import rules, Prettier, Vitest, Playwright (iPhone/WebKit and Pixel/Chromium).
- Minimal boot screen with title and version label.
- GitHub Actions CI and GitHub Pages deployment.
- Project plan: `CLAUDE.md`, game design, tech spec, roadmap and prompts.

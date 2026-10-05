# Maneki Merge

A portrait merge game with lucky cats (maneki-neko). Drop cats into a shrine jar; two identical cats merge into a bigger one and pay out coins. Pass score thresholds and the jar grows: the camera zooms out and bigger cats unlock. Coins buy permanent upgrades between runs.

**Play:** https://sekerderya.github.io/maneki-merge/

> Status: early development. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Install on your phone

The game is an offline web app (PWA), so no app store is needed. After the first visit it works without a connection.

**iPhone / iPad**

1. Open https://sekerderya.github.io/maneki-merge/ in Safari.
2. Tap the **Share** button (the square with an arrow).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Start the game from the new **Maneki** icon. It opens full screen.

**Android**

1. Open https://sekerderya.github.io/maneki-merge/ in Chrome.
2. Tap **Install app** on the game's menu, or open Chrome's ⋮ menu → **Install app** (or **Add to Home screen**).
3. Start the game from the **Maneki** icon in the app drawer.

**Updates:** when a new version is ready, the main menu shows "Update ready — tap to restart". Tap it to update. A run is never interrupted.

## Development

Requires Node.js 24 (see `.nvmrc`).

| Command                             | Purpose                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `npm install`                       | Install dependencies                                                           |
| `npm run dev`                       | Dev server (`npm run dev -- --host` to open it from a phone on the same Wi-Fi) |
| `npm run build` / `npm run preview` | Production build / serve the build                                             |
| `npm run check`                     | Typecheck + lint + unit tests with the coverage gate                           |
| `npm run test:e2e`                  | Playwright end-to-end tests (`npx playwright install chromium webkit` first)   |
| `npm run icons`                     | Regenerate the PWA icons in `public/` from `public/icon.svg`                   |

Project docs: [game design](docs/GAME_DESIGN.md) · [tech spec](docs/TECH_SPEC.md) · [roadmap](docs/ROADMAP.md).

## License

All rights reserved. Third-party packages keep their own licenses.

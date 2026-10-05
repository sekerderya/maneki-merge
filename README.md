# Maneki Merge

A portrait merge game with lucky cats (maneki-neko). Drop cats into a shrine jar; two identical cats merge into a bigger one and pay out coins. Pass score thresholds and the jar grows: the camera zooms out and bigger cats unlock. Coins buy permanent upgrades between runs.

**Play:** https://sekerderya.github.io/maneki-merge/

> Status: early development. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Install on your phone

The game is an offline-capable web app (PWA), so no app store is needed. Full installation steps arrive with milestone M2.

- **iPhone / iPad:** open the link in Safari → Share → **Add to Home Screen**.
- **Android:** open the link in Chrome → **Install app**.

## Development

Requires Node.js 24 (see `.nvmrc`).

| Command                             | Purpose                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `npm install`                       | Install dependencies                                                           |
| `npm run dev`                       | Dev server (`npm run dev -- --host` to open it from a phone on the same Wi-Fi) |
| `npm run build` / `npm run preview` | Production build / serve the build                                             |
| `npm run check`                     | Typecheck + lint + unit tests                                                  |
| `npm run test:e2e`                  | Playwright end-to-end tests (`npx playwright install chromium webkit` first)   |

Project docs: [game design](docs/GAME_DESIGN.md) · [tech spec](docs/TECH_SPEC.md) · [roadmap](docs/ROADMAP.md).

## License

All rights reserved. Third-party packages keep their own licenses.

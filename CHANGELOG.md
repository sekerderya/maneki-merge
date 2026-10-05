# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.4.0] - 2026-10-05

### Added

- M4: a deterministic, headless Suika physics core and the whole run, running in Node.
- `physics/circleCollision.ts`: exact circle contacts for matter-js (cat–cat and cat–wall), about 2.3× faster than polygon SAT and with true rolling. matter-js is pinned to 0.20.0 because the module follows its internal collision record contract.
- `physics/geometry.ts`: jar geometry per stage (rim, dropper band, drop height) and drop clamping, shared with the future game scene.
- `physics/PhysicsWorld.ts`: the matter-js world with tall jar walls per stage, gravity and speed limits scaled by stage, pause, one fixed step at a time (`FixedStepper`: at most 5 per frame), first-contact tracking, growth of merged cats and speed caps.
- `physics/balls.ts`: cats with their own ids, tier, golden flag, growth and landing time; `BallView` for rendering.
- `physics/merges.ts`: merge resolution after each step (oldest first, one merge per cat per step), Jackpots at the cap tier, midpoint spawn with the average velocity, growth from the old size.
- `physics/danger.ts`: the over-the-line timer with landing grace, and Lucky Save victim selection.
- `run/RunController.ts`: drops with cooldown and queue, payouts banked before their events, combo timer, expansion timeline (time stop, cash-out at the end of the zoom, chained one stage at a time, instant mode for tests and the simulator), locked-stage notice, Lucky Save, game over, pause, debug hooks (`spawnBall`, `setScore`, `forceGameOver`) and `stateHash()`.
- `core/hash.ts` (FNV-1a over exact float bits), `RunEconomy.comboAt()` and `setScore()`, the `dropReady` event, `stepsFor()`.
- About 100 new tests: circle contacts, world, merges, growth without launches, danger, RunController, determinism (a run recorded at random frame lengths replays tick by tick with matching hashes), the TECH_SPEC §5 stability stress test, chaos runs played by a bot, and a performance test.
- `npm run test:perf`: the 150-cat step benchmark alone, without coverage (0.79 ms per step on the dev machine; budget 2 ms).

### Changed

- Coverage gates now cover `src/physics` and `src/run` too (90% lines).
- TECH_SPEC §4–§5 and §11 record the geometry, the final physics constants with their reasons, the measurements, the merge order, the anti-launch approach, the expansion timeline and the determinism strategy.

### Decisions (where the docs were open)

- When pairs compete for a cat, the oldest cats merge first.
- A merged cat inherits the earlier landing time of its parents, so a pile over the line keeps counting.
- A Lucky Save pops landed cats only; a cat still falling from the dropper is left alone. Ties among the smallest cats go to the older cat.
- The expansion time stop also freezes the drop cooldown and the combo window. The cash-out happens when the zoom ends, and the walls, gravity and drop pool switch at that moment.
- "New cats unlocked!" lists the tiers the new cap allows (8 and 9 at stage 2).
- When a merge reaches the next threshold on the same step the danger timer would run out, the expansion wins.
- Timers count whole fixed steps, so 2.5 s is exactly 300 steps.

### Known issues

- Tall piles creep slowly: with 150 cats at stage 5, a slip of up to 0.4 of a radius can still happen after 10 s (matter-js's soft stacking). To be checked on the phones in M5.
- A random bot with Quick Growth 5 and Shrine Expansion 3 survived 4 minutes and reached stage 4 without needing a Lucky Save: a hint for the M10 balance pass.

## [0.3.0] - 2026-10-05

### Added

- M3: every game rule from GAME_DESIGN as pure, headless TypeScript.
- `src/config/`: tiers (radius, score and coin formulas), stages (jar sizes, tier caps, drop pools, thresholds), upgrades (names, prices, per-level effects), economy, timings and physics tunables.
- `core/rng.ts`: seeded sfc32 generator with serializable state.
- `core/dropQueue.ts`: per-stage drop pools, base weights, Big Catch, the two smallest opening drops, golden rolls and one or two previews.
- `core/economy.ts`: score, coin payout (multiplier, combo, golden, minimum 1), Jackpot, cash-out and Lucky Save pops, combo counter, per-run bookkeeping.
- `core/upgrades.ts`: derived stats, prices, `canBuy`, `buy`, and the "anything affordable" check for the menu dot.
- `core/progression.ts`: thresholds × Quick Growth, stage locks, next expansion (one stage at a time) and HUD progress.
- `core/save.ts`: save schema v1, defaults, migration framework, field-level repair, corrupt-save backups, `SaveStore` over a `StorageAdapter` (localStorage + memory); `platform/storage.ts` opens localStorage safely.
- `core/events.ts`: typed event bus and the game's event catalogue.
- `core/format.ts`: number formatting (1,684 · 12.5K · 3.2M); the menu uses it.
- About 280 unit tests, including every table in GAME_DESIGN (§4, §7, the §8 example, §10) and lint tests that prove the layer import rules.

### Changed

- ESLint now enforces the full layer order (config → core → physics → run), keeps matter-js inside `physics`, and blocks more browser globals (`fetch`, `location`, `indexedDB`, …) in the headless layers.
- `npm run check` and CI run the unit tests with coverage and fail below 90% line coverage on `src/core`.

### Decisions (where GAME_DESIGN was open)

- Jackpots count as merges for the combo; cash-out and Lucky Save pops don't touch the combo, but a golden cat that pops still pays ×3.
- Coin payouts and thresholds round halves up and ignore floating-point noise (50 × 1.15 = 57.5 → 58).
- After an expansion, queued cats outside the new drop pool are rolled again and keep their golden flag.
- The short number format truncates instead of rounding, so a balance never looks bigger than it is.
- Every queued cat always rolls both tier and golden, so a seed gives the same tiers at any Golden Touch level.
- A save from a newer app version is backed up and loaded with the fields this version knows. Only the newest 3 save backups are kept.

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

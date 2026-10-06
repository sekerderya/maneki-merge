# Maneki Merge: Roadmap

Each milestone is one Claude Code session (model: Opus 5.5), started with the prompt from `docs/PROMPTS.md` at the effort level listed here. Claude Code ticks the boxes and updates the status as it works.

| #   | Milestone                           | Effort             | Plan mode | Status      |
| --- | ----------------------------------- | ------------------ | --------- | ----------- |
| M0  | Owner setup                         | –                  | –         | done        |
| M1  | Repository, toolchain and CI/CD     | medium             | –         | done        |
| M2  | Mobile PWA shell                    | high               | –         | done        |
| M3  | Core rules, config and save system  | high               | –         | done        |
| M4  | Physics and merge engine (headless) | xhigh              | yes       | done        |
| M5  | Playable game scene                 | high               | –         | done        |
| M6  | Expansion system                    | xhigh              | yes       | done        |
| M7  | Economy and persistence in play     | high               | –         | done        |
| M8  | Main menu and upgrade shop          | high               | –         | done        |
| M9  | Audio, haptics and juice            | medium             | –         | done        |
| M10 | Balance simulation and tuning       | xhigh              | yes       | skipped     |
| M11 | QA, performance and hardening       | high               | –         | not started |
| M12 | Owner playtest and polish loop      | per issue          | –         | in progress |
| M13 | Final art integration               | high               | yes       | not started |
| M14 | Release v1.0                        | medium (APK: high) | –         | not started |

## Phone test checklist (owner, after every milestone)

1. Open the installed app (or the live URL). If the menu shows "Update ready", tap it.
2. Check that the version on the menu matches Claude's report.
3. Try the milestone's **Owner check** items below.
4. Quick regression: start a run, drop about 10 cats, pause and resume, go back to the menu.
5. Offline: turn on airplane mode, fully close the app, and reopen it. It must still work.
6. Write down anything odd for the feedback prompt.

---

## M0: Owner setup

- [x] Node.js 24 LTS, Git and the GitHub CLI installed; `gh` logged in as `sekerderya`
- [x] Plan docs and `CLAUDE.md` in the project folder
- [ ] An iPhone and/or Android phone ready for testing

## M1: Repository, toolchain and CI/CD

**Effort:** medium. **Goal:** a real (still empty) app, built by CI and live on GitHub Pages.

- [x] `git init` (default branch `main`), `.gitignore`, `.gitattributes` (LF), `.editorconfig`, `.nvmrc` (24)
- [x] Vite + TypeScript (strict) scaffold, with Phaser 4 and matter-js installed and the folder skeleton from TECH_SPEC §3
- [x] Tooling:
  - ESLint (flat config, including the layer-import rule) + Prettier
  - Vitest
  - Playwright (iPhone and Pixel profiles, Chromium + WebKit)
  - cross-platform npm scripts, including `check`
- [x] Build-time constants `__APP_VERSION__` and `__BUILD_HASH__`; a minimal page showing the title "Maneki Merge" and the version
- [x] `README.md` (what it is, the live URL, how to install on phones (placeholder until M2), dev commands, "All rights reserved") and `CHANGELOG.md`
- [x] Public GitHub repo `maneki-merge` created with `gh`; initial commit pushed to `main`
- [x] `ci.yml` and `deploy.yml`; Pages enabled with GitHub Actions as the source; first deploy green
- [x] One trivial unit test and one Playwright smoke test, so the pipelines actually run something

**Acceptance:** `npm run check` and the build pass locally and in CI, and the live URL shows the title and version.
**Owner check:** open https://sekerderya.github.io/maneki-merge/ on the phone.

## M2: Mobile PWA shell

**Effort:** high. **Goal:** an installable, offline, full-screen, portrait-safe shell with the two screens.

- [x] `vite-plugin-pwa` (generateSW, prompt-style updates), the manifest, a placeholder icon SVG turned into an icon set via `@vite-pwa/assets-generator`, apple-touch-icon, and iOS meta tags
- [x] Menu screen skeleton: title, coin balance (0), PLAY (centered), UPGRADES (below), sound icon, version
- [x] Game screen skeleton: an empty play area with a temporary "Back" control; switching between screens
- [x] Mobile CSS foundation (TECH_SPEC §10): safe areas, `100dvh`, no zoom/select/callout/rubber-band, 48 px targets, Fredoka via `@fontsource`, warm red/gold theme tokens
- [x] Rotate-device overlay (landscape on touch devices)
- [x] Install hints (iOS share instructions; Android install button)
- [x] "Update ready — tap to restart" badge (menu only)
- [x] Android back-button handling; `visibilitychange` hooks (stubs for pause and save)
- [x] URL flags parsed: `debug`, `seed`, `skin`
- [x] E2E: a clean console on boot (both profiles) and the offline reload test

**Acceptance:** installable in Chrome; offline relaunch works; no layout overflow at 375×667, 390×844 or 430×932.
**Owner check:** install on the iPhone (Safari → Share → Add to Home Screen) and on Android (Chrome → Install app). It opens full screen and works in airplane mode.

## M3: Core rules, config and save system

**Effort:** high. **Goal:** every game rule from GAME_DESIGN as pure, tested TypeScript.

- [x] `config/`: tiers (formulas), stages, upgrades, economy, timings, physics tunables, app
- [x] `core/rng.ts` (seeded, with serializable state)
- [x] `core/dropQueue.ts`: pools per stage, weights, Big Catch, the first-two-smallest rule, golden roll, preview count
- [x] `core/economy.ts`: score, coin payout (multiplier, combo, golden), Jackpot, cash-out
- [x] `core/upgrades.ts`: derived stats, prices, `canBuy`, `buy`
- [x] `core/progression.ts`: thresholds × factor, `maxStage`, next expansion or locked state
- [x] `core/save.ts`: schema v1, defaults, migration framework, corrupt-data handling, `StorageAdapter` (localStorage + memory)
- [x] `core/events.ts`: typed event bus
- [x] Tests that assert every table in GAME_DESIGN (§4, §7, the §8 example, §10)

**Acceptance:** at least 90% line coverage on `src/core`; ESLint blocks Phaser/DOM imports in the headless layers.
**Owner check:** nothing visible; Claude's report lists the tests.

## M4: Physics and merge engine (headless)

**Effort:** xhigh. **Plan mode:** yes. **Goal:** a robust, deterministic Suika physics core that runs in Node.

- [x] `physics/PhysicsWorld.ts`: engine, fixed-timestep accumulator, jar walls from the stage geometry, `setStage` (walls, rim, gravity scaling), pause/resume
- [x] `physics/balls.ts`: create and remove balls (tier, golden, radius, density) and query them for rendering
- [x] `physics/merges.ts`:
  - collision → queue → resolve after the step, one merge per ball per step
  - midpoint spawn, growth, velocity clamp
  - Jackpot at the cap tier
  - emits merge events
- [x] `physics/danger.ts`: landed flag + grace, over-the-line timer, game over, Lucky Save removal
- [x] `run/RunController.ts`:
  - drop(x) with cooldown and queue
  - combo timer
  - expansion trigger and timeline (instant mode for tests), cash-out
  - Lucky Save, game over, events
- [x] Headless tests (TECH_SPEC §11), including the stability stress test and determinism
- [x] The final physics constants and the reasoning behind them recorded in TECH_SPEC §5

**Acceptance:** all tests green; the stress test passes; the average physics step is under 2 ms with 150 balls in Node on the dev machine.
**Owner check:** nothing visible yet.

## M5: Playable game scene

**Effort:** high. **Goal:** the first playable version on the phone (stage 1, placeholder cats).

- [x] `GameScene` renders bodies with `PlaceholderSkin` (distinct colours, sharp upright numbers, golden variant)
- [x] Camera fit to the play band, with resize handling
- [x] Dropper: follows the finger, aim line, release or tap to drop, cooldown, next-cat pop-in
- [x] Jar and rim rendering; danger flashing + countdown
- [x] DOM HUD: pause, score, run coins, next preview, stage label + progress bar
- [x] Pause overlay, Game Over overlay, Play Again, Menu
- [x] PLAY starts a run; the scene sleeps on the menu
- [x] Basic merge feedback (pop + floating score) and first-run hints
- [x] Debug panel (`?debug=1`) and `window.__game` hooks (TECH_SPEC §11)
- [x] E2E: start a run, drop 10 cats via hooks, pause/resume, force game over, go back to the menu

**Acceptance:** smooth 60 fps on desktop and in mobile emulation; a clean console; screenshots at 390×844 and 375×667 in `docs/screenshots/`.
**Owner check:** play a few runs on each phone and note how dropping, bouncing and sizes feel.

## M6: Expansion system

**Effort:** xhigh. **Plan mode:** yes. **Goal:** the signature zoom-out.

- [x] Threshold detection with the Quick Growth factor and `maxStage`, one stage at a time
- [x] Expansion sequence (GAME_DESIGN §7.1):
  - time stop and banners
  - camera zoom and pan in sync with the wall slide and rim rise
  - cash-out pops
  - gravity scaling and dropper repositioning
- [x] Tier caps, Jackpots, per-stage drop pools
- [x] Locked stage: a one-time toast + HUD lock
- [x] HUD progress bar and stage label for each stage
- [x] Sharp visuals at stage 5 (texture sizes and line widths scale with zoom)
- [x] Debug: jump to stage N, set score
- [x] Tests: headless expansion (walls move, nothing escapes, no launches, correct cash-out amounts); E2E: threshold via hook → stage 2

**Acceptance:** smooth expansions up to stage 5 at 60 fps; resize or rotation during an expansion is safe; the locked case works.
**Owner check:** reach stage 2 in normal play, then jump through all stages with `?debug=1`.

## M7: Economy and persistence in play

**Effort:** high. **Goal:** coins and records work end to end and survive restarts.

- [x] Coin payout per merge with multipliers, combo and golden; floating "+N"; coin fly to the HUD
- [x] Combo counter and banner
- [x] Golden cats in the queue, with their visuals
- [x] Jackpot celebration and payout; cash-out payouts; Lucky Save flow
- [x] Save integration: wallet (throttled writes), records, stats, settings; load on boot
- [x] Game Over summary: coins earned this run, new-record badges
- [x] Tests: payout pipeline (unit) and coins surviving a mid-run reload (E2E)

**Acceptance:** the numbers match GAME_DESIGN; no coins are lost on quit, reload or backgrounding.
**Owner check:** earn coins, close the app mid-run, reopen it, and check that the wallet kept them.

## M8: Main menu and upgrade shop

**Effort:** high. **Goal:** the meta loop: play, earn, upgrade, play stronger.

- [x] Final menu layout (GAME_DESIGN §2.1), including best score/stage and the affordability dot
- [x] Shop panel (GAME_DESIGN §2.2): 8 cards, levels, prices, states, purchase feedback, scrolling
- [x] All 8 upgrade effects wired into runs
- [x] Debug: set any upgrade level
- [x] E2E: buy with debug coins; Fortune Teller shows 2 previews; Shrine Expansion Lv 1 allows stage 3

**Acceptance:** purchases persist; every effect is verified; the layout fits everything from 375×667 to 430×932 without overlap.
**Owner check:** buy upgrades and feel the difference in the next run.

## M9: Audio, haptics and juice

**Effort:** medium

- [x] Procedural SFX set (GAME_DESIGN §12) with a mixer, master mute and per-sound throttling
- [x] Haptics (Android) with a setting
- [x] Effects:
  - particles (pooled) and the merge pop
  - shake for big merges and combo escalation
  - Jackpot fanfare and expansion polish
  - danger tick
- [x] Menu micro-animations (button press, idle bob)
- [x] Settings respected; `prefers-reduced-motion`; iOS audio unlock and resume

**Acceptance:** 10 or more simultaneous merges stay smooth with no audio clipping.
**Owner check:** sound on the iPhone (ringer on) and on Android; vibration on Android.

## M10: Balance simulation and tuning

**Status:** skipped by the owner (v0.10). The half-done simulator is kept in a local git stash (`M10 balance simulator WIP`), not in the repo; it was written for score thresholds and would need rework for stage clears.

**Effort:** xhigh. **Plan mode:** yes. **Goal:** numbers that hit GAME_DESIGN §14.

- [ ] `tools/simulate.ts` (`npm run sim`): headless runs on worker threads, with options for runs, seed, policy and upgrade levels; JSON + Markdown output
- [ ] Bot policies: random, and greedy (prefers landing on the same tier, avoids tall columns)
- [ ] Meta-progression model: consecutive runs with a simple buy order, reporting how many runs each unlock takes
- [ ] Tune only `src/config/` values (thresholds, prices, coin constants, weights, physics if needed)
- [ ] `docs/BALANCE.md` with the method, before/after tables and final numbers; GAME_DESIGN tables updated

**Acceptance:** the targets are met, or each deviation is explained. Bots aren't humans, so the owner's playtest (M12) has the final say.

## M11: QA, performance and hardening

**Effort:** high

- [ ] Profile at 150–200 cats with 4× CPU throttling; remove hot-path allocations; pool objects
- [ ] 20 runs back to back without memory growth or leaked listeners/timers
- [ ] Edge cases:
  - background/foreground in the middle of an expansion
  - rotation mid-run
  - 30 fps devices
  - WebGL context loss
  - storage full or blocked
  - first offline launch after install
  - an update arriving mid-run
- [ ] Full E2E suite on both engines; Lighthouse PWA + performance audit
- [ ] Accessibility basics: labels, contrast, reduced motion
- [ ] Fix what's found and list the known issues in the CHANGELOG

**Acceptance:** all tests green; the TECH_SPEC §13 budgets are met.

## M12: Owner playtest and polish loop

**Effort:** depends on the issue:

- low: text or number tweaks
- medium: UI and tuning
- high: bugs
- xhigh, then max: stubborn bugs

- [ ] The owner plays on real devices for a few days and collects notes
- [ ] Feedback is sent in batches with the Feedback and Bug prompts, one session per batch
- [x] Batch 1 (v0.10.0), the stage loop (GAME_DESIGN §4–§8):
  - [x] the jar lifted off the bottom of tall screens, as far as the owner's sketch
  - [x] 12 cats per stage; making the 12th (from two 11s) is the only way to the next stage
  - [x] at that moment every other cat pops into its value (half of what its merge pays)
  - [x] every stage the same: the jar grows until the 12th cat is as small as the 1st, and it becomes the next stage's 1st; scores and coins keep growing with the numbers
  - [x] cat sizes like Suika Game's: sizes 11, 9, 8, 7, 6 and 5 cover 55% of the jar
  - [x] Quick Growth removed (no more score thresholds), its coins refunded by a save migration
- [x] Batch 2 (v0.11.0), the new look from the owner's design canvas (GAME_DESIGN §13.1), following the mobile game UX research:
  - [x] eleven lucky cats drawn in code (`CatSkin`), one look per size, numbers riding upright on their plates
  - [x] a bamboo and glass jar on a wooden floor, a shrine garden behind it, a cream theme with ink outlines
  - [x] main menu: settings on the left, coins on the right, the lucky cat on its cushion, a next-goal card, a round PLAY
  - [x] settings panel: sound effects, haptics, reduce motion, how to play, version (no music row: there is no music)
  - [x] HUD, shop (with "Need N more"), pause, Game Over, banners and toasts in the new style
- [x] Batch 3 (v0.12.0), physics and balance (GAME_DESIGN §4–§10, TECH_SPEC §5):
  - [x] lighter, bouncier cats that push each other more easily (friction 0.1 / 0.3, restitution 0.25, gravity 0.9, mass ∝ r^1.4, inertia × 3)
  - [x] no stage locks: every stage is open; Shrine Expansion is gone and its coins are refunded
  - [x] Big Catch: +3 points of biggest drop per level (10% → 25%), about twice as much as before
  - [x] Fortune Teller removed (refunded); the HUD shows one next cat
  - [x] Golden Touch became Golden Merge: +3% per level that a merge pays ×3 coins (no more golden cats)
  - [x] a stage is cleared by merging two 10s: 11 cats per stage (tiers 1–51), the jar grows by 205 / 28 ≈ 7.32
  - [x] save format v3 with the refunds and the Golden Merge level

## M13: Final art integration

**Effort:** high. **Plan mode:** yes. **Goal:** the owner's lucky-cat designs replace the placeholders.

**Note (v0.11):** the cats, jar and menu art from the owner's design canvas are already in (`CatSkin`, GAME_DESIGN §13.1). This milestone now only applies if the owner delivers drawn art files; the app icon and splash screens still use the placeholder icon.

- [ ] Source files in `art-source/` (GAME_DESIGN §13.3), checked and reported on before processing
- [ ] `tools/build-art.ts` pipeline (TECH_SPEC §14)
- [ ] `ArtSkin` as the default; numbers hidden (or kept small, per the owner); golden overlay
- [ ] Art-based extras:
  - app icons and iOS splash screens
  - title/logo
  - menu illustration, jar/background and music if provided (+ music toggle)
- [ ] A screenshot of every tier at stage 1 and stage 5; a performance re-check (texture memory on iOS)

**Acceptance:** all 15 tiers look right at every zoom; hitboxes match the visuals; no fps regression.

## M14: Release v1.0

**Effort:** medium (high for the Android APK part)

- [ ] The release QA checklist below passes on both phones
- [ ] Version 1.0.0, `CHANGELOG.md`, tag `v1.0.0`, and a GitHub Release with notes
- [ ] README: screenshots/GIF, install and update instructions for iOS and Android, known limitations
- [ ] Optional: a Capacitor Android wrapper + `android.yml` that builds a signed APK on tags and attaches it to the Release (same save format, native haptics)

### Release QA checklist

- Fresh install from the README on the iPhone and on Android; offline launch works
- A full run from stage 1 to game over, with expansions, a Jackpot and a Lucky Save
- Every upgrade bought and verified; coins persist across restarts
- Sound and haptics toggles, the rotate overlay, backgrounding, and the update badge flow
- No console errors; 60 fps on the test phones

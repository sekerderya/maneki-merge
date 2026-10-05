# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.9.0] - 2026-10-06

### Added

- M9: audio, haptics and juice.
- Procedural Web Audio sound effects, no files (GAME_DESIGN §12): drop plop, merge pop (lower for bigger cats), coin ching, rising combo notes, Jackpot fanfare, expansion whoosh and chime, danger tick (rising 3, 2, 1), game over, UI click and purchase.
- Mixer: per-sound gains, a master gain and a limiter; per-sound throttling (minimum interval, voice count) and a global voice cap, so 10+ simultaneous merges never clip.
- iOS audio unlock: the AudioContext is created inside the first tap and resumed on later taps until it runs; it is suspended in the background and when sound is off.
- Haptics on Android (`navigator.vibrate`): a light tick per merge (rate-limited), stronger patterns for Jackpots, expansions and Lucky Saves; the Pause toggle is respected. Nothing on iOS.
- Juice: particles in the new cat's colour on every merge, a scale bump on the merged cat, camera shake for tier 10+ merges, Jackpots and long combos, a "Combo ×N" label that heats up at ×4 and ×7, a pulsing danger countdown, and gold sparks along the grown rim at an expansion's reveal.
- Menu micro-animations: a floating title, a ripple ring on PLAY, a nudging UPGRADES dot and a deeper button press.
- `prefers-reduced-motion`: no shake, about a third of the particles, no menu idle animations.
- Run event `dangerTick { secondsLeft }`; `merged` now carries the new cat's `id`.
- Debug: `mergeBurst(pairs, tier)` (and a "Merge ×10" button), `audio()` (context state and output peak), `renderPeak(merges)` (offline render through the real mixer).
- Tests: pitches, voice throttle, haptics, shake, feedback wiring, the danger ticks and the merged id (unit/headless), and `juice.spec.ts` (audio unlock and toggle, 12 simultaneous merges peaking below 1).

### Decisions (where the docs were open)

- "Shake for combo escalation": a light shake from ×5 that grows with the combo (capped), plus the heating label and rising notes.
- "Expansion polish": a second spark sweep along the new rim at the reveal, a whoosh at the start and a chime at the reveal, and a haptic pattern.
- The clipping acceptance is checked by rendering the sounds offline (OfflineAudioContext) through the real mixer, because a live meter in headless browsers depends on the machine's audio device and load.
- Audio E2E runs in Chromium only: Playwright's WebKit build has no reliable Web Audio (none on Windows). Real iPhones are checked by the owner.

### Known issues

- iOS plays no sound with the silent switch on (a web audio limit). iOS has no vibration API for the web.

## [0.8.0] - 2026-10-06

### Added

- M8: the meta loop. Play, earn coins, buy permanent upgrades in the shop, play stronger.
- Shop panel (GAME_DESIGN §2.2): a sheet that slides up over the menu with the balance and a close button, and one card per upgrade: an icon, the name, the effect, the "current → next" value (e.g. "Coins +45% → +60%"), level pips with "3/10", and a price button that is affordable, disabled when coins are short, or MAX. Buying pulses the card and counts the balance down. The list scrolls; the back button, the close button or a tap above the sheet closes it.
- `Profile.buy(id)`: spends wallet coins on the next level and writes the save at once.
- `core/shop.ts`: what each card shows (price state and the value of every upgrade at every level).
- Menu: the UPGRADES dot shows when any upgrade is affordable; best score and best stage are two labelled chips under the title.
- Debug: the upgrade level field follows the chosen upgrade's max level.
- Tests: purchases in the profile (written at once, refused when maxed or too expensive, retried after a refused write), the shop cards, every upgrade bought through the profile changing the next run (headless), and E2E for buying with debug coins and reloading, the back button, Fortune Teller's 2 previews, Shrine Expansion Lv 1 opening stage 3, and the menu and shop fitting 375×667, 390×844 and 430×932.

### Changed

- UPGRADES is no longer "Soon".
- GAME_DESIGN §2.1 and §2.2 and TECH_SPEC §3, §7, §8 and §11 describe the shop, the card values and the purchase write.

### Decisions (where the docs were open)

- Each card's value is one number that the upgrade changes: for Big Catch it is the share of stage 1's largest drop tier (10% → 18% over 5 levels), for Quick Growth the thresholds as a percentage of normal (100% → 70%). The table is in GAME_DESIGN §2.2.
- The upgrade effects were already wired into runs in M3–M7; M8 adds a test per upgrade that buys it and compares a run with level 0.
- Upgrades bought apply from the next run (the shop only opens from the menu, so there is never a run in progress).
- The purchase sound arrives with the rest of the audio in M9.

### Known issues

- No purchase sound yet (M9).
- The title is still text until the final art (M13).

## [0.7.0] - 2026-10-06

### Added

- M7: coins and records now work end to end and survive restarts.
- `core/profile.ts`: the save in play. Wallet, upgrades, records, stats, settings and first-run hint flags, written to `localStorage` with a throttle (the first change after a quiet second at once, then at most once per second) and flushed on backgrounding, page hide, game over and leaving a run. A refused write is retried.
- `run/profileRun.ts`: every run starts with the saved upgrades and banks each payout into the wallet before its event fires; best score, best stage, highest tier, merges, Jackpots, coins earned and runs played update while the run plays.
- Boot loads the save (repairing or backing up a damaged one) and asks the browser to keep storage persistent. The menu shows the saved coins and best score/stage; sound and haptics settings persist; the first-run hints only show until they have been seen once.
- Payout feedback: a gold "+coins" for every merge, Jackpot and popping cat, and a coin that flies from there to the HUD counter, which bumps as it lands (a shower of 8 for a Jackpot).
- "Combo ×N" from the second merge in a row, with the Combo Charm bonus as a chip ("+16%"); it pops at each step and fades when the combo window passes.
- Jackpot celebration: a gold "Jackpot!" banner with the payout, a bigger "+coins" and a spark burst. Golden merges burst gold sparks.
- Golden cats twinkle with an upright star glint (also in the dropper); golden icons in the HUD preview shimmer.
- Lucky Save: a "Lucky Save!" banner ("1 left" while saves remain); its pops pay out and fly coins like cash-out pops.
- Game Over: coins earned this run, the biggest cat made, and a badge for each record broken (best score, best stage, biggest cat ever).
- Debug: spawn golden cats, "Danger timeout" (`forceDangerTimeout`: a Lucky Save if one is left, else game over), "Reset save"; `state()` shows the combo and Lucky Saves left; debug coins and upgrade levels go into the save.
- Tests: the profile and its write throttle (unit), the payout pipeline from physics merges to storage with Lucky Paw, combo, golden, Jackpot, cash-out and Lucky Save (headless), and E2E for coins surviving a reload in the middle of a run, saving on backgrounding, persisted settings/records/stats/hints, Game Over badges, Lucky Save, combo and Jackpot banners.

### Changed

- Merges show the coins they pay instead of their score (GAME_DESIGN §12); the score is in the HUD.
- GAME_DESIGN §2.3 and §12 and TECH_SPEC §3, §7, §8 and §11 describe the payout feedback, the profile and the new hooks.

### Decisions (where the docs were open)

- Records update during the run, not only at its end, so a crash or a closed app keeps a new best score; the Game Over badges compare against the records from the run's start.
- "Runs played" counts when a run starts, because a run closed with the app never reaches an end.
- Debug coins go into the wallet but don't count as coins earned.
- The HUD coin counter shows the true run total at once; the flying coins are decoration and are skipped when 24 are already in the air.
- "Combo ×N" sits 30% of the jar's height below the rim, text only, so it doesn't hide the pile or collide with the expansion banners.
- The Game Over overlay gained a "Biggest cat" row so the highest-tier record has something to point at.

### Known issues

- Two windows of the app open at the same time each keep their own copy of the save; the last one to write wins. Rare for a home-screen app; to be looked at in M11.
- A hard kill without a page-hide event can lose at most the last second of changes (the write throttle from TECH_SPEC §8).
- UPGRADES is still "Soon": the shop and the affordability dot arrive in M8. No sound or haptics yet (M9).

## [0.6.0] - 2026-10-05

### Added

- M6: the expansion, the game's signature moment. Passing a threshold stops time, the camera pulls back, the walls slide out and the rim rises, the smallest cats pop into coins, and play resumes at the new stage with bigger cats unlocked. Works through every stage up to 5.
- `game/expansionView.ts`: camera, walls and rim come from the run's tick timeline plus the fraction of a tick the frame is into (`RunController.renderAlpha`), so the zoom stays smooth at 60/90/120 Hz and never drifts from the physics. The camera leads and the walls trail it (`EXPANSION_WALL_LAG`), so the jar visibly widens into the new frame; the floor stays still on screen.
- One cat texture set per stage, drawn at that stage's zoom during the expansion and switched in at the reveal: stage 5 stays as sharp as stage 1. Only stage 1, the previous and the current sets are kept.
- Cash-out pops: each popped cat grows and fades in place, one after another, with a gold "+coins" (`PopFx`).
- Gold sparks along the rim when the shrine grows (`SparkFx`).
- Banners: "The shrine grows!" and "New cats unlocked!" with the new tiers' icons, placed in the empty top of the grown jar; they pause with the run. A locked stage shows "Expansion locked — upgrade the Shrine in the shop" once per run, and the HUD lock pulses.
- HUD: the stage label glows at each new stage, the bar resets without sliding back, and stays full and gold at stage 5.
- Run events: `expansionRevealed { stage, newTiers }` when the zoom ends; `catPopped` carries the cat's id.
- Debug: "Jump to stage" (`setStage`) now plays every expansion in turn and opens locked stages for that run (`RunController.jumpToStage`); "Set score" keeps the locks. `state()` shows the running expansion and the lock.
- Tests: a pile carried through every expansion to stage 5 (nothing escapes, launches or moves during the time stop), cash-out amounts and event order, the time stop freezing cooldown and combo, Quick Growth thresholds, Shrine locks, caps, Jackpots and drop pools at every stage, a replay through four expansions; unit tests for the expansion frames and texture sets; E2E for the first expansion, the locked toast, a resize and a pause mid-expansion, and the debug jump.

### Changed

- The pop ring texture is 512 px, and up to 48 merge effects play at once (a cash-out can pop dozens of cats).
- TECH_SPEC §4, §6, §7 and §11 describe the final expansion visuals, textures per stage, banners and hooks.

### Decisions (where the docs were open)

- No Phaser camera effects or tweens for the expansion: they run on the wall clock and would drift from the tick timeline and ignore pauses.
- The walls trail the camera by a quarter of the zoom, so the widening is visible; `EXPANSION_WALL_LAG = 0` would lock the jar to the frame. To be judged on the phones.
- Cash-out pops go off 30 ms apart, at most 240 ms in all, so they end within the reveal.
- Banners centre 15% of the jar's height below the rim; on tall phones a fixed position covered the dropper. The locked toast sits at the top of the play area, under the HUD lock it explains.
- "New cats unlocked!" stays 2 s, a little into play, because the reveal (0.4 s) is too short to read it.

### Measured

- Four expansions in a row (stage 1 → 5) in Chromium on the GPU at 390×844, DPR 3: median frame 16.7 ms, 99th percentile 16.8 ms; one 33 ms frame in the first of three runs, none in the others.

### Known issues

- The expansion has no sound or haptics yet (M9).
- Cats over the danger line when an expansion starts are usually below the new, higher rim afterwards, so an expansion can rescue a full jar. That follows GAME_DESIGN §7.1; M10 looks at the balance.

## [0.5.0] - 2026-10-05

### Added

- M5: the first playable version. PLAY starts a run with placeholder cats; the Phaser canvas renders it and forwards input.
- `game/GameScene.ts`: renders the run each frame and sends `drop(x)`. The dropper follows the finger or mouse, a release or tap drops, releases during the cooldown are ignored, and the next cat pops in.
- Aim guide: a dashed line down to where the cat first touches something, with a faint ghost circle there (`game/aim.ts`, tested against the real physics).
- `game/cameraFit.ts`: fits the jar, the dropper band and the margins into the play band, letterboxed with the floor at the bottom; re-fits on resize and rotation.
- `game/skins/`: the `BallSkin` interface and `PlaceholderSkin`: a colour per tier, darker outline, highlight arc that shows rolling, gold ring and sparkles for golden cats, and upright tier numbers in Fredoka as separate sprites. Textures are sized so they are never upscaled.
- `game/BallRenderer.ts`, `game/JarView.ts`, `game/fx/MergeFx.ts`: pooled cat sprites, the wooden jar with its rim, the danger flash and countdown, and merge pops with a floating "+score".
- High-DPI canvas: rendered at devicePixelRatio (capped at 2.5) and shown at CSS size. The game loop sleeps on the menu.
- DOM HUD: pause, score, run coins, next-cat preview, stage label and progress bar with a lock icon.
- Pause overlay (Resume, Sound, Haptics, Quit to Menu) and Game Over overlay (score, best, stage, coins, "New best!", Play Again, Menu).
- Back button: game → pause → menu. Backgrounding the app or turning a phone sideways pauses the run.
- First-run hints: "Drag to aim, release to drop" and "Merge two identical cats".
- `?debug=1` panel (FPS, body count, spawn tier, set score, jump to stage, set upgrade, add coins, game over) and the `window.__game` hooks from TECH_SPEC §11.
- `session.ts`: the composition root that starts runs and wires their events to the HUD, overlays and hints.
- Tests: camera fit for every stage and several viewports, aim landing, colour helpers and the placeholder palette; E2E for a whole run (10 drops, pause/resume, game over, play again, menu), tap-to-drop, backgrounding and the first expansion.

### Changed

- The temporary Back button on the game screen is replaced by the pause button; the E2E tests follow the new flow.
- The ESLint layer test gets a longer timeout (its first lint is slow while the suite runs in parallel).

### Decisions (where the docs were open)

- Until the save system (M7), the wallet, best score, settings, upgrade levels and seen hints live in memory for the session.
- The expansion past 500 points already works in a simple form: the camera and the drawn jar blend to the new stage during the zoom. M6 adds the full sequence.
- The danger countdown shows whole seconds (3, 2, 1) above the middle of the jar.
- The merge hint appears 0.6 s after the first drop and stays until the first merge.
- `?seed=` gives every run of the session the same seed, so Play Again replays the same drops.

### Known issues

- A random bot at 375×667 survived more than 5 minutes without a game over, and another reached stage 2 with 6,840 points: the game may be easy. M10 tunes the balance.
- Headless test browsers render in software at a few frames per second, and Chromium's SwiftShader drops parts of some sprites. Real GPUs are fine (checked on an NVIDIA GPU).

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

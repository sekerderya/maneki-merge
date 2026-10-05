# Maneki Merge: Technical Spec

## 1. Platforms and distribution

| Target       | How players install it                                                                                                  | Notes                                                                                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS / iPadOS | Safari (or any iOS browser) → Share → **Add to Home Screen**. It opens full screen from its own icon and works offline. | No App Store, Apple developer account, Mac, or re-signing every 7 days. Home-screen web apps keep their storage. No Vibration API. Orientation lock isn't honoured, so a rotate overlay is used instead. |
| Android      | Chrome → **Install app**, which puts a WebAPK in the app drawer. An APK via Capacitor is optional (M14).                | Vibration works, and so does the manifest's orientation lock.                                                                                                                                            |
| Desktop      | Any modern browser                                                                                                      | For development and testing.                                                                                                                                                                             |

Why a PWA: the owner builds on Windows and won't publish to the App Store. Native iOS builds need macOS and Xcode, and apps sideloaded with a free Apple ID expire after 7 days. A PWA installs on both platforms from one URL, updates itself, and runs fully offline.

Hosting: GitHub Pages from the public repo `sekerderya/maneki-merge`. It's free and served over HTTPS, which service workers require. Live URL: https://sekerderya.github.io/maneki-merge/

## 2. Stack

| Concern                 | Choice                                                                 | Notes                                                                                                |
| ----------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Language                | TypeScript 6.0, `strict: true`                                         | Pinned to `~6.0` until typescript-eslint supports TypeScript 7.                                      |
| Build and dev server    | Vite                                                                   | `base` = `/maneki-merge/` for Pages builds                                                           |
| Rendering               | **Phaser 4** (latest 4.x)                                              | Rendering, cameras, tweens, particles, input. Ships agent skills in `node_modules/phaser/skills/`.   |
| Physics                 | **matter-js** (standalone)                                             | Not Phaser's Matter plugin, so physics runs headless in Node.                                        |
| UI                      | Vanilla DOM + CSS                                                      | Menu, shop, HUD and overlays. No UI framework.                                                       |
| PWA                     | `vite-plugin-pwa` (Workbox `generateSW`), `@vite-pwa/assets-generator` | Precaches everything; icons generated from one SVG (`npm run icons`, output committed in `public/`). |
| Font                    | `@fontsource/fredoka`                                                  | Bundled for offline use. OFL license.                                                                |
| Audio                   | Web Audio API, procedural SFX                                          | No audio files until M13 (optional music).                                                           |
| Unit and headless tests | Vitest                                                                 |                                                                                                      |
| E2E tests               | Playwright: Chromium + WebKit with phone device profiles               |                                                                                                      |
| Lint and format         | ESLint (flat config, typescript-eslint) + Prettier                     |                                                                                                      |
| CI/CD                   | GitHub Actions → GitHub Pages                                          |                                                                                                      |
| Art pipeline (M13)      | `sharp` + a small MIT texture packer                                   |                                                                                                      |
| Optional (M14)          | Capacitor → Android APK                                                |                                                                                                      |

## 3. Architecture

```
src/
  main.ts            boot order: fonts → save → UI → Phaser → service worker
  session.ts         composition root for play: starts runs, wires run events to the HUD,
                     overlays and hints, owns pause / game over / quit (no rules)
  config/            pure data: app, platform, tiers, stages, upgrades, economy, physics, timings
  core/              pure rules: rng, dropQueue, economy, upgrades, progression, save, events
  physics/           matter-js wrapper: PhysicsWorld (+ FixedStepper), balls, merges, danger,
                     geometry (jar per stage), circleCollision (exact circle contacts)
  run/               RunController: the whole run, headless (drop, cooldown, queue, combo,
                     expansion timeline, cash-out, jackpot, Lucky Save, game over)
  game/              Phaser: GameScene, cameraFit + aim + expansionView (pure math),
                     BallRenderer, JarView, skins/ (BallSkin, PlaceholderSkin, skinSets),
                     fx/ (MergeFx, PopFx, SparkFx)
  ui/                DOM: screens/ (menu, game), panels/ (shop), overlays/ (pause, game over),
                     hud/, banners/, styles/
  audio/             procedural SFX + mixer
  platform/          storage adapter, haptics, visibility, back button, orientation,
                     install hint, update badge, safe areas
  debug/             debug panel, window.__game hooks
tools/
  simulate.ts        headless balance simulator (M10)
  build-art.ts       final art pipeline (M13)
tests/
  unit/  physics/  e2e/
```

Dependency rules, enforced with ESLint `no-restricted-imports`:

- `config` imports nothing except types (`import type` from `core`).
- `core` may import `config`. `physics` may import `config` and `core`. `run` may import `config`, `core` and `physics`.
- `config`, `core`, `physics` and `run` never import Phaser, DOM-only code, `game`, `ui`, `audio`, `platform` or `debug`. They must run in Node. They can't use browser globals (`window`, `document`, `navigator`, `localStorage`, `fetch`, …) or `Math.random`.
- Only `physics` (and `run` through it) imports matter-js.
- `tests/unit/layers.test.ts` lints snippets inside each layer to prove ESLint really blocks all of the above.

Randomness: `core/rng.ts` is sfc32 seeded through splitmix32. Its state is four unsigned 32-bit integers (`state()` / `Rng.fromState()`), and a unit test pins the sequence for one seed, so changing it is always deliberate. The caller picks the seed (`?seed=`, or a time-based one from the presentation layer).

- `game` and `ui` talk to each other only through the typed event bus (`core/events.ts`) and the RunController API, never by reaching into each other.

Data flow: pointer input (game) → `RunController.drop(x)` → PhysicsWorld steps → merge events → economy (score, coins) → event bus → HUD, FX, audio, haptics, save.

## 4. World, coordinates and camera

- One world unit is roughly one stage-1 pixel. The origin is the centre of the jar floor and y grows downward, so the rim is at `y = −H`.
- Jar geometry for each stage comes from `config/stages.ts` through `physics/geometry.ts` (`jarGeometry(stage)`: size, `rimY = −H`, dropper band, `dropY`), which the scene uses too. Walls are thick static rectangles (at least 300 units) so nothing can tunnel out. They rise `WALL_HEIGHT_FACTOR` (2) stage-5 jar heights above the floor at every stage; only the part up to the rim is drawn, and the invisible rest keeps a pile that grows past the rim from spilling over. An expansion only slides them outward.
- The dropper band above the rim is `0.18 × W` (`DROPPER_HEADROOM_RATIO`), and a dropped cat starts at its middle, `dropY = −(H + 0.09 W)`, so every stage's biggest dropped cat starts above the rim. The drop x is clamped so the whole cat is inside the walls.
- The screen is split into bands: HUD (safe-area top + about 72 CSS px), the play band, and the safe-area bottom.
- Camera fit (`game/cameraFit.ts`): show [jar W + 2 × side margin] × [jar H + dropper headroom (0.18 W) + floor margin] inside the play band, letterboxed, with the floor margin on the bottom edge. Spare height goes above the dropper. The side margin is 0.05 W per side and the floor margin 0.04 W (`config/view.ts`), so the drawn walls (0.03 W) fit and every stage looks the same size on screen. The canvas fills the play band, which spans the full screen width below the DOM HUD.
- The RunController owns the expansion timeline: progress goes from 0 to 1 over a configured duration, instantly in the simulator. Every frame, the scene derives camera zoom and scroll plus the wall and rim visuals from that progress, so visuals and physics never drift apart.
  - `run.expansion` is `{ from, to, elapsedMs, progress (0–1 over EXPANSION_DURATION_MS), zoomProgress (0–1 over EXPANSION_ZOOM_MS), phase }`, or null outside an expansion. It counts fixed ticks, like everything else in the run.
  - Start: the state becomes `expanding`, the physics world pauses (time stop), the danger timer resets, `expansionStarted` fires.
  - End of the zoom: phase `reveal`. The cash-out pops cats below the new stage's smallest drop tier (`catPopped { id, … }`, reason `cashOut`, oldest first, then `runCoinsChanged`), then the walls move to the new stage, gravity and speed limits scale, the drop queue re-rolls cats outside the new pool, and `expansionRevealed { stage, newTiers }` fires. Physics stays paused for the rest of the reveal.
  - End: physics resumes, the danger timer resets again, `expansionFinished { stage, newTiers }` fires (`newTiers` = the tiers the new cap allows, e.g. 8 and 9 at stage 2), and `dropReady` announces the dropper's cat. If the score already passed the next threshold, the next expansion starts right away: one stage at a time.
  - `instantExpansion` (tests, simulator) runs the whole sequence inside one tick.
  - While the run is paused (backgrounding, rotation, the pause button) the timeline stands still with it and continues from the same tick.
- **Expansion visuals** (`game/expansionView.ts`, pure, unit-tested). No Phaser camera effects or tweens: they run on the wall clock, would drift from the tick timeline and ignore pauses. Every frame the scene computes two frames from `run.expansion` and `run.renderAlpha`:
  - Zoom progress `t = (elapsedMs + alpha × PHYSICS_STEP_MS) / EXPANSION_ZOOM_MS`. `renderAlpha` is the fraction of a tick the frame's leftover time has reached (`FixedStepper.alpha`), so the zoom moves smoothly at 60, 90 or 120 Hz and through rAF jitter instead of stepping in whole ticks. It only affects rendering.
  - The camera fits `lerpFrame(from, to, easeInOut(t))`. The drawn walls and rim use `easeInOut((t − EXPANSION_WALL_LAG) / (1 − EXPANSION_WALL_LAG))` with a lag of 0.25: the view pulls back first, then the walls slide outward and the rim rises into the new frame. The jar always stays inside the camera frame, both arrive at the new stage exactly when the zoom ends, and the floor never moves on screen (unit-tested). A lag of 0 locks the jar to the frame.
  - The physics walls stay where they were during the zoom (time is stopped, so nothing moves) and switch at the reveal, when the drawn walls arrive there. Walls only ever move outward, so nothing can escape; the pile slumps into the wider jar when physics resumes (headless test: no escapes, no launches, nothing moves during the time stop).
  - The expansion start bursts gold sparks along the rim (`SparkFx`, one pooled Phaser emitter, paused with the run). The cash-out shows each popped cat's own sprite (`BallRenderer.detach`) growing and fading with a ring and a gold "+coins" (`PopFx`); pops of one tick go off 30 ms apart, within 240 ms in all, so they end inside the reveal.
- Resize or rotation re-fits the camera immediately, without a tween, also in the middle of an expansion: the frame is recomputed from the timeline every frame.

## 5. Physics

- matter-js engine with a fixed timestep of 1/120 s and an accumulator (at most 5 substeps per frame). Physics never depends on frame rate.
- **Exact circle contacts** (`physics/circleCollision.ts`). Stock matter-js treats every body as a polygon and runs SAT on its vertices: with 150 cats SAT took 55–65% of a step, and polygon cats roll over facets (a 20-gon won't roll on slopes under ~9°). `installCircleCollisions()` wraps `Matter.Collision.collides` once: a cat–cat pair uses an analytic circle test and a cat–wall pair a circle-vs-axis-aligned-box test, each with one contact point midway through the overlap; every other pair keeps SAT. A cat's body is still a polygon (12 sides drawn around the circle) because matter-js needs vertices for its broadphase bounds, but its mass and inertia are set from the true circle. The returned record follows matter-js 0.20.0's internal contract (record reuse through the pairs table, `bodyA` = smaller id, normal from bodyB to bodyA, one persistent support point so warm-starting carries over), so matter-js is pinned to exactly `0.20.0`, and tests check the contract and agreement with SAT before any upgrade.
- Constants in `config/physics.ts`, as chosen in M4 (M10 may retune them with the simulator). Speeds are world units per second at stage 1 and scale with the stage.

  | Constant                                      | Value         | Why                                                                                                                                                                        |
  | --------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `PHYSICS_STEP_MS`                             | 1000 / 120    | At the speed cap even the smallest cat a stage can hold moves less than its radius per step (unit-tested), and a step is cheap (0.8 ms with 150 cats).                     |
  | `PHYSICS_MAX_SUBSTEPS`                        | 5             | Covers frames down to 24 fps; a longer frame slows the game down instead of spiralling.                                                                                    |
  | `POSITION_ITERATIONS` / `VELOCITY_ITERATIONS` | 10 / 8        | Overlap stays under 8% in the stress test. 20 / 12 cost 40% more and didn't reduce pile creep.                                                                             |
  | `BALL_FRICTION` / `BALL_FRICTION_STATIC`      | 0.2 / 0.5     | Exact circles roll without slipping. Friction 0.6 settles tall piles a little sooner but makes cats grippy; left for the M5 phone test and M10.                            |
  | `BALL_RESTITUTION`                            | 0.1           | A small bounce on landing. 0 made no measurable difference in piles.                                                                                                       |
  | `BALL_FRICTION_AIR`                           | 0.01          | matter-js default. The terminal speed (about 1670 u/s at stage 1) is above any fall inside the jar.                                                                        |
  | `ENABLE_SLEEPING`                             | false         | Sleeping bodies skip contact checks, so resting same-tier cats could miss a merge.                                                                                         |
  | `GRAVITY_BASE`                                | 1 (1000 u/s²) | A cat falls from the dropper to the empty floor in about 1.3 s at stage 1, like matter-js Suika clones on a board of the same width. First feel check on the phones in M5. |
  | `BASE_DENSITY`, `DENSITY_EXPONENT`            | 0.001, 0.5    | Mass grows like r^1.5 (see below).                                                                                                                                         |
  | `BALL_HULL_SIDES`                             | 12            | The hull only feeds the broadphase bounds, so few vertices are enough.                                                                                                     |
  | `BALL_INERTIA_SCALE`                          | 4             | matter-js's own factor: cats spin as calmly as stock matter-js circles.                                                                                                    |
  | `MAX_SPEED_BASE`                              | 1500          | Above a natural fall from the dropper (about 1150 u/s at stage 1), so it only catches launches.                                                                            |
  | `MERGE_MAX_SPEED_BASE`                        | 400           | A merged cat starts calmly even when its parents collided fast.                                                                                                            |
  | `GROWTH_NEIGHBOUR_MAX_SPEED_BASE`             | 500           | Neighbours of a growing cat are pushed but never launched.                                                                                                                 |
  | `MAX_ANGULAR_SPEED`                           | 30 rad/s      | About 5 turns per second, a tier-1 cat rolling at 800 u/s. Not scaled: zooming out doesn't change spin on screen.                                                          |
  | `WALL_THICKNESS` / `WALL_HEIGHT_FACTOR`       | 300 / 2       | Nothing tunnels through, and a pile above the rim can't spill over (§4).                                                                                                   |

- Timers count whole steps (`stepsFor(ms)`): 2.5 s is exactly 300 steps, so floating-point noise never moves a deadline. `FixedStepper` divides the accumulated time by the step instead of subtracting step by step, for the same reason.
- Density per tier is `0.001 × (r1 / r(t))^0.5`, so mass grows like r^1.5 instead of r². This limits mass ratios.
- Gravity scales with the stage (`g_s = g_1 × scale_s`) so on-screen motion feels the same at every zoom. The speed clamp scales with it.
- Merges (`physics/merges.ts`, run after every step):
  - The step makes one pass over matter-js's pair list, which with sleeping off holds exactly the pairs that overlap this step (`collisionStart` + `collisionActive`), once each. It records each cat's first contact and collects same-tier cat pairs.
  - Order: candidate pairs are sorted by (older cat id, younger cat id), so the oldest cats merge first. Our ids come from creation order, so the order never depends on matter-js internals.
  - One merge per cat per step: a pair with an already used cat is skipped. Three touching cats give one merge; the third can merge on a later step. New cats aren't in this step's pairs, so chains continue on the next step at the earliest.
  - Two cats at or above the stage's cap tier make a Jackpot and vanish. Otherwise the new cat is born at the midpoint with the parents' average velocity (capped at `MERGE_MAX_SPEED_BASE` × scale), at the parents' size, and grows linearly into its own radius over `MERGE_GROW_MS` (120 ms, 15 steps). It inherits the earlier landing time, so a pile over the line keeps counting.
- Growth without launches: linear growth has the lowest peak growth rate (about 1.5% of the radius per step). matter-js 0.20 removes overlap in its position solver by moving `position` and `positionPrev` together, so growth pushes neighbours without giving them velocity. On top of that, every cat touching a growing cat is capped at `GROWTH_NEIGHBOUR_MAX_SPEED_BASE` × scale, and every cat on every step at `MAX_SPEED_BASE` × scale and `MAX_ANGULAR_SPEED`. A test wedges a big pair between the walls under a settled pile and resolves every merge at once: upward speeds stay under 20% of the speed limit.
- Stability acceptance test (headless): 150 random cats settle in a stage-5 jar within 10 s of simulated time. After settling, no cat has escaped, the largest overlap is under 15% of the smaller radius, and no cat moves faster than the clamp. "Settled" means every cat is slower than 5% of the speed limit from that moment on (checked until 12 s). Resting cats show velocity jitter (a cat can read 150 u/s while its position stays within a unit), so positions are checked separately, through overlap and wall penetration.
- Measured in M4 (dev machine, Node 24): a step with 150 settled cats at stage 5 takes **0.79 ms** on average (`npm run test:perf`, budget 2 ms; stock polygon SAT took about 1.8 ms). The stress test settles in about 4–7 s, with the largest overlap at 4–8% of the smaller radius, wall and floor penetration at 2–4%, and nothing escaping. matter-js passes, so planck.js isn't needed.
- Known: tall piles keep creeping. With 150 cats at stage 5, a slip of 0.1–0.4 of a radius within half a second can still happen after 10 s. It comes from matter-js's soft stacking; higher friction and more iterations didn't remove it. In play, cats arrive one at a time and merge, so piles are smaller. Watch it in the M5 phone test.
- Determinism (`tests/physics/determinism.test.ts`):
  1. One seeded RNG per run, used only by the drop queue. Physics has no randomness, and the matter-js engine never calls its own random.
  2. Fixed ticks: `update(frameMs)` only decides how many ticks run. Every timer counts ticks, never frame time or the wall clock (`Common.now` only feeds matter-js metrics).
  3. Inputs apply between ticks, so a run is its seed plus (tick, input) pairs. The test records a run driven by random frame lengths and replays it tick by tick: `stateHash()` (FNV-1a over the exact float bits of the run and every body) matches at every checkpoint, through an expansion.
  4. Ordering uses our own cat ids. matter-js body ids are global per process, so two worlds get different ids, but matter-js only compares them; the test builds another world in between to prove it.
  5. Exact replays hold on one JS engine. V8 and JavaScriptCore may differ in the last bit of `Math.sin` and `Math.cos`, so a seed isn't guaranteed to replay bit for bit across browsers.
- If matter-js can't pass the stability test after tuning, switch to planck.js behind the same `PhysicsWorld` interface and record why here.

## 6. Rendering

- Phaser 4 with WebGL (Canvas fallback): a transparent canvas over a CSS background.
- High-DPI: the game uses `Scale.NONE`. `game/index.ts` sizes the canvas to the play band × min(devicePixelRatio, 2.5) (`MAX_RENDER_RESOLUTION`) and shows it at CSS size through the scale zoom (1 / resolution). A `ResizeObserver` re-fits it; the camera zoom is canvas pixels per world unit.
- The game loop sleeps (`loop.sleep()`) while the menu is visible and wakes when a run is shown.
- The `BallSkin` interface (`game/skins/BallSkin.ts`) gives a frame per (tier, golden) and an optional upright number frame. A frame is a texture key plus world units per texture pixel at the tier's radius; that scale includes the hit-radius ratio. There are two implementations:
  - `PlaceholderSkin`: circles and numbers drawn with the 2D canvas API, one set per stage (below), refreshed after a WebGL context restore.
  - `ArtSkin`: an atlas, added in M13.
    `config/app.ts` selects the skin, and `?skin=placeholder` forces placeholders.
- **Textures per stage** (`game/skins/skinSets.ts`). The camera zooms out by each stage's scale, and canvas textures get no mipmaps (Phaser 4.2 renders with WebGL1, where mipmaps need power-of-two sizes), so a stage-1 texture would be shrunk almost 3× further at stage 5 and look jagged. Each stage therefore has its own set: the tiers it can hold (its smallest drop up to its cap), golden bodies for its drop pool, and the numbers, drawn at 2.5 texture pixels per world unit (`PLACEHOLDER_PX_PER_UNIT`) divided by the stage's scale. The camera zoom also scales with 1 / scale, so every stage shows its textures at the same texture-to-screen ratio as stage 1 (unit-tested): never upscaled on phones and tablets, never shrunk much. A tier bigger than the stage allows (debug spawns) is capped at its own first stage's density.
  - `BallSkin.prepare(stage, budgetMs)` draws the next stage's set during the zoom, about 4 ms per frame (physics is paused then, so it costs no frames); `setStage(stage)` switches at the reveal (finishing anything missing) and bumps `revision`, and `BallRenderer` gives live sprites their new textures. The skin keeps stage 1's set (every run starts there) and the previous stage's (popping cats still show it) and frees the rest: about 8 MB at stage 5.
  - Line widths: the aim guide scales with the stage, the jar's lines are fractions of its width, and floating texts and the danger countdown render at the current zoom, so all of them keep their on-screen size and sharpness. The pop ring texture is 512 px, so a tier-15 Jackpot's ring isn't upscaled.
- Numbers are separate upright sprites in a layer above all bodies, so a 6 never looks like a 9.
- Draw order (Phaser layers): jar interior, aim guide, cat bodies, numbers, jar walls and rim, dropper, effects.
- `BallRenderer` matches pooled body and number images to cats by id every frame; merge pops, cat pops and floating scores (`MergeFx`, `PopFx`) are pooled and animated by hand. No per-frame allocations in hot paths.
- The aim guide is a dashed line from the dropper cat to the point where it first touches a cat or the floor (`game/aim.ts`), plus a faint ghost circle there. A unit test checks it against the real physics.

## 7. UI (DOM)

- `index.html` has `#menu-screen` and `#game-screen`, and only one is visible at a time. The Phaser canvas lives in `#game-screen`, and the scene sleeps while the menu is visible.
- The HUD, overlays and banners are absolutely positioned DOM elements with `pointer-events: none`, except on controls.
- The HUD is a band above the play area: pause, score with run coins, the stage label with its progress bar (a lock icon when the next stage isn't unlocked), and the next-cat preview. At an expansion's reveal the label switches to the new stage with a short glow and the bar resets without sliding backwards; at stage 5 the bar stays full and gold. The lock pulses when the score reaches a locked stage.
- Banners (`ui/banners/banner.ts`): "The shrine grows!" at the expansion start and "New cats unlocked!" with the new tiers' icons at the reveal, centred 15% of the jar's height below its rim (`GameView.jarBox()`). That part of the grown jar is still empty, and the dropper above the rim stays visible. "Expansion locked — upgrade the Shrine in the shop" is a toast at the top of the play area, once per run. Each banner runs one CSS animation for its whole life and removes itself when it ends; while the run is paused its animation is paused too. A first-run hint is hidden while a banner shows, and `prefers-reduced-motion` fades banners instead of popping them.
- Back in the game: the screen manager keeps one history layer while the game is open. Back opens the pause overlay and re-opens the layer; back on the pause or Game Over overlay goes to the menu (`ui/screenManager.ts`, `session.ts`).
- Use `env(safe-area-inset-*)`, `100dvh`, and `resize` / `visualViewport` listeners.
- Touch targets are at least 48 px, with pressed states and no hover-only interactions.
- Coin fly: convert the merge's world position to screen space through the camera, then animate a DOM coin to the HUD counter.
- The HUD's next-cat preview and the shop icons use the same skin data: a CSS circle with a number for placeholders, small exported images for the final art.

## 8. Persistence

- The `localStorage` key `maneki-merge:save` holds `{ version, data }` (schema v1: wallet, upgrades, records, stats, settings, flags). `core/save.ts` provides `defaultSave()`, `decodeSave()` / `migrate()`, `sanitize()` and a `SaveStore` (`load()`, `save()`) behind a `StorageAdapter`. Implementations: `WebStorageAdapter` (wraps the localStorage that `platform/storage.ts` hands in after a probe write) and `MemoryStorage` (tests, the simulator, and browsers that block storage).
- Migrations: `MIGRATIONS[n]` turns version n data into version n + 1; they run in order up to `SAVE_VERSION`. A migrated save is rewritten in the new format right away.
- Repair: every known field is validated. A missing field silently takes its default, so adding a field needs no migration. An invalid field (wrong type, negative, above an upgrade's max level, …) takes its default or the nearest valid value and is reported. Unknown fields are dropped.
- Corrupt data (unreadable JSON, no version, a failed migration) and repaired saves: keep a copy of the raw text under `maneki-merge:save:corrupt:<timestamp>` (only the newest 3), then rewrite the save in clean form. A save from a newer app version is backed up the same way and loaded with the fields this version knows.
- Storage errors never crash the game: a failed read starts from defaults in memory, and `save()` returns false when a write fails (storage full or blocked).
- Write on:
  - purchase
  - coin changes (throttled to at most 1 write per second)
  - run end
  - `visibilitychange` (hidden) and `pagehide`
- Call `navigator.storage.persist()` once (best effort).

## 9. PWA and offline

- Manifest:
  - name "Maneki Merge", short_name "Maneki"
  - `display: "fullscreen"` (iOS falls back to standalone), `orientation: "portrait"`
  - theme and background colours (from `config/app.ts`); icons 64/192/512 + maskable 512; `apple-touch-icon` 180
  - icons are generated from `public/icon.svg` by `npm run icons` (`pwa-assets.config.ts`) and committed, so builds don't need `sharp`
  - iOS meta tags with a `black-translucent` status bar
- Workbox `generateSW` precaches the whole build (JS, CSS, HTML, fonts, images, audio), with `navigateFallback` = `index.html`. There are no remote origins to cache.
- Updates use `registerType: "prompt"`. When a new service worker is waiting, only the main menu shows the "Update ready" badge. Tapping it activates the new service worker and reloads. Never reload during a run. A cold start also picks up the new version.
- `platform/updateGate.ts` owns this policy. The plugin's `onNeedReload` hook routes through it, so even when another window of the app activates the update, this window doesn't reload mid-run: it shows the badge and reloads when the player taps it on the menu.
- A long-running app checks for a new version when it becomes visible and once an hour (`config/platform.ts`).

## 10. Mobile platform checklist

- `viewport-fit=cover`; no pinch or double-tap zoom (`touch-action: none` on the play area, block `gesturestart`); no text selection or long-press callout; `overscroll-behavior: none`; a fixed body so there's no rubber-band scrolling.
- Landscape on a phone shows a full-screen "Please rotate your device" overlay and pauses the run. "Phone" means a coarse pointer and a landscape viewport at most 540 px tall, so tablets in landscape stay playable.
- Audio: create or resume the AudioContext on the first pointer event and after returning from the background. iOS mutes web audio when the silent switch is on, which is acceptable.
- Backgrounding: pause the run, save, and suspend audio.
- Android back button: history-state handling (game → pause → menu).
- WebGL context loss: recover by regenerating textures, without crashing.
- Haptics: use `navigator.vibrate` when it's available and enabled; do nothing on iOS.
- Install hints: on an iOS browser outside standalone mode, show Share → Add to Home Screen. On Android, use `beforeinstallprompt`.

## 11. Testing

- **Unit tests (Vitest):** config tables vs GAME_DESIGN, camera fit and the expansion frames (the jar inside the camera, the floor still on screen), texture sets per stage, RNG determinism, drop weights and Big Catch, economy, upgrade prices/effects/purchase rules, thresholds and locks, save defaults/migrations/corruption, the event bus, number formatting, and the layer import rules. `npm run test:coverage` (part of `npm run check` and CI) fails below 90% line coverage on `src/core`.
- **Headless physics (Vitest, `tests/physics/`):** circle contacts against matter-js's record contract, the world (walls, stages, fixed stepping, speed limits, growth), merge rules (a pair → the next tier, three touching → one merge, cap → Jackpot), growth without launches, the danger timer, Lucky Save, the RunController (drops, cooldown, payouts, combo, expansion timeline and cash-out, locks, game over, pause), determinism, expansions (a pile through every stage up to 5: nothing escapes, launches or moves during the time stop; cash-out amounts and event order; the time stop freezing the cooldown and combo; Quick Growth thresholds and Shrine locks; caps, Jackpots and drop pools at every stage; a replay through four expansions), the stability stress test, and chaos runs where a bot plays whole runs while every tick checks that nothing escapes or beats the speed limit. `npm run test:coverage` also fails below 90% line coverage on `src/physics` and `src/run`.
- **Performance:** `npm run test:perf` runs the 150-cat step benchmark alone, without coverage, and fails above 2 ms per step. Inside the full suite the same test only catches gross regressions (20 ms), because coverage instrumentation slows it down several times.
- **E2E (Playwright, iPhone and Pixel profiles, Chromium + WebKit):**
  - Boot with a clean console.
  - Menu → play → drop cats via hooks → pause/resume → game over → menu.
  - Expansion: the threshold via a hook → banners → stage 2; a locked stage's toast and lock; a resize and a pause in the middle of an expansion; the debug jump past a locked stage.
  - Shop purchase with debug coins.
  - Coins survive a reload.
  - Offline reload: load, wait for the service worker, go offline, reload, start a run. This one runs in the Chromium project.
- **Hooks:** with `?debug=1`, `window.__game` exposes read-only state (`state()`: screen, run state, score, run coins, wallet, stage, ball count, canDrop, danger, locked, expansion `{ from, to, phase }`, ticks; `ballXs()`) and helpers (dropAt, addCoins, setUpgrade, setStage, setScore, spawnTier, forceGameOver). `setStage(n)` calls `RunController.jumpToStage(n)`: it opens every stage up to n for this run, whatever the Shrine Expansion level, raises the score to n's threshold, and each expansion then plays in turn. `setScore` respects the locks, so the locked case can be tested. The debug panel shows FPS, the body count and the running expansion, and puts the helpers on buttons.
- **Headless browsers:** they render the DPR-3 canvas in software at a few frames per second, so the run advances slowly there (at most 5 fixed steps per frame) and E2E waits are long. Chromium's software GPU (SwiftShader) also drops parts of some cat sprites; a real GPU renders the same scene correctly, so milestone screenshots are taken with Chromium on the GPU (`--use-angle=gl`).
- **Manual:** test on a real iPhone (home-screen app) and a real Android phone (installed app) after each milestone, using the checklist in ROADMAP.

## 12. CI/CD

- Development happens directly on `main` (no side branches or PRs), so `deploy.yml`'s checks are the gate before every deploy.
- `ci.yml` runs on PRs and on pushes to branches other than main (kept for the rare case one is used): `npm ci` → typecheck → lint → format check → unit tests with coverage → build → Playwright (`npx playwright install --with-deps chromium webkit`).
- `deploy.yml` runs on pushes to `main`: the same checks, then a build with the Pages base → `actions/upload-pages-artifact` → `actions/deploy-pages`. The Pages source is GitHub Actions.
- Versioning: the `package.json` version (0.x during development, 1.0.0 at release) plus the short commit hash, injected at build time and shown on the menu. Tag `vX.Y.Z` after each milestone merge.
- Optional `android.yml` (M14): on tags, run Capacitor sync and a Gradle release build signed with a keystore from repo secrets, and attach the APK to the GitHub Release.

## 13. Performance budgets

- 60 fps on mid-range phones (e.g. iPhone 11, Pixel 6a) with 150 cats; physics at most 4 ms per frame; no GC spikes.
- Gzipped JS under 800 KB; first load under 3 s on 4G; instant offline start afterwards.
- Final art: a WebP atlas, at most 4096×4096 in total (2048×2048 pages preferred).

## 14. Final art pipeline (M13)

- Input: `art-source/` (GAME_DESIGN §13.2).
- `tools/build-art.ts` (sharp):
  1. Validate each image: square, has alpha, minimum size.
  2. Trim and centre.
  3. Resize each tier to its largest on-screen size × 2.5 DPR.
  4. Export WebP and pack atlas pages.
  5. Measure each sprite's visible radius to get its hit-radius ratio.
  6. Export small per-tier PNG/WebP icons for the DOM (HUD preview, shop, banners).
- Output goes to `public/assets/` and is committed. `ArtSkin` becomes the default, and placeholders stay available.
- Regenerate the PWA icons and iOS splash screens from `art-source/app-icon.png`.

## 15. Phaser 4 notes for agents

- Read the matching skill in `node_modules/phaser/skills/` before writing Phaser code: `game-setup-and-config`, `scale-and-responsive`, `scenes`, `cameras`, `tweens`, `particles`, `render-textures`, `graphics-and-shapes`, `text-and-bitmaptext`, `sprites-and-images`, `input-keyboard-mouse-touch`, `v4-new-features`.
- Phaser 3 examples from memory may be wrong for v4, because the renderer, FX, mask and tint APIs changed. When in doubt, check the skill or `changelog/v4/` in the package.
- Don't use Phaser's Matter plugin for gameplay physics.

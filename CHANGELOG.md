# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.20.1] - 2026-10-08

The main menu's layout after the owner's first look on a phone.

### Changed

- The coins pill comes out of the screen's right edge, like the HUD's coins card.
- On taller screens the logo, the cat, the record cards, PLAY and UPGRADES move up together into the free height (a fifth of it; the logo three fifths), so the logo sits closer to the top bar.
- The cat, its glow and its sparkles are centred between the logo and the record cards.

## [0.20.0] - 2026-10-08

The main menu in the owner's art, laid out on the owner's mockup (M13, docs/ART_ASSETS.md phase 4).

### Added

- The main menu is the owner's mockup: the painted shrine garden, the "Maneki Merge" logo, the golden cat on its pink cushion with a warm glow and twinkling sparkles, two record cards (BEST SCORE with the paw badge, BEST STAGE with a torii), a glossy coral PLAY pill, a cream UPGRADES pill with an arrow and its red dot, the gear button and the coins pill. Every piece sits where it is in the mockup, on a stage scaled to the screen; taller screens show more sky and the logo moves up into it. Labels and numbers are live text; long numbers shrink to fit their wells and the coins pill grows.
- `tools/buildMenu.ts` (`npm run art`) cuts the menu pieces from the owner's images: three-slice strips for the pills and wells, a nine-slice record card, the cushion recoloured to the mockup's pink, the logo's rim lightened, drop shadows cleared.
- Boot preloads the menu art with the cat art, so the menu shows up whole.

### Changed

- The install hint and the update badge sit small in the top bar, between the gear and the coins.
- UPGRADES and the gear keep a 48 px touch target on every screen: on short screens their box is taller than the mockup's pill, which is drawn in its middle at the mockup's size.
- The code-drawn menu of v0.14 stays for `?skin=vector`.

## [0.19.5] - 2026-10-08

Cats roll on the jar's floor, from the owner's playtest of the soft landing.

### Changed

- A cat alone on the floor or a curve rolls like a ball instead of sliding: it turns as fast as it moves. A cat dropped by a wall now turns about once on its way down and across (it turned an eighth of that, sliding). A merged cat keeps its own spin.
- The floor's rug is a little stronger (800 u/s², was 600), so a rolling cat still stops where it did, about half a second after landing.
- The chaos test's Lucky Save run may last 300 s (its bot now clears stage 1 after the saves and the run ends at 196 s).

## [0.19.4] - 2026-10-08

A soft landing on the jar's curved corners, the owner's choice among measured options.

### Changed

- A dropped cat whose first touch is a curved corner lands softly: over half a second its speed fades, gently at first and at the end (never more than 3% of its fall in one step), down to about a quarter. v0.19.3 stopped it dead at the touch, which jolted. It then slides down and rolls on towards the middle, and never swings across the jar.
- The floor slows a cat rolling alone on it like a rug (600 u/s²): it stops within about half a second instead of rolling for 5–8 s. Cats in a pile push each other as before.
- The physics stress test drops 110 cats instead of 150: as much cat as 150 were before v0.19.3's bigger sizes. With 150 the pile stood nearly twice the jar's height and passed or failed by luck of the seed.

## [0.19.3] - 2026-10-08

Cat sizes evened out and the jar's corners fixed, from the owner's playtest.

### Changed

- Cat sizes: the smallest cat is as big as the second one was (radius 34) and the 9 keeps its size (137), with an even, smaller step between every two sizes (× 1.19 instead of × 1.22): 34, 40, 48, 57, 68, 81, 97, 115, 137 and 163 for the stage's last cat (168 before). The jar now grows by 163 / 34 ≈ 4.8 at each stage clear instead of 6.
- The dropper band above the rim is 0.2 of the jar's width (0.18), so the bigger size 4 still waits above the rim. Every dropped cat falls as far as before, so the 1 s drop is unchanged; on a 390 × 844 phone the jar sits 2–3 px lower.

### Fixed

- Cats no longer slip into the bamboo at the jar's bottom corners: the physics corners have the art's radius (168 instead of 112).
- Cats no longer slow down on the bottom corners. A dropped cat whose first touch is a curve lands dead there, as on the flat floor, and then slides down at its natural speed and rolls on (before, the curve braked it on every step, so it crept down for 1–3 s). Landing dead keeps a cat dropped by a wall from being swung across the jar and up the other wall.

## [0.19.2] - 2026-10-07

The HUD cards measured against the owner's reference image.

### Changed

- The score card is shorter (66 px) with a thinner outline and softer corners; "SCORE:" is centred, and the score's well is a rounded pill in the reference's warm tan.
- The coins card is a small card (no longer a long strip) coming out of the screen's right edge, rounded on the left only: "COINS:" centred and bigger, and under it a small coin with the number, evenly spaced. It is CSS now; the tool cuts the coin out of the generated card.
- The pause button's outline is the reference's rose brown instead of dark brown.

## [0.19.1] - 2026-10-07

The HUD closer to the owner's reference image.

### Changed

- The score card is a soft square in the coins card's colours with the paw badge over its top-left corner, a bigger "SCORE:" and the score in a sunken tan well (it was a long thin pill like the coins card).
- The coins card runs off the screen's right edge, is thicker, and shows its number bigger.
- Both numbers are white with a thin brown edge.

## [0.19.0] - 2026-10-07

The owner's HUD art (M13, phase 3 of docs/ART_ASSETS.md).

### Added

- The score and coins cards, the next-cat bubble and the pause button are the owner's images, with the labels and numbers as live text on them: "SCORE:" and the score after a pink paw badge, "COINS:" and the run's coins after a gold coin, "NEXT" on the bubble's tag. Flying coins land on the card's coin.
- `npm run art` also builds the HUD (`tools/buildHud.ts`). The score card is the coins card with the paw badge pasted over its coin, since the generator kept drawing the score panel in another style.

### Fixed

- The art pause button is 48 px, the touch-target minimum (it was 46).

## [0.18.0] - 2026-10-07

Clearer cats and a smaller HUD, from the owner's comparison with the reference image.

### Added

- A thick dark outline round every cat (5% of its radius, at least 4.5 world units), drawn by the game so all nine looks and all sizes get the same line; the body shrinks by as much, so touching cats still touch. The HUD's cat icons get a 1 px outline.

### Removed

- The stage card (stage label, progress bar and goal cat) under the score card, until the owner has art for it. The banners still announce stage clears and the next goal.

## [0.17.0] - 2026-10-07

The owner's scene art (M13, phase 2 of docs/ART_ASSETS.md).

### Added

- The bamboo jar, the calico paw and the painted shrine-garden background from the owner's images. The jar's glass rim and top rail are drawn behind the cats, its bamboo in front; the paw's arm stretches up to the top of the screen; the background follows the jar so its feet stand on the painted rug, fades into the sky at the top and always spans the screen.
- `npm run art` also builds the scene (`tools/buildScene.ts`): it cuts the white, measures the jar's opening and splits the jar into its two layers.

### Changed

- The camera shows 0.19 of the jar's width beside each wall instead of 0.15, so the thicker bamboo and its rail fit on screen: the jar is 283 px wide on a 390 px phone instead of 300.
- `?skin=vector` (and the fallback when the art can't load) also brings back the vector jar, paw and garden.

### Decisions (where the request was open)

- The physics corners stay at radius 112: the art's corners are rounder (168), and matching them changed the physics tests' settled piles. A cat deep in a corner tucks a few pixels behind the bamboo, which is drawn in front of it.
- The background's own rug is used; the separate rug image is kept in `art-source/` but unused.
- The jar's caps don't flash red in danger with the art (the dashed rim line still does).

## [0.16.0] - 2026-10-07

The owner's cat art (M13, phase 1 of docs/ART_ASSETS.md).

### Added

- Nine new lucky cats, raster art the owner generated with an AI image tool: round maneki-neko balls, each one body colour with a lighter belly, one raised paw and a collar with a gold bell (Shiro, Kuro, Mikan, Sora, Sakura, Matcha, Fuji, Aka, Kin). They are the default skin (`ArtSkin`), in the jar, the dropper, the HUD, the banners and Game Over.
- `npm run art` (`tools/build-art.ts`, sharp): cuts the images' white background, fits each body circle so touching cats touch on screen, and writes `public/assets/cats/*.webp` and `src/config/catSpriteData.ts`.
- docs/ART_ASSETS.md: the asset plan, the prompts and the checklist for the owner's art phases.
- `?skin=vector` shows the code-drawn cats of v0.11–v0.15.

### Changed

- The cats show no numbers (the owner's call): a cat's look tells its size. The vector and placeholder skins still show them.
- The menu's hero is the golden Kin (the calico with `?skin=vector`).
- The service worker also precaches `.webp` files.
- Audio unlocks only when the sound setting is switched on (or on a tap), not when boot or a profile change re-applies it while the browser still counts a recent gesture.

## [0.15.0] - 2026-10-07

Shorter stages: the stage loop runs on 10 cats.

### Changed

- Every stage holds 10 cats instead of 11. Merging two 9s makes the stage's 10th cat, which clears the stage; the jar grows and that cat becomes the new stage's 1st cat, as before. Stage 1 holds tiers 1–10, stage 2 10–19, stage 3 19–28, stage 4 28–37 and stage 5 37–46.
- The jar grows (and the camera zooms out) by 168 / 28 = 6 per stage instead of 7.32.
- The HUD goal, the "New cats unlocked!" banner, the debug spawn list and the Jackpot (5 × C(10) = 595 coins at stage 1) follow the new last cat.
- The camera shake starts at merges into size 9, so the two biggest merges still shake.
- Save format v4: a record tier above 46 (the old stage 5 went up to 51) is capped at 46.

### Removed

- Size 11 (radius 205), and with it the tenth cat look (Kuro, the black cat) and the tenth placeholder colour (white): the stage's last cat wears look 1, because it becomes the next stage's first cat. Kuro is in the git history.

### Decisions (where the request was open)

- Sizes 1–10 kept their radius (the v0.12 precedent), so the last cat is smaller than before (0.28 of the jar's width instead of 0.34) and a stage needs less room to clear. The Suika-like jar coverage was tuned with size 11; the owner's playtests decide whether the radii need a new tune.
- The look that left is the last one (Kuro), as Kimono did in v0.12.

## [0.14.1] - 2026-10-07

HUD layout from the owner's marked-up screenshot.

### Changed

- The score card lost its paw-print badge and is narrower (116 px instead of 166 px); "SCORE:" and the score are centred.
- The stage card is as narrow as the score card and as tall: "STAGE N" centred on top, a thin progress bar, and "STAGE N+1 =" with the cat that opens it (the stage's last cat). At the last stage it reads "GOAL =".
- The next cat moved under the coins card, on the right, in a round glass bubble without the speech-bubble tail, with a small "NEXT" tag on its rim.

### Decisions (where the request was open)

- The progress bar stays, thin, between the two rows of the stage card, so the player still sees how close the next stage is.
- On short screens (375 × 667) the bubble reaches the dropper's height, so the paw passes under it when aimed at the far right.

## [0.14.0] - 2026-10-07

The game screen from the owner's second design canvas: the "Sakura garden" design (M12).

### Changed

- The whole screen is the scene now, and the HUD floats over its top. On the left a cream score card with a paw-print badge and the score in a sunken well, with a stage card under it; on the right the next cat in a glass speech bubble, a glossy pink pause button and a coins card that runs off the right edge. Touches over the cards still aim; only the pause button is a button.
- The dropper is a calico cat's paw hanging from the top of the screen. It holds the next cat by the head, follows the aim, lifts a little when it lets go, and hides while the jar grows. The aim guide is dotted.
- The jar is a bamboo frame with a curved bottom and a glass back, standing on two bamboo feet on a mint rug, with a far rail tied to the posts and cut bamboo caps. The caps and the dashed rim line flash red in danger.
- The physics jar has the same curved bottom: its floor's corners are quarter circles of radius 112 (0.19 of the jar's width). A cat landing alone on a curve slides gently into place instead of being launched across the jar.
- The background is the sakura shrine garden: clouds, sakura branches and trees, a torii and a shrine seen through the glass, stone lanterns either side, a wooden floor. It is drawn around the jar and lines up with it on every screen size, also while the jar grows.
- The jar is 300 px wide on a 390 px phone (the design's proportions; it was about 350 px), and it sits between the HUD and the bottom edge.

### Decisions (where the request was open)

- "Move the box a little higher": the jar sits midway between the HUD and the bottom edge, which on a 390 × 844 iPhone puts its rim at 287 px (the design had 327 px) with the same width.
- The dropper stays where it was in physics (just above the rim), so a drop still takes exactly 1 s; the paw's arm reaches up to the top of the screen from there.
- The cats are still v0.11's lucky cats: new maneki-neko cat sets are on the design canvas for the owner to choose from.
- The 150-cat stress test now averages speeds over 0.1 s: the curved jar's taller pile shows more single-step velocity jitter, but its cats move no more than on the flat floor (TECH_SPEC §5).

### Known issues

- A narrower jar means smaller cats on screen (about 15% smaller than in v0.13). Say if the jar should be wider again: it is one number (`CAMERA_SIDE_MARGIN_RATIO`).

## [0.13.0] - 2026-10-06

Physics feel: the owner's fourth feedback batch (M12).

### Changed

- Merging: the new cat is born at rest exactly between the two cats that met. Until now it kept their average velocity (up to 400 u/s), so a cat landing on another drifted down towards the lower one while it grew.
- A merged cat starts to turn gently, as if another cat had clipped it: the way its parents slid past each other (a cat landing on the right shoulder of another turns clockwise), its rim moving at 80 u/s, so small cats turn faster than big ones. On the floor it rolls a short way.
- Drops are faster: a dropped cat reaches the empty floor in 1 s (1.6 s before). Gravity 900 → 2150 u/s², the speed limit 1500 → 2400 u/s. Everything else falls faster too.
- The floor never bounces: a landing cat stops dead. Cats still bounce a little off each other and off the walls (restitution 0.25).
- Cats shove each other harder: friction 0.1 / 0.3 → 0.05 / 0.2, and the floor and walls now use the same values (they had matter-js's 0.1 / 0.5, which gripped harder than the cats' own values); inertia × 3 → × 2, so pushed cats roll aside; mass ∝ r^1.4 → r, so big cats are lighter next to small ones. Measured headless against v0.12: a small cat rolling into a big one moves it 47 units instead of 21, a cat dropped into a narrow gap pushes its neighbours 397 units apart instead of 109, a cat landing on a bigger one's shoulder shoves it 170 units instead of 47.

### Decisions (where the request was open)

- "Reach the floor in exactly 1 second": measured from the dropper to the empty floor. The dropped sizes differ in radius, so size 1 takes 1.00 s and size 4 0.99 s.
- Faster drops come from stronger gravity rather than a downward throw: the cat still starts from rest and speeds up, and merged or rolling cats fall as quickly as dropped ones.
- "No bounce on the floor" covers the floor only. A cat landing on a cat that rests on the floor hardly bounces either (the floor absorbs the push); cats meeting in the air or on a pile still bounce a little. Say if they should land dead everywhere.
- The direction of the turn follows the parents' motion instead of a random pick, so it looks like the hit that started it. Cats that meet head-on keep the way they were turning; cats that weren't turning take a side from their ids.

### Known issues

- The 150-cat stress pile (cats overfilling the jar all at once) settles more slowly than before (under 75 u/s after 7–9.5 s instead of 3–4.5 s) and its deepest overlap grew from 4–5% to 8–13% of a radius. Normal play isn't affected in the headless bot runs: resting cats are as still as before.
- A physics step with 150 cats takes 0.93 ms instead of 0.78 ms on the dev machine (budget 2 ms).

## [0.12.0] - 2026-10-06

Physics and balance: the owner's third feedback batch (M12).

### Changed

- Physics: the cats are lighter, a bit more elastic and push each other more easily. Friction 0.2 / 0.5 → 0.1 / 0.3, restitution 0.1 → 0.25 (a dropped cat bounces about its own radius instead of a few units), gravity 1000 → 900 u/s², mass ∝ r^1.5 → r^1.4 (big cats are lighter next to small ones), inertia × 4 → × 3. Measured headless: a small cat rolling into a big one moves it 45% further, a cat dropped into a narrow gap pushes its neighbours 20% further apart; piles still settle in about 4 s.
- A stage is cleared by merging two 10s: every stage holds 11 cats now (size 12 is gone), so stage 1 has tiers 1–11, stage 2 11–21, … stage 5 41–51. The 11 is the stage's last cat: it wears the first cat's look, the other cats pop into their value, and the jar grows by r(11) / r(1) = 205 / 28 ≈ 7.32 into the next stage.
- Every stage is open: no locks, no "Expansion locked" toast, no lock on the HUD. A clear at stage 5 says "Stage clear!" and play goes on.
- Big Catch: each level moves 3 points of the drop chances from the smallest cat to the biggest (and 1 point from size 2 to size 3), so the biggest drop goes 10% → 13% → 16% → 19% → 22% → 25% (it was 10% → 12% … 18%; the old formula gave less and less per level).
- Golden Touch is now **Golden Merge**: +3% per level (3% at level 1, 15% at 5) that a merge pays ×3 coins, Jackpots included. A golden merge shows a bigger "+coins", bursts gold sparks, rings a bell and sends three coins to the counter. Dropped cats are never golden any more. Same prices; the level carries over.
- The HUD shows one next cat.

### Removed

- Shrine Expansion and Fortune Teller. The save format is now version 3: a version-2 save gets back every coin spent on them (1500 + 10000 + 60000 and 400), its Golden Touch level becomes Golden Merge, and a record tier above 51 is capped at 51.
- The menu's "Unlock Stage N" goal card, golden cats (gold ring, sparkles, glint, HUD shimmer) and the toast.
- The eleventh cat look (Kimono): with 11 sizes the last one wears look 1, so ten looks are used. It is in the git history.

### Decisions (where the request was open)

- "Lighter": a uniform change of density does nothing in matter-js (gravity accelerates every mass alike), so lighter means a little less gravity, big cats lighter relative to small ones, and less grip.
- Big Catch's old formula could not give 1.5–2× more per level (its last levels add about 1 point however high the factor), so it became a straight 3-points-per-level tilt.
- Golden merges roll on their own seeded generator, once per merge at every level, so a seed drops the same cats whatever the Golden Merge level.
- The chaos test now allows the one-step poke into a wall that matter-js makes about once in 300 000 ticks (a light cat squeezed by a newly merged neighbour, back inside on the next step). It happened with the old physics too.

### Known issues

- Jackpots need two last cats in the jar at once, but a clear pops the older one, so in play they practically never happen (as before).
- Balance is still untested on phones: coins after stage 2 grow very fast, and every stage is now reachable from the first run.

## [0.11.0] - 2026-10-06

The new look: the owner's second feedback batch (M12), built from the design canvas the owner approved and the mobile game UX research.

### Added

- Lucky cats instead of numbered circles: eleven looks drawn in code from vector shapes (`src/config/catArt.ts`), one per size, from a plain pink mochi to a kimono cat with both paws raised. Size 12 wears size 1's look, so the stage loop still swaps them seamlessly. The outer edge of each outline is the physics radius, so touching cats touch on screen.
- Each cat's number sits on its plate (belly, tag, plate or koban) and stays upright as the cat rolls. Golden cats get a gold ring, a warm tint and sparkles.
- Settings panel, opened from the gear on the menu: Sound effects, Haptics (only where the phone can vibrate), Reduce motion, How to play (the first-run hints come back) and the version. Each switch is a full-width row that says ON or OFF in words.
- Reduce motion setting: no camera shake, fewer particles, one flying coin, no decorative animations; banners fade instead of popping. The phone's own reduced-motion setting still does the same. Saved in the settings (no migration: older saves get it off).
- Next goal card on the menu: "Unlock Stage N" with a bar towards the next Shrine Expansion price and "N to go"; tapping it opens the shop.
- Shop cards say "Need N more" under a price you can't afford yet.

### Changed

- A cream shrine-garden theme with ink outlines: buttons stand on a solid ink edge and sink into it when tapped; coral only for the one primary button of a screen, gold for coins and progress, red for danger and badges, mint for secondary buttons.
- Main menu: settings on the left, coins on the right, the title, the calico lucky cat swaying on its cushion among floating coins in front of sakura trees, a shrine and a torii, the records, the goal card, a big round PLAY and UPGRADES. The sound toggle moved into Settings, and so did the version.
- The jar is glass in a bamboo frame on a wooden floor; gold knobs and a dashed line mark the rim and flash red in danger. Sakura branches, a torii and a shrine sit behind the glass.
- HUD: a "Score" label, the next cat in a bubble with a "Next" tag, and cat icons drawn from the same art. Pause, Game Over, banners, toasts, the combo label and the rotate screen use the new style.
- New icon set (mon coins with a square hole, gear, paw).
- Theme colour cream (`#fcefdf`); the iOS home-screen app uses the default status bar so its text stays readable on the light theme.

### Fixed

- With the phone's reduced motion on, banners and toasts vanished at once (every animation was cut to 0 ms); now they fade.

### Decisions (where the request was open)

- Cats keep rolling like Suika fruit; only their numbers stay upright.
- `?skin=placeholder` still shows the flat circles, in the game and in the DOM icons.
- The Haptics row hides on iPhones, which have no vibration for web apps.
- No music row until the game has music.

## [0.10.0] - 2026-10-06

The stage loop: the owner's first feedback batch (M12). M10 (balance simulator) is set aside.

### Changed

- Every stage has 12 cats. The only way to the next stage is to make the stage's last cat, the 12th, from two 11s (stage 1: two 11s → a 12). Score thresholds are gone; the score only counts for records.
- Stage clear: the moment the last cat is made, every other cat in the jar pops into its value, half of what merging two of them pays (merging two 4s pays C(4) = 5, so each pays 2.5 → 3). Lucky Save pops pay the same value now.
- The loop: the jar then grows by r(12) / r(1) ≈ 8.93 and the camera zooms out by as much, so the 12 ends up exactly as big as a 1 was and takes its place as the new stage's smallest cat (same size and colour, its own number). Stage 2 holds tiers 12–23, stage 3 23–34, stage 4 34–45, stage 5 45–56. Every stage plays the same (same jar, sizes, drops and goal); score S(t) = 2^t and coins C(t) = round(1.7^(t−1)) keep growing with the numbers.
- Cat sizes follow Suika Game: r(size) = round(28 × 1.22^(size−1)), so cats 11, 9, 8, 7, 6 and 5 cover 55% of the jar and pile up to 88% of its height, like the same six fruits in Suika's box (about 55% and 86%).
- The jar sits higher on tall screens: 45% of the spare height now goes below the floor (on a 435 × 967 phone the rim moved from 378 to 289 px and the floor from 963 to 875 px, where the owner's sketch put 277 and 884).
- Expansion sequence (2.1 s): the clear (0.5 s, the other cats pop and the 12 settles), the zoom (1.2 s, time stop, an even zoom even across ninefold), the reveal (0.4 s). The physics world is rescaled at the reveal instead of growing, so the jar, gravity and speed limits are the same at every stage.
- Queued cats keep their size across an expansion (a queued 3 becomes a 14), with no new rolls.
- HUD: the bar shows the biggest cat in the jar against the stage's last cat, and that cat sits after the bar as a small goal icon. Banners: "The shrine grows!" at a clear that grows the jar, "Stage clear!" at one that can't, "New cats unlocked!" with the next goal at the reveal.
- Locked or last stage: the clear still pops and pays, the last cat stays and play goes on; a locked clear shows the "Expansion locked" toast every time. Two last cats make a Jackpot.
- Placeholder colours repeat every 11 tiers (size 12 = size 1's colour), so every stage looks the same. Body textures are shared by all stages; only the numbers are drawn per stage.
- Merge pitch, particles and camera shake follow the cat's size, not its tier, so every stage sounds and feels the same. A stage clear plays the Jackpot fanfare.
- Numbers from 10^15 show as Qa and from 10^18 as Qi.
- The invisible part of the walls is 4 jar heights tall.
- Debug: the spawn list counts sizes 1–12 of the current stage; `setStage(n)` clears stage after stage; `state()` adds the stage's first and last tier and the bar's progress.

### Removed

- Quick Growth (−6% expansion thresholds): there are no thresholds any more. The save format is now version 2: a version-1 save gets every coin spent on Quick Growth back (150 + 300 + 600 + 1200 + 2400 for all 5 levels).

### Decisions (where the request was open)

- The pop value is half of the base C(t), with multipliers, golden ×3 and the 1-coin minimum, rounded once when paid.
- Shrine Expansion still opens stages 3, 4 and 5. A clear at a locked stage pays but keeps the jar; the last cat stays in it.
- The 12 finishes growing and settles alone for 0.5 s before the zoom (physics runs, input waits), so it never pokes through a wall; time stops for the zoom and the reveal.
- 5 stages, as before (tiers up to 56). Stage-5 scores pass 2^53; the save accepts them.
- The jar keeps its 600 × 870 shape (the sketch kept it); only the cat sizes follow Suika.

### Known issues

- Making the 12th cat means having two 11s in the jar at once, about as hard as two watermelons in Suika Game. Clearing stage 1 may be rare; the owner's playtest decides.
- After stage 2 the coins grow very fast (C(23) = 117,456 per merge), so every upgrade becomes cheap. Balance was not tuned (M10 skipped).
- During the ninefold zoom the old stage's textures are shrunk a lot for about a second (no mipmaps in WebGL1); at the reveal everything is sharp again.

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

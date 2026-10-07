# Maneki Merge: Game Design

> "Maneki Merge" is a working title. Player-facing text says "cats"; code says `Ball` with a `tier`.
> Every number here is a starting value; the owner's playtests (M12) tune them (M10's balance simulator was set aside in v0.10). Keep this file in sync with `src/config/`.

## 1. Pitch

Drop lucky cats into a shrine jar. Two identical cats merge into a bigger cat and pay out coins. Every stage has 10 cats; merge two 9s into the 10th and every other cat pays out its value, then the jar grows: the camera zooms out until the 10th cat is as small as the first one was, and it becomes the first of a new stage of 10 bigger-numbered cats. Every stage is open from the start. Coins carry over between runs and buy permanent upgrades.

- Mobile, portrait, one-handed, offline. A mouse works too, for testing on desktop.
- A run lasts 3–20 minutes.
- Pillars: satisfying merges, the "the world just got bigger" moment, and steady permanent progress.

## 2. Screens

There are exactly two screens. Everything else is a panel or overlay on top of them.

### 2.1 Main menu

A shrine garden in the art of §13, top to bottom:

- Top bar: the **settings** button (a gear) on the left opens the settings panel (§2.4); the coin balance on the right.
- The title "Maneki Merge".
- The hero: the golden lucky cat (Kin, look 9 of the cat art; the calico look 6 with `?skin=vector`) sitting on a pink cushion in front of a sakura garden with a little shrine and a torii, with a few coins floating around it. It takes whatever height is left, so short screens get a smaller cat.
- Best score and best stage as two labelled chips.
- **PLAY**: a big round coral button, the only coral thing on the screen.
- **UPGRADES**: below PLAY. Shows a red dot when any upgrade is affordable and opens the shop panel.
- Install hint, shown only when the game runs in a browser tab. On iOS: "Tap Share, then Add to Home Screen". On Android Chrome: an "Install" button.
- An "Update ready — tap to restart" badge when a new version is waiting.
- The version and build hash live in the settings panel.

### 2.2 Shop panel (over the main menu)

- Slides up, with a close button and the coin balance.
- One card per upgrade (§10) showing an icon, the name, a one-line effect, the current → next value, level pips with the level (e.g. 3/10) and a price button.
- The value each card shows (derived from §10; at MAX only the current value):

  | Upgrade       | Value                                                          | Level 0 → 1 | At max |
  | ------------- | -------------------------------------------------------------- | ----------- | ------ |
  | Lucky Paw     | Coins                                                          | +0% → +15%  | +150%  |
  | Big Catch     | Biggest drop: the share of a stage's largest drop (size 4, §8) | 10% → 13%   | 25%    |
  | Golden Merge  | Golden merges: the chance that a merge pays ×3 coins (§5)      | 0% → 3%     | 15%    |
  | Combo Charm   | Per combo step                                                 | +0% → +8%   | +40%   |
  | Second Chance | Lucky Saves                                                    | 0 → 1       | 2      |

- The price button has three states: affordable (gold), not enough coins (disabled, the price in red with "Need N more" under it), and MAX (dashed, with a check).
- Buying gives feedback: a sound (from M9), a card pulse, and the balance counting down. The purchase is saved at once. The panel scrolls vertically if needed.
- Closing: the close button, a tap on the dimmed menu above the panel, or the back button.

### 2.4 Settings panel (over the main menu)

- A card over the dimmed menu with a close button. Every switch is a whole row (icon, label, one line of help, and an ON/OFF switch that says its state in words too):
  - **Sound effects**: all sounds on or off.
  - **Haptics**: vibration; the row only shows where the browser can vibrate (Android).
  - **Reduce motion**: no camera shake, about a third of the particles, one flying coin per payout, and no decorative animations; banners fade instead of popping. The phone's own reduced-motion setting does the same whatever this switch says.
- **How to play**: the first-run hints show again in the next run.
- The version and build hash, small, at the bottom.
- Closing: the close button, a tap on the dimmed menu, or the back button. There is no music yet, so there is no music switch.

### 2.3 Game

- The screen the owner chose in v0.14 (the "Sakura garden" design): the whole screen is the scene, and the HUD floats over its top.
- The jar (§6, §13.1), with the danger line on its rim.
- The dropper: a calico cat's paw hangs from the top of the screen and holds the current cat by the head, just above the rim. It follows the aim, stays where it is while the next cat comes, lifts a little when it lets go, and is hidden while the jar grows. A dotted aim guide shows where the cat will fall, with a faint ghost of the cat where it lands.
- HUD over the top of the scene. On the left, a narrow cream score card with "SCORE:" and the score in a sunken well. (The stage card under it, with the stage, a progress bar and the stage's last cat, was removed in v0.18 until the owner has art for it; the banners still announce stage clears and the new goal.) On the right, a pink pause button, a "COINS:" card with the coins earned this run, which runs off the right edge, and under it the next cat in a round glass bubble with a small "NEXT" tag on its rim (v0.14.1). Only the pause button takes touches; everywhere else a touch aims.
- Overlays:
  - **Pause**: Resume, Sound, Haptics, Quit to Menu.
  - **Game Over**: score, best score, stage reached, the biggest cat made this run, coins earned this run, new-record badges (best score, best stage, biggest cat ever), Play Again, Menu.
- Short banners: Combo, Jackpot, The shrine grows! (a stage clear that grows the jar), Stage clear! (a clear at the last stage), New cats unlocked! (with the next goal), Lucky Save!.
- First-run hints: "Drag to aim, release to drop" and "Merge two identical cats".

## 3. Controls

- Touch and drag anywhere in the play area. The dropper follows the finger horizontally, clamped so the cat stays inside the jar. Release to drop.
- A tap without dragging drops the cat at the tapped x.
- A dropped cat falls from the dropper to the empty jar floor in 1 second, and lands without bouncing off the floor (cats still bounce a little off each other and the walls).
- After a drop, the next cat appears after a 0.45 s cooldown. Releases during the cooldown are ignored.
- Mouse: move to aim, click to drop.
- Android back button: game → pause, pause → menu, menu → system default.
- Leaving the app (backgrounding) pauses the run automatically.

## 4. Cats: sizes and tiers

Every stage holds the same 10 **sizes** of cat. A cat's **tier** is its number (the cat art doesn't show it, §13.1): it only ever goes up, from 1 at stage 1 to 46 at stage 5, and it sets the score and coins. A cat's size is its place in the current stage: `size = tier − firstTier(stage) + 1`, 1–10. The last size of a stage (10) becomes the first of the next one, so stage 1 holds tiers 1–10, stage 2 tiers 10–19, stage 3 19–28, stage 4 28–37 and stage 5 37–46 (§7). (Until v0.12 a stage held 12 sizes, until v0.15 11; sizes 12 (radius 250) and 11 (radius 205) are gone.)

The radius depends on the size only: `r(s) = round(34 × 1.19^(s−1))` in world units; the jar is 600 × 870 at every stage. v0.19.3 (owner): size 1 grew to what size 2 was (34) and size 9 kept its radius (137), with an even step between them, so every step is smaller than before; size 10 follows the same step (163, 0.27 of the jar's width). Until then it was `round(28 × 1.22^(s−1))` (28 to 168), chosen, when a stage still held 11 sizes, so that sizes 11, 9, 8, 7, 6 and 5 covered about as much of the jar as the same six fruits do in Suika Game's box (55% of its area).

| Size | Radius | Radius / jar width | Until v0.19.3 |
| ---: | -----: | -----------------: | ------------: |
|    1 |     34 |              0.057 |            28 |
|    2 |     40 |              0.067 |            34 |
|    3 |     48 |              0.080 |            42 |
|    4 |     57 |              0.095 |            51 |
|    5 |     68 |              0.113 |            62 |
|    6 |     81 |              0.135 |            76 |
|    7 |     97 |              0.162 |            92 |
|    8 |    115 |              0.192 |           113 |
|    9 |    137 |              0.228 |           137 |
|   10 |    163 |              0.272 |           168 |

When two tier-`t` cats merge, they pay score `S(t) = 2^t` and base coins `C(t) = round(1.7^(t−1))`. Both keep growing with the tier through every stage: a stage-2 merge of two 13s pays like a tier-13 merge, not like a tier-3 one. A single cat's **value** is half of what its pair's merge pays: `C(t) / 2`. That is what it pays when it pops (§5).

| Tier | Score S(t) | Coins C(t) | Value C(t)/2 |
| ---: | ---------: | ---------: | -----------: |
|    1 |          2 |          1 |          0.5 |
|    2 |          4 |          2 |            1 |
|    3 |          8 |          3 |          1.5 |
|    4 |         16 |          5 |          2.5 |
|    5 |         32 |          8 |            4 |
|    6 |         64 |         14 |            7 |
|    7 |        128 |         24 |           12 |
|    8 |        256 |         41 |         20.5 |
|    9 |        512 |         70 |           35 |
|   10 |      1,024 |        119 |         59.5 |
|   19 |    524,288 |     14,063 |      7,031.5 |
|   28 |  2.7 × 10⁸ |  1,667,711 |    833,855.5 |
|   37 | 1.4 × 10¹¹ |  2.0 × 10⁸ |    9.9 × 10⁷ |
|   46 | 7.0 × 10¹³ | 2.3 × 10¹⁰ |   1.2 × 10¹⁰ |

Values are rounded only when paid (§5). Implement the formulas. Unit tests assert these tables.

## 5. Merging

- Two touching cats of the same tier merge into one cat of the next tier, with a pop. The new cat is born at rest exactly at their midpoint and grows from the old size to its new size over about 120 ms, so neighbours get pushed but never launched.
- The new cat starts to turn gently, as if another cat had clipped it: the way its parents slid past each other (when a cat lands on the right shoulder of another, the new cat turns clockwise), small cats faster than big ones. On the floor it rolls a short way.
- A cat takes part in at most one merge per physics step. Merges are queued during collision handling and resolved after the step. When pairs compete for a cat, the oldest cats merge first.
- **The last cat.** Two size-9 cats merge into the stage's last cat (size 10). That clears the stage (§7): every other cat in the jar pops into its value, and the jar grows into the next stage (at stage 5, the last, it stays).
- **Jackpot.** Two of a stage's last cat don't merge upward: both vanish with a big celebration, paying score `2 × S(last)` and coins `5 × C(last)` before multipliers. In play this needs two last cats in the jar at once, which a clear prevents (it pops the older one), so in practice only the debug tools make one.
- **Combo.** A merge within 1.0 s of the previous merge raises the combo counter; otherwise the counter resets to 1. "Combo ×N" shows from N = 2. Combos pay extra coins only with the Combo Charm upgrade. Jackpots count as merges for the combo; pops (stage clears, Lucky Save) neither raise it nor get a combo bonus.
- **Golden merges.** Every merge (and Jackpot) has a chance to be golden: it pays ×3 coins, with a bigger "+coins", gold sparks, a bell and three coins flying to the counter. The chance comes from Golden Merge, 3% per level, 0% without it. Cats themselves are never golden (until v0.12 dropped cats could be, from Golden Touch), so pops pay their plain value.
- **Coin payout** for any merge, Jackpot or pop: `round(base × coinMultiplier × (1 + comboBonus) × (golden ? 3 : 1))`, minimum 1. The base is C(t) for a merge, 5 × C(last) for a Jackpot and the cat's value C(t)/2 for a pop. Halves round up (57.5 → 58), ignoring floating-point noise. So two popping 4s pay what merging them would (C(5) = 8 → 4 + 4); an odd C(t) can pay one coin more.
- Coins go into the persistent wallet immediately. Quitting or a crash never loses earned coins.

## 6. Jar, danger line, game over

- The jar is open at the top: straight walls, a flat floor and rounded bottom corners (quarter circles of radius 168, 0.28 of the jar's width: the bamboo art's inner corners, v0.19.3; 112 from v0.14). Its rim is the danger line.
- The curves are part of the floor, which never bounces (§3): a dropped cat whose first touch is a curve stops dead there, as it would on the flat floor, instead of being swung along the curve across the jar. Then nothing holds it back: it slides down the curve at its natural speed and rolls on along the floor (v0.19.3, owner: cats shouldn't slow down on the curves; until then the curve braked a lone cat on every step, so it crept down).
- A cat is _over the line_ when its top edge is above the rim. A cat is ignored until 0.5 s after it lands (first contact).
- If at least one cat is over the line continuously for 2.5 s, the game is over. While that timer runs, the rim flashes red and a short countdown shows.
- **Lucky Save** (from the Second Chance upgrade) replaces the game over: every cat over the line plus the 6 smallest other cats (smaller tier first, then older first) pop into their value, the timer resets, and a 2 s grace period follows. Only landed cats count, so a cat still falling from the dropper is left alone. You get one save per run per upgrade level.
- At game over, physics stops and the Game Over overlay appears. Play Again starts a new run immediately.

## 7. Stages (signature mechanic)

Every stage plays the same way: the same 600 × 870 jar (aspect 1 : 1.45), the same 10 sizes, the same drop pool of sizes 1–4 (§8) and the same goal, **making the stage's last cat** (size 10, from two size-9 cats). The last cat of a stage is the first cat of the next one. Only the cats' tiers, and so the score and coins, keep growing. Every stage is open from the start: there are no stage locks (Shrine Expansion was removed in v0.12).

| Stage | Tiers | Drops (sizes 1–4) | Last cat (the goal) |
| ----: | ----- | ----------------- | ------------------: |
|     1 | 1–10  | 1–4               |                  10 |
|     2 | 10–19 | 10–13             |                  19 |
|     3 | 19–28 | 19–22             |                  28 |
|     4 | 28–37 | 28–31             |                  37 |
|     5 | 37–46 | 37–40             |                  46 |

**The loop.** When the jar grows, it grows by `r(10) / r(1) = 163 / 34 ≈ 4.8` in every direction (6 until v0.19.3), and the camera zooms out by as much: the last cat shrinks on screen to exactly the size the first cat had, and takes its place. The 10 of stage 1 is the smallest cat of stage 2, shown like a 1 was (same size and look), with its own tier. The floor stays at the bottom of the jar, and the jar looks the same on screen at every stage.

### 7.1 Stage clear and expansion (about 2.1 s)

1. **Stage clear.** The moment the last cat is made (its merge pays as usual), every other cat in the jar pops into its value (§4, §5), oldest first, one after another within a quarter of a second, with a "+coins" each and a fanfare. "The shrine grows!" shows (or "Stage clear!" at the last stage, §7.2).
2. Input is disabled and the dropper hides. For 0.5 s the last cat finishes growing and settles alone in the jar; the danger timer is reset.
3. **Zoom** (about 1.2 s): time stops (physics, the drop cooldown and the combo window freeze), with a whoosh and gold sparks along the rim. The camera zooms out by about 4.8, at an even rate on screen (ease in-out), while the walls slide outward and the rim rises. The camera leads a little, so the jar visibly widens into the new frame; both arrive together. The floor stays put.
4. **Reveal** (0.4 s): the world is now the next stage's. The last cat is size 1 of the new stage, the dropper's cats move to the new stage's pool (§8), and a "New cats unlocked!" banner shows the new goal (the new stage's last cat).
5. Physics resumes, the dropper returns, and input is enabled again.

### 7.2 The last stage

At stage 5 there is no next stage: the clear still happens (every other cat pops into its value and "Stage clear!" shows), the jar doesn't grow, the last cat stays in the jar and the run goes on. The next 46 clears the stage again.

## 8. Drop pool

- Every stage drops its sizes 1–4 (stage 1: tiers 1–4; stage 2: 10–13; …), with base weights `[40, 30, 20, 10]` (smallest first).
- Big Catch tilts the chances towards the bigger cats: each level moves 3 points from the smallest to the biggest and 1 point from size 2 to size 3, so `share_i = base_i + 3 × L × (2i − 3) / 3` % (i = 0 for the smallest):

  | Big Catch |   1 |   2 |   3 |   4 |
  | --------: | --: | --: | --: | --: |
  |         0 | 40% | 30% | 20% | 10% |
  |         1 | 37% | 29% | 21% | 13% |
  |         2 | 34% | 28% | 22% | 16% |
  |         3 | 31% | 27% | 23% | 19% |
  |         4 | 28% | 26% | 24% | 22% |
  |         5 | 25% | 25% | 25% | 25% |

  Until v0.12 it was `base_i × (1 + 0.12 × L × i)`, normalized (10% → 17.5% at L = 5): every level now adds about twice as much.

- The first two drops of a run are always the pool's smallest tier.
- The queue comes from the seeded RNG. The next cat is visible. Every queued cat rolls its tier (the roll happens even for the two fixed opening drops). Golden merges roll on a second generator seeded from the same seed, once per merge whatever the Golden Merge level, so a seed gives the same drops at every level.
- After an expansion, queued cats keep their size: each takes the tier at the same place in the new pool (a queued 3 becomes a 12), so the preview the player saw still holds. No new rolls.

## 9. Score, coins, records

- Score: `S(t)` per merge and `2 × S(last)` per Jackpot. Score only drives best-score records (the stage clears, not the score, grow the jar).
- Coins: merges, Jackpots, stage-clear pops and Lucky Save pops all pay out by the rule in §5.
- Number formatting: thousands separators below 10,000, short format from 10,000 (12.5K, 125K, 3.2M, then B, T, Qa for 10^15 and Qi for 10^18): one decimal below 100 units, none from 100. The short format truncates instead of rounding, so a balance never looks bigger than it is (59,960 shows 59.9K, not 60K).

## 10. Upgrades (permanent, bought in the shop)

| ID             | Name          | Effect per level                                   | Max | Price for each next level                         |
| -------------- | ------------- | -------------------------------------------------- | --: | ------------------------------------------------- |
| `luckyPaw`     | Lucky Paw     | +15% coins from everything                         |  10 | 50, 80, 125, 200, 320, 500, 800, 1250, 2000, 3200 |
| `bigCatch`     | Big Catch     | Bigger cats come more often: +3% biggest drop (§8) |   5 | 100, 250, 600, 1500, 3500                         |
| `goldenMerge`  | Golden Merge  | +3% chance that a merge pays ×3 coins (§5)         |   5 | 120, 240, 480, 960, 1900                          |
| `comboCharm`   | Combo Charm   | +8% coins per combo step (up to 5 steps)           |   5 | 80, 160, 320, 640, 1280                           |
| `secondChance` | Second Chance | +1 Lucky Save per run                              |   2 | 500, 4000                                         |

Derived values, where each name means that upgrade's current level:

- `coinMultiplier = 1 + 0.15 × luckyPaw`
- `comboBonus = 0.08 × comboCharm × min(combo − 1, 5)`
- `goldenChance = 0.03 × goldenMerge`
- `luckySaves = secondChance`

Upgrade definitions are data in `src/config/upgrades.ts`: id, name, description, max level, prices and effect.

Removed upgrades give back every coin spent on them when an older save loads (§11):

- Quick Growth (−6% expansion thresholds), in v0.10, when stage clears replaced the score thresholds.
- Shrine Expansion (unlocked stages 3, 4 and 5) and Fortune Teller (showed the next 2 cats), in v0.12: every stage is open, and the HUD shows one next cat.

Golden Touch (golden dropped cats) became Golden Merge in v0.12; its level carries over.

## 11. Saved data

Everything is stored locally, with a version number:

- wallet coins and upgrade levels
- records: best score, best stage, highest tier ever made
- stats: runs played, total merges, total coins earned, jackpots
- settings: sound, haptics, reduce motion
- flags: which first-run hints have been seen

A run in progress isn't saved. Closing the app ends it, but its coins are already banked.

The save format is at version 4:

- v1 → v2 (v0.10) removed Quick Growth and returns the coins spent on its levels to the wallet (150, 300, 600, 1200 and 2400 for levels 1–5).
- v2 → v3 (v0.12) removed Shrine Expansion (1500, 10000 and 60000 back) and Fortune Teller (400 back), moves the Golden Touch level to Golden Merge, and caps a record tier above 51 (stages had 12 cats, up to tier 56) at 51.
- v3 → v4 (v0.15) caps a record tier above 46 (stages had 11 cats, up to tier 51) at 46.

If a save can't be read, or some of its fields are invalid, a copy is kept (TECH_SPEC §8) and the game continues with the valid fields and defaults for the rest.

## 12. Feedback and juice

- Merge: a pop scale, a particle burst in the cat's colour, a floating "+coins", and a coin icon that flies to the HUD counter. A golden merge shows a bigger "+coins", bursts gold sparks, rings a bell and sends three coins; a Jackpot shows an even bigger "+coins", a gold spark burst and a shower of coins.
- Merges also bump the new cat (a short scale pop on top of its growth) and burst particles in its colour, more for bigger cats.
- Combo: "Combo ×N" over the jar, with the Combo Charm bonus ("+16%") when it has one. The label heats up (bigger, brighter) at ×4 and ×7.
- Danger: the countdown number pulses on each new second, with a tick that rises in pitch (3, 2, 1).
- Stage clear: every other cat pops in turn with its "+coins", and the Jackpot fanfare plays.
- Expansion: gold sparks along the rim when the zoom starts and again along the grown rim at the reveal.
- Sound effects are procedural Web Audio, no files:
  - drop plop; merge pop (lower pitch for bigger sizes, the same at every stage); coin ching
  - rising combo notes; Jackpot and stage-clear fanfare; expansion whoosh + chime
  - danger tick; game over; UI click; purchase
- Haptics (Android only, toggled in Pause and in Settings): a light tick per merge (at most one every 70 ms) and a stronger pattern for Jackpots, stage clears, expansions and Lucky Saves.
- A small camera shake for merges into size 9 and above (stronger for bigger cats), for Jackpots, and a light one that grows with the combo from ×5. Reduce motion (the setting or `prefers-reduced-motion`): no shake and about a third of the particles.
- Menu: the title floats, the lucky cat sways on its cushion, the coins bob, PLAY sends out a soft ring every few seconds, the UPGRADES dot nudges, and buttons sink into their ink edge when tapped.
- Every button clicks; a purchase plays its own sound. Sound off (Settings or Pause) silences everything.

## 13. Art

### 13.1 The lucky cats (the cat art, the default since v0.16)

The owner chose the scene in a design canvas (v0.14): a cream shrine garden, ink outlines, soft pastels. Since v0.16 the cats, and since v0.17 the jar, the paw and the background, are raster art the owner generated with an AI image tool from a reference image (docs/ART_ASSETS.md); the HUD and the menu are still drawn in code until their art arrives. With `?skin=vector` (or if the art can't load) the game uses the code-drawn art of v0.11–v0.15.

- **Cats** (`public/assets/cats/`, `src/config/catSprites.ts`): round maneki-neko balls in the reference image's style, one look per size. Every cat is a perfect circle with only its ears above it, raises one paw (on the viewer's right, palm and pink pads forward) and wears a collar with a gold bell. Each look is one solid body colour with a lighter belly, so the nine look clearly different at a glance (the owner rejected multi-colour coats as hard to tell apart). Size 10 (a stage's last cat) wears look 1, because it becomes the next stage's size 1.

  | Size | Look   | Body colour | What else makes it different                    |
  | ---: | ------ | ----------- | ----------------------------------------------- |
  |    1 | Shiro  | white       | Closed happy eyes, red collar                   |
  |    2 | Kuro   | charcoal    | Grey belly, big golden eyes, red collar         |
  |    3 | Mikan  | orange      | Tabby stripes, sky-blue collar                  |
  |    4 | Sora   | sky blue    | Winking, dark stripes, red collar               |
  |    5 | Sakura | pink        | Tongue out, mint collar                         |
  |    6 | Matcha | green       | Forehead stripes, red collar                    |
  |    7 | Fuji   | purple      | Gold collar, sakura flower on one ear           |
  |    8 | Aka    | red         | Tabby stripes, gold collar and a gold coin      |
  |    9 | Kin    | gold        | Red bib with gold trim, sakura flower on an ear |

  The game draws a thick dark outline (#3b2620) round every cat (v0.18, like the owner's reference image), so neighbouring cats never blend into each other: 5% of the cat's radius, at least 4.5 world units, and the body is drawn that much smaller so the outline's outer edge is the physics radius. DOM icons get a 1 px outline.

  The tool (`npm run art`, TECH_SPEC §14) removes the images' white background and fits each body circle, and the game scales that circle onto the physics radius, so touching cats touch on screen.

- **Numbers**: the cat art shows no numbers (v0.16, the owner's call): a cat's look tells its size. The tier still sets the score and coins (§4). The vector looks (`?skin=vector`) and the placeholders still show their number, upright on the cat's plate.
- **Vector cats** (`?skin=vector`, `src/config/catArt.ts`): the code-drawn looks of v0.11–v0.15 (Sakura, Mint, Tangerine, Lavender, Sky, Calico, Matcha, Daruma, Indigo), kept as a fallback.
- **Jar** (v0.17 art; v0.14 layout): a bamboo U frame with curved bottom corners on two bamboo feet, a rail across the top tied to the posts with twine, and cut caps on the posts. The art's opening is stretched onto the physics jar (its inner edge, the glass's pale rim, lies inside the opening, behind the cats); the bamboo is drawn in front of the cats. Its inner corners have the physics corners' radius (168, v0.19.3; a config test checks the art against it), so a cat in a corner touches the bamboo and never slips behind it (until v0.19.3 the physics corners were 112). A dashed line across the opening marks the rim (the danger line) and flashes red in danger (the vector jar's caps flash too). The glass is a pale wash, so the garden shows through it. The bamboo is thicker than the vector frame's, so the camera shows 0.19 of the jar's width beside each wall (0.15 before v0.17): a 283 px jar on a 390 px phone.
- **Dropper** (v0.17 art): a calico paw (white with orange and dark spots, pink pads) hanging from the top of the screen; a plain row of its arm is stretched up to the screen's top.
- **Background** (v0.17 art): a painted sakura shrine garden: sakura branches and clouds on a cream sky, a torii and a shrine seen through the glass, stone lanterns either side, and a rug on the wooden floor where the jar stands. It moves and scales with the jar so the feet stay on the rug; it always spans the screen's width, its top fades into the sky colour, and the floor colour fills the screen below it. The separate rug image is unused: the background has its own.
- **HUD** (v0.19 art, v0.19.2 cards after the owner's reference image): both cards are CSS in the reference's style: cream with a thin dark outline, rounded corners and a tan bottom edge. The score card (138 × 66 px) has "SCORE:" centred on top and the score in a rounded tan well, with the art's pink paw badge over its left edge. The coins card comes out of the screen's right edge (rounded on the left only) with "COINS:" centred over the art's small gold coin and the run's coins, evenly spaced. Both numbers are white with a thin brown edge. The next cat sits in a round pale blue glass bubble with a cream "NEXT" tag; the pause button is the art's glossy pink square, its outline recoloured to the reference's rose brown. Flying coins land on the coin. The vector HUD of v0.14 stays for `?skin=vector`.
- **Palette**: cream ground, paper plates, ink outlines and text, cocoa for labels; coral only for the primary button of a screen (PLAY, Resume, Play Again), gold for coins, rewards and progress, red for danger and badges, mint for secondary buttons and "on". One font: Fredoka (700 for titles, numbers and buttons; 500–600 for labels).

### 13.2 Placeholder (`?skin=placeholder`)

- Each size is a flat circle in its own colour with a darker outline, and the tier number in bold Fredoka, centered. The number stays upright while the circle rotates.
- There are 9 colours, repeating every 9 tiers (size 10 = size 1's colour).

### 13.3 Owner art (M13)

The owner generates the art phase by phase with the prompts in docs/ART_ASSETS.md and drops the files into `art-source/`: the cats are in (v0.16); the scene, the HUD kit, the menu art and the app icon follow. Images come on a plain white background; the tool cuts it out.

- Cats roll like Suika fruit (v0.11).
- Optional later: a music loop (OGG/MP3, licensed for use, with a music switch in Settings).

## 14. Balance targets (M10, set aside in v0.10)

These were written for score thresholds. With stage clears (§7), clearing stage 1 means making two 9s at once (two 10s until v0.15, two 11s until v0.12); the owner's playtests decide the balance now.

- A new player with no upgrades reaches stage 2 in at least 70% of first runs, with the first expansion within about 2 minutes.
- The first run pays for 2–3 cheap upgrades.
- Maxing every upgrade takes about 50–70 runs.
- A run that reaches stage 4 or 5 lasts 12–20 minutes.
- Every upgrade changes runs noticeably, and none is a mandatory first pick.

## 15. Not in v1 (ideas for later)

- Random in-run perks at each expansion ("choose 1 of 3 blessings")
- Daily seeded challenge, achievements, skins, leaderboards
- Saving a run in progress, cloud save, localization

# Maneki Merge: Game Design

> "Maneki Merge" is a working title. Player-facing text says "cats"; code says `Ball` with a `tier`.
> Every number here is a starting value; the owner's playtests (M12) tune them (M10's balance simulator was set aside in v0.10). Keep this file in sync with `src/config/`.

## 1. Pitch

Drop lucky cats into a shrine jar. Two identical cats merge into a bigger cat and pay out coins. Every stage has 11 cats; merge two 10s into the 11th and every other cat pays out its value, then the jar grows: the camera zooms out until the 11th cat is as small as the first one was, and a new stage of 11 bigger-numbered cats begins. Every stage is open from the start. Coins carry over between runs and buy permanent upgrades.

- Mobile, portrait, one-handed, offline. A mouse works too, for testing on desktop.
- A run lasts 3–20 minutes.
- Pillars: satisfying merges, the "the world just got bigger" moment, and steady permanent progress.

## 2. Screens

There are exactly two screens. Everything else is a panel or overlay on top of them.

### 2.1 Main menu

A shrine garden in the art of §13, top to bottom:

- Top bar: the **settings** button (a gear) on the left opens the settings panel (§2.4); the coin balance on the right.
- The title "Maneki Merge".
- The hero: the calico lucky cat (look 6, no number) sitting on a pink cushion in front of a sakura garden with a little shrine and a torii, with a few coins floating around it. It takes whatever height is left, so short screens get a smaller cat.
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

- The jar, with the danger line on its rim.
- The dropper above the rim holds the current cat. A vertical aim guide shows where it will fall.
- HUD at the top: pause button, score (with a small "Score" label), coins earned this run, a preview of the next cat in a bubble with a "Next" tag, and a stage label with a progress bar towards the stage's last cat and that cat as a small goal icon. The bar shows the biggest cat in the jar: its size − 1 out of 10 (§4); it turns gold at the last stage.
- Overlays:
  - **Pause**: Resume, Sound, Haptics, Quit to Menu.
  - **Game Over**: score, best score, stage reached, the biggest cat made this run, coins earned this run, new-record badges (best score, best stage, biggest cat ever), Play Again, Menu.
- Short banners: Combo, Jackpot, The shrine grows! (a stage clear that grows the jar), Stage clear! (a clear at the last stage), New cats unlocked! (with the next goal), Lucky Save!.
- First-run hints: "Drag to aim, release to drop" and "Merge two identical cats".

## 3. Controls

- Touch and drag anywhere in the play area. The dropper follows the finger horizontally, clamped so the cat stays inside the jar. Release to drop.
- A tap without dragging drops the cat at the tapped x.
- After a drop, the next cat appears after a 0.45 s cooldown. Releases during the cooldown are ignored.
- Mouse: move to aim, click to drop.
- Android back button: game → pause, pause → menu, menu → system default.
- Leaving the app (backgrounding) pauses the run automatically.

## 4. Cats: sizes and tiers

Every stage holds the same 11 **sizes** of cat. A cat's **tier** is the number on it: it only ever goes up, from 1 at stage 1 to 51 at stage 5, and it sets the score and coins. A cat's size is its place in the current stage: `size = tier − firstTier(stage) + 1`, 1–11. The last size of a stage (11) becomes the first of the next one, so stage 1 holds tiers 1–11, stage 2 tiers 11–21, stage 3 21–31, stage 4 31–41 and stage 5 41–51 (§7). (Until v0.12 a stage held 12 sizes; size 12, radius 250, is gone.)

The radius depends on the size only: `r(s) = round(28 × 1.22^(s−1))` in world units; the jar is 600 × 870 at every stage. The sizes were chosen so that cats of sizes 11, 9, 8, 7, 6 and 5 cover about as much of the jar as the same six fruits (watermelon, pineapple, peach, pear, apple, persimmon) do in Suika Game's box: 55% of its area, piling up to about 88% of its height (Suika: about 55% and 86%).

| Size | Radius | Radius / jar width |
| ---: | -----: | -----------------: |
|    1 |     28 |              0.047 |
|    2 |     34 |              0.057 |
|    3 |     42 |              0.070 |
|    4 |     51 |              0.085 |
|    5 |     62 |              0.103 |
|    6 |     76 |              0.127 |
|    7 |     92 |              0.153 |
|    8 |    113 |              0.188 |
|    9 |    137 |              0.228 |
|   10 |    168 |              0.280 |
|   11 |    205 |              0.342 |

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
|   11 |      2,048 |        202 |          101 |
|   21 |  2,097,152 |     40,642 |       20,321 |
|   31 |  2.1 × 10⁹ |  8,193,466 |    4,096,733 |
|   41 | 2.2 × 10¹² |  1.7 × 10⁹ |    8.3 × 10⁸ |
|   51 | 2.3 × 10¹⁵ | 3.3 × 10¹¹ |   1.7 × 10¹¹ |

Values are rounded only when paid (§5). Implement the formulas. Unit tests assert these tables.

## 5. Merging

- Two touching cats of the same tier merge into one cat of the next tier at their midpoint, with a pop. The new cat grows from the old size to its new size over about 120 ms, so neighbours get pushed but never launched.
- A cat takes part in at most one merge per physics step. Merges are queued during collision handling and resolved after the step. When pairs compete for a cat, the oldest cats merge first.
- **The last cat.** Two size-10 cats merge into the stage's last cat (size 11). That clears the stage (§7): every other cat in the jar pops into its value, and the jar grows into the next stage (at stage 5, the last, it stays).
- **Jackpot.** Two of a stage's last cat don't merge upward: both vanish with a big celebration, paying score `2 × S(last)` and coins `5 × C(last)` before multipliers. In play this needs two last cats in the jar at once, which a clear prevents (it pops the older one), so in practice only the debug tools make one.
- **Combo.** A merge within 1.0 s of the previous merge raises the combo counter; otherwise the counter resets to 1. "Combo ×N" shows from N = 2. Combos pay extra coins only with the Combo Charm upgrade. Jackpots count as merges for the combo; pops (stage clears, Lucky Save) neither raise it nor get a combo bonus.
- **Golden merges.** Every merge (and Jackpot) has a chance to be golden: it pays ×3 coins, with a bigger "+coins", gold sparks, a bell and three coins flying to the counter. The chance comes from Golden Merge, 3% per level, 0% without it. Cats themselves are never golden (until v0.12 dropped cats could be, from Golden Touch), so pops pay their plain value.
- **Coin payout** for any merge, Jackpot or pop: `round(base × coinMultiplier × (1 + comboBonus) × (golden ? 3 : 1))`, minimum 1. The base is C(t) for a merge, 5 × C(last) for a Jackpot and the cat's value C(t)/2 for a pop. Halves round up (57.5 → 58), ignoring floating-point noise. So two popping 4s pay what merging them would (C(5) = 8 → 4 + 4); an odd C(t) can pay one coin more.
- Coins go into the persistent wallet immediately. Quitting or a crash never loses earned coins.

## 6. Jar, danger line, game over

- The jar is an open-top box, and its rim is the danger line.
- A cat is _over the line_ when its top edge is above the rim. A cat is ignored until 0.5 s after it lands (first contact).
- If at least one cat is over the line continuously for 2.5 s, the game is over. While that timer runs, the rim flashes red and a short countdown shows.
- **Lucky Save** (from the Second Chance upgrade) replaces the game over: every cat over the line plus the 6 smallest other cats (smaller tier first, then older first) pop into their value, the timer resets, and a 2 s grace period follows. Only landed cats count, so a cat still falling from the dropper is left alone. You get one save per run per upgrade level.
- At game over, physics stops and the Game Over overlay appears. Play Again starts a new run immediately.

## 7. Stages (signature mechanic)

Every stage plays the same way: the same 600 × 870 jar (aspect 1 : 1.45), the same 11 sizes, the same drop pool of sizes 1–4 (§8) and the same goal, **making the stage's last cat** (size 11, from two size-10 cats). Only the numbers on the cats, and so the score and coins, keep growing. Every stage is open from the start: there are no stage locks (Shrine Expansion was removed in v0.12).

| Stage | Tiers | Drops (sizes 1–4) | Last cat (the goal) |
| ----: | ----- | ----------------- | ------------------: |
|     1 | 1–11  | 1–4               |                  11 |
|     2 | 11–21 | 11–14             |                  21 |
|     3 | 21–31 | 21–24             |                  31 |
|     4 | 31–41 | 31–34             |                  41 |
|     5 | 41–51 | 41–44             |                  51 |

**The loop.** When the jar grows, it grows by `r(11) / r(1) = 205 / 28 ≈ 7.32` in every direction, and the camera zooms out by as much: the last cat shrinks on screen to exactly the size the first cat had, and takes its place. The 11 of stage 1 is the smallest cat of stage 2, shown like a 1 was (same size and colour), with its own number. The floor stays at the bottom of the jar, and the jar looks the same on screen at every stage.

### 7.1 Stage clear and expansion (about 2.1 s)

1. **Stage clear.** The moment the last cat is made (its merge pays as usual), every other cat in the jar pops into its value (§4, §5), oldest first, one after another within a quarter of a second, with a "+coins" each and a fanfare. "The shrine grows!" shows (or "Stage clear!" at the last stage, §7.2).
2. Input is disabled and the dropper hides. For 0.5 s the last cat finishes growing and settles alone in the jar; the danger timer is reset.
3. **Zoom** (about 1.2 s): time stops (physics, the drop cooldown and the combo window freeze), with a whoosh and gold sparks along the rim. The camera zooms out by 7.32, at an even rate on screen (ease in-out), while the walls slide outward and the rim rises. The camera leads a little, so the jar visibly widens into the new frame; both arrive together. The floor stays put.
4. **Reveal** (0.4 s): the world is now the next stage's. The last cat is size 1 of the new stage, the dropper's cats move to the new stage's pool (§8), and a "New cats unlocked!" banner shows the new goal (the new stage's last cat).
5. Physics resumes, the dropper returns, and input is enabled again.

### 7.2 The last stage

At stage 5 there is no next stage: the clear still happens (every other cat pops into its value and "Stage clear!" shows), the jar doesn't grow, the last cat stays in the jar and the run goes on. The next 51 clears the stage again.

## 8. Drop pool

- Every stage drops its sizes 1–4 (stage 1: tiers 1–4; stage 2: 12–15; …), with base weights `[40, 30, 20, 10]` (smallest first).
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
- After an expansion, queued cats keep their size: each takes the tier at the same place in the new pool (a queued 3 becomes a 13), so the preview the player saw still holds. No new rolls.

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

The save format is at version 3:

- v1 → v2 (v0.10) removed Quick Growth and returns the coins spent on its levels to the wallet (150, 300, 600, 1200 and 2400 for levels 1–5).
- v2 → v3 (v0.12) removed Shrine Expansion (1500, 10000 and 60000 back) and Fortune Teller (400 back), moves the Golden Touch level to Golden Merge, and caps a record tier above 51 (stages had 12 cats, up to tier 56) at 51.

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
- A small camera shake for merges into size 10 and above (stronger for bigger cats), for Jackpots, and a light one that grows with the combo from ×5. Reduce motion (the setting or `prefers-reduced-motion`): no shake and about a third of the particles.
- Menu: the title floats, the lucky cat sways on its cushion, the coins bob, PLAY sends out a soft ring every few seconds, the UPGRADES dot nudges, and buttons sink into their ink edge when tapped.
- Every button clicks; a purchase plays its own sound. Sound off (Settings or Pause) silences everything.

## 13. Art

### 13.1 The lucky cats (the default since v0.11)

The owner chose the look in a design canvas: a cream shrine garden, ink outlines, soft pastels. Everything is drawn in code from vector data, so it stays sharp at every zoom and works offline.

- **Cats** (`src/config/catArt.ts`): round daruma-like bodies with ears on top, one look per size, getting richer as they grow. Size 11 (a stage's last cat) wears look 1, because it becomes the next stage's size 1.

  | Size | Look      | What makes it different                        |
  | ---: | --------- | ---------------------------------------------- |
  |    1 | Sakura    | Plain pink mochi, sleepy eyes                  |
  |    2 | Mint      | Red polka-dot bib                              |
  |    3 | Tangerine | Tabby stripes, blue collar, gold tag           |
  |    4 | Lavender  | Silver bell, the first raised paw              |
  |    5 | Sky       | Wave-pattern (seigaiha) belly band, gold bell  |
  |    6 | Calico    | The classic maneki-neko: red collar, gold bell |
  |    7 | Matcha    | Holds a gold koban                             |
  |    8 | Daruma    | Daruma face, gold swirls                       |
  |    9 | Indigo    | Gold chain and koban, gold eyes                |
  |   10 | Kuro      | Black cat, red bib, gold eyes                  |

  The eleventh look (Kimono: kimono and obi, both paws raised) left with size 12 in v0.12; it is in the git history.

  Neighbouring sizes differ in shape and accessories as well as colour, so they can be told apart without colour. The outer edge of each body's outline is exactly the cat's radius, so touching cats touch on screen.

- **Numbers**: each cat has a plate (belly, tag, plate, koban) where its tier number sits. The cat rolls; the number stays upright and rides on its plate.
- **Jar**: glass in a bamboo frame, standing on a wooden floor. Gold knobs on the posts and a dashed ink line across the opening mark the rim (the danger line); they flash red in danger.
- **Background**: a cream sky with sakura branches, a torii and a shrine seen through the glass.
- **Palette**: cream ground, paper plates, ink outlines and text, cocoa for labels; coral only for the primary button of a screen (PLAY, Resume, Play Again), gold for coins, rewards and progress, red for danger and badges, mint for secondary buttons and "on". One font: Fredoka (700 for titles, numbers and buttons; 500–600 for labels).

### 13.2 Placeholder (`?skin=placeholder`)

- Each size is a flat circle in its own colour with a darker outline, and the tier number in bold Fredoka, centered. The number stays upright while the circle rotates.
- There are 10 colours, repeating every 10 tiers (size 11 = size 1's colour).

### 13.3 Owner art (optional, M13)

- If the owner delivers drawn art later: `art-source/size-01.png` … `size-10.png`, one cat per size; they repeat every stage like the looks above:
  - square, with a transparent background
  - the round body touching the edges of the square
  - at least 512×512 (1024×1024 preferred for sizes 8–10)
- Optional extras: `app-icon.png` (1024×1024), `logo.png`, `background.png`, `jar.png`, and a music loop (OGG/MP3, licensed for use, with a music switch in Settings).
- Cats rotate like Suika fruit (v0.11); the numbers stay upright.

## 14. Balance targets (M10, set aside in v0.10)

These were written for score thresholds. With stage clears (§7), clearing stage 1 means making two 10s at once (two 11s until v0.12); the owner's playtests decide the balance now.

- A new player with no upgrades reaches stage 2 in at least 70% of first runs, with the first expansion within about 2 minutes.
- The first run pays for 2–3 cheap upgrades.
- Maxing every upgrade takes about 50–70 runs.
- A run that reaches stage 4 or 5 lasts 12–20 minutes.
- Every upgrade changes runs noticeably, and none is a mandatory first pick.

## 15. Not in v1 (ideas for later)

- Random in-run perks at each expansion ("choose 1 of 3 blessings")
- Daily seeded challenge, achievements, skins, leaderboards
- Saving a run in progress, cloud save, localization

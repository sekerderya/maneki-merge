# Maneki Merge: Game Design

> "Maneki Merge" is a working title. Player-facing text says "cats"; code says `Ball` with a `tier`.
> Every number here is a starting value. M10 tunes them with the balance simulator. Keep this file in sync with `src/config/`.

## 1. Pitch

Drop lucky cats into a shrine jar. Two identical cats merge into a bigger cat and pay out coins. Pass a score threshold and the jar grows: time stops, the camera zooms out, the jar widens, and bigger cats become possible. Coins carry over between runs and buy permanent upgrades.

- Mobile, portrait, one-handed, offline. A mouse works too, for testing on desktop.
- A run lasts 3–20 minutes.
- Pillars: satisfying merges, the "the world just got bigger" moment, and steady permanent progress.

## 2. Screens

There are exactly two screens. Everything else is a panel or overlay on top of them.

### 2.1 Main menu

- Title (text placeholder until the final art), with the best score and best stage under it as two labelled chips.
- Coin balance at the top.
- **PLAY**: large and centered.
- **UPGRADES**: below PLAY. Shows a dot when any upgrade is affordable and opens the shop panel.
- Sound toggle in the top-right corner. Version and build hash, small, in a bottom corner.
- Install hint, shown only when the game runs in a browser tab. On iOS: "Tap Share, then Add to Home Screen". On Android Chrome: an "Install" button.
- An "Update ready — tap to restart" badge when a new version is waiting.

### 2.2 Shop panel (over the main menu)

- Slides up, with a close button and the coin balance.
- One card per upgrade (§10) showing an icon, the name, a one-line effect, the current → next value, level pips with the level (e.g. 3/10) and a price button.
- The value each card shows (derived from §10; at MAX only the current value):

  | Upgrade          | Value                                                       | Level 0 → 1 | At max |
  | ---------------- | ----------------------------------------------------------- | ----------- | ------ |
  | Lucky Paw        | Coins                                                       | +0% → +15%  | +150%  |
  | Big Catch        | Biggest drop: the share of stage 1's largest drop tier (§8) | 10% → 12%   | 18%    |
  | Shrine Expansion | Max stage                                                   | 2 → 3       | 5      |
  | Quick Growth     | Thresholds                                                  | 100% → 94%  | 70%    |
  | Golden Touch     | Golden                                                      | 0% → 3%     | 15%    |
  | Combo Charm      | Per combo step                                              | +0% → +8%   | +40%   |
  | Second Chance    | Lucky Saves                                                 | 0 → 1       | 2      |
  | Fortune Teller   | Next cats shown                                             | 1 → 2       | 2      |

- The price button has three states: affordable, not enough coins (disabled), and MAX.
- Buying gives feedback: a sound (from M9), a card pulse, and the balance counting down. The purchase is saved at once. The panel scrolls vertically if needed.
- Closing: the close button, a tap on the dimmed menu above the panel, or the back button.

### 2.3 Game

- The jar, with the danger line on its rim.
- The dropper above the rim holds the current cat. A vertical aim guide shows where it will fall.
- HUD at the top: pause button, score, coins earned this run, a preview of the next cat (or two with Fortune Teller), and a stage label with a progress bar to the next expansion (a lock icon if the next stage isn't unlocked).
- Overlays:
  - **Pause**: Resume, Sound, Haptics, Quit to Menu.
  - **Game Over**: score, best score, stage reached, the biggest cat made this run, coins earned this run, new-record badges (best score, best stage, biggest cat ever), Play Again, Menu.
- Short banners: Combo, Jackpot, The shrine grows!, New cats unlocked, Lucky Save!, Expansion locked.
- First-run hints: "Drag to aim, release to drop" and "Merge two identical cats".

## 3. Controls

- Touch and drag anywhere in the play area. The dropper follows the finger horizontally, clamped so the cat stays inside the jar. Release to drop.
- A tap without dragging drops the cat at the tapped x.
- After a drop, the next cat appears after a 0.45 s cooldown. Releases during the cooldown are ignored.
- Mouse: move to aim, click to drop.
- Android back button: game → pause, pause → menu, menu → system default.
- Leaving the app (backgrounding) pauses the run automatically.

## 4. Cats (tiers)

There are 15 tiers. The radius is `r(t) = round(27 × 1.22^(t−1))` in world units; the stage-1 jar is 600 units wide.
When two tier-`t` cats merge, they pay score `S(t) = 2^t` and base coins `C(t) = round(1.7^(t−1))`.

| Tier | Radius | Score S(t) | Coins C(t) | Dropped from  |
| ---: | -----: | ---------: | ---------: | ------------- |
|    1 |     27 |          2 |          1 | stage 1       |
|    2 |     33 |          4 |          2 | stage 1       |
|    3 |     40 |          8 |          3 | stage 1       |
|    4 |     49 |         16 |          5 | stage 1       |
|    5 |     60 |         32 |          8 | stage 2       |
|    6 |     73 |         64 |         14 | stage 3       |
|    7 |     89 |        128 |         24 | stage 4       |
|    8 |    109 |        256 |         41 | stage 5       |
|    9 |    133 |        512 |         70 | never dropped |
|   10 |    162 |      1,024 |        119 | never dropped |
|   11 |    197 |      2,048 |        202 | never dropped |
|   12 |    241 |      4,096 |        343 | never dropped |
|   13 |    294 |      8,192 |        583 | never dropped |
|   14 |    358 |     16,384 |        990 | never dropped |
|   15 |    437 |     32,768 |      1,684 | never dropped |

Implement the formulas. Unit tests assert this table.

## 5. Merging

- Two touching cats of the same tier merge into one cat of the next tier at their midpoint, with a pop. The new cat grows from the old size to its new size over about 120 ms, so neighbours get pushed but never launched.
- A cat takes part in at most one merge per physics step. Merges are queued during collision handling and resolved after the step. When pairs compete for a cat, the oldest cats merge first.
- **Cap tier.** Each stage has a maximum tier (§7). Two cap-tier cats don't merge upward. Instead they trigger a **Jackpot**: both vanish with a big celebration, paying score `2 × S(cap)` and coins `5 × C(cap)` before multipliers.
- **Combo.** A merge within 1.0 s of the previous merge raises the combo counter; otherwise the counter resets to 1. "Combo ×N" shows from N = 2. Combos pay extra coins only with the Combo Charm upgrade. Jackpots count as merges for the combo; pops (cash-out, Lucky Save) neither raise it nor get a combo bonus.
- **Golden cats.** A dropped cat may be golden; the chance comes from Golden Touch and is 0% by default. If either merging cat is golden, that merge pays ×3 coins. The merged cat is a normal one. A golden cat that pops (cash-out, Lucky Save) also pays ×3.
- **Coin payout** for any merge, Jackpot or pop: `round(base × coinMultiplier × (1 + comboBonus) × (golden ? 3 : 1))`, minimum 1. Halves round up (57.5 → 58), ignoring floating-point noise.
- Coins go into the persistent wallet immediately. Quitting or a crash never loses earned coins.

## 6. Jar, danger line, game over

- The jar is an open-top box, and its rim is the danger line.
- A cat is _over the line_ when its top edge is above the rim. A cat is ignored until 0.5 s after it lands (first contact).
- If at least one cat is over the line continuously for 2.5 s, the game is over. While that timer runs, the rim flashes red and a short countdown shows.
- **Lucky Save** (from the Second Chance upgrade) replaces the game over: every cat over the line plus the 6 smallest other cats (smaller tier first, then older first) pop into coins, the timer resets, and a 2 s grace period follows. Only landed cats count, so a cat still falling from the dropper is left alone. You get one save per run per upgrade level.
- At game over, physics stops and the Game Over overlay appears. Play Again starts a new run immediately.

## 7. Expansion stages (signature mechanic)

The stage-1 jar is 600 × 870 world units. Each stage scales the jar by 1.3 in both directions, so the aspect ratio stays 1 : 1.45. The floor stays at the bottom of the screen, and the camera zooms out so the whole jar still fits.

| Stage | Scale | Jar W × H   | Tier cap | Drop pool | Expand at score ≥ | Unlocked by           |
| ----: | ----: | ----------- | -------: | --------- | ----------------: | --------------------- |
|     1 | 1.000 | 600 × 870   |        7 | tiers 1–4 |             start | –                     |
|     2 | 1.300 | 780 × 1131  |        9 | tiers 1–5 |               500 | –                     |
|     3 | 1.690 | 1014 × 1470 |       11 | tiers 2–6 |             3,000 | Shrine Expansion Lv 1 |
|     4 | 2.197 | 1318 × 1911 |       13 | tiers 3–7 |            12,000 | Shrine Expansion Lv 2 |
|     5 | 2.856 | 1714 × 2485 |       15 | tiers 4–8 |            40,000 | Shrine Expansion Lv 3 |

Thresholds are cumulative run score multiplied by the Quick Growth factor (§10), rounded to a whole number. The HUD progress bar fills from the current stage's threshold to the next one.

### 7.1 Expansion sequence (about 1.6 s)

1. The expansion starts as soon as the score reaches the next threshold and that stage is unlocked. If several thresholds are passed at once, the jar expands one stage at a time.
2. Input is disabled, the dropper hides, physics pauses (a "time stop"), and the danger timers reset. The time stop also freezes the drop cooldown and the combo window.
3. A "The shrine grows!" banner shows, with a whoosh and a burst of gold particles.
4. The camera zooms out and pans (ease in-out, about 1.2 s) while the walls slide outward and the rim rises. The camera leads a little, so the jar visibly widens into the new frame; both arrive together. The floor stays put.
5. **Cash-out** (when the zoom ends). Every cat below the new stage's smallest drop tier pops into coins: C(t) each, with multipliers. These tiny cats would be unreadable at the new zoom. They pop one after another, oldest first, within a quarter of a second.
6. A "New cats unlocked!" banner shows the new tiers: the ones the new tier cap allows (8 and 9 at stage 2).
7. Physics resumes with gravity scaled to the stage (TECH_SPEC §5), the dropper returns at the new rim, and input is enabled again.

### 7.2 Locked stage

If the score passes the next threshold but that stage isn't unlocked, the game shows "Expansion locked — upgrade the Shrine in the shop" once per run and puts a lock icon on the HUD progress bar. The run continues normally, and cap-tier pairs keep producing Jackpots.

## 8. Drop pool

- Base weights by position in the stage's pool, smallest first:
  - 4-tier pool: `[40, 30, 20, 10]`
  - 5-tier pool: `[36, 28, 20, 10, 6]`
- Big Catch at level L sets `weight_i = base_i × (1 + 0.12 × L × i)` (i = 0 for the smallest tier), then normalizes. For example, a 5-tier pool at L = 5 gives about `[20.8, 25.9, 25.4, 16.2, 11.8] %`.
- The first two drops of a run are always the pool's smallest tier.
- Each drop rolls separately for golden (§5).
- The queue comes from the seeded RNG. The next one or two cats are visible. Every queued cat rolls its tier and then its golden flag (both rolls always happen, even for the two fixed opening drops), so a seed gives the same tiers whatever the Golden Touch level.
- After an expansion, queued cats whose tier isn't in the new pool are rolled again from it and keep their golden flag.

## 9. Score, coins, records

- Score: `S(t)` per merge and `2 × S(cap)` per Jackpot. Score only drives expansions and best-score records.
- Coins: merges, Jackpots, cash-outs and Lucky Save pops all pay out by the rule in §5.
- Number formatting: thousands separators below 10,000, short format from 10,000 (12.5K, 125K, 3.2M, then B and T): one decimal below 100 units, none from 100. The short format truncates instead of rounding, so a balance never looks bigger than it is (59,960 shows 59.9K, not 60K).

## 10. Upgrades (permanent, bought in the shop)

| ID                | Name             | Effect per level                                   | Max | Price for each next level                         |
| ----------------- | ---------------- | -------------------------------------------------- | --: | ------------------------------------------------- |
| `luckyPaw`        | Lucky Paw        | +15% coins from everything                         |  10 | 50, 80, 125, 200, 320, 500, 800, 1250, 2000, 3200 |
| `bigCatch`        | Big Catch        | Bigger cats come more often (§8)                   |   5 | 100, 250, 600, 1500, 3500                         |
| `shrineExpansion` | Shrine Expansion | Unlocks stage 3 / 4 / 5                            |   3 | 1500, 10000, 60000                                |
| `quickGrowth`     | Quick Growth     | −6% expansion thresholds                           |   5 | 150, 300, 600, 1200, 2400                         |
| `goldenTouch`     | Golden Touch     | +3% chance that a dropped cat is golden (×3 coins) |   5 | 120, 240, 480, 960, 1900                          |
| `comboCharm`      | Combo Charm      | +8% coins per combo step (up to 5 steps)           |   5 | 80, 160, 320, 640, 1280                           |
| `secondChance`    | Second Chance    | +1 Lucky Save per run                              |   2 | 500, 4000                                         |
| `fortuneTeller`   | Fortune Teller   | See the next 2 cats instead of 1                   |   1 | 400                                               |

Derived values, where each name means that upgrade's current level:

- `coinMultiplier = 1 + 0.15 × luckyPaw`
- `comboBonus = 0.08 × comboCharm × min(combo − 1, 5)`
- `maxStage = 2 + shrineExpansion`
- `thresholdFactor = 1 − 0.06 × quickGrowth`
- `goldenChance = 0.03 × goldenTouch`
- `luckySaves = secondChance`
- `previewCount = 1 + fortuneTeller`

Upgrade definitions are data in `src/config/upgrades.ts`: id, name, description, max level, prices and effect.

## 11. Saved data

Everything is stored locally, with a version number:

- wallet coins and upgrade levels
- records: best score, best stage, highest tier ever made
- stats: runs played, total merges, total coins earned, jackpots
- settings: sound, haptics
- flags: which first-run hints have been seen

A run in progress isn't saved. Closing the app ends it, but its coins are already banked.

If a save can't be read, or some of its fields are invalid, a copy is kept (TECH_SPEC §8) and the game continues with the valid fields and defaults for the rest.

## 12. Feedback and juice

- Merge: a pop scale, a particle burst in the tier's colour, a floating "+coins", and a coin icon that flies to the HUD counter. A Jackpot shows a bigger "+coins", a gold spark burst and a shower of coins; golden merges burst gold sparks.
- Combo: "Combo ×N" over the jar, with the Combo Charm bonus ("+16%") when it has one.
- Sound effects are procedural Web Audio, no files:
  - drop plop; merge pop (lower pitch for bigger tiers); coin ching
  - rising combo notes; Jackpot fanfare; expansion whoosh + chime
  - danger tick; game over; UI click; purchase
- Haptics (Android only, toggled in Pause): a light tick per merge and a stronger pattern for Jackpots and expansions.
- A small camera shake for merges of tier 10 and above and for Jackpots. Respect `prefers-reduced-motion`: no shake and fewer particles.

## 13. Art

### 13.1 Placeholder (used until M13)

- Each tier is a flat circle in its own colour with a darker outline and the tier number in bold Fredoka, centered. The number stays upright while the circle rotates, so a 6 is never mistaken for a 9.
- Golden cats get a gold ring and a shimmer.
- The jar is a simple rounded wooden box. The background is a warm red-to-gold gradient.

### 13.2 Final art (the owner delivers it at the end; integrated in M13)

- `art-source/tier-01.png` … `tier-15.png`:
  - square, with a transparent background
  - the round body touching the edges of the square
  - at least 512×512 (1024×1024 preferred for tiers 10–15)
- Optional extras: `app-icon.png` (1024×1024), `logo.png`, `background.png`, `jar.png`, a golden overlay, and a music loop (OGG/MP3, licensed for use).
- Whether cats rotate like Suika fruit or stay upright is decided in M13.

## 14. Balance targets (M10)

- A new player with no upgrades reaches stage 2 in at least 70% of first runs, with the first expansion within about 2 minutes.
- The first run pays for 2–3 cheap upgrades.
- Shrine Expansion Lv 1 takes about 4–6 runs, unlocking stage 5 about 25–35 runs, and maxing everything about 50–70 runs.
- A run that reaches stage 4 or 5 lasts 12–20 minutes.
- Every upgrade changes runs noticeably, and none is a mandatory first pick.

## 15. Not in v1 (ideas for later)

- Random in-run perks at each expansion ("choose 1 of 3 blessings")
- Daily seeded challenge, achievements, skins, leaderboards
- Saving a run in progress, cloud save, localization

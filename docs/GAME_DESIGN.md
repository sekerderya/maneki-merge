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

The owner's mockup (v0.20, `art-source/menu/mockup.jpg`, §13.1), top to bottom:

- Top bar: the **settings** button (a round cream button with a brown gear) on the left opens the settings panel (§2.4); the coin balance on the right, in a cream pill with a gold paw coin that comes out of the screen's right edge like the HUD's coins card (v0.20.1; it grows to the left for long numbers).
- The logo "Maneki Merge": chunky coral letters on a cream rim, a gold bell on the "M" of "Merge", a few sakura petals.
- The hero: the golden lucky cat (raised paw with pink pads, red collar, gold bell) on a pink cushion with gold tassels, with a warm glow behind it and gold sparkles twinkling around it, in front of the painted shrine garden (sakura branches, a torii, a shrine, stone lanterns, a stone path, a wooden deck and a mat).
- Two record cards: BEST SCORE with a pink paw badge and BEST STAGE with a small red torii, each number in a sunken tan well (long numbers shrink to fit).
- **PLAY**: a big glossy coral pill, the only coral thing on the screen.
- **UPGRADES**: a cream pill with an up arrow, below PLAY. Shows a red dot when any upgrade is affordable and opens the shop panel.
- Install hint, shown only when the game runs in a browser tab. On iOS: "Tap Share, then Add to Home Screen". On Android Chrome: an "Install" button. It and the update badge sit small in the top bar, between the gear and the coins.
- An "Updating…" badge while a new version installs. It installs itself and restarts the app after a second on the menu with no panel open; one that arrives during a run waits for the menu. Tapping the badge retries a stalled update.
- The version and build hash live in the settings panel.

Layout: everything sits where it is in the mockup, on a stage of the mockup's size (768 × 1376) scaled to fit the screen and standing on its bottom edge, lifted clear of the home indicator. The garden spans the screen's width and stands on its bottom edge. A taller screen has free height above the stage: the stage moves up by a fifth of it and the logo by three fifths in all, and the cat (with its glow and sparkles) stays centred between the logo and the record cards (v0.20.1, the owner's call; v0.20.0 kept the stage on the bottom edge and moved only the logo). The top bar stays at the top of the screen, below the safe area. Every word and number is live text (Fredoka). With `?skin=vector` the menu is the code-drawn garden of v0.14: a round coral PLAY, the calico cat (look 6) on its cushion with floating coins, taking whatever height is left.

### 2.2 Shop panel (over the main menu)

- Slides up, with a close button and the coin balance.
- One card per upgrade (§10) showing an icon, the name, a one-line effect, the current → next value, level pips with the level (e.g. 3/10) and a price button.
- The value each card shows (derived from §10; at MAX only the current value):

  | Upgrade       | Value                                                          | Level 0 → 1 | At max |
  | ------------- | -------------------------------------------------------------- | ----------- | ------ |
  | Lucky Paw     | Coins                                                          | +0% → +15%  | +150%  |
  | Big Catch     | Biggest drop: the share of a stage's largest drop (size 4, §8) | 10% → 13%   | 25%    |
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
- The dropper: a calico cat's paw reaches out from under a noren curtain (v0.22, with the raster art; from the top of the screen with `?skin=vector`) and holds the current cat by the head, just above the jar's top rail (v0.21.1; until then the cat hung in front of the rail). It follows the aim, stays where it is while the next cat comes, lifts a little when it lets go, and is hidden while the jar grows. A dotted aim guide shows where the cat will fall, with a faint ghost of the cat where it lands.
- HUD over the top of the scene. On the left, a narrow cream score card with "SCORE:" and the score in a sunken well. (The stage card under it, with the stage, a progress bar and the stage's last cat, was removed in v0.18 until the owner has art for it; the banners still announce stage clears and the new goal.) On the right, a pink pause button, a "COINS:" card with the coins earned this run, which runs off the right edge, and under it the next cat in a round glass bubble with a small "NEXT" tag on its rim (v0.14.1). Only the pause button takes touches; everywhere else a touch aims.
- Overlays:
  - **Pause**: Resume, Sound, Haptics, Quit to Menu.
  - **Game Over**: score, best score, stage reached, the biggest cat made this run, coins earned this run, new-record badges (best score, best stage, biggest cat ever), Play Again, Menu.
- Short banners: Combo, Jackpot, The shrine grows! (a stage clear that grows the jar), Stage clear! (a clear at the last stage), New cats unlocked! (with the next goal), Lucky Save!.
- First-run hints: "Drag to aim, release to drop" and "Merge two identical cats".

## 3. Controls

- Touch and drag anywhere in the play area. The dropper follows the finger horizontally, clamped so the cat stays inside the jar. Release to drop.
- A tap without dragging drops the cat at the tapped x.
- A dropped cat falls from the dropper to the empty jar floor in about 1 second (1.03–1.04 s since v0.21.1 raised the dropper; 1 s before), and lands without bouncing off the floor (cats still bounce a little off each other and the walls).
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
- **Golden cats** (§15.4) skip a tier when they merge. Until v0.21 the Golden Merge upgrade gave every merge a chance to pay ×3 coins; it is gone (§10).
- **Coin payout** for any merge, Jackpot or pop: `round(base × coinMultiplier × (1 + comboBonus))`, minimum 1. The base is C(t) for a merge, 5 × C(last) for a Jackpot and the cat's value C(t)/2 for a pop. Halves round up (57.5 → 58), ignoring floating-point noise. So two popping 4s pay what merging them would (C(5) = 8 → 4 + 4); an odd C(t) can pay one coin more.
- Coins go into the persistent wallet immediately. Quitting or a crash never loses earned coins.

## 6. Jar, danger line, game over

- The jar is open at the top: straight walls, a flat floor and square bottom corners (v0.23.4, the owner's call, with the square bamboo frame). From v0.14 to v0.23.3 its bottom corners were quarter circles (radius 112, then 168 from v0.19.3), with a soft landing on the curves (v0.19.4); both are gone. Its rim is the danger line.
- The floor is like a rug: a cat alone on it rolls like a ball (it turns as fast as it moves, v0.19.5; before, the slippery jar let it slide), slows down evenly and stops, instead of rolling for seconds (v0.19.4). Cats in a pile push each other as before.
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

The trial and blessing picks (§15.5) come between steps 2 and 3.

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
- The queue comes from the seeded RNG. The next cat is visible. Every queued cat rolls its tier (the roll happens even for the two fixed opening drops). Magnets, boulders and golden cats roll on a second generator seeded from the same seed (§15.1), so a seed gives the same drops at every pick level.
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
| `comboCharm`   | Combo Charm   | +8% coins per combo step (up to 5 steps)           |   5 | 80, 160, 320, 640, 1280                           |
| `secondChance` | Second Chance | +1 Lucky Save per run                              |   2 | 500, 4000                                         |

Derived values, where each name means that upgrade's current level:

- `coinMultiplier = 1 + 0.15 × luckyPaw`
- `comboBonus = 0.08 × comboCharm × min(combo − 1, 5)`
- `luckySaves = secondChance`

Upgrade definitions are data in `src/config/upgrades.ts`: id, name, description, max level, prices and effect.

Removed upgrades give back every coin spent on them when an older save loads (§11):

- Quick Growth (−6% expansion thresholds), in v0.10, when stage clears replaced the score thresholds.
- Shrine Expansion (unlocked stages 3, 4 and 5) and Fortune Teller (showed the next 2 cats), in v0.12: every stage is open, and the HUD shows one next cat.

- Golden Merge (+3% per level that a merge pays ×3 coins; 120, 240, 480, 960 and 1900), in v0.21: golden cats skip a tier instead (§15.4).

Golden Touch (golden dropped cats) became Golden Merge in v0.12; its level carried over.

## 11. Saved data

Everything is stored locally, with a version number:

- wallet coins and upgrade levels
- records: best score, best stage, highest tier ever made
- stats: runs played, total merges, total coins earned, jackpots
- settings: sound, haptics, reduce motion
- flags: which first-run hints have been seen

A run in progress isn't saved. Closing the app ends it, but its coins are already banked.

The save format is at version 5:

- v1 → v2 (v0.10) removed Quick Growth and returns the coins spent on its levels to the wallet (150, 300, 600, 1200 and 2400 for levels 1–5).
- v2 → v3 (v0.12) removed Shrine Expansion (1500, 10000 and 60000 back) and Fortune Teller (400 back), moves the Golden Touch level to Golden Merge, and caps a record tier above 51 (stages had 12 cats, up to tier 56) at 51.
- v3 → v4 (v0.15) caps a record tier above 46 (stages had 11 cats, up to tier 51) at 46.
- v4 → v5 (v0.21) removed Golden Merge and returns the coins spent on its levels.

If a save can't be read, or some of its fields are invalid, a copy is kept (TECH_SPEC §8) and the game continues with the valid fields and defaults for the rest.

## 12. Feedback and juice

- Merge: a pop scale, a particle burst in the cat's colour, a floating "+coins", and a coin icon that flies to the HUD counter. A golden cat's merge (§15.4) shows a bigger "+coins", bursts gold sparks, rings a bell and sends three coins; a Jackpot shows an even bigger "+coins", a gold spark burst and a shower of coins.
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

The owner chose the scene in a design canvas (v0.14): a cream shrine garden, ink outlines, soft pastels. Since v0.16 the cats, and since v0.17 the jar, the paw and the background, are raster art the owner generated with an AI image tool from a reference image (docs/ART_ASSETS.md); so are the HUD's pieces since v0.19 and the main menu since v0.20. The shop, settings and overlays are still drawn in code until their art arrives. With `?skin=vector` (or if the art can't load) the game uses the code-drawn art of v0.11–v0.15.

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
- **Jar** (v0.17 art, square since v0.23.4–5; v0.14 layout): a bamboo frame on two angled bamboo feet: two posts joined to a straight, level bottom with small bamboo elbow joints (the round U of v0.17–v0.23.3, the owner's call), a rail across the top tied to the posts with twine, cut caps on the posts, and the glass's pale edge framing the opening. The art's opening is stretched onto the physics jar (its inner edge, the glass's pale rim, lies inside the opening, behind the cats); the bamboo is drawn in front of the cats, except its short inner bends, which lie inside the square physics corners and are drawn behind them: a small cat deep in a corner overlaps the bend by a few pixels. A dashed line across the opening marks the rim (the danger line) and flashes red in danger (the vector jar's caps flash too). The glass is a pale wash, so the garden shows through it. The bamboo is thicker than the vector frame's, so the camera shows 0.19 of the jar's width beside each wall (0.15 before v0.17): a 283 px jar on a 390 px phone.
- **Dropper** (v0.17 art): a calico paw (white with orange and dark spots, pink pads) hanging from the top of the screen; a plain row of its arm is stretched up to the screen's top. Since v0.22 the arm goes behind the noren; since v0.23.2 it reaches up to about the score card's bottom, so it shows through the curtain's slits.
- **Noren** (v0.22 art, the owner's mockup `art-source/scene/noren-mockup.webp`): a shop curtain across the top of the screen, so a tall phone's empty height above the jar isn't a long bare arm. A rose-brown rod with cream loops (the generated rod was tan; the art tool recolours it to the mockup's), four cream panels with a pink band at the hem, and a gold paw coin under the rod in the middle. Its hem hangs 300 world units above the rim, so the paw and a little of the arm show under it; its panels span 1.44 jar widths (just past a phone's edges) and its plain fabric stretches up to the top of the screen. When there isn't room, the rod and the coin go off the top instead of squashing. The HUD floats over it; the paw's arm goes behind it.
- **Background** (v0.17 art): a painted sakura shrine garden: sakura branches and clouds on a cream sky, a torii and a shrine seen through the glass, stone lanterns either side, and a rug on the wooden floor where the jar stands. It moves and scales with the jar so the feet stay on the rug; it always spans the screen's width, its top fades into the sky colour, and the floor colour fills the screen below it. The separate rug image is unused: the background has its own.
- **HUD** (v0.19 art, v0.19.2 cards after the owner's reference image, v0.22 score card and bubble copied from the owner's references `art-source/hud/ref-score.png` and `ref-next.png`): the score card is the owner's image (66 px tall, 141 px wide, wider for a long score): cream with a dark chocolate outline, a white highlight inside its top edge and a tan base, a white beckoning paw with pink pads sticking out of its left end, "SCORE:" (#7F3D2A, 17 px, centred on the card's body, v0.23.2) over a caramel well with the score in it. The coins card is CSS in the reference's style: cream with a thin dark outline, rounded corners and a tan bottom edge. The coins card comes out of the screen's right edge (rounded on the left only), only as wide as its coins need (about 98 px on screen, v0.23.2), with "COINS:" (17 px) over the art's small gold coin and the run's coins, centred. The NEXT bubble hangs 14 px under it (v0.23.2). Both numbers are white with a thin brown edge. The next cat sits in a round glass bubble (v0.22: a dark outline, a cream rim, mint fading to pink, white shines), with "NEXT" in dark brown with a cream edge on its top rim; the pause button is the art's glossy pink square, its outline recoloured to the reference's rose brown. Flying coins land on the coin. The vector HUD of v0.14 stays for `?skin=vector`.
- **Main menu** (v0.20 art, §2.1): the owner first generated a whole-screen mockup, then every piece as an edit of it, so they keep its look: the garden without the interface (it added a stone path, kept by the owner's call), the logo, the cat on its cushion (its cushion turned from the generated peach back to the mockup's pink by the tool), the buttons and a record card, and the small icons (torii, coin, arrow, sparkles). PLAY, UPGRADES, the coins pill and the cards' wells stretch as three-slice strips and the cards as nine-slice frames, so they take any width; the paw badge is the HUD's. The glow and the twinkling sparkles are drawn in code.
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

## 15. Special balls, trials and blessings

> The owner's design (2026-10-08), built in v0.21. Its numbers are starting values: balance and the economy come later.

Later stages get harder and every run gets its own build. Every stage clear asks the player to pick a **trial**, which makes the coming stages harder, and then a **blessing**, which helps. Picks stack by level for the rest of the run, like Vampire Survivors' level-ups: the same pick again raises its level. Trials work through **boulders**. Blessings work through **magnets**, bigger drops and **golden cats**.

### 15.1 The queue

The dropper hands out three kinds of ball: cats, magnets and boulders. Every item rolls its kind when it is queued:

| Kind    | Chance per queued item                                               |
| ------- | -------------------------------------------------------------------- |
| Magnet  | 2% + 3% per More Magnets level                                       |
| Boulder | 0% at stage 1; from stage 2, 3% + 3% per More Boulders level         |
| Cat     | the rest; a cat is golden with 4% per Golden Cats level (0% without) |

- The first two drops of a run are always cats of the pool's smallest tier (§8).
- Magnets and boulders are never golden.
- Debug jumps (`?debug=1`, "Jump to stage") skip the stage-clear picks.
- The NEXT bubble shows the item as it is: a cat (golden ones with their glow), the magnet, or the boulder at its size with its bands.
- A level picked at a stage clear applies to items queued after the pick. The two items already queued (in the paw and in NEXT) stay as they are. At an expansion, queued cats change tier as in §8, and queued boulders keep their size and bands.
- Determinism: kind and golden roll on their own generator, seeded from the run's seed. Every queued item rolls its kind, its golden and its tier every time, whatever the chances, so a seed gives the same tiers at any level.

### 15.2 Magnet

The magnet takes one ball out of the jar and puts it in the paw, to be dropped again.

- When the magnet reaches the paw, the paw holds the magnet instead of a cat and the aim guide hides. A touch on the jar now selects a ball instead of aiming.
- **Select:** tap a ball. Any ball in the jar that has landed (§6) can be selected, cat or boulder; a ball still falling from the dropper can't. The selected ball gets a pulsing gold ring that follows it, and a **Take** button appears just above it (kept on screen).
- Tap another ball to move the selection; tap anywhere else to clear it. The selection also clears if the selected ball merges, breaks or pops, or a stage clear starts.
- **Confirm:** Take. The button ignores taps in its first 0.3 s, so a quick double tap can't take a ball by mistake.
- The taken ball leaves the jar and flies up into the paw (0.25 s, input ignored). It keeps its tier and golden glow, or, for a boulder, its size and the hits it still needs. The player aims and drops it like any cat (§3); the usual cooldown follows, then the next item.
- The magnet is used up. Taking doesn't move the queue: the taken ball replaces the magnet and NEXT stays.
- There's no skip: the magnet stays in the paw until it takes a ball. Physics, the danger timer and the combo window keep running while the player chooses, as while aiming a cat. Pause works as usual.
- **Big balls in the paw:** the band above the rim holds a size-4 cat, the biggest drop. A held ball bigger than size 4 is drawn in the paw at size 4's radius. When released, it takes its true radius with its bottom edge where a size-4 cat's bottom edge would be, and falls. The aim ghost shows its true size, and the aim clamp uses its true radius.
- The first magnet of a profile shows a first-run hint: "Tap a cat, then Take".

### 15.3 Boulder

A boulder is a stone ball that only takes up room.

- It never merges, with cats or with other boulders.
- It uses the same physics as a cat of its size, and counts for the danger line and game over like a cat (§6).
- **Size:** size 2 (radius 40), one size bigger per Big Boulders level. The size is fixed when the boulder is queued.
- **Hits:** a boulder takes a hit from every merge in which at least one of the two merging cats is within 15 world units of it, edge to edge, when the merge resolves: touching, or so close the gap doesn't show (v0.21: cats resting side by side on the floor often leave a gap of a few units). A Jackpot counts as a merge. One merge hits each boulder it reaches once.
- **Breaking:** a boulder needs 1 hit, plus 1 per Iron Bands level at the time it was queued. The last hit breaks it.
- **Look:** grey stone with an ink outline like the cats. Every extra hit it needs is one iron band (a metal plate) round it.
  - Each hit knocks one band off, with a clang and a few sparks.
  - The bare stone breaks on the next hit, with a crunch and stone chips.
  - So the bands show at a glance how many merges are left.
  - With `?skin=placeholder`, a boulder is a grey circle showing the hits left as a number.
- Breaking pays no score or coins for now and doesn't count for the combo.
- **Stage clear:** every boulder in the jar crumbles along with the pops (§7.1), paying nothing.
- **Lucky Save:** boulders over the line crumble; boulders don't count among the 6 smallest cats.
- The magnet can take a boulder (§15.2).

### 15.4 Golden cats

- A golden cat is a normal cat of its tier with a gold glow and sparkles. It must stay easy to tell apart from Kin (size 9), whose body is gold.
- Golden cats only come from the dropper, so they are always sizes 1–4. A merge never makes a golden cat.
- **Merging:** it merges with a cat of its tier, golden or not. When at least one of the two is golden, the new cat is **two tiers** higher instead of one: two 3s make a 5. The new cat is never above the stage's last cat. Drops can't reach that cap, but the debug tools can.
- The new cat isn't golden. It is born and grows as in §5 (over about 120 ms from the old size to its new one), so it pushes its neighbours harder but never launches them.
- The merge pays score and coins like a normal merge of the two cats' tier, and counts once for the combo (economy later). A golden cat that pops (stage clear, Lucky Save) pays its plain value.
- Feedback: the bell and gold sparks of a golden merge, and a bigger pop.
- Golden cats replaced the Golden Merge upgrade (a merge's chance to pay ×3 coins), removed in v0.21.

### 15.5 Stage-clear picks

At every stage clear, including the repeated clears of the last stage, two picks come after the last cat settles alone (§7.1 step 2) and before the zoom:

1. **Choose a trial:** 3 cards; the player picks one.
2. **Choose a blessing:** 3 cards; the player picks one.

Then the zoom follows (§7.1 step 3). At the last stage there is no settling: the picks come right after the pops, and play resumes after them.

- **Options:** each pick shows up to 3 different options, drawn at random from those not at their max level, with the run's seeded RNG. Today there are exactly 3 of each kind, so a pick shows all of them in random order. With fewer than 3 left it shows fewer cards; with none left the pick is skipped.
- The player must pick exactly one: no skip, no reroll, no rarities.
- **Levels:** a pick raises that option's level by 1. Levels last for the run, and every run starts at 0. They aren't saved, because a run in progress isn't saved (§11).
- **Card:** an icon, the name, a one-line effect, the level as pips with "Lv 1 → 2", and the value it changes (current → next), like a shop card (§2.2).
- **Choosing:** tap a card to select it (it lifts and glows), then tap **Choose** to confirm. Taps are ignored for the panel's first 0.4 s, because a clear often comes right after a drop and a tap still in flight mustn't pick.
- **Time:** time stays stopped while the panel is up (physics, the drop cooldown, the combo window, the danger timer). The pause button, the back button (→ pause) and backgrounding work as in play; resuming returns to the pick.

**Trials**

| ID             | Name          | Effect per level                      | Max | Level 0 → max                 |
| -------------- | ------------- | ------------------------------------- | --: | ----------------------------- |
| `moreBoulders` | More Boulders | +3% boulder chance (from stage 2)     |   5 | 3% → 18%                      |
| `ironBands`    | Iron Bands    | Boulders need one more merge to break |   3 | 1 → 4 merges                  |
| `bigBoulders`  | Big Boulders  | Boulders one size bigger              |   4 | size 2 (r 40) → size 6 (r 81) |

**Blessings**

| ID            | Name         | Effect per level                    | Max | Level 0 → max |
| ------------- | ------------ | ----------------------------------- | --: | ------------- |
| `moreMagnets` | More Magnets | +3% magnet chance                   |   5 | 2% → 17%      |
| `bigDrops`    | Big Drops    | +2 Big Catch levels in §8's formula |   5 | see below     |
| `goldenCats`  | Golden Cats  | +4% golden cat chance               |   5 | 0% → 20%      |

- **Big Drops:** the drop weights use `L = Big Catch level + 2 × Big Drops level`, at most 10, in §8's formula `share_i = base_i + L × (2i − 3)` %.
  - L = 6 gives 22/24/26/28%; L = 8 gives 16/22/28/34%; L = 10 gives 10/20/30/40%.
  - Big Drops counts as maxed (not offered) once L reaches 10.

### 15.6 Notes for building it

- The rules (kinds, chances, hits, golden merges, the picks and their levels) live in the headless layers with unit tests. `game/` and `ui/` only draw and send intents (select, Take, the card pick). Every number goes in `src/config/`.
- Debug panel (`?debug=1`): set trial and blessing levels, put a magnet, a boulder or a golden cat in the paw, and open the stage-clear picks. `window.__game` gets matching hooks for Playwright.
- The visuals are code-drawn first; the owner's raster art follows through docs/ART_ASSETS.md.
- Procedural sounds (§12): the magnet's take, a boulder hit (clang), a boulder break (crunch), the golden two-tier merge.

## 16. Not in v1 (ideas for later)

- Daily seeded challenge, achievements, skins, leaderboards
- Saving a run in progress, cloud save, localization

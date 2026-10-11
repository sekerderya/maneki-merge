# Batch 20 plan: economy, score and meta progression

> Written 2026-10-12 from the owner's decisions in chat, for the agent that builds it. Read it whole
> before you start, together with `CLAUDE.md`, GAME_DESIGN §2.2, §4, §5, §7, §9–§11, §14 and §15.5,
> and TECH_SPEC §8 and §11. Once a feature is built, its rules live in GAME_DESIGN; from then on
> GAME_DESIGN wins over this file. Numbers marked _start_ are starting values: build with them,
> measure, and report.

## 1. What and why

Score and coins were left for last on purpose. Today:

- **Coins grow ~118× per stage** (`C(t) = round(1.7^(t−1))` by tier). The balance bot (no
  upgrades) has ~530 coins when it clears stage 1, ~60K at stage 2, ~7M at stage 3 and ~850M at
  stage 4. Every upgrade together costs 21,455, so one run past stage 2 buys the whole shop.
- **The shop barely changes how far a run goes.** Only Big Catch and Second Chance help a run
  survive; the real power is the in-run blessings, which every profile has from its first run. A
  new player can go as far as a maxed one.
- **Score is `2^t`**: about 10^81 at stage 30 ("1.2e81").

This batch makes coins and score readable, puts the run's power behind the shop, and paces the
meta progression.

## 2. Owner decisions (don't change them)

- **Coins by size, times the jar.** A merge pays by the cats' size (1–9), not their tier, times
  the jar's number: stages 1–5 ×1, 6–10 ×2, 11–15 ×3, and so on. When the jar grows, the banner
  says so ("Coins ×2").
- **Score stays exponential, but slow:** clearing stage 30 should give about **5 million**. Score
  also gets a combo multiplier for everyone (Combo Charm stays coins only).
- **Meta length: 8 hours** of continuous play, buying upgrades as soon as they are affordable, to
  unlock and max everything.
- **A new player's first run ends at stage 2–3, rarely 4.** (A new player, not the owner: the
  owner's own fresh run will go further.)
- **Trials are all open from the start** (no stage gates for trials).
- **Full profile: 30 stages in about 50 minutes on average**, with the early stages faster than
  today.
- **Big Catch gets 10 levels** (more frequent progress), and **blessings are bought in the shop**,
  with shop cards opening at stage gates (both confirmed 2026-10-12).
- **Every profile is reset** (the save version bump wipes progress; §8). Only the settings stay.
- Unlocks come from **reaching stages** or from **the upgrades shop**. No player levels or XP.

## 3. Coins

```
coins(merge of two size-s cats at stage n) = round(1.7^(s−1)) × jar(n)     jar(n) = ⌊(n−1)/5⌋ + 1
```

| Size merged |   1 |   2 |   3 |   4 |   5 |   6 |   7 |   8 |
| ----------: | --: | --: | --: | --: | --: | --: | --: | --: |
|  Base coins |   1 |   2 |   3 |   5 |   8 |  14 |  24 |  41 |

- Everything else keeps its rule, on top of this base: a pop pays half (halves round up), a
  Jackpot 5 × the last cat's base, a Hubris three 1.5 ×, a lifted curse twice; Lucky Paw and
  Combo Charm multiply as in §5 of GAME_DESIGN.
- `jar(n)` is the same jar number the backgrounds use (`stageJar`, config/stages.ts).
- "The shrine grows!" gets a second line, "Coins ×N", the new jar's multiplier (text only, in the
  banner's style).
- Expected income per run, no upgrades (the bot makes ~530 coins per stage 1 clear): a run that
  ends in stage 3 ~1.2K, stage 10 ~7.5K, stage 20 ~25K, stage 30 ~52K. Lucky Paw 10 multiplies by
  2.5.

## 4. Score

```
score(merge of two size-s cats at stage n) = round(2^s × G^(n−1) × combo)
G = 1.24 (start)          combo = 1 + 0.1 × min(combo − 1, 5)   (×1 … ×1.5)
```

- The bot scores ~1,800 by the time it clears stage 1 (that is `2^s` per merge, no combo). With
  `G = 1.24` the running total is about 60K after stage 10, 580K after stage 20 and **5M after
  stage 30**. Calibrate `G` with the bot so stage 30 lands at about 5M (with a typical combo), and
  write the measured table into GAME_DESIGN §4.
- Jackpot: `2 × score(size 9)`. Hubris three: 1.5 ×. Other score rules stay.
- The combo multiplier shows on the combo label ("Combo ×4 · Score +30%" or similar; with Combo
  Charm the coin bonus too). Keep it short; the owner checks it on the phone.

## 5. The shop

The upgrades panel gets two sections: **Upgrades** (the four permanent ones) and **Blessings**
(new). Every card keeps today's look (§2.2): icon, name with level, one-line effect,
current → next value, Buy button.

### 5.1 Blessing cards

- A blessing's **shop level is the highest level it can reach in a run.** Golden Cats 0/5: it is
  never offered in a stage-clear pick. Golden Cats 2/5: it can be picked up to level 2 in a run.
- A fresh profile starts with **Golden Cats 1 and Big Drops 1** (free), so the first run sees the
  whole loop (trial, then blessing).
- **Big Drops** has 3 shop levels (1 free + 2 bought): its in-run tilt is capped at L = 10 with
  Big Catch (§8 of GAME_DESIGN), so more levels would buy nothing.
- When no blessing is under its cap, the blessing pick is skipped, as today when every blessing is
  maxed. The run then only gathers trials and ends on its own: the total blessing budget sets how
  far a run can go. With every card maxed the budget is today's (5 + 3 + 5 + 5 + 5 levels).
- The card's stat strip shows the in-run cap's value, e.g. Golden Cats "Up to 8% → 12%".
- Icons: the blessing pick cards' icons (the game's own art in a gold-rimmed medallion: the golden
  cat, the size-4 cat, the magnet, the hanabi, the joker). No new art.

### 5.2 Upgrades

Lucky Paw, Combo Charm and Second Chance keep their effects. **Big Catch goes from 5 to 10
levels** (the owner's call: progress comes more often), each worth **0.8 tilt levels** (L in §8 of
GAME_DESIGN; until now 1). Big Catch 10 is L = 8: 16, 22, 28, 34% (today's max, L = 5, is 25% each),
so a maxed profile clears early stages faster, and it leaves room for Big Drops (L ≤ 10). At 1 L
per level, Big Catch 10 alone would reach L = 10 and Big Drops could never be picked. Its shares
move 2.4 points per level for the biggest and smallest drop and 0.8 for the middle two; the card
shows them rounded (10, 12, 15, 17, 20, 22, 24, 27, 29, 32, 34%). Measured (bot, stage 1): Big
Catch 5 (L = 5) needs 97 drops against 141 without it; L = 9 needs 83.

### 5.3 Stage gates

A card is **locked** until the profile's best stage reaches its gate. A locked card is faded, shows
its icon and name, and "Reach stage N" with the BEST STAGE card's small torii instead of the Buy
button. The Game Over overlay lists cards a run unlocked ("New in the shop: Hanabi").

### 5.4 Prices (start)

Calibrated with the model in §7 for 8 hours. All other upgrade prices are replaced.

| Card          | Gate | Levels | Prices                                            |
| ------------- | ---: | -----: | ------------------------------------------------- |
| Lucky Paw     |    1 |     10 | 300, 600, 1K, 1.6K, 2.5K, 4K, 6.5K, 10K, 16K, 25K |
| Big Catch     |    1 |     10 | 300, 800, 1.6K, 3K, 5K, 8K, 13K, 20K, 30K, 45K    |
| Golden Cats   |    1 |  1 → 5 | 400, 2K, 5K, 12K                                  |
| Big Drops     |    1 |  1 → 3 | 2K, 8K                                            |
| Combo Charm   |    3 |      5 | 1K, 3K, 6K, 12K, 20K                              |
| More Magnets  |    3 |      5 | 1.2K, 3.5K, 8K, 15K, 25K                          |
| Second Chance |    5 |      2 | 10K, 50K                                          |
| Hanabi        |    5 |      5 | 3.5K, 7K, 13K, 22K, 35K                           |
| Joker Cat     |    8 |      5 | 9K, 16K, 26K, 40K, 60K                            |

Total ~610K. Prices and gates live in `src/config/upgrades.ts` (add `gate` and `startLevel` to
`UpgradeDef`; the blessing cards become upgrade ids with their pick as the effect).

## 6. Rules and trials

Trials and rules stay open from the start. Only the shop is gated.

## 7. The pacing model (to check against play)

A greedy-buyer model (scratch script, not in the repo) gave the prices above. Its assumptions,
which the owner's play must confirm:

- A run ends in stage 2.5 at no power and stage 25 with everything (the owner reaches 15–35 maxed),
  linear in "power" (blessing caps, Big Catch, Second Chance).
- A stage takes 120 s at no power (bot: 64 s; a person aims), 70 s maxed, each later stage 3.5%
  longer (more trials): 30 stages maxed ≈ 50 min.
- ~530 coins per stage before multipliers.

Its timeline: run 1 (5 min) buys Lucky Paw 1, Big Catch 1 and Golden Cats 2; after 1 hour runs
reach stage ~7; after 2 hours ~10; after 4 hours ~16; after ~7.9 hours (21 runs) everything is
bought and runs reach ~25.

## 8. Save reset

- `SAVE_VERSION` 6 → 7. Loading any older save keeps only the **settings** (sound, haptics,
  reduce motion) and starts a fresh profile: no coins, upgrades at their start levels, no records,
  no stats, hints unseen. A saved run in progress is dropped.
- GAME_DESIGN §11 lists the migration; TECH_SPEC §8 says why it breaks the "never break saves"
  rule (the owner's call, the game is still in development).

## 9. Debug and measurement

- `?debug=1`: the upgrade-level setters cover the blessing cards; add "Set best stage" (to open
  gates) and a **stage times** readout (each stage's play time this run, and the run's total), so
  the owner can report pace.
- The balance bot (`npm run sim`) gets `--upgrades id=level,…` and reports coins and score per
  stage clear, to calibrate `G` and check §3's income.

## 10. Build order

1. Coins by size × jar, score by size × G^(n−1) × combo (core/economy.ts, config/tiers.ts,
   config/economy.ts), with unit tests and the GAME_DESIGN §4 tables regenerated.
2. Blessing shop cards, caps in `pickOpen`, start levels, Big Catch 10, gates, prices (config,
   core/upgrades.ts, core/picks.ts, core/shop.ts) with tests.
3. Save v7 reset, with tests.
4. Shop panel sections and locked cards; Game Over "New in the shop"; "Coins ×N" on the growth
   banner; the combo label's score bonus.
5. Debug additions; bot flags; calibrate `G`.
6. Docs (GAME_DESIGN §2.2, §4, §5, §7.1, §9, §10, §11, §14 rewritten with these targets, §15.5),
   TECH_SPEC §8, ROADMAP, CHANGELOG, version 0.36.0.

## 11. What the owner tests

1. A fresh profile's first runs: where do they end, and is the first purchase reachable after
   run 1?
2. The stage times readout: stage pace fresh and after a few Big Catch levels.
3. Later, with the debug panel: a maxed profile (all cards max), 30 stages, about 50 minutes,
   early stages quicker than before.

Tuning levers if play disagrees with the model: the price scale, the gates, the free start levels,
Big Catch's top levels, Second Chance's levels, and `G`.

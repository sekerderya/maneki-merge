# Weapons and passives: direction package

> Written 2026-10-16 from the owner's chat (three rounds of ideas and answers). This is a **direction
> package, not a build plan yet**: it records what the owner decided, what they liked with details
> still to discuss, and every proposal on the table, so another session can pick it up. Nothing here
> is built. Before building any piece, discuss its open details with the owner (feel and physics:
> measure options and let the owner pick), then write a batch plan (like `batch-23.md`). Once a
> feature is built, its rules live in GAME_DESIGN §15 and GAME_DESIGN wins over this file.
>
> Read first: GAME_DESIGN §10 (shop cards, gates), §15.1 (the queue), §15.5 (stage-clear picks),
> §15.6–§15.7 and §15.15 (the hanabi, joker and lightning balls, the closest existing models).

## 1. The idea (the owner's words, summed up)

Think of **Vampire Survivors' split between weapons and passive items**:

- **Special balls are the weapons**: Magnet, Hanabi, Joker Cat, Lightning today.
- **Passives** are the blessings that change every drop rather than being a ball: Golden Cats and
  Big Drops today.
- The owner wants **more weapon variety**. A new weapon **doesn't have to be stronger**, only
  different. The goal: as the player progresses they keep **unlocking new special balls**, without
  the game getting harder step by step.
- They prefer a few mechanics in a good balance over many mechanics; new weapons should each touch
  the jar in their own way, not stack more rules on top.

## 2. Systems the owner decided on

| System                                     | Status                                         | Notes                                                                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weapon slots                               | **Decided**                                    | A run holds a limited number of different weapons. The number is open (see §7).                                                                                                     |
| Passive slots                              | **Decided**                                    | Same, for passives. Number open.                                                                                                                                                    |
| Skip                                       | **Decided**                                    | Skip a pick. Proposal: a skipped blessing pick pays the Lucky gift (GAME_DESIGN §15.5), which exists already.                                                                       |
| Banish                                     | **Decided**                                    | Take an option out of this run's pool.                                                                                                                                              |
| Reroll                                     | **Decided**                                    | Draw the pick's options again. (This reverses the old "no rerolls" call from 2026-10-08.)                                                                                           |
| Evolutions                                 | **Decided** (the owner had it in mind already) | A maxed weapon plus a given passive turns into an evolved weapon, as in Vampire Survivors. The recipes in §5 are proposals.                                                         |
| Varied weapon upgrades                     | **Decided**                                    | Each weapon's levels improve it in its own way, not just "+chance". Example the owner gave: Katana's multishot (§3.1).                                                              |
| Seal (banish for good)                     | Proposed, not discussed                        | Vampire Survivors' Seal: shut a weapon out of the pool for every future run, so the player shapes their pool as more weapons open.                                                  |
| Where skip/banish/reroll charges come from | Proposed, not discussed                        | Shop cards that raise each one's charges per run (e.g. Reroll 1 → 3), as Vampire Survivors sells them in its power-up shop. Coins would get a new use once the 8-hour shop is done. |

Still true from before: **no rarities**, **no second currency**, no XP levels (picks come only at
stage clears). Unlocks keep going through shop cards gated by best stage (GAME_DESIGN §10): a
weapon whose card is at 0 is never offered, so spreading new weapons' gates over the stages gives
the steady stream of unlocks the owner wants.

## 3. Weapons

### 3.1 Katana: decided

- Dropped from the paw like any special ball. From the point where it is dropped it **cuts
  straight down, vertically: every cat of sizes 1–4 in that line is cut** (pops into its value,
  like a hanabi's pops, presumably; confirm).
- **Big cats don't stop it** (the owner's call: the cut goes through the whole column).
- **Upgrades: multishot.** The owner's example: with multishot upgraded it also cuts **diagonally
  from the two corners, in an X**. Only an example; how the levels go is to be designed later.
- Open: how wide the cut is, whether it cuts as it falls or all at once when it lands, the look and
  the sound, the levels' path, the shop gate and price.

### 3.2 The merge zone (was "Koban"): liked, details to discuss

- The first pitch was Koban (a lucky coin: merges near it pay ×3 coins). The owner reworked it:
  **it boosts merges, not coins.** It stays where it lands for **5 drops** (from its drop until 5
  more balls have left the paw), and **merges inside its area are "2x"**.
- **Name:** the owner is happy with **Ofuda** (a paper talisman that sticks and blesses the spot) or
  **Shimenawa** (the sacred straw rope that rings a holy place). To settle later. Note: §4 proposed
  "Ofuda" as a passive's name too; if the ball takes it, the passive needs another name.
- **What "2x" means**, two readings were offered:
  - A) **A merge in the zone grows two sizes** instead of one, like a golden cat's merge (GAME_DESIGN
    §15.4). Clearly felt. Claude's recommendation.
  - B) A merge in the zone counts twice (combo, boulder hits). Subtler.
- Open: the reading, the area's size, the look of the zone, upgrades (area, duration, two zones),
  gate and price.

### 3.3 Onibi (ghost fire): liked, details to discuss

- The pitch: it lands and **three small flames circle around it for 5 drops**; any size 1–2 cat that
  touches the orbit pops. Vampire Survivors' King Bible (an orbiting weapon).
- The owner liked it, but how it should work is to be talked over again.

### 3.4 Frog (Kaeru): liked, the owner's version

- Pitched as **Shikigami** (a paper spirit that stays 5 drops and pops the jar's smallest cat after
  every drop: a turret). The owner turned it into **a frog**:
- The frog **stays for 5 drops; every drop ("turn") it shoots its tongue at the jar's smallest cat
  and swallows it** (one cat per drop).
- Open, to discuss in detail: the effect and the look (the tongue, the swallow), whether a swallowed
  cat pays its value, where the frog sits (in the jar as a ball, presumably), what happens when it
  is over the line, upgrades, gate and price.
- (A separate frog pitch, "Kaeru hops across the pile three times popping a cat per hop", was not
  picked; the owner's frog is the turret above.)

### 3.5 Other weapon pitches still open

Pitched in the last round with no answer either way:

- **Torii gate**: a torii appears over the column where it is dropped; the next 3 cats dropped
  through it come out golden. Pops nothing; turns the drops instead. Pairs with Golden Cats.

The patterns so far, so new weapons keep to their own: Katana a line, Hanabi a circle, Lightning a
size, the merge zone an area over time, Onibi an orbit, the frog a turret.

### 3.6 Weapon pitches the owner turned down (don't re-pitch)

Shuriken (column that big cats stop), Senkō sparkler drilling down, snowball that eats size 1s,
paper lantern that lifts a cat out, Tanuki that turns into the commonest size, mochi hammer that
splits a cat in two, egg that hatches a random cat, folding fan sweeping the top layer, moon
gravity, Temari bouncing ball, origami crane that brings a lonely cat its pair, gashapon capsule,
Kaeru hopping across the pile.

## 4. Passives: proposed, not discussed

The idea: the passives are the weapons' **shared stats**, as in Vampire Survivors, so weapon
upgrades (like multishot) and passives speak one language, and evolution recipes follow from it.
Golden Cats and Big Drops stay passives.

| Axis      | Name (proposal)              | Effect                                                                |
| --------- | ---------------------------- | --------------------------------------------------------------------- |
| Might     | Ofuda (name may clash, §3.2) | Every weapon reaches one size bigger (Katana 1–4 → 1–5)               |
| Area      | Andon (paper lantern)        | Hanabi radius, the merge zone, Onibi's orbit grow                     |
| Amount    | Futago suzu (twin bells)     | +1 of each weapon: a second Katana blade, a small second hanabi burst |
| Duration  | Senkō (incense)              | Weapons that stay (merge zone, Onibi, frog) stay more drops           |
| Frequency | Maneki paw                   | Special balls come more often                                         |
| Life      | Daruma                       | +1 Lucky Save in this run (Vampire Survivors' Tiragisu)               |

## 5. Evolutions: every proposal so far (none picked yet)

A weapon at its top level plus a given passive (the Vampire Survivors rule) can evolve. Recipes
proposed in the two rounds:

First round (before passives were defined):

- **Golden Joker** (Joker Cat + Golden Cats): the joker makes the cat it touches **two** sizes
  bigger.
- **Golden Magnet** (Magnet + Golden Cats): the cat the magnet takes turns golden.
- **Thunder Hanabi** (Hanabi + Lightning): the blast also strikes, chain-lightning style, every cat
  of the smallest size it popped.

Second round (with the §4 passives):

- **Kusanagi** (Katana + Might): cuts sizes 1–6.
- **Lasting zone** (merge zone + Senkō / Duration): the zone stays for the rest of the stage.
- **Shakudama** (Hanabi + Andon / Area): a giant hanabi.
- **Raijin** (Lightning + Futago suzu / Amount): strikes two sizes at once.
- **Golden Joker** (Joker Cat + Golden Cats): as above.
- **Two-catch Magnet** (Magnet + Maneki paw / Frequency): the magnet takes two balls.

Note that Thunder Hanabi pairs two weapons, unlike the Vampire Survivors rule (weapon + passive);
Vampire Survivors has a few weapon + weapon unions too, so either is possible.

## 6. Other ideas from the same chat that the owner turned down (don't re-pitch)

Heat-style pre-picked trials at run start, a daily seeded run, hand-made puzzles from the Scenes,
cat set skins and garden decorations bought with coins, ema achievement board, seasons, more jar
backgrounds, Kintsugi and Treasure Boulder blessings, a Matsuri combo fever, a Golden Rhythm rule,
a festival cat, a Daruma guardian at jar growth. (The owner wants weapon variety, not these.)

## 7. Open questions for the next session

1. **Slot counts** for weapons and passives. A sum worth checking: with 4 weapons + 4 passives at
   5 levels each, a run has 40 levels to fill plus evolutions, but today a run gets **one blessing
   pick per clear** (about 30 picks in 30 stages). Options: 3 + 3 slots, two blessing picks at the
   clears where the jar grows, or fewer levels per weapon. Measure with the meta bot before
   choosing (`npm run sim`, see the economy notes in GAME_DESIGN §14).
2. Do the existing weapons get new upgrade paths too (e.g. Hanabi: radius, then a second burst;
   Lightning: one more size; Magnet: takes two)? Today each level only raises the chance.
3. How weapons and passives show on the pick cards and in the HUD (slots full, the evolution
   hint), and how skip / banish / reroll show on the picks screen.
4. The gates and prices of the new weapons' shop cards, spread so a new weapon opens every few
   stages of best stage, the early game untouched (as Lightning's stage 8 gate did).
5. Each new weapon's open details (§3.1–§3.4), and the owner's art for every new look
   (`docs/ART_ASSETS.md`; never code-made designs).

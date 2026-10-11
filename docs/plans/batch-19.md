# Batch 19 plan: Cursed Bell, Copycat and Dice

> Written 2026-10-11 from the owner's decisions in chat, for the agent that builds it. Read it whole
> before you start, together with `CLAUDE.md`, GAME_DESIGN §4–§8 and §15 (especially §15.5 and
> §15.8–§15.11, built in v0.34), and TECH_SPEC §3, §5, §8 and §11. Once a feature is built, its
> rules live in GAME_DESIGN; from then on GAME_DESIGN wins over this file. Numbers marked _start_
> are starting values: build with them, measure, and report.

## 1. What and why

v0.34 added three trials and two rules (Hubris, Echo). The owner wants more variety, especially
in the rules that come every 5 stages. Today only two rules exist, so from stage 15 on, those
clears fall back to a trial. This batch adds:

| Kind  | ID           | Name        | One line                                                                   |
| ----- | ------------ | ----------- | -------------------------------------------------------------------------- |
| Trial | `cursedBell` | Cursed Bell | Now and then a cat is cursed: merge it within N drops or it turns to stone |
| Trial | `quickCurse` | Quick Curse | Follow-up of Cursed Bell: fewer drops before a cursed cat turns to stone   |
| Trial | `moreCurses` | More Curses | Follow-up of Cursed Bell: curses come more often                           |
| Rule  | `copycat`    | Copycat     | The next cat copies the size of your last merge                            |
| Rule  | `dice`       | Dice        | Every merge rolls a die: sometimes a size more, sometimes it fizzles       |

**Lessons from v0.34** (GAME_DESIGN §15.11): rules that add balls on every merge or set off chains
ended runs in about 40 s and had to be cut back twice. None of these adds balls. Measure each one
with a headless bot before shipping (§5.6), the way v0.34's tuning did.

## 2. Owner decisions (don't change them)

- **Cursed Bell is a trial.** Taking it the first time **unlocks** the curse. After that, two
  follow-up trials can come up in later trial picks: **Quick Curse** (fewer drops before the stone)
  and **More Curses** (curses come more often). They are never offered before Cursed Bell is
  taken.
- **Copycat and Dice are rules**, offered with Hubris and Echo at the clears where the jar grows
  (every 5 stages, GAME_DESIGN §15.5). With four rules, rule picks run through stage 20.
- **Art first, no code-made designs.** Every new look comes from the owner's images: the prompts
  are in `docs/ART_ASSETS.md` §4.13 (phase 12): two effect sheets (`fx/curse`, `fx/dice`) and five
  card pictures (`picks/<id>`). The code may move, scale, rotate, fade and sway those images, write
  numbers as live text (Fredoka, like the HUD), and reuse the effects that already exist (boulder
  chips, the merge puff, golden sparkles). It must not draw new shapes or icons. If an image is
  missing or wrong, ask the owner for it with a better prompt; never patch or replace it in code.

## 3. Decisions taken for the owner (note them in the CHANGELOG and the report)

The owner didn't rule on these. Build them as written and list them in the report.

1. **A petrified cat is a bare boulder of its own size, one merge to break.** Iron Bands and Big
   Boulders don't apply to it, so the curse doesn't stack with the boulder trials.
2. **The countdown counts drops, not seconds**, so it never rushes the player (time stops in the
   picks and pauses anyway). The tag shows the drops left. The cat turns to stone when the player
   drops while the tag already shows 0, so the drop that brings it to 0 can still make the merge.
3. **One cursed cat at a time.** A curse that comes due while another is still on waits until that
   one ends.
4. **Lifting a curse pays:** a merge that uses the cursed cat pays its coins twice (the bonus
   equals the merge's own coins, _start_). A magnet taking the cursed cat lifts the curse with no
   bonus. That makes the magnet a counter to it.
5. **Copycat leaves the magnet, boulder, hanabi and joker rolls alone.** Only a cat's size is
   copied; a golden cat stays golden. Big Drops still shapes the rolls a stage makes before its
   first merge, so it stays offered.
6. **Dice never rolls for the merge that makes the stage's last cat, nor for a joker's merge.** A
   lucky roll may make the last cat (two 7s), like two golden 7s already can.
7. **A fizzle still counts as a merge**: it pays, counts for the combo, hits boulders, cracks
   neighbours (Porcelain) and lifts a curse. It never echoes.

## 4. Before you start

1. Sync `main` (Milestone workflow step 1).
2. Check `art-source/fx/` and `art-source/picks/` for the seven files of ART_ASSETS §4.13. Check
   each against ART_ASSETS §2 and the §4.13 checks. If some are missing or fail a check, build the
   headless parts first (rules, physics, saves, tests: §5.1–§5.4 without their **Look** parts),
   then stop and ask the owner for those files, with a corrected prompt for any that failed.
3. Read the code paths that v0.34 touched; the new features plug into the same places:
   - `src/config/picks.ts` (ids, kinds, `PICKS`, the rule ids), `src/core/picks.ts` (`drawOffer`,
     `pickCard`, `pickValue`).
   - `src/run/RunController.ts`: `drop`, `take`, merges' bookkeeping, `clearStage`, the pick flow,
     the salted RNG streams, snapshot and hash.
   - `src/core/dropQueue.ts` (`current`, `next`, `replaceCurrent`, odds).
   - `src/physics/merges.ts` (`MergeResolver`, `MergeOutcome`, Hubris threes, the Echo hook),
     `src/physics/balls.ts`, `src/physics/PhysicsWorld.ts`.
   - `src/core/runSave.ts`, `src/core/events.ts`, `src/core/economy.ts`.
   - `src/ui/overlays/pickOverlay.ts`, `src/ui/pickArt.ts`, `src/config/pickSprites.ts`.
   - `src/game/skins/*`, `src/game/fx/*`, the Hubris hint (`ui/banners/hint.ts`).
   - `tools/build-art.ts`, `tools/buildPicks.ts` and how v0.34 cut `fx/fireball` and
     `fx/porcelain`.
   - `src/debug/index.ts` (panel and `window.__game`).

## 5. Steps

Make one or more Conventional Commits per step. Keep `config` → `core` → `physics` → `run`
headless. Every number goes in `src/config/`. Every new random roll uses the run's seed on **its
own salted stream**, so an old seed without these picks plays exactly as before (the replay hash
test must stay green).

### 5.1 Follow-up trials (picks that need another pick)

- `PickDef` gets an optional `requires?: PickId`. `drawOffer` leaves out any option whose required
  pick is still at level 0. `quickCurse` and `moreCurses` require `cursedBell`.
- Add the three trials and the two rules to `config/picks.ts` (§6 has their cards).
- Tests (`tests/unit/picks.test.ts`): follow-ups never show before Cursed Bell, can show after it;
  maxed options drop out; a rule pick draws from four rules.

### 5.2 Cursed Bell, Quick Curse, More Curses (trials)

**When a curse comes.** With Cursed Bell taken, count the drops in each stage (any kind of ball,
also a ball a magnet took and drops again). The first curse comes due after the stage's
`CURSE_FIRST_DROP`th drop (15, _start_: the jar has cats by then). The next comes due
`curseInterval` drops after the last one began: 30, then 25, 20, 15 with More Curses levels 1–3
(_start_). When one comes due while another cursed cat is still on, it waits until that one ends
(§3.3). Counting starts again at every stage.

**Which cat.** At random (its own salted stream), one cat (`kind === 'cat'`) that has landed, isn't
growing, is of sizes 1 to `CURSE_MAX_SIZE` (6), and whose top is below the rim. When none fits, try
again after the next drop.

**The countdown.** The cat's tag starts at `curseDrops`: 10, then 8, 7, 6 with Quick Curse levels
1–3 (_start_). Every drop after the curse begins takes one off. When the player drops while it
already shows 0, the cat turns to stone just before that ball leaves the paw (§3.2).

**Ways it ends.**

- **Merged** (a pair, a Hubris three, a joker's merge, a Dice roll of any outcome): the curse is
  lifted. The merge pays a bonus equal to its own coins (`CURSE_LIFT_BONUS = 1`, _start_), with
  the golden-merge sparkle and chime.
- **Magnet:** taking the cursed cat lifts the curse, no bonus. The cat goes into the paw as a
  normal cat.
- **Gone otherwise** (a hanabi pops it, a Lucky Save pops it, Porcelain breaks it, the stage
  clears): the curse just ends. Shards, echoes and new cats are never cursed.
- **Stone:** the cat is replaced, where it is and with its velocity and angle, by a boulder of its
  own size with one hit to break (bare stone), whatever Iron Bands and Big Boulders say (§3.1).
  From then on it is an ordinary boulder (it breaks, crumbles at a clear, a magnet can take it).
  It pays nothing.

**Save.** The cursed ball's id and drops left, and the stage's drop count and next due drop, go
into the run snapshot; snapshots without them load with no curse.

**Look (art from `fx/curse` only).** The cursed bell floats just above the cat, follows it without
turning, and shows the drops left as live text on its blank tag. The flame ring sits round the cat,
scaled to its radius, and turns slowly (static with reduced motion). From 2 drops left the bell
sways (no sway with reduced motion). Turning to stone: the cat and the ring fade out as the boulder
art fades in (0.3 s), with the existing boulder chips and a low stone grind (procedural,
`audio/sfx.ts`). A curse beginning plays a dull bell (procedural). The first curse of a profile
shows a hint pill: "Cursed! Merge this cat before its bell runs out".

**Cards.** See §6. Pictures: `picks/cursedBell`, `picks/quickCurse`, `picks/moreCurses`.

**Tests.** The first curse at the right drop; the interval per More Curses level; only fitting cats
get cursed; one at a time; the countdown per Quick Curse level; stone at the drop after 0, as a
1-hit boulder of the cat's size even with Iron Bands and Big Boulders; a merge lifts it and pays the
bonus; a magnet lifts it without; hanabi, Lucky Save, Porcelain break and stage clear end it;
determinism (same seed and inputs, same hash); save round trip; an old snapshot loads.

### 5.3 Copycat (rule)

**Rule.** While Copycat is on, the run remembers the size of the cats in the stage's latest merge:
the size that met (a pair's or a three's; for a joker's merge, its cat's size; for a Dice fizzle,
the size that met too), at most `COPYCAT_MAX_SIZE` (4, the biggest drop, _start_). A queued cat's
size follows it: the cat in **NEXT** changes to that size whenever a merge happens, until it moves
into the paw, where it is fixed. Before the stage's first merge, cats are rolled as usual. Magnets,
boulders, hanabi and jokers are rolled as before and never change; a golden cat stays golden at its
new size (§3.5). The run's first two drops stay the smallest size. Saved with the run (the
remembered size per stage).

**Look.** No new art: when NEXT changes, it uses the existing merge puff on the bubble. When the rule
is chosen, a hint shows as the next stage starts: "Copycat: the next cat copies your last merge".

**Tests.** NEXT follows the latest merge and the paw's cat doesn't change; sizes above 4 give a 4;
the first merge of a stage switches it on and a new stage starts with normal rolls; specials and
golden as in §3.5; determinism; save round trip.

### 5.4 Dice (rule)

**Rule.** While Dice is on, every merge of two cats, or three under Hubris, rolls on its own salted
stream before it resolves:

- **Lucky** (`DICE_LUCKY_CHANCE`, 1/6, _start_): the new cat is one size bigger than it would have
  been (a pair makes two sizes up, a Hubris three three, a golden pair three), never above the
  stage's last size. A lucky roll may make the last cat (§3.6).
- **Fizzle** (`DICE_FIZZLE_CHANCE`, 1/6, _start_): the cats become **one** cat of their own size at
  their midpoint (two 4s make one 4). It doesn't grow; it counts as a merge in every way (§3.7) and
  never echoes.
- Otherwise the merge is normal.
- No roll for a joker's merge or the merge that makes the stage's last cat (§3.6).
- `MergeOutcome` says which way it went (for example `dice: 'lucky' | 'fizzle' | null`), so
  effects, sounds, Echo and the economy can tell.

**Look (art from `fx/dice` only).** On a lucky roll the gold die pops up over the merge, rises a
little and fades (about 0.6 s) with the golden-merge chime; on a fizzle the grey die does the same
with a dull clack (procedural) and the existing puff. Normal merges show nothing. With reduced
motion the die fades in and out without rising.

**Tests.** The rates over many seeded rolls; lucky sizes for a pair, a three and a golden pair; the
cap; a fizzle gives one cat of the same size, pays, hits boulders, cracks, lifts a curse and
doesn't echo; no roll for jokers and the last cat; determinism.

### 5.5 Art

Run the pipeline on the phase 12 files (`npm run art`, extend `tools/` where needed):

- `fx/curse` → the cursed bell (with the tag's centre and size measured, for the live number) and
  the flame ring. The ring's middle is white enclosed by the flames: remove all of the white, the
  middle too.
- `fx/dice` → the lucky and the unlucky die.
- `picks/cursedBell`, `picks/quickCurse`, `picks/moreCurses`, `picks/copycat`, `picks/dice` → card
  pictures like the others (`config/pickSprites.ts`).

All new images are precached (offline). Check each against ART_ASSETS §2 and the §4.13 checks.

### 5.6 Balance check (required)

v0.34's rules had to be tuned twice after the owner played them. Measure first this time:

- Write a headless bot that plays a run the way v0.34's tuning did (drops as fast as it can at a
  seeded random x, takes the first card of every pick unless a test forces one), and keep it in the
  repo as `npm run sim` (CLAUDE.md reserves that name), documented in TECH_SPEC §11, so later
  batches reuse it.
- For each new pick, 30 seeds of a stage-1 jar with it on against 30 without: stages cleared and
  runs lost. For Cursed Bell also at Quick Curse and More Curses both at max (they multiply each
  other, like the boulder trials did, and the owner should see how much).
- If a rule makes runs end much sooner than Hubris or Echo do now, tune its _start_ numbers
  (`COPYCAT_MAX_SIZE`, the Dice chances, the curse's drops and interval) before shipping, and say
  what you changed and why.
- Put the table in the report and in the CHANGELOG entry, like v0.34's notes.

### 5.7 Debug, docs, release

- Debug panel (`?debug=1`) and `window.__game`: set the three trials' levels and Copycat and Dice on
  or off; curse a cat by id (or the newest), set its drops left; force the next Dice roll (lucky,
  fizzle, normal). Update TECH_SPEC §11.
- E2E: extend the picks spec so Cursed Bell's follow-ups appear only after it, through
  `window.__game`. Run only that spec locally (`--project=pixel-chromium --workers=1`).
- GAME_DESIGN §15: the trials table (+3 rows, with "needs Cursed Bell"), the rules table (+2 rows),
  §15.5 (follow-up trials; four rules), new subsections for the Cursed Bell, Copycat and Dice, and
  §12 for the new sounds. TECH_SPEC §5 (Dice in merge resolution) and §8 (the snapshot's new
  fields).
- ROADMAP: tick Batch 19. CHANGELOG `[0.35.0]` with the §3 decisions and the §5.6 table.
  `package.json` 0.35.0.
- Verify at 390×844 and 375×667: play seeded runs with each new pick on (debug panel), take
  screenshots (a cursed cat with its bell and ring, the turn to stone, a lifted curse, NEXT copying
  a merge, a lucky and a fizzled die, the new cards) into `docs/screenshots/v0.35.0/`. Console
  clean.
- Ship per the Milestone workflow, tag `v0.35.0`, and report in Turkish: what changed, the balance
  table, the §3 decisions, what to test on the phone.

## 6. Card texts and values (summary)

| ID           | Kind  | Max | Needs       | Name        | Effect line                                                          | Stat label           | Values            |
| ------------ | ----- | --: | ----------- | ----------- | -------------------------------------------------------------------- | -------------------- | ----------------- |
| `cursedBell` | trial |   1 | –           | Cursed Bell | Now and then a cat is cursed: merge it in time, or it turns to stone | Curse                | Off → On          |
| `quickCurse` | trial |   3 | Cursed Bell | Quick Curse | Cursed cats turn to stone sooner                                     | Drops to stone       | 10 → 8 → 7 → 6    |
| `moreCurses` | trial |   3 | Cursed Bell | More Curses | Curses come more often                                               | Drops between curses | 30 → 25 → 20 → 15 |
| `copycat`    | rule  |   1 | –           | Copycat     | The next cat copies the size of your last merge                      | Next cat             | Random → Copied   |
| `dice`       | rule  |   1 | –           | Dice        | Every merge rolls a die: sometimes a size more, sometimes it fizzles | Merges               | Sure → Rolled     |

## 7. Out of scope

- No change to the existing trials, rules or blessings, except where §3 says how they meet the new
  ones.
- No new blessings, rerolls, rarities or currencies; no narrowing of the jar.
- No code-drawn icons, badges or effects beyond what §2 allows.

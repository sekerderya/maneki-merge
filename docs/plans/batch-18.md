# Batch 18 plan: new trials and stage rules

> Written 2026-10-11 from the owner's decisions in chat, for the agent that builds it. Read it whole
> before you start, together with `CLAUDE.md`, GAME_DESIGN §4–§8 and §15, and TECH_SPEC §3, §5, §8
> and §11. Once a feature is built, its rules live in GAME_DESIGN; from then on GAME_DESIGN wins over
> this file. Numbers marked _start_ are starting values: build with them, measure, and report.

## 1. Why

Today there are three trials, and all three are about boulders: More Boulders (how often), Big
Boulders (how big) and Iron Bands (how many merges to break). They multiply each other. At their
max a boulder is 6× as frequent, 4× the area and takes 4× the merges, so the burden grows about
96×, and since every trial pick shows all three, the player can't avoid them. The owner wants
trials that make the game harder **in different ways that don't build on each other**, and never
by narrowing the jar.

This batch adds:

| Kind            | ID          | Name       | One line                                                                        |
| --------------- | ----------- | ---------- | ------------------------------------------------------------------------------- |
| Trial           | `wind`      | Wind       | The wind pushes falling balls sideways; one direction per run, the seed decides |
| Trial           | `heavyDrop` | Heavy Drop | Dropped balls fall faster and hit harder; a fireball at the top level           |
| Trial           | `porcelain` | Porcelain  | A merge can crack the cats beside it; a cracked cat that cracks again breaks    |
| Rule (new kind) | `hubris`    | Hubris     | Sizes 1–5 merge only in threes, and a three-way merge skips a size              |
| Rule (new kind) | `echo`      | Echo       | A merge of sizes 4–7 leaves a cat of the merged size beside the new cat         |

Why they don't stack: Wind makes aiming harder, Heavy Drop makes the drop harder to control,
Porcelain punishes merging next to your own cats (the opposite of boulders, which want merges
beside them), and the rules change how merging works. Heavy Drop even softens Wind: a faster fall
leaves the wind less time to push. Porcelain is triggered by merges, **not** by impacts, on
purpose, so Heavy Drop doesn't feed it.

## 2. Owner decisions (don't change them)

- **Rules come every 5 stages, instead of the trial.** At the stage clears where the jar grows
  (stages 5, 10, 15, …: `clearGrowsJar(stage)` in `config/stages.ts`), the picks are **rule → blessing**. At the other
  clears they stay **trial → blessing**. When no rule is left, those clears offer a trial as usual.
- **A rule has one level**: on or off for the rest of the run. Rules stack with each other (both
  can be on after stage 10).
- **Hubris:** cats of sizes 1–5 need **three** to merge; a three-way merge makes a cat **two**
  sizes bigger (three 3s make a 5).
- **Echo:** only merges whose cats are sizes **4–7** echo (the owner's example: two 4s make a 5,
  and a 4 appears on a random side of it). Never for the stage's last cat.
- **Wind:** each run blows either to the right or to the left, chosen at random by the game
  (the run's seed).
- **Heavy Drop:** at higher levels the ball shoots down like a fireball.
- **Porcelain:** the neighbour-crack version (a merge cracks the cats beside it), in the porcelain
  look, with gold kintsugi seams.
- **Art comes first.** The prompts are in `docs/ART_ASSETS.md` §4.12 (phase 11): two effect
  sheets (`fx/fireball`, `fx/porcelain`) and five card pictures (`picks/<id>`). Never draw a
  substitute for the owner's art (memory: no self-made art); code may add effects (sparks, glows,
  petals, ripples), as it does for the hanabi and the magnet.

## 3. Decisions taken for the owner (note them in the CHANGELOG and the report)

The owner didn't rule on these. Build them as written and list them in the report so the owner
can change them.

1. **What wind and heavy drop act on:** every ball that leaves the paw (cat, golden cat,
   boulder, hanabi, joker, a ball a magnet took and drops again), only **from the drop until its
   first contact** (`landedMs < 0`). Balls already in the pile never feel them.
2. **Porcelain spares cats of the merging size.** A merge cracks only neighbours whose size
   differs from the merging cats', so it doesn't spoil the next merge in a chain.
3. **The two pieces of a broken cat never merge with each other** (otherwise they would merge
   straight back into the cat that broke). Each merges normally with any other cat of its size.
4. **Hubris and the joker:** the joker stays the wild card. A joker still merges with one cat of
   any size and makes it one size bigger, so it is a way around Hubris.
5. **Hubris and golden cats:** a three-way merge with a golden cat among the three goes up
   **three** sizes (two for the three, one for the gold), never above the stage's last size.
6. **Echo leaves the joker alone:** a joker's merge never echoes.
7. **Rule cards** show "New rule" where trials show "Lv 1 → 2", and get their own colour: a
   **vermilion** (shrine-red) medallion rim and glow, next to the trials' blue glow and the
   blessings' gold. If the medallion rim is part of an image rather than CSS, ask the owner before
   making a new rim image (icon kit, ART_ASSETS §5, says rim variants come from an approved
   mockup).

## 4. Before you start

1. Sync `main` (Milestone workflow step 1).
2. Check `art-source/fx/` and `art-source/picks/` for the seven files of ART_ASSETS §4.12. Check
   each against ART_ASSETS §2 and the §4.12 checks. If some are missing or fail a check, build
   steps 5.1–5.6 first (the rules and physics work without art, with the placeholder skin), then
   stop before 5.7 and ask the owner for those files, with a corrected prompt for any that failed.
3. Read the code paths below. They are where today's trials live:
   - `src/config/picks.ts`: pick ids, kinds, `PICKS` table, `PICK_ORDER`.
   - `src/core/picks.ts`: levels, `dropOdds`, `drawOffer`, `pickCard`, `pickValue`.
   - `src/run/RunController.ts`: `drop`, `choose`, `clearStage`, `beginPicks`, `offerNextPick`,
     the salted RNG streams, snapshot and hash.
   - `src/physics/PhysicsWorld.ts` (`scanContacts`, speed limits, steps), `src/physics/merges.ts`
     (`MergeResolver`), `src/physics/balls.ts` (`Ball`, `BallSpec`).
   - `src/core/runSave.ts` (the run snapshot), `src/core/events.ts` (`pickOffered`, `pickChosen`).
   - `src/ui/overlays/pickOverlay.ts`, `src/ui/pickArt.ts`, `src/config/pickSprites.ts`,
     `src/ui/styles/pick-art.css` (the cards).
   - `src/game/skins/*` (BallSkin), `src/game/fx/*` (effects), `src/game/AimGuide.ts`.
   - `tools/build-art.ts` and `tools/buildPicks.ts` (the art pipeline, `npm run art`).
   - `src/debug/index.ts` (the debug panel and `window.__game`).

## 5. Steps

Make one or more Conventional Commits per step. Keep `config` → `core` → `physics` → `run`
headless. Every number goes in `src/config/`. All randomness uses the run's seeded RNG, each new
roll on its **own salted stream**, so that adding a stream never changes what an old seed drops.

### 5.1 Rules as a pick kind, and the new pick order

- `config/picks.ts`: `PickKind` becomes `'trial' | 'blessing' | 'rule'`. Add
  `TRIAL_IDS += 'wind', 'heavyDrop', 'porcelain'` and `RULE_IDS = ['hubris', 'echo']`, and include
  both in `PICK_IDS`. `pickIds(kind)` handles `'rule'`. Add the five `PICKS` entries (§6 has the
  card texts and values). Rules have `maxLevel: 1`.
- The pick order depends on the clear: `pickOrder(grows: boolean)` returns `['rule', 'blessing']`
  for a stage clear that grows the jar, else `['trial', 'blessing']`. In `offerNextPick`, a
  `'rule'` pick with no options left falls back to a `'trial'` pick (not to nothing).
- `RunController.beginPicks` needs to know whether this clear grows the jar. It already knows in
  `clearStage` (`next.grows`).
- `core/runSave.ts`: `'rule'` is a valid `PickKind` in a snapshot's `pickQueue` and `offer`. A
  snapshot without the new ids loads with them at 0 (that already works for new pick ids, check
  it). Old snapshots must keep loading (test it with a saved v0.33 snapshot fixture).
- Pick overlay: the title for a rule pick is "Choose a rule", with the detail "It changes the game
  for the rest of the run". The level line reads "New rule". Vermilion glow and rim (§3.7).
- Tests: `tests/unit/picks.test.ts` (offers, order at growth clears, fallback to a trial when both
  rules are taken, card values), `tests/unit/runSave.test.ts` (round trip, old snapshot),
  `tests/physics/runController.test.ts` (a run through stage 5 is offered a rule, stage 6 a trial).

### 5.2 Wind (trial)

**Rule.** When the run starts, a seeded roll (its own salted stream) sets `windDirection` to
`1` (right) or `-1` (left), whether or not the player ever takes Wind. It is saved with the run.
With Wind at level L > 0, every ball from the drop until its first contact gets a constant sideways
acceleration of `WIND_ACCEL_PER_LEVEL × L × windDirection` (world units per second², applied every
fixed step to the velocity). It never acts on a ball that has touched anything.

**Numbers (start).** `WIND_ACCEL_PER_LEVEL = 100` u/s², max level 5. On a full one-second fall to
the empty floor that drifts a ball ½·a·t² = 50 u at level 1 and 250 u at level 5 (the jar is 600
wide). Measure the drift at every level for a full fall and for a fall onto a half-full jar, and put
the table in the report. Physics feel is the owner's to judge (memory: discuss game feel first).

**Edges.**

- The wind can push a ball against a wall: it just slides down the wall. `clampDropX` stays as
  it is.
- The aim guide stays a straight line under the paw. It shows where the ball leaves the paw, not
  where it lands. Bending it with the wind would take the challenge away; mention it in the report
  as an option.
- Speed limits stay. The wind can't push a ball past `MAX_SPEED_BASE`.

**Look.** The player must see the wind before dropping. Draw in code, in `game/` or as a DOM
layer above the jar: sakura petals (the menu's petal shape, `ui/scenery.ts`) and a few thin wind
streaks drift across the top of the screen in the wind's direction, more and faster with the
level. With reduced motion, a few slow petals and no streaks. Nothing while Wind is at level 0.

**Card.** `Wind`, "The wind blows falling cats to the right" (or "to the left", the run's
direction), stat label "Wind", values by level: Calm, Breeze, Gusty, Strong, Gale, Storm. The
picture is `picks/wind` (a carp streamer flying to the right), mirrored when the run's wind blows
to the left.

**Tests.** A ball dropped in a still, empty jar lands `½·a·t²` to the side (within a tolerance),
in the run's direction; landed balls don't drift; the direction is the same for the same seed and
can be either way across seeds; the direction survives a save and load; level 0 changes nothing
(an old seed's replay hash is unchanged).

### 5.3 Heavy Drop (trial)

**Rule.** With Heavy Drop at level L > 0, every ball from the drop until its first contact falls
faster: it leaves the paw with a downward speed `HEAVY_DROP_START_SPEED[L]` and feels extra gravity
`HEAVY_DROP_GRAVITY_BONUS[L]`. While it is falling it may go faster than `MAX_SPEED_BASE`, up to
`HEAVY_DROP_MAX_SPEED`. From its first contact the normal limit applies again, so the speed it
bounces off with is capped as before (that's the existing anti-launch rule). It pushes the pile
harder because it arrives faster; it has no other effect (no damage, no burning).

**Numbers (start).** Max level 5. Pick the start speed and gravity bonus per level so that the
fall from the paw to the empty floor takes about **0.8, 0.65, 0.5, 0.4 and 0.3 s** (1.0 s today,
TECH_SPEC §5). Solve for the values with a headless test, write them in `config/physics.ts` with
the fall times in the comment, and list fall time and impact speed per level in the report.

**Safety (required).** A faster ball must never tunnel through a cat, the floor or a wall, and must
never launch a cat over the rim or out of the jar.

- Check the largest move per fixed step (1/120 s) against the smallest radius (size 1). If a
  falling heavy ball could move more than about half a size-1 radius per step, cap
  `HEAVY_DROP_MAX_SPEED` there or run extra substeps while one is falling; pick one, explain why
  in TECH_SPEC §5.
- A headless stress test: a jar with 150 cats, 100 drops at level 5 at random x (seeded); nothing
  leaves the jar, nothing passes through the floor, and no cat crosses the rim faster than an
  ordinary drop would make it. `npm run test:perf` must still pass (≤ 2 ms per step).

**Look.** Levels 1–2: thin speed lines behind the falling ball (code). Levels 3–4: the small
flame from `fx/fireball` behind it, with a few code embers. Level 5: the big fireball behind it,
and on landing a burst of orange sparks (the existing spark effect in fire colours), a short
heavier thud (procedural, `audio/sfx.ts`) and a small screen shake (`game/shake.ts`), no shake
with reduced motion. The flame is drawn under the ball, its round head centred on it and sized a
little larger than the ball, so its flames lick round the ball's edge; it fades out on the first
contact. Everything is visual only.

**Card.** `Heavy Drop`, "Cats fall faster and hit harder", stat label "Fall time", "1.0 s → 0.8 s"
and so on. Picture: `picks/heavyDrop`.

**Tests.** Fall times per level within a tolerance; the speed limit applies again after the first
contact; the stress test above; level 0 changes nothing.

### 5.4 Porcelain (trial)

**Rule.**

- Every merge, of any kind (a pair, a Hubris three, a joker's merge, a Jackpot), looks at every
  **cat** (`kind === 'cat'`) whose edge is within `PORCELAIN_REACH` of the edge of one of the
  merging cats when the merge resolves. Skip the merging cats themselves, the new cat, any cat that
  merges in the same step, cats of the merging cats' size (§3.2), and the stage's last size. Each
  of the others cracks with chance `PORCELAIN_CHANCE_PER_LEVEL × L`, rolled on its own salted
  stream in a fixed order (cats by id, then merges in resolution order). One merge cracks a cat at
  most once.
- A cat has a `cracked` flag. An intact cat that cracks becomes cracked. A **cracked cat that
  cracks again breaks**: it vanishes and two cats one size smaller appear where it was, side by
  side across its centre (kept inside the walls), each growing from a small radius into its own
  over `MERGE_GROW_MS` like a merged cat, so the growth speed cap keeps them from launching their
  neighbours. The two are **shard mates**: they never merge with each other (§3.3), but each
  merges with any other cat of its size. Neither is cracked or golden. They count as landed.
- A cracked **size 1** that breaks just shatters: it is gone.
- A cracked cat that merges makes a new, intact cat. That's the player's answer: merge a cracked
  cat quickly. Gold kintsugi seams flash on the new cat.
- Cracking and breaking pay nothing, score nothing, and don't count for the combo. Boulders,
  hanabi and jokers never crack. Golden cats can (their pieces aren't golden). A hanabi's pops and
  a Lucky Save's pops aren't merges and crack nothing.
- Save: each ball's `cracked` flag and its shard mate's id (or none) go into the run snapshot.
  Snapshots without them load with false and none.

**Numbers (start).** `PORCELAIN_REACH = BOULDER_HIT_REACH` (15 u: touching, or so close the gap
doesn't show). `PORCELAIN_CHANCE_PER_LEVEL = 0.2`, max level 4 (20% → 80%).

**Look.** A cracked cat shows one of the two crack patterns of `fx/porcelain` over it, chosen and
rotated from its id so cats don't all look the same, scaled to its radius and turning with it. A
crack plays a small "tink" and a few white chips (code); a break plays a porcelain shatter and
chips. On a merge that used a cracked cat, one of the two gold seams flashes on the new cat and
fades in about 0.6 s. The crack lines are drawn on white: the pipeline must remove **all** of the
white, also the white enclosed between branching lines (key by brightness, not by flood fill from
the edge), and clip the pattern to its circle. `?skin=placeholder` may show a cracked cat with a
simple dark outline ring. The cracks go through the `BallSkin` interface.

**Card.** `Porcelain`, "Merges can crack the cats beside them; cracked twice, a cat breaks in
two", stat label "Crack chance", "0% → 20%". Picture: `picks/porcelain`.

**Tests.** Neighbours within reach crack and those beyond don't; the same-size and last-size
exceptions; a second crack breaks the cat into two of the size below, inside the walls; shard mates
don't merge with each other but do with a third cat; size 1 shatters; a cracked cat's merge gives
an intact cat; determinism (same seed and inputs, same hash); save round trip.

### 5.5 Hubris (rule)

**Rule.**

- Cats of sizes 1 to `HUBRIS_MAX_SIZE` (5) don't merge in pairs. Three cats of one such size
  that are **connected by touching** (A touches B and B touches C; A and C needn't touch) merge
  into one cat **two sizes** bigger at the three's centroid (three 5s make a 7). With a golden cat
  among them, three sizes (§3.5), never above the stage's last size.
- Sizes 6–8 merge in pairs as before, and two 8s still make the stage's last cat.
- Resolution (in `MergeResolver`, deterministic, from our own ids, never matter-js order): from
  the step's same-size contacts, build each small size's touch graph. Go through the cats oldest
  first; for each unused cat, find the oldest connected triple that contains it among the unused
  cats (by the sorted ids of the three) and merge it. A cat takes part in at most one merge per
  step, as today. Four or more connected cats make one merge now and the rest wait for later
  steps.
- The new cat starts at the radius of the biggest of the three and grows into its own, like any
  merged cat, and turns as today (`mergeSpinDirection` from the two oldest).
- Jokers (§3.4), magnets and hanabi work as before.
- A three-way merge is one merge: it hits each boulder in reach once (reach from any of the three),
  cracks neighbours once (Porcelain), counts once for the combo, and pays like a normal merge of
  its size **plus half** (three cats instead of two; _start_, economy later).
- `MergeOutcome` needs to carry three-way merges (for example a `parts: 2 | 3` field), so effects,
  sounds and the economy can tell.
- When Hubris is chosen, show a hint pill once at the start of the next stage: "Hubris: sizes 1–5
  merge in threes".

**Card.** `Hubris`, "Sizes 1–5 only merge in threes, and skip a size when they do", stat label
"Small cats merge", "In pairs → In threes". Picture: `picks/hubris`.

**Tests.** Two small cats touching don't merge; three in a chain do, into size + 2 at their
centroid; golden three goes up three sizes; four in a row make one merge, then wait; sizes 6+
still merge in pairs; boulder hits and porcelain cracks count it once; the payout; determinism.

### 5.6 Echo (rule)

**Rule.**

- When two cats of sizes `ECHO_MIN_SIZE`–`ECHO_MAX_SIZE` (4–7) merge (or three, under Hubris; a
  golden merge counts too), a cat of **their** size (not the new cat's) appears beside the new
  cat: two 4s make a 5 and a 4, three 5s under Hubris make a 7 and a 5.
- Never for the stage's last cat (two 8s), never for a joker's merge (§3.6), never for sizes 1–3.
- **Where:** level with the new cat, on a side picked by a seeded roll (its own salted stream),
  just touching it: centre at `x ± (r_new + r_echo)`. If that side would put it through a wall,
  use the other side; if neither fits, put it straight above the new cat. It grows from a small
  radius into its size over `MERGE_GROW_MS` (no launches), counts as landed, isn't golden or
  cracked, and may merge on the next step like any cat.
- It pays nothing and isn't a merge (no boulder hit, no crack, no combo).

**Look.** It fades in from pale with two or three expanding ripple rings (code), and a soft bell
echo (procedural, `audio/sfx.ts`).

**Card.** `Echo`, "Merges of sizes 4–7 leave a cat of their size behind", stat label "Echo",
"Off → On". Picture: `picks/echo`.

**Tests.** Pairs of 4–7 echo and 1–3 and the last cat don't; a joker's merge doesn't; the side
follows the seed; the wall fallback; the echo cat merges later like any cat; it pays nothing;
Echo with Hubris (three 5s → a 7 and a 5).

### 5.7 Art

Run the pipeline on the phase 11 files (`npm run art`, extend `tools/` where needed):

- `fx/fireball` → its two flames as separate images, white removed, the round head's centre and
  radius measured so the game can put it under the ball.
- `fx/porcelain` → two crack patterns and two gold seams, white keyed by brightness (§5.4), each
  clipped to its circle.
- `picks/wind`, `picks/heavyDrop`, `picks/porcelain`, `picks/hubris`, `picks/echo` → card pictures
  like More Boulders' (`config/pickSprites.ts`).

All new images are precached (offline). Never retouch the owner's art in code; a bad image goes
back to the owner with a better prompt.

### 5.8 Debug, docs, release

- Debug panel (`?debug=1`) and `window.__game`: set Wind, Heavy Drop and Porcelain levels and
  Hubris and Echo on or off; flip the wind direction; spawn a cracked cat; crack a cat by id; open
  a rule pick. Update TECH_SPEC §11 for the new hooks.
- E2E: extend the spec that covers picks so a rule pick can be opened and chosen through
  `window.__game`. Run only that spec locally (`--project=pixel-chromium --workers=1`).
- GAME_DESIGN §15: the intro, §15.1 (no change to the queue, but say wind and heavy drop act on
  every dropped kind), §15.5 (the rule pick at growth clears, the vermilion rule cards, 3 of 6
  trials), the trials table (+3 rows), a new rules table, and new subsections §15.8 Wind, §15.9
  Heavy Drop, §15.10 Porcelain, §15.11 Rules (Hubris, Echo). §12 for the new sounds. TECH_SPEC §5
  (wind force, heavy-drop speed cap and tunnelling guard, the three-way merge resolution, shard
  mates, echo placement) and §8 (the snapshot's new fields).
- ROADMAP: tick Batch 18. CHANGELOG `[0.34.0]` with the §3 decisions. `package.json` 0.34.0.
- Verify at 390×844 and 375×667: play a seeded run with each trial at its max level and with both
  rules (use the debug panel), take screenshots of each (wind petals, the fireball, a cracked cat
  and its kintsugi flash, a three-way merge, an echo, a rule card) into
  `docs/screenshots/v0.34.0/`. Console clean.
- Ship per the Milestone workflow, tag `v0.34.0`, and report in Turkish: what changed, the measured
  tables for Wind and Heavy Drop, the §3 decisions, what to test on the phone.

## 6. Card texts and values (summary)

| ID          | Kind  | Name       | Effect line                                                        | Stat label       | Values                         | Max |
| ----------- | ----- | ---------- | ------------------------------------------------------------------ | ---------------- | ------------------------------ | --: |
| `wind`      | trial | Wind       | The wind blows falling cats to the right / left                    | Wind             | Calm → Breeze → … → Storm      |   5 |
| `heavyDrop` | trial | Heavy Drop | Cats fall faster and hit harder                                    | Fall time        | 1.0 s → 0.8 → 0.65 → … → 0.3 s |   5 |
| `porcelain` | trial | Porcelain  | Merges can crack the cats beside them; cracked twice, a cat breaks | Crack chance     | 0% → 20% → … → 80%             |   4 |
| `hubris`    | rule  | Hubris     | Sizes 1–5 only merge in threes, and skip a size when they do       | Small cats merge | In pairs → In threes           |   1 |
| `echo`      | rule  | Echo       | Merges of sizes 4–7 leave a cat of their size behind               | Echo             | Off → On                       |   1 |

## 7. Out of scope

- No change to the boulder trials' numbers, and no "at most one boulder card per pick" rule: with
  six trials, a pick already shows three of six. Mention in the report that the boulder trials
  still multiply each other, as a balance note.
- No new blessings, no rerolls, no rarities, no second currency (GAME_DESIGN §15, the owner's
  rules).
- No narrowing of the jar in any form.

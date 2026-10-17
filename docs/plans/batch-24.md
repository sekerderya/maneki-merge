# Batch 24 plan: Lucky Save, Lucky gift, automatic trials, late-game start

> Written 2026-10-17 from the owner's requests in chat, after a player's-eye review of v0.56.8.
> To start: read this file, then follow the Milestone workflow in `CLAUDE.md`. Once a part is
> built, its rules live in GAME_DESIGN (and TECH_SPEC where it applies); from then on GAME_DESIGN
> wins over this file.

## 0. Why (the review in short)

A bot played v0.56.8 in real time like a so-so new player (fresh, mid and maxed profiles):

- Runs nearly always ended in a **jam of big cats**: two or three 8s and some 7s in the jar that
  never touch (two 8s take 93% of the jar's width). Both **Lucky Saves** seen bought only **~13 s**
  (363 → 376 s, 726 → 739 s): they pop the small cats and leave the jam that caused the danger.
- The **Lucky gift** was nearly invisible: a banner of +59 and +117 coins in a run that earned 6.7K,
  where the player expected a reward moment.
- The **trial pick** is pure punishment ("The coming stages get harder"), with no reason to want
  any card: the player only picks the least bad.
- A **maxed profile** played 40 minutes, 24 stages, with the danger line reached in one stage only;
  its early stages are a slow, tension-free chore.

## 1. Order of work

Build the parts in this order, each as its own version (patch or minor as the Milestone workflow
says) with its own CHANGELOG entry, so the owner can test one change at a time on the phone.

| Part | What                                   | Start right away?                                            |
| ---- | -------------------------------------- | ------------------------------------------------------------ |
| 1    | Lucky Save keeps the two biggest sizes | Yes, after the two open questions in §2.3 (ask, then build)  |
| 2    | Lucky gift as a pick card, +50%        | Yes                                                          |
| 3    | Automatic trials instead of the pick   | **No: ask the owner the questions in §4.4 and get approval** |
| 4    | Late-game start: faster and harder     | **No: a proposal for the owner; build only what they pick**  |

## 2. Part 1: Lucky Save keeps the two biggest sizes

### 2.1 The owner's rule

> When a Lucky Save triggers, the cats of the two biggest cat sizes in the jar stay; everything
> else pops.

### 2.2 How to read it (decided for the owner; list it in the report)

- "The two biggest sizes" are the two highest **sizes present among the jar's cats** at that
  moment (ordinary and golden cats). Example: the jar holds 8, 8, 7, 6, 6, 5, … → both 8s and the 7
  stay. With 8, 8, 8, 6, 6 → the three 8s and both 6s stay (sizes, not cat count). A jar with only
  one size of cat keeps those cats.
- **Everything else pops:** every other cat pops into its value (coins, no score, no combo, as
  today, GAME_DESIGN §5 and §6), boulders crumble paying nothing, hanabi, jokers, lightning balls
  and a cursed cat's stone vanish as at a stage clear. Frogs stay (they never count for the danger
  line and a Lucky Save already leaves them alone, §15.17). A ball still falling from the paw is left
  alone, as today (only landed balls count).
- The timer resets and the 2 s grace (`LUCKY_SAVE_GRACE_MS`) follows, as today.
- The same rule serves the ad's extra Lucky Save (GAME_DESIGN §2.7), which calls the same code.

### 2.3 Open questions (ask the owner before building)

1. **A kept cat that is over the line:** when one of the two biggest sizes sticks out over the rim
   (common when the jar is jammed), keeping it means the danger starts again at once. Options:
   (a) it pops anyway (recommended: the save must save), (b) it stays and the grace is longer.
2. **A cursed cat of a kept size:** it stays cursed (recommended), or its curse ends.

### 2.4 Where in the code

- `src/physics/danger.ts`: `luckySaveVictims()` picks the victims today (the balls over the line
  plus the `LUCKY_SAVE_SMALLEST_POPS` (9) smallest cats). Rewrite it for the new rule; keep it
  headless and pure.
- `src/run/RunController.ts`: `luckySave()` (around line 1808) pops the victims with `pop(…,
'luckySave')`. Check that boulders, hanabi, jokers, lightning balls and stones go the way §2.2
  says (they are not `kind === 'cat'`).
- `src/config/economy.ts`: `LUCKY_SAVE_SMALLEST_POPS` goes (or is replaced by a constant for "the
  two biggest sizes": `LUCKY_SAVE_KEEP_SIZES = 2`). No magic numbers.
- Tests: `tests/physics/danger.test.ts` (the victims), and whatever tests the save in the run.
- **Scenes and clips that show a Lucky Save** will look different: the scenes "Brim full" and
  "Saved and cleared" (GAME_DESIGN §2.6, `src/config/scenarios.ts`, checked by
  `tests/physics/scenarios.test.ts`) and the `luckySave` clip (Second Chance's card, §2.5). Check the
  scenes still play their moment (retune the jars if needed) and re-record the clip with
  `npm run clips -- luckySave`.
- Docs: GAME_DESIGN §6 (Lucky Save), §2.7 (the ad's save), §10 (Second Chance's line if it
  mentions the 9 cats), §2.2 (the shop card's value is unchanged: the number of saves).
- Measure with the smart bot before and after (`npm run sim -- --meta 30 --seeds 24` and
  `--extra-saves 1`, GAME_DESIGN §14) and put the numbers in the report.

## 3. Part 2: Lucky gift as a pick card, +50%

### 3.1 The owner's rule

> The Lucky gift works like a blessing: the doors close, and it is taken by choosing it, even when
> it is the only option. Its reward goes up by 50%.

### 3.2 How to build it

- Today (`RunController.offerNextPick()`, `luckyGift()`, GAME_DESIGN §15.5) a blessing pick with
  nothing open pays the gift at once and shows the "Lucky gift!" banner as the next stage opens.
- New: such a pick becomes a **pick with one card**: the stage doors close as for any pick, the
  title is "Choose a blessing" (or the owner's wording, ask if unsure), one card "Lucky gift" with
  the coin amount as its value, and **Choose** (faded until the card is tapped, as on every pick).
  The coins are paid when Choose is tapped, then fly to the counter with the coin sound as the
  banner's coins do now. No separate banner any more (or keep the banner as the reward's feedback
  after Choose; ask the owner if unsure).
- The card's icon: an existing picture, the HUD's gold coin in the gold-rimmed medallion (icon kit,
  docs/ART_ASSETS.md §5). If the owner wants a new picture, give them the prompt first (no
  self-made art) and use the coin until it comes.
- **+50%:** `LUCKY_GIFT_FACTOR` in `src/config/economy.ts` goes from 1 to **1.5**.
- Save: a run saved while the gift card waits must come back to it (the pick offer is already
  saved with the run; add the gift as a pick option, e.g. a `luckyGift` pick id of kind
  `blessing`, or a flag on the offer; choose what keeps old saves loading). Never break saves.
- The debug panel's "Picks" and Playwright's `pick-overlay` / `pick-card` / `pick-choose` keep
  working; update `tests/e2e/expansion.spec.ts` where it expects the banner.
- Docs: GAME_DESIGN §15.5 (The Lucky gift), §10 (the line about the Lucky gift), §14 (the
  measurement note: rerun `--meta 720` and say how much the time to buy every card moves; the owner
  allowed 10% in v0.50).

## 4. Part 3: automatic trials instead of the trial pick

### 4.1 The owner's rule

> The "choose a trial" pick goes. Instead, the trials come by themselves. For example, if boulders
> come in at stage 2, then at stage 3 a random boulder trial comes, and like the boulders' card
> when they first appear, it says what it is, but the card is different: say the random draw gave
> Big Boulders; the player sees a **small card** with a line like "Boulders get bigger!", an icon
> that shows the boulders growing, a **question-mark button at the top right** that shows the clip
> for those who want to see exactly what it does, and a **Got it** button at the bottom. The
> details are asked while building it, and the owner approves them.

Then (2026-10-17, the owner's call, replacing the question-mark button above): the **first time in
a profile** a trial or a trial's upgrade comes, the card shows its clip directly, so it needs no
question-mark button; **every later time** a card with only the short line and the icons shows,
with no buttons and no question mark, and goes by itself after 3 seconds. No HUD icons for the
trials.

### 4.2 What stays the same (unless the owner says otherwise)

- The **teaching order** (GAME_DESIGN §15.5, `TEACHING_CLEARS` in `src/config/picks.ts`): which
  clear brings which hazards, and the hazards' intro cards (boulders as stage 2 opens, Cursed Bell
  as stage 4 opens, the wind 7, porcelain 9).
- The **blessing pick** at every clear and the **rule pick** at the clears that grow the jar (a
  rule is not a trial; the owner only named the trial pick).
- The trial pools: clear 2 boulder trials, clear 4 boulder and curse trials, clear 7 adds the wind,
  from clear 9 every trial; the follow-ups still need their trial (Quick Curse and More Curses need
  Cursed Bell). Levels stack for the run as now.

### 4.3 What changes

- Where a clear has a `trial` pick today (clears 2, 4, 7, 9, and every clear from 11 that doesn't
  grow the jar; also a rule pick with no rule left), the run instead **draws one open trial at
  random** from that clear's pool with the run's seeded pick generator (`pickRng`, never
  `Math.random()`), applies its level, and shows the **trial card** as the next stage opens.
- **The draw is weighted by family (the owner's call, 2026-10-17).** The families: boulders
  (More Boulders, Iron Bands, Big Boulders), curses (Cursed Bell, Quick Curse, More Curses), wind,
  porcelain. First draw a family among those with an open trial in the clear's pool, then one open
  trial of it, uniformly. The families are equally likely (so the boulders, with three trials, no
  longer come three times as often as the wind); a family the run hasn't had yet weighs more (a
  factor in `src/config/picks.ts`, e.g. 2); the family of the previous automatic trial is left out
  when another family is open, so the same family never comes twice in a row. This keeps the boulder
  trials from piling up (more × bigger × bands, which the owner found impossible in Batch 18).
- **Two trial cards (the owner's call, 2026-10-17):**
  - **The first time in a profile** a trial comes: a card with the short line, the trial's clip
    playing directly (looping, like the intro cards and the clip popup, §2.5) and **Got it** (the
    coral PLAY pill, ignoring taps for its first 0.4 s). **No question-mark button**: the clip is
    already shown. Time stays stopped until Got it, as with the intro cards. "Seen" is saved per
    profile like the hints (GAME_DESIGN §11), and "How to play" in Settings brings these cards back
    like the others (§2.4).
  - **Every later time:** a small card with only the short line and the icon(s) that show the
    change; **no buttons, no question mark, no clip**. It goes by itself after **3 s**
    (`TRIAL_TOAST_MS` in `src/config/view.ts`). It shows over the empty jar as the doors open,
    and time doesn't stop for it (the jar is empty then; ask the owner if unsure).
  - **What counts as new (the owner's call, 2026-10-17):** the full card with the clip shows only
    the first time a trial comes in the profile (its level 1). **Every upgrade of a trial** (its
    next level: Big Boulders 1 → 2, Wind 2 → 3, …) and every trial seen before take the small
    card that goes by itself. The follow-ups (Quick Curse, More Curses) are trials of their own:
    the first time each comes, its full card.
  - **No HUD icons** for the trials (the owner turned them down).
- The hazards' intro-card lines say "A trial can …" today (`src/config/introCards.ts`); they must
  be reworded now that trials come by themselves (propose new lines to the owner).

### 4.4 Questions for the owner (ask them all, show a mockup if useful, build after the approval)

1. **The line for each trial**, a draft to approve:
   - More Boulders: "More boulders!" · Iron Bands: "Boulders get iron bands!" · Big Boulders:
     "Boulders get bigger!" · Wind: "The wind picks up!" (first level: "Wind!") · Porcelain:
     "Cats turn to porcelain!" (later levels: "More cracks!") · Cursed Bell: "Cats can be cursed!"
     · Quick Curse: "Curses work faster!" · More Curses: "Curses come more often!"
   - Should the card also show the level change ("Lv 1 → 2") or the value ("Size 3 → Size 4"), or
     only the line?
2. **The icon:** the pick cards' existing pictures (docs/ART_ASSETS.md §4.12, §4.13, the icon kit
   §5) in the stone-grey medallion, or new pictures that show the change (e.g. a small boulder
   growing into a big one)? New pictures: give the owner the prompts first, one complete block per
   image (memories: art prompts first, no self-made art).
3. **The card's look and place:** size (half the screen width?), position over the jar, the
   doors (no doors for the trial card, recommended, since there is nothing to choose), and
   whether it comes before or after the blessing pick's doors.
4. **The rule pick** at the jar-growth clears: stays a choice (recommended, as written in §4.2)?
5. **Balance:** the player could steer around the trials before; random trials may make runs
   harder. Measure with the smart bot (fresh profile `--meta 30`, maxed
   `base --aim smart --upgrades max --stages 40 --cap 3600 --seeds 60`) before and after and show
   the owner the numbers; retune only with their call.

### 4.5 Where in the code (once approved)

- `src/config/picks.ts`: `ClearPicks.picks` loses `'trial'` as a choice; add an automatic-trial
  step (e.g. `autoTrial: true` with the clear's `trials` pool). `clearPicks()` from clear 11.
- `src/run/RunController.ts`: `beginPicks()` / `offerNextPick()` (around line 1871): draw and
  apply the automatic trial, emit an event the UI shows as the trial card, and save the card as
  waiting with the run (like the intro cards) so a run closed under it comes back to it.
- `src/core/picks.ts`: the draw (`drawOffer` / `openOptions`) can be reused for one random trial.
- UI: the intro card (`src/config/introCards.ts` and its DOM card) is the model for the
  first-time card (clip and Got it); the later card is a smaller variant with no buttons that goes
  after 3 s. DOM + CSS only, in `src/ui/`.
- Save: a saved run waiting on a trial pick (old version) must still load: apply the automatic
  trial instead. Never break saves; add a migration test.
- Debug panel and `window.__game`: a hook to force the next automatic trial, for Playwright.
- Tests: unit tests for the draw (seeded, pool, follow-ups), the run (applied level, saved card),
  an E2E spec for the card (`tests/e2e/expansion.spec.ts` covers the picks today). Run only the
  touched specs locally (CLAUDE.md).
- Docs: GAME_DESIGN §15 intro, §15.5 (the teaching order table, the picks, "Choose a trial"), §2.5
  (the clips table), §11 (saved data), §14 if the balance moves.

## 5. Part 4: a faster and harder start for maxed, late-game profiles (proposal only)

### 5.1 The owner's request

> For profiles with the shop maxed (late game), think about systems that speed up the start and
> make it harder at the same time; build one only if a decision is taken.

### 5.2 What to do

- Don't build anything yet. Write 2–4 clearly different options, each with what the player sees,
  when it turns on (e.g. once every card is maxed, or from a best stage), and bot numbers: time to
  reach stage 10, 20 and 30, how often the danger line is reached, and how runs end (the maxed run
  in the review reached the danger line in 1 stage of 24 and never ended in 40 minutes).
- Reply to the owner in Turkish with the options and a recommendation; build the picked one as
  its own part with a plan like this file.
- Don't re-pitch what the owner turned down (`docs/plans/weapons-and-passives.md` §6 and §3.6, and
  the memories): no first-jar protection, no opening "Omamori" blessing pick, no Heat or pre-picked
  trials, no daily seed, achievements, cosmetics, seasons, more jar backgrounds, second currency,
  rarities or XP levels.
- Coins pile up with nothing to buy on a maxed profile (102K in the review's run); an option may
  use them, and the planned skip / banish / reroll charges (weapons-and-passives §2) are a related
  coin sink.

## 6. For every part

- Follow the Milestone workflow in `CLAUDE.md`: work on `main`, small Conventional Commits, tests
  for every rule touched, `npm run check` and `npm run build`, then play it in the browser at
  390×844 and 375×667 (GPU headless shell, see TECH_SPEC §11) with screenshots and a clean console.
- Every number in `src/config/`; all randomness through the seeded RNG; headless layers stay
  headless.
- Update GAME_DESIGN in the same commit as each rule change, tick this batch's line in
  `docs/ROADMAP.md`, add a CHANGELOG entry, bump the version.
- Report to the owner in Turkish: what changed, screenshots, the bot's numbers, what to test on the
  phone and how.

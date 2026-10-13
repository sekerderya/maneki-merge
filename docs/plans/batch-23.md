# Batch 23 plan: the Lightning blessing

> Written 2026-10-13 from the owner's request in chat. Once a feature is built, its rules live in
> GAME_DESIGN (§15.15); from then on GAME_DESIGN wins over this file.

## 1. What and why

The owner asked for a new blessing ball, the **lightning ball**: the first cat it touches is struck,
and with it every cat of that size in the jar; if it touches a boulder, every boulder goes. The
strike should look like **chain lightning**: bolts linking the struck cats, all hit at once. The
progression balance must hold: it should open **later**, and above all the early game and its flow
must not change.

## 2. Owner decisions (don't change them)

- A blessing ball, like the hanabi and the joker: it comes from the queue once its blessing is
  taken, and its shop card sets how far the blessing goes in a run (GAME_DESIGN §10).
- It strikes the first cat it touches and every cat of that size, or every boulder.
- Chain lightning between the struck cats, striking them at once.
- It opens later than the other blessings; the early game stays as it is.
- Its look comes from the owner's art: the prompts are in `docs/ART_ASSETS.md` §4.16 (phase 15),
  with several bolt shapes so the strike crackles.

## 3. Decisions taken for the owner (listed in the report and the CHANGELOG)

1. **Struck cats pop into their value** (coins, no score, no combo), like a hanabi's pops; struck
   boulders break and pay nothing.
2. **Time stands still for 0.45 s** while the lightning chains through them (a hit-stop): physics,
   the drop cooldown, the combo window and the danger timer stop, so the bolts link still balls and
   nothing merges or rolls away meanwhile. Then they all pop at once.
3. **It waits when it lands on nothing to strike** (the floor, a hanabi, a joker, another lightning
   ball): the first cat or boulder that touches it later is struck, so a cat dropped onto it sets
   it off. The magnet can take it.
4. **Size 2, rarer than its peers:** +1.5% per level (up to 7.5%), against +2.25% for Hanabi and
   Joker Cat. The bot measured one level of Lightning as worth about one level of Hanabi (§5).
5. **No lightning ball in a stage's first 20 drops**, and a queued one becomes a cat at a stage
   clear, like the hanabi: an empty jar has nothing to strike.
6. **Shop card at stage 8**, for 15K, 25K, 40K, 60K and 85K (225K in all; the Joker Cat opens at
   stage 5 for 10K first). It adds about an hour at the end of the 8-hour pacing model.
7. **Look:** the jar darkens to a stormy indigo, a sky bolt lands on the ball, the chain is a tree
   from the ball to each next-nearest struck ball (edge to edge), each link 35 ms after the one
   before it, flickering between shapes, with a flash, a ring and crackles where each lands; yellow
   sparks as they pop; a zap, a crack and rolling thunder. The light is drawn with SCREEN
   blending (Phaser's ADD clears the dark off the transparent canvas in squares).

## 4. Built in v0.42.0

- Rules, queue, picks, shop card, saves and events, with unit and physics tests
  (`tests/physics/lightning.test.ts`).
- The strike's look with **stand-ins** drawn in code (`game/fx/lightningFrames.ts`): jagged
  glowing lines, a flash, a ring and crackles in the art's colours, so it plays now; a violet ball
  with a yellow bolt in the jar and NEXT, a bolt glyph on the cards.
- The thunder sound, the haptic pattern, a jolt; the balance bot aims lightning balls.

## 5. Measured

The smart bot, 30 seeds of three stages from a fresh profile, 15 minutes at most (cleared / lost):

| Arm               | Cleared 3 stages | Lost | Median run |
| ----------------- | ---------------: | ---: | ---------: |
| No blessing       |                5 |   25 |      224 s |
| Lightning 1, 1.5% |               10 |   20 |      310 s |
| Lightning 3, 4.5% |               17 |   13 |      390 s |
| Lightning 5, 7.5% |               22 |    7 |      534 s |
| Hanabi 1, 2.25%   |                8 |   22 |      285 s |
| Hanabi 5, 11.25%  |               23 |    7 |      433 s |
| Joker Cat 5       |               29 |    1 |      119 s |

The bot aims a lightning ball at the boulders, else at the small size (1–4) with the most cats.
Aimed at any size up to 6, Lightning 5 lost 1 run in 30 but ran out of time in 16: it kept popping
the cats it needed. A person aims better; the owner's play decides.

The meta bot (`npm run sim -- --meta 150 --seeds 12 --extra-saves 1 --goal 8`): stage 8 is first
cleared after a median 68 minutes, so the card opens about an hour in. Until a profile buys a level,
its chance is 0 and no blessing pick offers it: every earlier run plays exactly as before.

## 6. The owner's art (done in v0.42.1)

All five came on 2026-10-13 and went in as below; the notes on what differs from the prompts are in
ART_ASSETS §4.16.

1. The owner generates the five images of ART_ASSETS §4.16: `specials/lightning`, `fx/bolts`,
   `fx/skybolts`, `fx/zap`, `fx/shock`. Check them against §2 and the §4.16 checks.
2. The ball goes through `tools/buildSpecials.ts` as it is (`npm run art`).
3. The effect sheets need a new build step (e.g. `tools/buildLightning.ts`, called from
   `tools/build-art.ts`):
   - black to transparency: alpha = the brightest channel, the colour divided by it (unpremultiplied),
     with a small floor so JPEG noise in the black goes;
   - split the pieces: `bolts` by its six rows, `skybolts` by its three columns, `zap` by its 3×2
     grid, `shock` by its 2×2 grid (cut at the empty bands, as `buildFx` does for the fireballs);
   - measure each bolt's two ends (`a`, `b`: the brightest core pixels at its left and right ends,
     or a sky bolt's top and its tip) and its band (the height across the a → b line), and each
     round piece's radius;
   - write `public/assets/fx/lightning-*.webp` and their data into `src/config/fxSpriteData.ts`.
4. Load them with the other effect art (`game/artImages.ts`) and turn them into `LightningFrames`
   (`game/fx/lightningFrames.ts`), which `LightningFx` takes in place of the stand-ins; the arcs are
   the zap sheet's bottom row, the flash and ring its top row (its sparks can join the pops).
5. Record the Lightning clip (`npm run clips`, a scene in `tools/clips/scenes.ts`) and open it from
   the Lightning cards (`config/clips.ts`).
6. Look at it at 390×844 and 375×667, on a phone at 120 Hz, and with reduced motion.

# Batch 21 plan: how-it-works clips

> **Status:** built in v0.38.0 (2026-10-12). Differences from this plan: the clips are 480 × 850
> (the play area from 200 px above the rim to 80 px below the floor); the recorder flushes the
> page's rAF itself with exact 1/60 s timestamps (Playwright's clock alone gave uneven frames, the
> owner saw it in the first clip); the Iron Bands clip shows one band; the Porcelain clip shows a
> crack and a break, not the mending.
>
> Written 2026-10-12 from the owner's decisions in chat, for the agent that builds it. Read it whole
> before you start, together with `CLAUDE.md`, GAME_DESIGN §2.2, §15 and TECH_SPEC §7–§9 and §11.
> Once a feature is built, its rules live in GAME_DESIGN and TECH_SPEC; from then on they win over
> this file.

## 1. What and why

Many cards in the shop and in the stage-clear picks name things a new player can't picture from
one line: what a magnet does, how a boulder breaks, what Hubris or Echo change. The owner wants a
small button next to those cards that plays a short, looping clip of the real game showing it.

## 2. Owner decisions (don't change them)

- **Where:** the Upgrades shop's cards and the stage-clear picks (trials, rules, blessings), only on
  cards whose effect can't be guessed (§5 lists them).
- **What:** a short clip, like a GIF: the real game recorded, looping, no sound.
- **Which:** every special ball (magnet, boulder, golden cat, hanabi, joker), the boulder trials,
  the Cursed Bell, every rule, Wind and Heavy Drop. Not Big Catch or Big Drops.
- **How:** recorded clips, made by a tool from scripted scenes (§4), not a live demo in the page.
- **New dot:** a clip the player has never opened shows a small dot on its button; opening it once
  takes the dot away for good.
- **Taps:** where the clip shows a tap (the magnet), a finger/paw pointer shows it (the owner's art,
  §8).

## 3. Decisions taken for the owner (note them in the CHANGELOG and the report)

- **One clip per mechanic, not per card.** The same clip opens from every card that is about it
  (the shop's More Magnets card and the More Magnets blessing; the three Cursed Bell trials).
- Porcelain, Combo Charm and Second Chance get clips too: they were in the first list and the owner
  didn't drop them.
- **The button's icon** is a play triangle in the icon kit's medallion (docs/ART_ASSETS.md §5), not
  a "?": the kit allows no letters or signs.
- **The pointer** is a small pointing hand, not a paw: the dropper is already a paw, and a second
  paw tapping the jar would read as the dropper.
- **Captions are live text** under the clip (Fredoka), never burned into the video: they stay
  sharp and can be translated later.
- **Wind** gets two clips, one per direction, so the clip blows the way the run's wind does (the
  card's picture already turns that way). Mirroring one clip would mirror the NEXT bubble's word.
- **Reduced motion:** the clip doesn't start on its own; it waits on its first frame with a play
  button.
- **"How to play"** in Settings brings the new dots back with the first-run hints.

## 4. The recording method (tried 2026-10-12)

A spike recorded the magnet scene from the running game and encoded it to H.264 MP4 with no
ffmpeg. What worked:

- **Browser:** Playwright's default headless shell with `--use-angle=gl --enable-gpu
--ignore-gpu-blocklist` (the owner's GTX 1650; TECH_SPEC §11's GPU note), viewport 390×844.
- **Fixed time:** `page.clock.install()` before the page loads fakes `requestAnimationFrame`,
  `performance.now`, `Date` and timers, so Phaser and the run only move when the tool calls
  `page.clock.runFor(1000 / 30)`: one video frame, exactly two fixed ticks, however slowly the
  screenshot takes (~0.19 s a frame). The run's ticks advance exactly.
- **DOM animations** (the Take button, the combo banner, coin flights, the wind's petals) run on
  the compositor's clock, not the fake one. The tool freezes them with CDP
  `Animation.setPlaybackRate({ playbackRate: 0 })` and, before each frame, moves every running
  animation of `document.getAnimations()` on by the frame's 33.3 ms. In the spike the combo banner
  and the coins showed at the right moments.
- **Frames:** `page.screenshot({ clip })` of the play area (canvas and DOM together).
- **Encoding:** a second page on a fake `http://localhost` origin (WebCodecs needs a secure
  context) draws each PNG to an `OffscreenCanvas`, wraps it in a `VideoFrame` and feeds a
  `VideoEncoder` (`avc1.4d0028`, H.264 Main, which every iPhone and Android plays); `mp4-muxer`
  (MIT, a devDependency, `fastStart: 'in-memory'`) writes the MP4. Quantizer mode isn't supported
  there; use a bitrate.
- **Size:** 480×800 at 300 kbit/s: a 6.6 s clip is 160 KB and sharp enough; 360×600 at 150 kbit/s
  (88 KB) blurs the cats. About 17 clips of 4–8 s come to ~2.5 MB.
- **Checking a clip:** Playwright's own Chromium can't play H.264; `channel: 'chrome'` can, from a
  blob URL (a route without range support can't seek).

## 5. The clips

Each clip shows the jar from just above the paw (NEXT included) to the rug: the CSS box 390×650
from y = 140 on a 390×844 screen, measured from the jar's box, not hard-coded. 30 fps, 4–8 s,
looping. Hints and the debug button are hidden while recording.

| Clip id     | Opens from                            | Scene (scripted)                                                                                                                                              | Caption                                                                                        |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `magnet`    | More Magnets (shop, blessing)         | 1, 2, 3 against the left wall, a lone 1 on the right. The pointer taps the lone 1, then Take; the paw carries it left and drops it: 1+1, 2+2, 3+3 in a chain. | Tap a cat, then Take: it goes back to the paw and you drop it again.                           |
| `boulder`   | More Boulders, Big Boulders           | A bare boulder on the floor beside a size 2; a 2 dropped on it merges, and the boulder breaks.                                                                | Boulders never merge. A merge right beside one breaks it.                                      |
| `ironBands` | Iron Bands                            | A boulder with two bands, pairs beside it; three merges knock off a band, a band, then break it.                                                              | Each band takes one more merge beside the boulder.                                             |
| `golden`    | Golden Cats (shop, blessing)          | A golden 3 in the paw, a 3 on the floor: dropped, they make a 5.                                                                                              | A golden cat merges two sizes up: two 3s make a 5.                                             |
| `hanabi`    | Hanabi (shop, blessing)               | Small cats and a 6 on the floor; the hanabi lands among them, its fuse burns 1 s, it bursts: the small cats pop into coins, the 6 is pushed.                  | It goes off a second after it lands: small cats pop into coins, big ones get a push.           |
| `joker`     | Joker Cat (shop, blessing)            | A 4 on the floor; the joker drops on it and the 4 becomes a 5 where it is.                                                                                    | The joker merges with the first cat it touches and makes it one size bigger.                   |
| `windRight` | Wind (the run blows right)            | Wind 3; two cats dropped from the middle drift right as they fall; the petals cross the top.                                                                  | The wind pushes falling cats sideways, more at every level. Landed cats stay put.              |
| `windLeft`  | Wind (the run blows left)             | The same, blowing left.                                                                                                                                       | (same)                                                                                         |
| `heavyDrop` | Heavy Drop                            | Heavy Drop 5: a cat shoots down as the fireball and knocks the cat it lands on aside.                                                                         | Cats shoot out of the paw, fall faster and knock aside the cat they land on.                   |
| `porcelain` | Porcelain                             | A cracked 4 beside a pair of 2s; their merge cracks it again and it breaks into two 3s; the two 3s part and merge: the gold seam flashes.                     | A merge can crack the cats beside it. Cracked twice, a cat breaks in two. Merge it to mend it. |
| `curse`     | Cursed Bell, Quick Curse, More Curses | A cursed 3 goes to stone over a few drops; a second cursed 3 is merged in time: double coins and the chime.                                                   | A cursed cat turns to stone after a few drops. Merge it in time for double coins.              |
| `hubris`    | Hubris                                | Two 2s touch and wait; a third 2 drops on them and the three make a 4.                                                                                        | Three small cats that touch merge at once and skip a size. Two wait a moment first.            |
| `echo`      | Echo                                  | Two 5s merge into a 6, and a 5 appears beside it with the ripples.                                                                                            | Merging sizes 5–7 leaves a cat of their size behind, once per drop.                            |
| `copycat`   | Copycat                               | NEXT shows a 1; two 3s merge and NEXT pops to a 3, which the paw then drops.                                                                                  | The cat in NEXT copies the size of your last merge, up to size 4.                              |
| `dice`      | Dice                                  | Two 2s merge with a lucky roll (the gold die, a 4); two 3s fizzle (the grey die, one 3).                                                                      | Every merge rolls a die: sometimes a size more, sometimes it fizzles into one cat.             |
| `combo`     | Combo Charm                           | One drop sets off a chain of three merges: Combo ×2, ×3, the coins flying.                                                                                    | Merges within a second of each other build a combo. Combo Charm makes every step pay more.     |
| `luckySave` | Second Chance                         | A jar full over the line; the danger countdown runs out and the Lucky Save pops the cats over the line and the six smallest.                                  | When the jar overflows, a Lucky Save pops the top and the six smallest cats instead.           |

No clip: Lucky Paw, Big Catch, Big Drops. Scenes use `?seed=` and the debug hooks only, and forced
outcomes (`forceDice`, `crackCat`, `curseCat`) where a roll decides, so each clip is the same every
time it is recorded. Tune each scene until it reads at a glance; show the owner the clips before the
UI is built on them.

## 6. Steps

### 6.1 Config and save (headless, unit-tested)

- `src/config/clips.ts`: `CLIP_IDS`, and per clip its caption and the cards it opens from (pick
  ids and upgrade ids). The wind's card picks `windRight` or `windLeft` from the run's wind; the
  shop has no Wind card.
- `flags.clipsSeen: Record<ClipId, boolean>` in the save, next to `hintsSeen`. A missing field
  takes its default, so no version bump; a unit test loads a v0.37 save. "How to play" clears it.
- Unit tests: every clip id has a caption and at least one card; every card listed in §5 maps to a
  clip and no other card does; every clip has `public/clips/<id>.mp4` and its poster.

### 6.2 The recorder (`npm run clips`)

- `tools/clips/record.ts` (run with `node`, like `tools/build-art.ts`), the scenes in
  `tools/clips/scenes.ts`. `npm run clips` records all; `npm run clips -- magnet hubris` records
  those. It starts its own Vite dev server on a free port (`createServer`), records each scene as
  in §4, writes `public/clips/<id>.mp4` and a poster `public/clips/<id>.webp` (the first frame,
  with `sharp`), and prints each clip's length and size.
- A scene is `{ id, seed, upgrades?, setup(driver), play(driver) }`. `setup` runs before
  recording (start a run, set levels, place cats, let them settle); `play` is recorded. The driver
  wraps the hooks and moves the clock: `wait(ms)`, `place(tier, x, opts)`, `give(kind)`,
  `drag(fromX, toX, ms)`, `release()`, `tap(ballId)`, `tapTake()`, with the pointer drawn over
  taps and drags (§8; until the art comes, a plain translucent circle).
- New debug hooks it needs (TECH_SPEC §11): `spawnTier(tier, x, y?)` to lay a cat on the floor,
  `worldToScreen(x, y)`, `jarBox()`.
- It refuses to run without a GPU renderer (SwiftShader drops parts of sprites) and says so.
- `tests/unit/clips.test.ts` checks that every clip id has a scene. The recorder itself isn't run in
  CI (it needs the GPU); its output is committed.

### 6.3 Offline

- Add `mp4` to the precache `globPatterns` (`vite.config.ts`). Clips live in `public/clips/` with
  revisions, like the art.
- The popup loads a clip with `fetch()` and plays it from a blob URL: iOS asks for videos in byte
  ranges, which a precached response served by the service worker doesn't answer, so a plain
  `src` fails offline on iPhones. A blob URL seeks and loops on every phone.

### 6.4 The button and the popup (DOM)

- **Button:** a round badge (34 px, a 44 px hit area) on the lower right of a card's icon medallion,
  in the shop and in the picks, only on cards with a clip. The pick card is a `<button>`, so the
  badge is its sibling inside a wrapper, not inside it; a tap on the badge never selects the card.
  Its icon is `icons/clip` (§8; until then, a CSS cream disc with a coral triangle).
- **New dot:** the menu's UPGRADES dot (red, small) on the badge while the clip isn't seen.
- **Popup** (`ui/overlays/clipPopup.ts`): over the shop or the picks, built from the Upgrades
  screen's pieces: the card's name in the title lettering, the clip in a rounded cream frame
  (`<video muted loop playsinline autoplay>`, the poster first), the caption under it, the Upgrades
  close button. Closing: the close button, a tap outside, the back button (it closes the popup, not
  the shop or the pause). Opening it marks the clip seen.
- In the picks, time is stopped anyway; the popup changes nothing in the run.
- Fit 375×667 and 430×932: the clip shrinks to fit the height, the caption stays readable.

### 6.5 Tests, docs, release

- E2E `tests/e2e/clips.spec.ts`: a shop badge opens the popup with a playing clip, closes three
  ways; the dot goes and stays gone after a reload; a pick's badge doesn't select its card; "How
  to play" brings the dots back; the popup fits the three screen sizes. Run only this spec locally.
- GAME_DESIGN §2.2 and §15.5 (the button, the popup), §11 (the flag); TECH_SPEC §9 (clips,
  blob URLs), §11 (the recorder, the hooks), §14 (recording clips); ROADMAP; CHANGELOG; minor
  version bump.

## 7. Build order

1. The recorder and the `magnet` clip; the owner looks at it.
2. The other clips; the owner looks at them all.
3. Config, save flag, button, popup, dot; E2E; docs; release.
4. When the owner's art (§8) comes: the badge icon, and the clips recorded again with the pointer.

## 8. Art (docs/ART_ASSETS.md §4.15)

Two pieces from the owner: the badge icon (`art-source/icons/clip.png`, icon kit) and the pointer
(`art-source/ui/tap-pointer.png`). The game ships with stand-ins until they come; the pointer only
appears inside clips, so only the recorder draws it.

## 9. What the owner tests

- Each clip on the phone: is it clear what the card does, without reading the caption?
- The badge and the dot on the shop and on each kind of pick; the dot gone after one look.
- Offline (airplane mode, the home-screen app): clips still play, on the iPhone too.
- Reduced motion: the clip waits for a tap.

## 10. Out of scope

- Clips during play (the first magnet in the paw, a new curse): the first-run hints stay.
- Sound in clips, clips in the pause menu, a list of all clips.

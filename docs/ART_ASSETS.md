# Maneki Merge: Raster Art Plan (M13)

> The owner generates the art with an AI image tool; Claude cuts, sizes and integrates it.
> Goal: the polish of the owner's AI reference image (round cats in a bamboo jar in a sakura shrine
> garden), with two changes: **every cat is a maneki-neko** (one raised beckoning paw, palm forward,
> collar, gold bell), and **every cat has one body colour**, clearly different from the others, so players can
> tell them apart at a glance (a lighter belly and a few small stripes are fine; patches are not).
> The reference image is a **style** reference only. Attach it to every request.

## 1. How we work

1. **Phase 0: style lock.** Generate the 9-cat lineup sheet (§4.1). Iterate until the style and
   the 9 designs are right. The chosen sheet becomes the second reference for everything after it.
   **Done (2026-10-07):** the approved sheet is `art-source/style/lineup.webp`. Its cats are a bit
   wider than round and flat at the bottom; phase 1 asks for rounder bodies.
2. **One phase at a time** (§3). The owner generates a phase's assets and drops them into
   `art-source/<phase>/` with the file names below (or sends them in chat). Claude checks each file
   against the checklist (§2), reports problems (with a fix to the prompt), then processes and
   integrates the phase, plays it at 390×844 and 375×667 and posts screenshots next to the reference.
3. Fix-ups: only regenerate what failed; keep the same chat/thread in the tool so the style holds.

Tips for the generator:

- Use one tool for everything, highest quality, and attach **the reference image** (and, from
  phase 1, **the approved lineup sheet**) to every request.
- Paste the **style block** (§4.0) at the start of every prompt, then the asset prompt.
- **Background: plain flat solid white (`#FFFFFF`)**, not "transparent". Most tools can't make a
  real transparent PNG and paint a fake checkerboard instead. Claude removes the white: every asset
  has a thick dark-brown outline, so the white outside it comes off cleanly (the white cat too).
  Exceptions: the scene background and the app icon fill their whole canvas.
- No drop shadows on UI pieces; the game adds shadows in code.
- Generate one asset per image unless the prompt says "sheet".
- Text in images: none, except the logo. All labels and numbers are live text (Fredoka) in code.

## 2. Checklist (every image)

- No text, letters, numbers or kanji anywhere (koban and bibs are blank).
- Plain flat white background (no gradient, texture or checkerboard); nothing cropped at the edges.
- No cast shadow under the object, no floor, no glow or sparkles around it (code adds effects).
- Outline: warm dark brown, closed all around, the same weight as the reference.
- Cats: front view; the silhouette is a perfect circle (no flat bottom, feet or tail), only the
  ears stick out; exactly one raised paw, the cat's left (viewer's right), palm and pink pads facing
  the viewer, inside the circle; the other paw down on the belly; collar and bell present; the
  lighter belly is clear and blank; ears fully visible.
- Cats: one body colour each (lighter belly allowed, small stripes only where the prompt says), no
  patches or spots, and the colour matches its row in §4.1.
- Cats still recognisable when shrunk to 64 px, and every cat clearly different from its
  neighbours (size n−1 and n+1) at a glance.

## 3. Asset list

Sizes are what to generate; Claude makes the in-game sizes (WebP, precached for offline). They use
only the three sizes every common tool offers (ChatGPT: 1024×1024, 1536×1024, 1024×1536); a tool
that offers more pixels in the same ratio is better. Set the ratio in the tool's size setting when
it has one, and download the original PNG (not a screenshot or a compressed copy). "×2": upscale
the background 2× (the tool's upscale, or the free Upscayl app) to 2048×3072, since it fills the
whole screen; the rest is sharp enough at the generated size. Rug, paw, logo and banner are
narrower than their canvas: Claude crops the empty space.

**The owner's image tool (since 2026-10-16) offers only five ratios: 1:1, 9:16, 3:4, 4:3 and 16:9.**
Every new prompt asks for one of these. Older prompts below that say 2:3 or 3:2 map to them: a tall
2:3 becomes 3:4 (or 9:16 for something long and thin, or a full-screen picture), a wide 3:2 becomes
4:3 (or 16:9 for a sheet of long horizontal pieces). The art pipeline crops and fits whatever comes,
so the exact pixel size doesn't matter.

| #   | Phase      | File (in `art-source/`)                    | What                                                                | Generate          |
| --- | ---------- | ------------------------------------------ | ------------------------------------------------------------------- | ----------------- |
| 0   | 0 style    | `style/lineup.png`                         | The 9 cats on one sheet (style lock, not used in game)              | 1:1, 1024×1024    |
| 1   | 1 cats     | `cats/size-01.png` … `size-09.png`         | One cat per size (GAME_DESIGN §4)                                   | 1:1, 1024×1024    |
| 2   | 2 scene    | `scene/background.png`                     | Shrine garden behind and around the jar                             | 2:3, 1024×1536 ×2 |
| 2a  | 9 jars     | `scene/background-2` … `-5`                | The grown jars' backgrounds, a bigger place each (§4.10)            | 9:16              |
| 2b  | 10 clouds  | `transition/clouds.jpg`                    | Sheet: the clouds for the growth transition (§4.11)                 | 3:2, 1536×1024    |
| 3   | 2 scene    | `scene/jar.png`                            | Empty bamboo-framed glass jar, front view                           | 2:3, 1024×1536    |
| 4   | 2 scene    | `scene/rug.png`                            | Mint rug the jar stands on                                          | 3:2, 1536×1024    |
| 5   | 2 scene    | `scene/paw.png`                            | Calico dropper arm hanging from the top                             | 2:3, 1024×1536    |
| 5a  | 2 scene    | `scene/noren-mockup.webp`                  | Game screen with the noren, design reference (done)                 | –                 |
| 5b  | 2 scene    | `scene/noren.jpg`                          | Noren curtain over the jar (v0.22–v0.24; gone in v0.25)             | 3:2, 1536×1024    |
| 6   | 3 HUD      | `hud/hud-kit.png`                          | Sheet: card, sunken well, pause button, NEXT bubble, …              | 1:1, 1024×1024    |
| 7   | 3 HUD      | `hud/icons.png`                            | Sheet: coin, paw badge, sparkle, petals, puff                       | 1:1, 1024×1024    |
| 7a  | 3 HUD      | `hud/score-card.png`                       | The whole score card, blank, copied from `ref-score.png`            | 3:2, 1536×1024    |
| 7b  | 3 HUD      | `hud/next-bubble.png`                      | The round NEXT bubble, empty, copied from `ref-next.png`            | 1:1, 1024×1024    |
| 7c  | 3 HUD      | `hud/xp-empty`, `hud/xp-full`              | XP card, an edit of the score card (v0.25 only)                     | 4:3, 1024×768     |
| 7b  | 4 menu     | `menu/mockup.jpg`                          | Whole main-menu screen, design reference (done)                     | 2:3, 1024×1536    |
| 7c  | 4 menu     | `menu/background.png`                      | Menu garden, the mockup without UI, logo and cat                    | 2:3, 1024×1536    |
| 8   | 4 menu     | `menu/logo.png`                            | "Maneki Merge" logo (the only image with text)                      | 3:2, 1536×1024    |
| 9   | 4 menu     | `menu/hero.png`                            | Big golden maneki-neko on a pink cushion                            | 1:1, 1024×1024    |
| 9b  | 4 menu     | `menu/buttons.png`                         | Sheet: blank PLAY, UPGRADES, record card, gear, coin pill           | 3:2, 1536×1024    |
| 9c  | 4 menu     | `menu/menu-icons.png`                      | Sheet: torii, paw badge, arrow, coin, sparkles, petals              | 1:1, 1024×1024    |
| 9d  | 4 menu     | `menu/record-card.png`                     | One empty record card with its sunken well                          | 3:2, 1536×1024    |
| 9e  | 4 menu     | `menu/torii.png`                           | Chunky torii for the BEST STAGE card (v0.42.8)                      | 1:1, 1024×1024    |
| 10  | 4 menu     | `menu/ui-kit.png`                          | Sheet: PLAY, secondary button, panel, card, close, gear             | 3:2, 1536×1024    |
| 11  | 4 menu     | `menu/upgrade-icons.png`                   | Sheet: 5 upgrade icons                                              | 3:2, 1536×1024    |
| 12  | 4 menu     | `menu/settings-icons.png`                  | Sheet: sound, haptics, reduce motion, how to play                   | 1:1, 1024×1024    |
| 13  | 4 menu     | `menu/banner.png`                          | Blank ribbon banner for "The shrine grows!" etc.                    | 3:2, 1536×1024    |
| 14  | 5 app      | `app-icon.jpg`                             | App icon: the golden cat from the chest up, full bleed (§4.6)       | 1:1, 1024×1024    |
| 15  | 6 doors    | `doors/picture.png`                        | Stage-door picture, cut into four strips by the game                | 9:16              |
| 16  | 6 doors    | `doors/panel.png`                          | One empty door frame, laid over each strip                          | 2:3, 1024×1536    |
| 17  | 7 specials | `specials/magnet.png`                      | The magnet token (in the paw and NEXT)                              | 1:1, 1024×1024    |
| 18  | 7 specials | `specials/hanabi.png`                      | The firework ball                                                   | 1:1, 1024×1024    |
| 19  | 7 specials | `specials/joker.png`                       | The joker cat, a rainbow maneki-neko in a jester hat                | 1:1, 1024×1024    |
| 20  | 7 specials | `specials/boulders.png`                    | Sheet: the boulder with 0, 1, 2 and 3 iron bands                    | 1:1, 1024×1024    |
| 21  | 8 screens  | `ui/upgrades-mockup.png`                   | Whole Upgrades screen, design reference (approved)                  | 9:16 or 2:3       |
| 21a | 8 screens  | `ui/upgrade-icons.png`                     | Sheet: the four upgrade icons, the icon kit's style (§5)            | 1:1, 1024×1024    |
| 21b | 8 screens  | `ui/upgrade-pieces.png`                    | Sheet: empty card, Buy button, title card, close button             | 3:2, 1536×1024    |
| 22  | 8 screens  | `ui/trial-mockup.png`                      | Trial pick over the shut doors, design reference                    | 9:16 or 2:3       |
| 23  | 8 screens  | `ui/blessing-mockup.png`                   | Blessing pick, an edit of the trial mockup                          | 9:16 or 2:3       |
| 24  | 11 trials  | `fx/fireball.png`                          | Sheet: Heavy Drop's small and big fireball flames (§4.12)           | 3:2, 1536×1024    |
| 25  | 11 trials  | `fx/porcelain.png`                         | Sheet: 2 crack patterns, 2 gold kintsugi seams                      | 1:1, 1024×1024    |
| 26  | 11 trials  | `picks/wind.png` … `picks/echo.png`        | Card pictures: Wind, Heavy Drop, Porcelain, Hubris, Echo            | 1:1, 1024×1024    |
| 27  | 12 trials  | `fx/stone.png`                             | Sheet: 4 stone patterns, a cursed cat turning to stone (§4.13)      | 1:1, 1024×1024    |
| 28  | 12 trials  | `fx/dice.png`                              | Sheet: the lucky gold die, the cracked grey die                     | 3:2, 1536×1024    |
| 29  | 12 trials  | `picks/cursedBell.png` … `picks/dice.png`  | Card pictures: Cursed Bell, Quick Curse, More Curses, Copycat, Dice | 1:1, 1024×1024    |
| 30  | 13 panels  | `ui/settings-mockup.png`                   | Settings panel, today's layout restyled, design reference (§4.14)   | 9:16              |
| 31  | 13 panels  | `ui/pause-mockup.png`                      | Pause panel, today's layout restyled, design reference              | 9:16              |
| 32  | 13 panels  | `ui/gameover-mockup.png`                   | Game Over panel, today's layout restyled, design reference          | 9:16              |
| 33  | 15 bolt    | `specials/lightning.png`                   | The lightning ball, a little storm with a yellow bolt (§4.16)       | 1:1, 1024×1024    |
| 34  | 15 bolt    | `fx/bolts.png`                             | Sheet on black: six chain bolts, end to end on their rows           | 3:2, 1536×1024    |
| 35  | 15 bolt    | `fx/skybolts.png`                          | Sheet on black: three bolts striking down from the sky              | 2:3, 1024×1536    |
| 36  | 15 bolt    | `fx/zap.png`                               | Sheet on black: impact flash, shock ring, sparks, three small arcs  | 3:2, 1536×1024    |
| 37  | 15 bolt    | `fx/shock.png`                             | Sheet on black: four electric crackle patterns over a struck cat    | 1:1, 1024×1024    |
| 38  | 16 loading | `loading/bar.jpg`                          | The loading bar: the score card, long, with an empty well (§4.17)   | 3:2, 1536×1024    |
| 39  | 16 loading | `loading/bar-full.jpg`                     | The same bar, an edit with the well full of gold                    | 3:2, 1536×1024    |
| 40  | 17 Play    | `store/feature-graphic.png`                | Google Play's feature graphic: the logo and the cats, wide (§4.18)  | 3:2, 1536×1024    |
| 41  | 18 goal    | `ui/goal-strip-mockup*.png`                | Play screen with the stage goal strip, two states (§4.19)           | 9:16              |
| 42  | 18 goal    | `hud/goal-slot.png`                        | The goal's round slot: cream disc, flat gold ring                   | 1:1, 1024×1024    |
| 43  | 19 time    | `scene/background…-sunset.png`             | The five jar backgrounds at sunset, edits of the day ones (§4.20)   | 9:16              |
| 44  | 19 time    | `scene/background…-night.png`              | The five jar backgrounds at night                                   | 9:16              |
| 45  | 20 katana  | `specials/katana.png`                      | The katana, point down, long and slender, no bell (§4.21)           | 9:16              |
| 46  | 20 katana  | `fx/slashes.png`                           | Sheet on black: four straight sword-slash streaks, end to end       | 16:9              |
| 47  | 20 katana  | `fx/cut.png`                               | Sheet on black: cut flash, glint, sparks, swoosh, strike, flash     | 4:3               |
| 48  | 20 katana  | `icons/katana.png` … `icons/wideBlade.png` | The three Katana pick icons (icon kit, §5)                          | 1:1, 1024×1024    |
| 49  | 20 katana  | `specials/katana-ball.png`                 | The katana's ball in the paw and NEXT (v0.55.1, §4.21)              | 1:1, 1024×1024    |

How the pieces go into the game:

- **Cats**: `ArtSkin` (BallSkin) replaces the vector `CatSkin` as the default; the vector cats stay
  behind `?skin=vector`, the placeholder behind `?skin=placeholder`. The hit circle is measured from
  the art so touching cats touch on screen. Cats roll. The cats show no numbers (the owner's call).
- **Jar**: sliced into posts, bottom curve, rail and caps (9-slice), so it fits the physics walls
  exactly and still animates during the stage zoom. The glass tint and the dashed danger line stay
  in code.
- **Background**: anchored to the jar's floor line, scaled with the jar; extra sky is added on tall
  screens, so the top of the image must be plain sky. One per jar since v0.33 (§4.10): the jar
  grows every 5 stages and the next background comes in as the old one shrinks away.
- **HUD and menus**: stay DOM + CSS; frames use the art as `border-image` 9-slices, so cards stretch
  to any text. Numbers and labels stay live text.

## 4. Prompts

### 4.0 Style block (paste first, every time)

```text
Style: match the attached reference image exactly. Polished casual mobile-game art, cute chibi
kawaii illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel
shading with gentle gradients and one small glossy highlight, light from the upper left, warm cream
and sakura-pink palette, clean crisp vector-like edges, rich but readable at small sizes.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard.
No text, no letters, no numbers, no kanji, no watermark, no signature.
```

### 4.1 Phase 0: lineup sheet (style lock)

The nine body colours are spread over the colour wheel and alternate light and dark, so neighbours
never look alike; red and green, blue and purple are never neighbours.

```text
A character lineup sheet: 9 maneki-neko (Japanese lucky cat) game pieces in a 3×3 grid, evenly
spaced, all exactly the same size, on a plain flat solid white background (#FFFFFF), with no shadow
under any cat. Faces: big shiny eyes, rosy cheeks and happy expressions, drawn like the cats in the
reference image.
SHAPE RULE: every cat is a perfect round ball, because it is a ball in a Suika-style merge game.
Head and body are one single sphere, like a gumball or a mochi ball: the outline is a perfect
circle, with no flat bottom, no visible legs or feet, no tail and nothing bulging out. Only the two
small ears stick out above the circle; everything else, both paws included, stays inside it.
POSE RULE: the classic maneki-neko beckoning pose of the porcelain figurines. Exactly ONE paw is
raised: the cat's LEFT front paw (on the viewer's RIGHT), held up beside the cheek at eye height,
inside the circle, with the palm facing the viewer so the pink paw pads (toe beans) show. The other
front paw is DOWN, resting low on the side of the belly, and is never raised. A collar with a round
gold bell sits under the chin.
COLOUR RULE: each cat is ONE solid body colour, completely different from every other cat on the
sheet, so a player can tell all nine apart instantly even when they are small. The only other colour
on the body is a large, lighter, oval belly patch (blank, nothing on it). No patches, no spots, no
calico, no tuxedo, no two-tone coats. Small stripes only where noted.
Left to right, top to bottom:
1. Shiro: snow white body (#FFFFFF), pale pink belly, pink inner ears, sleepy happy closed eyes,
   thin red collar, small gold bell.
2. Kuro: charcoal black body (#3B3A45), light grey belly, big golden eyes, red collar, gold bell.
3. Mikan: bright orange body (#F59A3C) with a few darker orange tabby stripes on the head and back,
   cream belly, sky-blue collar, gold bell, cheerful open mouth.
4. Sora: clear sky-blue body (#6EC3F0), white belly, red collar, gold bell, winking.
5. Sakura: soft pink body (#F7A8C4), white belly, mint-green collar, gold bell, tongue out.
6. Matcha: fresh green body (#8CCB6B) with three small darker green stripes on the forehead, cream
   belly, red collar, gold bell, a small red-and-white bib.
7. Fuji: rich purple body (#8E6AD0), lavender belly, gold collar, gold bell, a small pink sakura
   flower on one ear.
8. Aka: bold red body (#E0473E), cream belly, gold collar, big gold bell, a small gold koban coin
   charm hanging next to the bell.
9. Kin: shiny golden yellow body (#F2C33D) with a soft lacquered sheen, cream belly, red bib with
   gold trim, big gold bell, a sakura flower on one ear. The most luxurious one.
Front view, all facing the viewer. Square 1:1.
```

If a cat comes out wrong, regenerate the sheet with a correction line at the end, e.g.
`Fix only cat 4: make the body a clearer sky blue and the belly white; keep the other 8 exactly the same.`

When the colours and faces are right but the shape or pose is not, edit the image instead of
regenerating it (attach it, in the same chat):

```text
Edit this image. Keep every cat's colour, face, collar, bell and accessories exactly the same, and
change only this:
1. Make every cat a perfect round ball: one single sphere, perfect circle outline, no flat bottom,
   no legs or feet, no tail. Only the ears stick out of the circle.
2. Every cat raises exactly ONE paw: its LEFT front paw (on the viewer's RIGHT), beside the cheek,
   palm facing the viewer with pink paw pads showing. Lower the other paw so it rests low on the
   side of the belly.
3. Plain flat solid white background (#FFFFFF), no shadows under the cats.
```

### 4.2 Phase 1: one cat per file (`cats/size-NN.png`)

Attach the reference image **and** the approved lineup sheet. Style block, then:

```text
Draw only this cat from the attached lineup sheet, on its own: <CAT>. Keep exactly the same body
colour, face, collar, bell, accessories, expression and drawing style, as a single game piece,
centered, facing the viewer. One change from the sheet: the sheet's cats are a little too wide and
flat at the bottom; this one must be perfectly round.
SHAPE RULE: every cat is a perfect round ball, because it is a ball in a Suika-style merge game.
Head and body are one single sphere, like a gumball or a mochi ball: the outline is a perfect
circle, with no flat bottom, no visible legs or feet, no tail and nothing bulging out. Only the two
small ears stick out above the circle; everything else, both paws included, stays inside it.
POSE RULE: the classic maneki-neko beckoning pose of the porcelain figurines. Exactly ONE paw is
raised: the cat's LEFT front paw (on the viewer's RIGHT), held up beside the cheek at eye height,
inside the circle, with the palm facing the viewer so the pink paw pads (toe beans) show. The other
front paw is DOWN, resting low on the side of the belly, and is never raised. A collar with a round
gold bell sits under the chin.
The round body is about 88% of the canvas width and centered horizontally; the ears are fully
visible, with a small empty margin on every side. The lighter oval belly patch is large, clearly
visible, centered horizontally and completely blank.
Plain flat solid white background (#FFFFFF). No floor, no shadow, no glow, no sparkles, nothing
outside the cat. Square 1:1, 1024×1024.
```

Replace `<CAT>` with the cat's line below.

**Done (2026-10-07):** all nine cats are in `art-source/cats/` and in the game (v0.16). Phase 1
worked best with a short prompt and, for a redo, the perfectly round purple cat attached as a shape
template ("copy the attached PURPLE cat exactly for the body shape, size, pose and paw
position").

| File          | `<CAT>`                                                                                |
| ------------- | -------------------------------------------------------------------------------------- |
| `size-01.png` | `top row, left: Shiro, the white cat with closed happy eyes and a red collar`          |
| `size-02.png` | `top row, middle: Kuro, the charcoal black cat with a grey belly and a red collar`     |
| `size-03.png` | `top row, right: Mikan, the orange striped cat with a sky-blue collar`                 |
| `size-04.png` | `middle row, left: Sora, the sky-blue winking cat with a red collar`                   |
| `size-05.png` | `middle row, middle: Sakura, the pink cat with its tongue out and a mint collar`       |
| `size-06.png` | `middle row, right: Matcha, the green cat with forehead stripes and a red bib`         |
| `size-07.png` | `bottom row, left: Fuji, the purple cat with a gold collar and a sakura flower`        |
| `size-08.png` | `bottom row, middle: Aka, the red cat with a gold collar and a gold koban charm`       |
| `size-09.png` | `bottom row, right: Kin, the golden cat with a red bib and a sakura flower on its ear` |

Every size is drawn up to about 900 px on a phone (size 9, a stage's last cat, is the biggest), so each must look good at 1024 px.

### 4.3 Phase 2: scene

**Done (2026-10-07):** jar, paw and background are in the game (v0.17). The background came with its
own rug, so `scene/rug.jpg` is unused. The background is 768 px wide; a 2× upscaled copy would be
sharper on phones.

**Background** (`scene/background.png`): style block, then:

```text
A vertical mobile-game background, portrait 2:3, of a peaceful Japanese shrine garden in spring, matching the background of the reference
image, but with NO jar, NO cats and NO user interface.
Layout from top to bottom: the top 15% is only a soft cream-to-pale-peach sky with a few fluffy
cream clouds (plain enough to extend upwards); sakura branches with pink blossoms reach in from the
top-left and top-right corners; in the middle distance a red torii gate on the left and a small
wooden shrine with a dark tiled roof on the right, with soft pink sakura trees and low bushes; a
stone lantern (tōrō) stands on the ground on each side near the left and right edges; at the
bottom 18% a warm light wooden floor/veranda seen slightly from above, its horizon line straight.
The centre column (the middle 60% of the width, from 25% to 85% of the height) stays calm and
low-contrast, because a glass jar will stand there and the garden shows through it. A few sakura
petals in the air. Soft, bright, cosy.
```

**Jar** (`scene/jar.png`):

```text
An empty tall glass jar in a bamboo frame, game prop, strictly front orthographic view, perfectly
left-right symmetric, like the jar in the reference image. Shape: a U — two straight vertical
bamboo posts, rounded bottom corners (corner radius about one fifth of the width), a straight
bamboo bottom, two short bamboo feet under it. A horizontal bamboo rail across the top, tied to the
posts with brown twine; the posts continue a little above the rail and end in cut bamboo caps.
Inner opening proportions: width : height = 1 : 1.45. The inside is completely empty; the glass is
almost invisible (only a faint highlight streak on the left). The jar fills most of the canvas
height. Plain flat solid white background, no rug, no floor, no cast shadow. Portrait 2:3.
```

**Tighter corners** (done 2026-10-09, in the game in v0.23.4): the owner wanted the same jar with
square bottom corners, and the physics corners went. Asked for square corners outright, the tools
kept drawing the bottom like the top (a pole sticking out past the posts, twine on the corners) or
turned the jar into a closed picture frame. What worked: edit the original `scene/jar.jpg` and only
tighten the bends, one step at a time in the same thread:

```text
Edit the attached bamboo jar. Keep everything exactly the same: the top rail, the twine, the caps,
the posts, the two angled feet, the pale tan glass edge, the colours, the outline, the size and
position. Change only one thing: make the two rounded bottom corners much tighter. The bamboo
still bends in one continuous piece from the post into the bottom, but the bend is now only half
as round as before, so the bottom corners look sharper and more square. The tan glass edge
inside follows the same tighter bend.
```

That gave v0.23.4's jar, whose bottom still bent upwards a little. v0.23.5's jar came from more
edits in the same thread: "make the bottom bamboo and the tan strip above it completely straight and
level from end to end, with sharp square corners at both ends"; then the elbow joints copied back
from the previous image (attached as a second image), since the straightening had cut the corners
flat; then "make the whole frame about 15% wider, keeping exactly the same height", because the
edits had stretched the opening to 1 : 1.65 (asking for a shorter frame changed nothing). Every
edit softens the lines a little, so download the tool's original file each time.

**Rug** (`scene/rug.png`):

```text
A flat mint-green rectangular rug with a cream woven border and small tassels on the short ends,
seen from a low front angle (a wide thin trapezoid), like the rug under the jar in the reference
image. The rug spans the full width of the canvas in a thin band across the middle. Plain flat
solid white background, no shadow, nothing on it. Landscape 3:2.
```

**Paw** (`scene/paw.png`):

```text
A long chubby cat foreleg hanging straight down from the top edge of the image, game prop, like the
paw at the top of the reference image: white fur with a few orange and dark-brown calico patches,
the paw at the bottom facing the viewer, pink toe beans and a pink main pad visible, toes slightly
spread as if gently holding something just below. The arm is straight, vertical, the same width
along its whole length and cut off cleanly at the top edge; the paw ends at about 80% of the
height, the arm is about a quarter of the canvas width and centered. Plain flat solid white background,
no shadow. Portrait 2:3.
```

**Noren** (`scene/noren.png`, **done (2026-10-09), in the game from v0.22 to v0.24**; removed in
v0.25 with the new top HUD, where the paw floats instead; its rod came out tan and
the art tool recolours it to the mockup's rose brown): on a tall phone the paw's arm filled the empty
height between the HUD and the jar. The owner chose a noren (`scene/noren-mockup.webp`): a shop
curtain across the top of the screen, its hem a fixed distance above the jar, the paw reaching out
from under it. The game stretches the plain part of the fabric to the top of any screen (rod and
coin on top, the pink band at the bottom stay as drawn), and the HUD floats over it. Attach the
mockup with the reference image and the lineup sheet. Style block, then:

```text
A Japanese noren shop-entrance curtain, game prop, strictly front orthographic view, perfectly
left-right symmetric, flat with no perspective, like the curtain at the top of the attached game
mockup. It hangs from a straight horizontal bamboo rod across the full width at the very top,
through small cream fabric loops; the rod's two cut ends stick out a little at the sides. The
curtain is split into four equal vertical panels by three thin straight slits that run from the
bottom hem up to just below the rod. Fabric: soft warm cream, one flat even colour, with a wide
sakura-pink band along the bottom hem (about one sixth of the curtain's height) and a thin darker
pink line along the top of the band. The upper part of every panel is completely plain cream
fabric: no pattern, no wrinkles, no folds, no shading change from top to bottom, because the game
stretches it taller on long phone screens. On the centre slit, just below the rod, a round gold
coin with a small embossed paw print (no text), like the coin in the mockup. The bottom hem is
straight and even. The curtain spans the whole canvas width and about 60% of its height. Nothing
behind or below it: no cat, no arm, no paw, no jar. Plain flat solid white background, no cast
shadow. Landscape 3:2.
```

Checks for this one: the slits are straight and vertical, the cream between the coin and the pink
band is flat (it will be stretched), and the bottom hem lies on one straight line.

### 4.4 Phase 3: HUD

**Done (2026-10-07):** the coins card, the pause button and the next bubble are in the game (v0.19).
The generator couldn't draw the cards in the reference's proportions, so both cards are CSS
(v0.19.2) with the coin and the paw badge cut out of the generated images. The stage card was dropped until it has art.

**HUD kit sheet** (`hud/hud-kit.png`), elements well apart on a white background:

```text
A mobile-game UI kit sheet in the style of the reference image's HUD, all elements blank (no text,
no numbers), spaced far apart on a plain flat white background:
1. A wide rounded-rectangle card: cream fill (#fff6e7), thick tan border (#eccda2), soft inner
   highlight, no drop shadow.
2. A sunken rounded well for numbers: slightly darker beige, inner shadow at the top.
3. A thin rounded progress bar: empty beige track, and separately its gold fill.
4. A glossy pink rounded-square pause button with a white pause symbol (two bars), darker pink
   bottom edge.
5. A round pale-blue glass bubble, empty, with a white shine at the top-left (a "next item"
   preview bubble).
6. A small rounded tag (cream with tan border) that sits on the bubble's rim.
Flat front view, crisp edges. Square 1:1.
```

**Icons sheet** (`hud/icons.png`):

```text
A sheet of small mobile-game icons in the style of the reference image, spaced far apart on a
plain flat white background, each readable at 32 px:
1. a shiny round gold coin with a small embossed paw print (blank, no text);
2. a pink cat paw print badge (like the one on the reference's score card);
3. a four-pointed gold sparkle;
4. three different single sakura petals;
5. a small white puff cloud (merge "poof");
6. a small gold bell.
Square 1:1.
```

**Score card and NEXT bubble, copied from the owner's references** (**done (2026-10-09), in the game in v0.23**; `hud/score-card.jpg` and `hud/next-bubble.jpg`, which replaced `hud/next.png`). The owner wants
these two exactly like `hud/ref-score.png` and `hud/ref-next.png` (small crops of a reference
screen). Earlier prompts got the shapes and the paw wrong, so these ask for an **edit of the
attached crop** (remove the text and the cat, redraw it big and clean) instead of a new drawing,
and spell out every colour (sampled from the crops). Attach only that one crop, not the style
reference or the lineup, and don't paste the style block (it would pull the style away from the
crop). Labels and numbers stay live text (Fredoka): "SCORE:" and the score, and "NEXT" (dark brown
with a cream edge, over the bubble's top rim).

Score card (`hud/score-card.png`, 3:2):

```text
Edit the attached image. It is a small crop of a mobile game's score card. Redraw this exact card,
large and razor sharp, as a single game UI asset: same shapes, same proportions, same colours, same
soft rounded edges, same outline weight. Do not restyle, simplify or "improve" anything.
Remove all text: no "SCORE:" label and no number; the caramel well is empty. Remove the background
and the sakura branch: the card alone, centred, on a plain flat solid white background (#FFFFFF),
no shadow, nothing cropped.
Keep exactly:
- The card: a wide rounded rectangle, about 2.1 times as wide as tall, corners rounded with a
  radius of about a quarter of its height. Outline: dark chocolate brown (#5B2517), even, about
  3% of the card's height. Just inside the outline along the top, a thin pure white highlight line.
  Fill: flat warm cream (#FBE7CC). Along the bottom, a raised base like a soft button: a band of
  light tan (#EBBD8E) about 6% of the height, with a thin pale cream line (#FFEFD4) above it.
- The well: a long pill-shaped sunken well in flat caramel (#D4986D), in the lower 55% of the card,
  its right end fully round and close to the card's right edge, with a thin pale cream lip
  (#F7DDBC) under it. The space above the well is plain cream (the label goes there).
- The paw, exactly like the crop: a white cat paw (fur #FFF9F4 with very soft cream shading,
  outlined in the same dark brown) raised like a lucky cat's beckoning paw, palm facing the viewer,
  tilted about 15 degrees to the left. It sits at the card's left end and sticks out past the card's
  left edge by about a tenth of the card's width; its top stays below the card's top edge. Its
  forearm runs down to the card's bottom edge and covers the left end of the well. Pink pads: four
  oval toe beans in an arc and one large rounded triangular main pad, fill #FDB3B2 shading to
  #F9A6A7, each outlined in rose brown (#C37D7B), not dark brown, with a tiny white shine on the
  main pad.
- The middle of the card (between the paw and the well's round right end) is plain, so the game
  can stretch it sideways.
Landscape 3:2.
```

NEXT bubble (`hud/next-bubble.png`, 1:1):

```text
Edit the attached image. It is a small crop of a mobile game's "next item" glass bubble. Redraw
this exact bubble, large and razor sharp, as a single game UI asset: same colours, same glassy
look, same outline weight, same highlights. Do not restyle, simplify or "improve" anything.
Change only these things: remove the "NEXT" text, remove the black cat inside (the bubble is
empty), and remove the speech-bubble tail at the lower left: the bubble is a perfect circle all
the way round, its outline closed and unbroken at the top too. Remove the background and the
pieces of other elements at the edges: the bubble alone, centred, on a plain flat solid white
background (#FFFFFF), no shadow, nothing cropped.
Keep exactly:
- Outline: dark chocolate brown (#531C0A), even, about 2.5% of the bubble's width.
- Just inside it, a cream rim (#F8E9D7 to #FFF8E6), about 3% of the width, a little thicker and
  brighter (#FFFDE3) along the bottom, like the edge of a glass ball.
- The glass: a smooth vertical gradient from pale mint (#CDE8D6) at the top, through pale cream
  (#DDE0CC) in the middle, to soft pink (#F2C2BE) at the bottom.
- Highlights: a long curved white glossy streak inside the rim at the upper left, a small white
  dot just under it, a small white oval shine at the lower right, and two or three tiny white
  sparkle dots.
Square 1:1.
```

Checks for these two: no text anywhere; the paw sticks out of the card's left edge and its pads
have rose-brown (not dark) outlines; the well is empty and pill-shaped; the bubble is a closed
circle with no tail; colours side by side with the crops look the same.

**XP card** (`hud/xp-empty` and `hud/xp-full`, **done (2026-10-09), in the game in v0.25 only**: the
owner dropped the XP levels in v0.26; the images stay here, unused). Mockups
of whole screens kept inventing their own bar styles, so the XP card is an **edit of the approved
score card**: attach only `hud/score-card.jpg`, no style block. Ask for the empty card first, then,
in the same chat, the full one, so both line up (the art tool cuts them to one box and checks the
well; the game shows the full one over the empty one up to the run's XP). "Lv N" is live text.

```text
Edit the attached image. It is the score card of my mobile game. Turn it into an XP bar card by
changing only what is listed below, and redraw it large and razor sharp. Keep exactly the same
style, colours, outline weight, the white highlight inside the top edge, the tan base along the
lower edge, the white paw on the left with its pink pads, and the soft rounded corners. Do not
restyle, simplify or "improve" anything.
Changes:
- Remove all text: no "SCORE:" label and no number.
- Make the caramel well much thicker: it fills almost the whole height of the card, leaving only
  the card's frame around it, so the card becomes one fat, chunky bar. The paw still covers the
  well's left end and sticks out past the card's left edge as now.
- The well stays empty: flat caramel (#D4986D) with its soft inner shadow at the top.
- The card is about 3 times as wide as it is tall.
The card alone, centred, on a plain flat solid white background (#FFFFFF), no shadow, nothing
cropped. Landscape 3:2.
```

```text
Now the same card again, exactly the same in every way, but with the well completely full: the
whole well is filled with glossy gold, like a shiny gold coin (#FECE5A at the top, #FBC23A in the
middle, a darker gold #E39333 along its lower edge), with one long soft white shine streak along
the top of the gold and two or three tiny white sparkles. Nothing else changes.
```

### 4.5 Phase 4: menu

**Menu mockup first** (`menu/mockup.png`, design reference only, not cut into the game). The v0.14
menu (code-drawn) no longer matches the raster game screen, so the owner generates a whole-screen
mockup first. Attach a screenshot of the game screen (e.g. `docs/screenshots/v0.19.4/rest-390x844.png`),
the lineup sheet and the reference image. Words are allowed here because it is only a reference;
in the game every label stays live text. Claude then builds the menu from it like the HUD (cards and
buttons in CSS, measured against the mockup) and asks for the pieces that need art (likely the logo
and the hero below), with prompts adjusted to the chosen mockup.

```text
A complete portrait main-menu screen for a cute casual mobile game called "Maneki Merge", shown
flat and full-bleed: no phone frame, no hands, no device mockup.

Style: match the attached in-game screenshot and reference image exactly. Polished casual
mobile-game art, cute chibi kawaii illustration, thick warm dark-brown outlines (never black),
soft pastel cel shading with gentle gradients and small glossy highlights, light from the upper
left, warm cream and sakura-pink palette, crisp clean edges. The menu must look like it belongs to
the same game as the screenshot.

Background: the same sakura shrine garden as the game: cream sky with soft clouds, sakura branches
in the top corners, a red torii gate and a small shrine in the distance, stone lanterns, pink
bushes, a warm wooden deck at the bottom. A little softer and lighter than the foreground so the
buttons read clearly.

Layout, top to bottom:
1. Top bar: on the left a round cream button with a dark-brown gear icon; on the right a coin
   counter card with a shiny gold coin (a small embossed paw print on it) and the number "1,250".
2. The logo "Maneki Merge" (spelled exactly like that) in chunky rounded bubbly letters, warm cream
   with a soft pink-orange gradient and a thick dark-brown outline, a small gold bell hanging from
   the "M", a few sakura petals around it.
3. The hero, large, in the middle: the golden maneki-neko (cat number 9, Kin, from the attached
   lineup sheet) sitting on a plump pink silk cushion with gold tassels, its raised beckoning paw
   with pink pads facing us, red collar with a big gold bell, a happy smile, a soft warm glow
   behind it, a few gold coins and four-pointed gold sparkles floating around. Two or three smaller
   round lucky cats from the lineup (white, orange, sky blue), each with its raised paw, collar and
   bell, peek in beside the cushion.
4. Two small record cards side by side: "BEST SCORE" over "12,480" with a pink paw badge, and
   "BEST STAGE" over "3" with a small red torii icon.
5. A big glossy coral-pink pill-shaped PLAY button with a white paw icon and the word "PLAY" in
   white rounded letters with a dark-brown outline, and a darker pink bottom edge, like the game's
   pink pause button.
6. Under it a smaller cream "UPGRADES" button with an up-arrow icon and a small red notification
   dot on its corner.

Every card and button: cream fill (#fff6e7), thin dark-brown outline, soft rounded corners and a
tan bottom edge, like the score and coins cards in the screenshot. A rounded friendly font like
Fredoka. Only these words: "Maneki Merge", "PLAY", "UPGRADES", "BEST SCORE", "BEST STAGE", plus
the numbers. No other buttons or icons, no ads, no stars, no level map, no characters other than
the lucky cats, no watermark, no signature. Keep everything important in the middle of the canvas,
with some plain sky at the top and deck at the bottom, so it can stretch to taller phones.
Portrait 2:3 (1024×1536).
```

**Main menu pieces, cut from the mockup.** Done (2026-10-08): the owner picked a mockup
(`menu/mockup.jpg`, 768×1376). Every main-menu piece is now an edit of that image, so it keeps the
mockup's exact look. Attach **only the mockup** to each request, one asset per chat (or a new
message in the same chat). Paste this block first (not the §4.0 style block), then the asset prompt:

```text
The attached image is the approved main-menu mockup of my mobile game. I need one piece of it as a
separate game asset. Copy that piece exactly as it is drawn in the mockup: same shape, proportions,
colours, outlines, shading and highlights. Do not redesign it.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard. No cast
shadow, no glow, no sparkles unless I ask for them. No watermark, no signature.
```

In the game the words ("PLAY", "UPGRADES", "BEST SCORE", the numbers) stay live text (Fredoka) and
the red dot on UPGRADES, the glow behind the cat and the twinkling sparkles are drawn in code.

**Background** (`menu/background.png`): this one is a full-bleed edit, so skip the block above.

```text
Edit the attached image. Remove everything that is user interface or foreground: the gear button,
the coin counter, the "Maneki Merge" logo with its bell, the golden cat and its pink cushion with
tassels, the glow and the sparkles around the cat, the two record cards, the PLAY button and the
UPGRADES button. Paint the garden behind them in their place so the scene is complete: the cream
sky and soft clouds, the sakura branches at the top left and top right, the red torii gate on the
left, the shrine on the right, the stone lanterns on both sides, the sakura trees and bushes, the
wooden deck and the mat at the bottom. Keep everything else exactly the same: positions, colours,
outlines and lighting. The middle stays calm and low-contrast, because the logo, the cat and the
buttons go back on top of it. No text, no letters, no numbers anywhere. Same framing; if the canvas
has to be wider, extend the garden at the sides, never crop the top or bottom.
Portrait 2:3 (1024×1536).
```

**Logo** (`menu/logo.png`):

```text
Only the "Maneki Merge" logo from the mockup, on its own: the same two lines, "Maneki" on top and
"Merge" below, the same chunky rounded coral-pink letters with their cream highlights and thick
dark-brown outline, the same gold bell hanging at the left of "Merge" and the same few small sakura
petals around the letters. Spelled exactly "Maneki Merge". Centered, about 90% of the canvas width,
with a small empty margin on every side. Landscape 3:2 (1536×1024).
```

**Hero** (`menu/hero.png`):

```text
Only the golden lucky cat sitting on its pink cushion from the mockup, on its own: the same golden
maneki-neko with the tabby stripes on its head, closed happy eyes, rosy cheeks and smile, the same
raised beckoning paw with pink paw pads on the same side as in the mockup, the red collar with the
gold bell, sitting on the same plump pink cushion with gold tassels. The whole cat and cushion are
fully visible, from the ear tips to the tassels, centered, with a small empty margin on every side.
No glow behind it, no sparkles, no coins, no shadow under the cushion. Square 1:1 (1024×1024).
```

**Buttons and cards** (`menu/buttons.png`):

```text
These interface pieces from the mockup, as a sheet, spaced far apart, each drawn exactly as in the
mockup (same colours, outline, gloss, bottom edge and corner rounding) and completely EMPTY:
1. the big coral-pink PLAY button with NO text: just the glossy pill, about 3.2 times as wide as
   it is tall;
2. the cream UPGRADES button with NO text, NO arrow and NO red dot: just the pill, about 4 times as
   wide as it is tall;
3. one record card like the BEST SCORE card with NO text, NO icon and NO number: just the cream card
   with its outline and the empty sunken beige well inside it, about 1.9 times as wide as it is tall;
4. the round cream settings button WITH its brown gear;
5. the coin counter pill from the top right with NO coin and NO number, about 2.5 times as wide as
   it is tall.
No text, no letters, no numbers anywhere. Landscape 3:2 (1536×1024).
```

If a shape comes out with the wrong proportions, it is built in CSS instead (like the HUD cards).

**Record card** (`menu/record-card.png`): the buttons sheet's card came out as one big well, so the
card was asked for on its own:

```text
Only ONE empty record card from the mockup (the BEST SCORE card), on its own, with everything
inside it removed: no words, no numbers, no paw badge, no torii. Keep exactly:
- the cream card with rounded corners, the thick dark-brown outline and the slightly darker tan
  bottom edge;
- the empty top part of the card where the title was: plain cream, about 40% of the card height;
- below it the sunken well: one long rounded pill in a darker tan, with NO outline and a soft
  inner shadow at its top, about 45% of the card height and almost the full card width, with an
  even cream margin under it and beside it.
The card is about 1.9 times as wide as it is tall, centered, about 80% of the canvas width.
Landscape 3:2 (1536×1024).
```

**Done (2026-10-08):** the main menu is in the game (v0.20), placed in mockup pixels. What the tool
fixed instead of a regeneration: the logo's rim was a little darker than the mockup's (lifted), the
hero's cushion came out peach (turned pink), the buttons came out ~10% flatter than the mockup's
(they stretch, so it doesn't show), the coins pill ran off the sheet (its left end is mirrored), the
icons sheet drew a pink gear instead of the paw badge (the HUD's badge is used) and a line under the
arrow (dropped). The glow and the sparkles' twinkle are code; the sheets' petals are unused.

**Small icons** (`menu/menu-icons.png`):

```text
These small icons from the mockup, as a sheet, spaced far apart, each drawn exactly as in the
mockup and readable at 32 px:
1. the small red torii gate icon from the BEST STAGE card;
2. the round pink paw-print badge from the BEST SCORE card;
3. the up-arrow icon from the UPGRADES button;
4. the shiny gold coin from the coin counter;
5. the four-pointed gold sparkle from around the cat, twice: one big, one small;
6. three single sakura petals like the ones floating in the air, each at a different angle.
No text, no letters, no numbers. Square 1:1 (1024×1024).
```

The shop and settings screens keep the sheets below (ui-kit, upgrade icons, settings icons, banner);
they get their own mockups later.

**UI kit sheet** (`menu/ui-kit.png`):

```text
A mobile-game menu UI kit sheet in the style of the reference image, all elements blank (no text),
spaced far apart on a plain flat white background:
1. a big glossy coral round-cornered primary button (pill shape) with a darker coral bottom edge;
2. a mint secondary button, same shape, smaller;
3. a cream gold "buy" button, same shape, small;
4. a large cream panel with a thick tan border, rounded corners, no drop shadow, a small sakura
   branch decoration on the top-left corner;
5. a smaller cream card for list items (tan border);
6. a round close button (cream, brown X);
7. a round settings button (cream, brown gear);
8. an ON switch (mint) and an OFF switch (beige), pill shaped.
Flat front view, crisp edges. Landscape 3:2.
```

**Upgrade icons** (`menu/upgrade-icons.png`):

```text
Five square mobile-game upgrade icons in the style of the reference image, on a plain flat
white background, spaced far apart, each readable at 48 px, no text:
1. Lucky Paw: a maneki-neko's raised paw with a gold coin;
2. Big Catch: a big red sea bream (tai fish) on a bamboo fishing line;
3. Golden Merge: two gold coins clinking with gold sparkles;
4. Combo Charm: a red omamori charm bag with a gold knot and small sparkles;
5. Second Chance: a red daruma doll.
Landscape 3:2.
```

**Settings icons** (`menu/settings-icons.png`):

```text
Four round mobile-game settings icons in the style of the reference image, on a plain flat
white background, spaced far apart, readable at 32 px, no text: 1. a speaker with sound waves; 2. a
phone vibrating; 3. a snail (reduce motion); 4. a question mark in a speech bubble (how to play). Square 1:1.
```

**Banner** (`menu/banner.png`):

```text
A blank horizontal ribbon banner for a mobile game: a red ribbon with gold edges and folded ends,
a few sakura petals at its ends, no text, in the style of the reference image. Plain flat white
background. Landscape 3:2, the ribbon as wide as the canvas.
```

**Torii for the BEST STAGE card** (`menu/torii.png`, v0.42.8): the menu's record cards are the
HUD's score card (v0.42.5); BEST STAGE has no paw, so the torii sits in the well's left end where
the paw sits on BEST SCORE. The sheet's torii is thin and flat there. This one is a card ornament
like the paw, not a §5 medallion. Attach `public/assets/hud/score-card.webp` and
`art-source/menu/mockup.jpg`. The pipeline uses it instead of the sheet's torii, in the menu and
on the shop's locked cards.

```text
Style: match the attached score card and its white cat paw exactly. Polished casual mobile-game
art, cute chibi kawaii illustration, thick warm dark-brown outlines (never black) of even weight,
soft pastel cel shading with gentle gradients and one small glossy highlight, light from the upper
left, clean crisp vector-like edges, readable at 32 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One small icon for the mobile game "Maneki Merge": a cute, chunky red Japanese torii gate, seen
straight from the front, perfectly symmetric. In the game it sits inside the caramel well of the
attached card, beside the "BEST STAGE" number, the way the white cat paw sits on the score card, so
draw it with the same outline weight, shading and warmth as that paw.
The gate is stocky and toy-like, about as wide as it is tall, with soft rounded corners and no
thin parts:
- a thick top beam that curves gently upward at both ends, capped in dark chocolate brown;
- a second straight crossbeam a little below it, in glossy vermilion red;
- a small blank plaque between the two beams;
- two thick round pillars, as thick as the beams, slightly splayed, in glossy vermilion red with a
  lighter red highlight on their left side;
- small dark chocolate-brown feet at the bottom of each pillar.
Only the gate: no ground, no steps, no lanterns, no petals, no sparkles, no circle or badge
behind it. The gate centred, filling about 80% of the canvas. Square 1:1.
```

**Done (2026-10-13, v0.42.9):** `menu/torii.jpg` is in the game, on the BEST STAGE card (66 mockup
px wide, centred on the well's height) and on the shop's locked cards.

### 4.6 Phase 5: app icon

The icon on the phone's home screen, the install sheet and the browser tab (until v0.42.11 a
code-drawn cream cat in a gold coin, `public/icon.svg`). **Done (v0.42.11):**
`art-source/app-icon.jpg`, the golden cat from the chest up; `npm run icons`
(`tools/buildAppIcon.ts`) makes every size. One full-bleed square, no white to cut: the phone
crops it, to a rounded square on iPhones and to a circle (or a squircle) on Android, so everything
that matters sits in the centre 70%. Attach the menu's hero (`art-source/menu/hero.jpg`), the
menu mockup (`art-source/menu/mockup.jpg`) and the lineup sheet (`art-source/style/lineup.webp`).
Save it as `art-source/app-icon.png` (1:1, 1024×1024); Claude makes every size from it (the PWA
icons 64/192/512, the maskable 512, Apple's 180 and the favicon). The raised paw reaches a little
past the maskable icon's safe circle, so the maskable one shrinks the picture to 86% and copies
its edge pixels outwards (the cream, and the body straight down).

```text
Style: match the attached images exactly (the game's golden lucky cat, its main menu and its cat
lineup). Polished casual mobile-game art, cute chibi kawaii illustration, thick warm dark-brown
outlines (never black) of even weight, soft pastel cel shading with gentle gradients and one
small glossy highlight, light from the upper left, clean crisp vector-like edges. No text, no
letters, no numbers, no kanji, no watermark, no signature.

The app icon for the mobile game "Maneki Merge": the golden maneki-neko from the attached menu
picture, the very same cat (golden-yellow body with a few soft orange tabby stripes on its
forehead, happy closed eyes, pink cheeks, a red collar with a gold bell), shown from the chest up,
big and centred, looking straight at the viewer, its left paw (the viewer's right) raised beside
its face with the palm and the pink paw pads facing the viewer. Behind it, filling the whole
square edge to edge: a warm cream background (#fcefdf) with a soft sakura-pink glow round the cat
and a few small pink cherry-blossom petals near the corners. The ears, the raised paw and the bell
all sit inside the centre 70% of the square; nothing important near the edges or the corners
(phones crop the icon to a circle or a rounded square). Bold, simple shapes that still read at
48 px on a home screen. No border, no frame, no rounded corners, no transparent areas, no shadow
round the edge. Square 1:1, 1024×1024.
```

### 4.7 Phase 6: stage doors

The folding screen (byōbu) is an interstitial between stages, a picture in its own right. When a
stage is cleared, two wings of two panels each fold in from the sides like an accordion and meet in
the middle. The screen stays closed while the trial and blessing are picked (the pick cards are
their own UI on top, not part of this art), then folds open again and the zoom plays as before
(GAME_DESIGN §7.1). The fold is CSS 3D in code; the art is the screen seen flat and closed.

**Done (2026-10-10):** the picture and the panel are in the game (v0.29), from the two-piece plan below. The picture is 768 px wide; a 2× upscaled copy would be sharper on phones.

**Current plan (2026-10-10): two pieces.** Every one-image attempt below came out folded at an
angle: asked for four panels, the tools draw a folding screen as furniture, and an attached angled
image makes them copy its shape. So the art is now two separate images, and the game puts them
together: it cuts the picture into four vertical strips and lays one panel frame over each strip,
stretching the frame's plain sides to the screen's height. The picture is 9:16, close to a phone's
shape, so nothing needs repeating.

Use a new thread for each. Attach only the two game screenshots
(`docs/screenshots/v0.26.0/390-1-hud.png` and `docs/screenshots/v0.20.1/menu-390x844.png`), not
an earlier screen image. Style block, then:

**Picture** (`doors/picture.png`, 9:16):

```text
A full-screen vertical illustration for a cute mobile game, portrait 9:16, filling the whole
canvas edge to edge, with no border and no frame: a peaceful Japanese shrine garden in spring,
seen straight on. A pale cream sky fills the upper half, with puffy cream clouds; a big soft gold
sun sits exactly in the horizontal centre of the image, in the upper third; a few round blank gold
coins hang on strings from the top edge. Lower down: a big sakura tree with pink blossoms rising
on the left side, a red torii gate left of centre, a small wooden shrine with a dark tiled roof
right of centre, soft pink sakura trees and green bushes behind them, and a sandy path along the
bottom. Draw it in exactly the art style of the attached game screenshots: thick warm dark-brown
outlines around every shape, flat cel shading, chunky rounded cartoon shapes, blossoms and clouds
like the ones in the screenshots. No doors, no panels, no frame, no lattice, no cats, no text,
no kanji. This image fills the whole canvas, so ignore the white background rule.
```

**Panel** (`doors/panel.png`, 2:3):

```text
One single tall wooden shoji door frame, a game UI piece, seen perfectly straight from the front,
completely flat like a drawing on paper: a plain upright rectangle, perfectly left-right
symmetric, no perspective, no angle, no depth, no second panel. About two and a half times as
tall as it is wide, centred, filling most of the canvas height. A chunky glossy rose-brown wooden
frame (#813C2D) with soft rounded corners and small gold corner caps on all four corners. At the
top, under the top rail, two rows of small square lattice windows with cream paper (#FFF4E2),
three windows per row; the same two rows at the bottom, above the bottom rail. Between them the
middle of the frame is one big empty opening: nothing inside, only the plain white background
showing through, no paper, no bars, no picture. The two side bars run straight and even from top
to bottom. Plain flat solid white background, no shadow. Portrait 2:3.
```

Checks: the picture fills the canvas with no panels or frame and the sun in the exact centre; the
panel is one flat, symmetric frame, its middle plain white, its window paper cream.

**Earlier attempts** (kept for what went wrong):

Claude cuts the four panels apart at the white gaps. Phones are taller than the 2:3 image (a
390×844 screen needs about 45% more height), so each panel gets taller by repeating its plain
lattice rows at the very top and bottom; the painting stays whole in the middle. If the tool offers
a taller portrait size (9:16), use it: less needs repeating. Upscale ×2: it fills the whole screen.

Attach two screenshots of the game as the style reference: the game screen
(`docs/screenshots/v0.26.0/390-1-hud.png`) and the main menu
(`docs/screenshots/v0.20.1/menu-390x844.png`), plus the lineup sheet for variant B. Style block,
then **one** of the two paintings (generate both if unsure and compare). Add this line at the end
of the prompt:

```text
Draw it in exactly the art style of the attached game screenshots: thick warm dark-brown outlines
around every shape, flat cel shading, chunky rounded cartoon shapes, blossoms and clouds drawn
like the ones in the screenshots.
```

**Variant A: gold clouds and sakura** (`doors/screen.png`):

```text
A Japanese folding screen (byobu) with four tall panels standing side by side, a game prop for a
cute maneki-neko mobile game, shown completely flat: strictly front orthographic view, all four
panels unfolded in one straight line, no perspective, no zigzag, no angle, no room around it.
PANELS: four identical tall rectangular panels of exactly equal width, each with its own frame,
separated by a narrow straight vertical gap of plain white background (about 1% of the image
width), so each panel can be cut out on its own. No hinges, no metal between the panels. Together
they fill the whole width of the canvas and about 96% of its height; nothing is cropped.
FRAME: every panel has a chunky frame of glossy lacquered rose-brown wood (#813C2D), soft rounded
outer corners, a warm lighter highlight along its top and left edges, and small gold corner caps
on all four corners.
PAPER AND LATTICE: inside each frame, warm cream washi paper (#FFF4E2, never pure white) behind a
lattice of thin caramel-brown wooden bars: two vertical bars split each panel into three equal
columns, and evenly spaced horizontal bars split it into tall rectangular cells, every row of
cells exactly the same height from the top of the panel to the bottom.
PAINTING: one big picture painted on the paper behind the lattice bars, flowing across all four
panels as a single composition: a blossoming sakura tree whose dark trunk rises from the lower
left and whose branches spread across all four panels, full of pink blossoms; soft gold-leaf
clouds (rounded, scalloped Japanese cloud bands) drifting behind it; a big pale gold sun behind
the two middle panels; a few blank round gold coins hanging among the blossoms like lucky charms;
drifting pink petals. The painting fills the panels except the top two and bottom two rows of
lattice cells, which stay plain cream paper with nothing painted on them.
No cats on the screen. No text, no kanji, no calligraphy, no seal stamp. Plain flat solid white
background around the screen, no floor, no cast shadow. Portrait 2:3.
```

**Variant B: the lucky cat** (`doors/screen-cat.png`): the same prompt, with the PAINTING part
replaced by:

```text
PAINTING: one big picture painted on the paper behind the lattice bars, flowing across all four
panels as a single composition: in the centre a big cute white maneki-neko like cat 1 of the
attached lineup (round body, one raised beckoning paw, red collar, gold bell) sitting on a pink
cushion, painted across the two middle panels so the gap between panel 2 and panel 3 runs straight
down the middle of the cat; around it soft gold-leaf clouds (rounded, scalloped Japanese cloud
bands), sakura branches with pink blossoms reaching in from the outer panels, blank round gold
coins falling like gentle rain and small piles of gold coins at the cat's sides, drifting pink
petals. The painting fills the panels except the top two and bottom two rows of lattice cells,
which stay plain cream paper with nothing painted on them.
```

**Restyle** (2026-10-10): the first generation of variant A had the right layout but a thin-lined,
watercolour look that didn't match the game, and its panels were slightly tilted. Edit it in the
same thread, attaching the two screenshots:

```text
Redraw the first attached image, the four-panel folding screen, in exactly the art style of the
other attached images, the screenshots of the game and its main menu. Keep the composition: the
four panels, the white gaps between them, the cream paper, the lattice, the sakura tree, the
clouds, the sun, the hanging coins and the plain top and bottom rows of cells.
Change the drawing style to match the screenshots:
- a thick warm dark-brown outline of even weight around every shape: the frames, every lattice
  bar, the trunk and branches, every blossom, every cloud, the sun and every coin;
- flat cel shading with soft pastel gradients and one small glossy highlight, no watercolour,
  no gold-leaf texture, no fine painterly detail;
- chunky, rounded, simplified cartoon shapes; the trunk and branches thicker and smoother;
- blossoms drawn like the ones in the screenshots: simple round five-petal pink flowers with a
  darker pink centre, fewer and bigger;
- clouds drawn like the clouds in the screenshots: puffy rounded shapes with an outline, in soft
  cream and pale gold;
- the sun a flat soft gold circle with an outline; the coins like the game's gold coin: round,
  glossy, blank, with an outline;
- the frame chunky glossy rose-brown wood with gold corner caps, like the game's buttons and cards.
Make all four panels perfectly flat and facing the viewer: their top and bottom edges perfectly
horizontal and level with each other, no tilt, no perspective.
No text, no kanji, no stamp. Plain flat solid white background around the screen.
```

If the edit keeps too much of the old look, start a new thread with the two screenshots and the
text prompt above (with the style line at its end).

The restyled screen (a garden scene with a torii, a shrine and a sun split between the two
middle panels) matched the game, but came out at 3:4, filling only about 78% of the height (panels
about 1 : 4.4 against 1 : 8.7 on a 390×844 phone), with its panels drawn folded at an angle. Fix in
the same thread, with the size set to portrait 9:16 (or 2:3):

```text
Keep the art style, the colours, the scene and everything in it exactly the same. Change only
the shape:
- Draw the folding screen completely flat, seen straight from the front: all four panels are
  plain upright rectangles of exactly the same width and height, their top edges on one straight
  horizontal line and their bottom edges on another. No zigzag, no fold, no angle, no perspective.
- Make the screen much taller: it fills the whole height of the portrait canvas (about 96%),
  with the same narrow white gaps between the panels. Use the extra height for the scene: more
  sky above it (the sun, the hanging coins and the clouds higher up) and a little more ground
  below it, so the painting stays one picture. Keep exactly two rows of lattice windows at the
  top and two at the bottom of every panel.
```

If the edit keeps the old size, ask for it as a new image in the same thread ("Generate this same
picture again as a new image", then the same list).

The edit only widened the canvas to 9:16 and left the folded screen as it was. Asked for a
"folding screen" or "byobu", the tools draw folded furniture at an angle, because that is how
every byobu photo looks. What to use instead: a new thread, size 9:16, attaching the restyled image
(for its scene) and the two screenshots (for the style); style block, then:

```text
Four tall shoji door panels standing side by side in one flat row, seen perfectly straight from
the front, like a flat wall of sliding doors: a full-screen graphic for a cute mobile game, not a
piece of furniture. Every panel is a plain upright rectangle, all four exactly the same width and
height, their top edges on one straight horizontal line and their bottom edges on another. No
folding, no zigzag, no angle, no perspective, no depth.
SIZE: the four panels fill the whole portrait canvas from the top edge to the bottom edge (about
97% of its height, only a thin white margin), and the whole width. Each panel is very tall and
narrow, about seven times as tall as it is wide. Between the panels a narrow straight vertical gap
of plain white background.
PANEL: a chunky rose-brown wooden frame around each panel, gold corner caps on the four outer
corners of the row. At the top and at the bottom of every panel, two rows of small square lattice
windows with cream paper. Between them, the rest of the panel is plain cream paper with no lattice
bars, and one picture is painted across all four panels.
PICTURE: the same scene as the first attached image, made taller to fill the tall panels: a pale
cream sky taking the upper half, with a big soft gold sun split exactly between panel 2 and panel 3,
gold coins hanging on strings from the top, puffy cream clouds; lower down a big sakura tree with
pink blossoms rising on the left panel, a red torii gate on panel 2, a small wooden shrine with a
dark roof on panels 3 and 4, soft pink sakura trees and green bushes behind them, and a sandy path
at the bottom.
Draw it in exactly the art style of the attached game screenshots: thick warm dark-brown outlines
around every shape, flat cel shading, chunky rounded cartoon shapes.
No text, no kanji, no stamp. Plain flat solid white background around the panels, no floor, no
shadow. Portrait 9:16.
```

Checks for this one: four panels of equal width with straight white gaps between them; the
panels are flat (no angle or zigzag); the paper is cream, not white; the top two and bottom two
rows of cells are plain and the same height as the others; no kanji or stamp anywhere. If the tool
draws the screen at an angle or paints into the plain rows, edit the image in the same thread:
"Keep everything the same; make the four panels completely flat and facing the viewer" or "keep
the painting, but leave the top two and bottom two rows of lattice cells plain cream paper".

### 4.8 Phase 7: special balls

**Done (2026-10-10):** all four are in the game (v0.30), from the first generation. The boulders' bands and the hanabi's red band stick out of the circle by a few pixels, which the circle fit leaves out.

The magnet, the hanabi, the joker cat and the boulder (GAME_DESIGN §15) were code-drawn
placeholders until these came in. Each is a ball like the cats, so the art goes through the cats'
pipeline: the white is cut, the round body is fitted (a fuse or a hat sticking out of the top is
left out of the fit, like the cats' ears) and scaled onto the ball's physics radius. The game adds
the effects in code: a lit hanabi's flickering glow, the magnet's gold selection ring, sparks and
chips. Boulders have four looks, one per iron band left (Iron Bands has 3 levels), so they come
on one sheet to stay alike.

Attach the lineup sheet (`art-source/style/lineup.webp`) and the game screenshot
`docs/screenshots/v0.26.0/390-1-hud.png` to every request. Each prompt is complete (the style
block is inside it). One image per request, square 1:1 (1024×1024).

**Magnet** (`specials/magnet.png`):

```text
Style: match the attached images exactly (the game's cat lineup and a game screenshot). Polished
casual mobile-game art, cute chibi kawaii illustration, thick warm dark-brown outlines (never
black) of even weight, soft pastel cel shading with gentle gradients and one small glossy
highlight, light from the upper left, clean crisp vector-like edges, readable at small sizes.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the object. No text, no letters, no numbers, no kanji, no watermark.

A magnet token for a Suika-style merge game, the same size and drawing style as the cats in the
attached lineup: strictly front view, its outline a perfect circle, centred, filling about 80% of
the canvas. A round cream disc with a thin gold rim, like a lucky coin, and in its middle a big
glossy red horseshoe magnet, opening downwards, with shiny silver-white tips, and two or three
small curved gold lines beside each tip showing its pull. Everything stays inside the circle.
Square 1:1.
```

**Hanabi** (`specials/hanabi.png`):

```text
Style: match the attached images exactly (the game's cat lineup and a game screenshot). Polished
casual mobile-game art, cute chibi kawaii illustration, thick warm dark-brown outlines (never
black) of even weight, soft pastel cel shading with gentle gradients and one small glossy
highlight, light from the upper left, clean crisp vector-like edges, readable at small sizes.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the object. No text, no letters, no numbers, no kanji, no watermark.

A Japanese firework shell (hanabi-dama) drawn as a cute ball for a Suika-style merge game, the
same size and drawing style as the cats in the attached lineup: strictly front view, its outline a
perfect circle, centred, filling about 80% of the canvas. The ball is wrapped in deep navy washi
paper with a bright firework burst painted on it: rays and dots in pink, gold, mint and white
spreading from the centre. A thin red paper band goes round its middle. A short twisted brown
paper fuse with a tiny red tip sticks up from the very top, only as big as a cat's ear; nothing
else sticks out of the circle. No flame, no sparks, no glow around it (the game adds them).
Square 1:1.
```

**Joker cat** (`specials/joker.png`):

```text
Style: match the attached images exactly (the game's cat lineup and a game screenshot). Polished
casual mobile-game art, cute chibi kawaii illustration, thick warm dark-brown outlines (never
black) of even weight, soft pastel cel shading with gentle gradients and one small glossy
highlight, light from the upper left, clean crisp vector-like edges, readable at small sizes.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the object. No text, no letters, no numbers, no kanji, no watermark.

The joker cat, the wild card of a Suika-style merge game: a maneki-neko (Japanese lucky cat) with
exactly the same round body, pose, size and drawing style as the cats in the attached lineup.
SHAPE: head and body are one perfect round ball; only the two ears and a small hat stick out
above the circle; no feet, no tail. POSE: exactly ONE raised beckoning paw, the cat's left (on
the viewer's right), held up beside the cheek with the palm and pink paw pads facing the viewer;
the other paw rests down on the belly. A collar with a round gold bell under the chin.
WHAT MAKES IT THE JOKER: its body has soft pastel rainbow stripes (red, orange, yellow, green,
blue and purple bands curving across the ball) with a plain cream belly patch; a playful winking
face with a little pink tongue out; a small jester hat between its ears with two floppy points,
one pink and one purple, each tipped with a tiny gold bell. It must look clearly different from
all nine cats in the lineup at a glance. Square 1:1.
```

**Boulders** (`specials/boulders.png`, a sheet):

```text
Style: match the attached images exactly (the game's cat lineup and a game screenshot). Polished
casual mobile-game art, cute chibi kawaii illustration, thick warm dark-brown outlines (never
black) of even weight, soft pastel cel shading with gentle gradients and one small glossy
highlight, light from the upper left, clean crisp vector-like edges, readable at small sizes.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the objects. No text, no letters, no numbers, no kanji, no watermark.

A sheet of four game balls for a Suika-style merge game in a 2×2 grid, evenly spaced, all exactly
the same size, each one a perfect circle seen strictly from the front, with white space between
them. All four are the SAME boulder: a round grey stone ball like a smooth river stone, cool soft
grey with a few darker speckles and one soft highlight, no face. Only the iron bands differ:
- top left: the bare stone, no band;
- top right: one iron band, a dark steel strap with two round rivets, wrapped straight across the
  middle of the stone from edge to edge;
- bottom left: two iron bands, evenly spaced;
- bottom right: three iron bands, evenly spaced.
The bands are horizontal and curve slightly with the ball's round surface; nothing sticks out of
the circles. Square 1:1.
```

Checks for these: the outline is a closed circle (only the hanabi's fuse and the joker's ears and
hat stick out at the top); a plain white background with nothing cropped; the joker has exactly
one raised paw on the viewer's right, a collar and a bell; the four boulders are the same stone at
the same size, with 0, 1, 2 and 3 bands.

### 4.9 Phase 8: Upgrades and the stage-clear picks

The Upgrades screen and the trial and blessing picks are still the code-drawn cards of v0.14–v0.21,
plainer than the raster menu and game. As for the main menu (§4.5), the owner first generates a
**whole-screen mockup** of each (a design reference, words allowed); Claude builds the screen from
the approved mockup in CSS and then asks for the pieces that need art (icons, frames, the title
plaque), as edits of the mockup. Generate at portrait 9:16 if the tool offers it, else 2:3.

Attach to every mockup request: the approved main-menu mockup (`art-source/menu/mockup.jpg`), the
game screen (`docs/screenshots/v0.26.0/390-1-hud.png`) and the lineup sheet
(`art-source/style/lineup.webp`), plus the screen's current version for its content (named below).

**Upgrades mockup** (`ui/upgrades-mockup.png`, approved as `ui/upgrades-mockup.jpg`); also attach
`docs/screenshots/v0.30.0/shop-current-390x844.png`:

```text
Style: match the attached main-menu mockup and game screenshot exactly. Polished casual
mobile-game art, cute chibi kawaii illustration, thick warm dark-brown outlines (never black),
soft pastel cel shading with gentle gradients and small glossy highlights, light from the upper
left, warm cream and sakura-pink palette, crisp clean edges. It must look like the same game as
the attached main menu.

A complete portrait "Upgrades" screen for the cute casual mobile game "Maneki Merge", shown flat
and full-bleed: no phone frame, no hands, no device mockup. It is a lucky-charm shop at the
shrine, where coins buy permanent upgrades. Use the content of the attached current screen, but
redesign its look to match the main menu.

Background: the main menu's sakura shrine garden, softly blurred and a little darker, so the
panel in front reads clearly.

Layout, top to bottom:
1. A title plaque at the top centre: a small wooden shrine signboard (warm brown wood, a tiny
   red-and-gold roof edge, gold corner caps) with the word "Upgrades" in chunky rounded cream
   letters with a dark-brown outline. To its right a round cream close button with a dark-brown X,
   like the menu's gear button. Under the plaque, a coin counter card like the menu's: a shiny gold
   coin with a small embossed paw print and the number "1,250".
2. Four upgrade cards stacked down the screen, each a cream card (#fff6e7) with a thin dark-brown
   outline, soft rounded corners and a tan bottom edge, like the menu's record cards. Each card:
   on the left, a round illustrated icon in a cream medallion with a gold rim; to its right the
   name, the level ("2/10") and a row of level marks drawn as small gold coins (earned) and pale
   empty coin outlines (not yet); under them a short description in brown; at the bottom the stat
   in small caps with its change ("COINS +30% → +45%"); on the right a glossy gold pill-shaped buy
   button with a darker gold bottom edge, a small gold coin and the price.
   - "Lucky Paw", 2/10, "+15% coins from everything", COINS +30% → +45%, price 125. Icon: a white
     maneki-neko paw with pink pads holding a gold koban coin.
   - "Big Catch", 0/5, "Bigger cats come more often", BIGGEST DROP 10% → 13%, price 100. Icon: a
     big red sea bream (tai fish) hanging from a bamboo fishing rod.
   - "Combo Charm", 1/5, "+8% coins per combo step (up to 5 steps)", PER COMBO STEP +8% → +16%,
     price 160. Icon: a red omamori charm bag with a gold knot and little sparkles.
   - "Second Chance", 0/2, "+1 Lucky Save per run", LUCKY SAVES 0 → 1, price 500. Icon: a red
     daruma doll with one eye painted in.
A rounded friendly font like Fredoka. Only these words and numbers; no other buttons, no tabs, no
ads, no stars, no characters besides what is listed, no watermark, no signature. Keep the cards in
the middle of the canvas with some garden above and below, so it can stretch to taller phones.
Portrait 9:16 (or 2:3).
```

**Upgrades mockup approved (2026-10-10):** `art-source/ui/upgrades-mockup.jpg` (768×1376), after one
edit of the first generation: the owner removed the row of gold level coins under each name and
the wooden signboard with a roof behind the title (the title now sits on a plain cream pill). The
level stays as text ("2/10"). Every word and number on the screen is live text (Fredoka), so the
mockup's text slips (the buttons say "+ 125") don't matter. The garden behind is the menu's
background, blurred in CSS, and the coin counter is the menu's coins pill (`menu/buttons.jpg`).

**Upgrades pieces, cut from the mockup.** Attach **only the mockup**, one request per image, and
paste the whole prompt:

Icons (`ui/upgrade-icons.png`; they also set the style of every later icon, §5):

```text
The attached image is the approved Upgrades screen mockup of my mobile game. I need its four
round upgrade icons as a separate game asset. Copy each one exactly as it is drawn in the mockup:
the cream medallion with its gold rim and thick dark-brown outline, and the picture inside it,
with the same shape, proportions, colours, outlines, shading and highlights. Do not redesign them.
Lay them out in a 2×2 grid, all exactly the same size, evenly spaced, with white space between
them; each medallion a perfect circle filling most of its quarter:
- top left: the Lucky Paw icon (the white beckoning paw holding a gold koban coin);
- top right: the Big Catch icon (the red tai fish on the bamboo fishing rod);
- bottom left: the Combo Charm icon (the red omamori charm bag with the gold knot);
- bottom right: the Second Chance icon (the red daruma doll).
The koban coin and the charm bag are blank: no characters, no kanji, no letters on them.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard. No cast
shadow, no glow, no sparkles outside the medallions. No text, no watermark, no signature.
Square 1:1.
```

**Icons, first sheet (2026-10-10):** `art-source/ui/upgrade-icons.webp`. The owner kept the left
column (Lucky Paw, Combo Charm) and turned down the right one (the tai fish and the daruma looked
foreign to the game), so Big Catch and Second Chance come as single icons from the icon kit (§5),
in `art-source/icons/bigCatch.*` and `art-source/icons/secondChance.*`, which win over the
sheet's quarters: Big Catch is a big lucky-cat ball beside a small one with a gold up arrow;
Second Chance is the cats' gold collar bell on its red cord with a small pink heart.

Card, button, title and close pieces (`ui/upgrade-pieces.png`):

```text
The attached image is the approved Upgrades screen mockup of my mobile game. I need some of its
pieces as separate game assets, all empty. Copy each one exactly as it is drawn in the mockup:
same shape, proportions, colours, outlines, shading and highlights. Do not redesign them.
Spread them far apart on one sheet:
1. top, across most of the width: one empty upgrade card, the cream card with the thin dark-brown
   outline, rounded corners and the tan strip along its bottom, at the mockup's proportions, with
   nothing inside it: no icon, no words, no numbers, no button;
2. bottom left: the empty gold Buy button (the glossy gold pill with its darker bottom edge), with
   no words, no coin and no numbers on it;
3. bottom middle: the empty title card, the cream pill behind the word "Upgrades", with no words
   on it;
4. bottom right: the round cream close button with its dark-brown X.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard. No cast
shadow, no glow. No text, no letters, no numbers, no watermark, no signature. Landscape 3:2.
```

**Done (2026-10-10):** both sheets are in the game (v0.31), with Big Catch and Second Chance from the icon kit (`art-source/icons/`). Big Catch raises the paw on the viewer's left, unlike the cats; the owner may regenerate it.

Claude cuts them like the menu's pieces (§4.5): the card becomes a nine-slice frame (its tan strip
inside the bottom slice), the Buy button and the title card three-slice strips that stretch to
their text, the icons and the close button single sprites.

**Trial pick mockup** (`ui/trial-mockup.png`); also attach
`docs/screenshots/v0.30.0/trial-current-390x844.png` (the shut stage doors behind it) and the
boulder sheet (`art-source/specials/boulders.jpg`):

```text
Style: match the attached main-menu mockup and game screenshot exactly. Polished casual
mobile-game art, cute chibi kawaii illustration, thick warm dark-brown outlines (never black),
soft pastel cel shading with gentle gradients and small glossy highlights, light from the upper
left, warm cream and sakura-pink palette, crisp clean edges. It must look like the same game as
the attached main menu.

A complete portrait screen of the cute casual mobile game "Maneki Merge", shown flat and
full-bleed: no phone frame, no hands, no device mockup. After a stage is cleared, the player picks
one trial that makes the coming stages harder. Use the content of the attached current screen,
but redesign its look to match the main menu.

Background: the four shut shoji doors from the attached screen (rose-brown frames, lattice windows
at the top and bottom, a painted shrine garden with a big gold sun across them), slightly dimmed
so the panel in front reads clearly.

In the middle, one panel: a cream card (#fff6e7) with a thick dark-brown outline, soft rounded
corners and a tan bottom edge, like the main menu's cards, with a small grey stone ornament and a
few pebbles on its top edge (the trial is about boulders). Inside, top to bottom:
1. The title "Choose a trial" in chunky rounded dark-brown letters with a cool grey shadow, and
   under it "The coming stages get harder" in smaller brown letters.
2. Three option cards, cream with a thin dark-brown outline and a tan bottom edge. Each: on the
   left a round illustrated icon in a cool grey stone medallion; to its right the name and the
   level change ("Lv 0 → 1"), a short description and the stat with its change in small caps.
   The first card is selected: a pale stone-grey fill and a thicker outline.
   - "More Boulders", "+3% boulder chance (from stage 2)", BOULDERS 3% → 6%. Icon: three of the
     attached grey boulders in a little pile.
   - "Iron Bands", "Boulders need one more merge to break", MERGES TO BREAK 1 → 2. Icon: one
     attached boulder with a riveted iron band.
   - "Big Boulders", "Boulders one size bigger", BOULDER SIZE Size 2 → Size 3. Icon: a big
     boulder next to a small one.
3. A wide glossy coral-pink pill-shaped "Choose" button with a darker pink bottom edge, white
   rounded letters with a dark-brown outline, like the menu's PLAY button.
A rounded friendly font like Fredoka. Only these words and numbers; no other buttons, no ads, no
watermark, no signature. Portrait 9:16 (or 2:3).
```

**Blessing pick mockup** (`ui/blessing-mockup.png`): an edit of the approved trial mockup, in the
same thread, so the two stay alike. Also attach `docs/screenshots/v0.30.0/blessing-current-390x844.png`
and the special balls' art (`art-source/specials/magnet.jpg`, `hanabi.jpg`, `joker.jpg`):

```text
Edit the trial screen you made: keep exactly the same layout, panel, card shapes, outlines,
fonts, button and the shut doors behind it. This is the blessing pick that comes right after it,
so it is warm and golden instead of stone grey:
- the panel's top-edge ornament is a small gold koban coin with a sprig of sakura instead of the
  stones;
- the title is "Choose a blessing" with a gold shadow, the line under it "It lasts for the whole
  run";
- the icon medallions are gold-rimmed cream instead of grey stone, and the selected card has a
  pale gold fill;
- the three cards: "More Magnets", "+1.5% magnet chance", MAGNETS 1% → 2.5%, icon: the attached
  magnet coin; "Joker Cat", "Merges with any cat and makes it one size bigger", JOKERS 0% → 1.5%,
  icon: the attached rainbow joker cat; "Hanabi", "Fireworks that pop the small cats around
  them", HANABI 0% →
  1.5%, icon: the attached firework shell.
Everything else stays as it is. Portrait, the same size.
```

The other blessings' icons (Big Drops, Golden Cats) and the pieces for the game come after the
mockups are approved, as edits of them.

**Pick icons: not needed (v0.32.1).** The owner chose the game's own art instead: each card shows the ball it is about (`src/ui/pickArt.ts`). The prompts below stay for a pick that gets its own icon later.

**More Boulders and Big Boulders pictures (2026-10-10).** Both showed the same plain boulder, so the owner asked for art that tells them apart. They are not medallions: like the other cards' balls, each is drawn alone on white and the game puts it in the card's grey medallion. Attach `art-source/specials/boulders.jpg` and the lineup sheet, one per request, square 1:1, and save them as `art-source/picks/moreBoulders.png` and `art-source/picks/bigBoulders.png`.

**Both in the game (v0.32.4):** the pyramid of three (`art-source/picks/moreBoulders.jpg`) and Big Boulders (`bigBoulders.jpg`, its arrow drawn on the big stone; small in the card, may be redone).

**More Boulders in v0.32.3:** `art-source/picks/moreBoulders.jpg`, a heap of four; the owner didn't like it (crowded, one boulder half hidden), so it is asked for again as a neat pyramid of three, the same way as Big Boulders. The first Big Boulders came back as the attached boulder sheet with a small boulder and an arrow pasted in: the tool edited the sheet instead of drawing. Ask for it in a new chat with only one bare boulder attached (`public/assets/specials/boulder-0.webp`) and the prompts below, which say to draw a new picture.

More Boulders:

```text
Style: match the attached boulder art exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the objects. No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture. The attached image only shows what one boulder looks like: do not copy
its layout and do not edit it.
A small game picture for a Suika-style merge game: exactly three grey boulders like the attached
one (the bare stone, no iron bands), all the same size, stacked in a neat little pyramid: two side
by side at the bottom, just touching, and the third sitting in the dip between their tops. All
three are fully visible: none is hidden behind another, and each keeps its own complete
dark-brown outline. Each keeps the attached boulder's round shape, colours, speckles and
highlight. The pyramid is centred, as wide as it is tall, and fills about 75% of the canvas. No
frame, no circle, no medallion, no ground, nothing else. Square 1:1.
```

Big Boulders:

```text
Style: match the attached boulder art exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the objects. No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture. The attached image only shows what one boulder looks like: do not copy
its layout and do not edit it.
A small game picture for a Suika-style merge game: one big grey boulder like the attached one (the
bare stone, no iron bands) and, at its lower left, a small one half its size, both resting on the
same invisible line; between them, above the small one, a chunky light-grey up arrow with the same
dark-brown outline, pointing up. The boulders keep the attached art's round shape, colours,
speckles and highlight. The group is centred and fills about 80% of the canvas. No frame, no
circle, no medallion, no ground, nothing else. Square 1:1.
```

**Pick icons (icon kit, §5).** The trial and blessing screens are built from the Upgrades pieces (v0.32, without the trial and blessing mockups above: the approved pieces fit them, so Claude built the screens straight away for the owner to judge on the phone). Their cards' icons come from the icon kit, one per request, square 1:1; trials get the cool grey stone rim, blessings the gold one. Attach the icon sheet (`art-source/ui/upgrade-icons.webp`), the lineup sheet and the art named with each icon, and save the result as `art-source/icons/<id>.png`. Until an icon exists the card shows its code-drawn icon in a cream medallion.

More Boulders (`icons/moreBoulders.png`, trial; also attach `art-source/specials/boulders.jpg`):

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a
cool grey stone rim and the same thick dark-brown outline round it. Inside, big and centred:
three of the attached grey boulders (plain, no bands) piled up in a little heap, two at the bottom and one on top. It stands for "more boulders fall into the jar". Nothing sticks out of the circle. Square 1:1.
```

Iron Bands (`icons/ironBands.png`, trial; also attach `art-source/specials/boulders.jpg`):

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a
cool grey stone rim and the same thick dark-brown outline round it. Inside, big and centred:
one of the attached grey boulders wrapped with two riveted dark steel iron bands, a small cartoon padlock hanging from the front band. It stands for "boulders get tougher to break". Nothing sticks out of the circle. Square 1:1.
```

Big Boulders (`icons/bigBoulders.png`, trial; also attach `art-source/specials/boulders.jpg`):

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a
cool grey stone rim and the same thick dark-brown outline round it. Inside, big and centred:
one big attached grey boulder with a small one beside it, a small grey up arrow between them. It stands for "boulders get bigger". Nothing sticks out of the circle. Square 1:1.
```

More Magnets (`icons/moreMagnets.png`, blessing; also attach `art-source/specials/magnet.jpg`):

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a
gold rim and the same thick dark-brown outline round it. Inside, big and centred:
the glossy red horseshoe magnet with silver tips from the attached magnet token, opening downwards, with small curved gold lines showing its pull. It stands for "more magnets come". Nothing sticks out of the circle. Square 1:1.
```

Big Drops (`icons/bigDrops.png`, blessing; also attach `art-source/scene/paw.jpg`):

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a
gold rim and the same thick dark-brown outline round it. Inside, big and centred:
the attached white cat paw with pink pads reaching down from the top and holding a big round orange lucky-cat ball like the orange cat of the attached lineup. It stands for "bigger cats come from the paw". Nothing sticks out of the circle. Square 1:1.
```

Golden Cats (`icons/goldenCats.png`, blessing):

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a
gold rim and the same thick dark-brown outline round it. Inside, big and centred:
a round white lucky-cat ball like the white cat of the attached lineup (one raised beckoning paw, a red collar, a gold bell), wrapped in a warm gold glow with a few four-pointed gold sparkles around it. It stands for "golden cats that skip a size when they merge". Nothing sticks out of the circle. Square 1:1.
```

Hanabi (`icons/hanabi.png`, blessing; also attach `art-source/specials/hanabi.jpg`):

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a
gold rim and the same thick dark-brown outline round it. Inside, big and centred:
the attached navy firework shell with its fuse lit, a small bright pink and gold firework burst popping above it. It stands for "fireworks that pop the small cats". Nothing sticks out of the circle. Square 1:1.
```

Joker Cat (`icons/joker.png`, blessing; also attach `art-source/specials/joker.jpg`):

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a
gold rim and the same thick dark-brown outline round it. Inside, big and centred:
the attached rainbow-striped joker cat in its jester hat, winking. It stands for "a wild cat that merges with any cat". Nothing sticks out of the circle. Square 1:1.
```

### 4.10 Phase 9: the grown jars' backgrounds

Stages have no end, and the jar grows every 5 stages (GAME_DESIGN §7): stages 1–5 play in the
first jar, 6–10 in the second, and so on. Each grown jar gets a new background, and that is what
sells the growth: **the jar stays the same size on the screen, so the world around it must look
smaller every time**, as if the camera pulled back and the jar now towered over the place it stood
in before. During the zoom the old background shrinks towards the jar's feet and fades out over the
new one.

| Jar | Stages | File (in `art-source/scene/`) | Where the jar stands now                                  |
| --: | ------ | ----------------------------- | --------------------------------------------------------- |
|   1 | 1–5    | `background.jpg` (done)       | The sakura shrine garden, on a veranda                    |
|   2 | 6–10   | `background-2.jpg` (done)     | A grand temple courtyard: as tall as a pagoda             |
|   3 | 11–15  | `background-3.jpg` (done)     | A hilltop terrace above a whole shrine town               |
|   4 | 16–20  | `background-4.jpg` (done)     | A wooden temple stage high on a mountainside              |
|   5 | 21 on  | `background-5.jpg` (done)     | A mountain peak above a sea of clouds (kept from then on) |

**Done (2026-10-11):** backgrounds 2, 3 and the mountain peak are in the game (v0.33.1). The owner
turned down a sixth, the heavens (it also drew a jar): the mountain peak is high enough to be the
last, and a step between the hilltop and the peak comes instead. The step (background 4, the
temple stage on a mountainside) came the same day (v0.33.2), and the peak moved to
`background-5.jpg`. Phase 9 is done.

**How to generate.** One image per request, full-bleed (this is a scene, so it has no white
background). Attach two images: the style reference, and the game's current background
`art-source/scene/background.jpg`, which sets the layout every background must keep. Ask for
**portrait 9:16**, the same shape as the attached background (1080×1920 or bigger if the tool
offers it; 1024×1536 also works, the pipeline crops the sides). Generate them in order in the same
chat, so each one is a step bigger than the last.

**Layout rules (every background, Claude checks them).** The game places all of them the same
way, so these must hold:

- The jar is not drawn: its spot is the centre of the image, about 85% of the width, from about
  30% down to 87% of the height. That column stays calm and low in contrast (the scene shows
  through the glass), with the interesting things beside and behind it.
- The jar's feet stand at 87% of the height, on **the same mint rug as in the attached background,
  the same size and in the same place**. The rug travels with the jar: it is the one thing that
  doesn't shrink.
- The bottom 13–18% is flat ground seen slightly from above, with a straight horizon line, like the
  attached veranda.
- The top 15% is plain soft sky that ends in one flat colour at the top edge (no stars, branches
  or clouds touching the edge): the game extends it upwards on tall screens.
- Framing things (branches, lanterns, rocks) sit at the left and right edges, beside the jar.
- No jar, no cats, no characters, no user interface, no text.

**Background 2** (`scene/background-2.png`), a grand temple courtyard:

```text
A vertical mobile-game background, portrait 9:16, the same shape and layout as the attached game
background, in the style of the attached reference: polished casual mobile-game art, cute chibi
kawaii illustration, thick warm dark-brown outlines (never black), soft pastel cel shading with
gentle gradients, light from the upper left, warm cream, peach and sakura-pink palette, clean crisp
vector-like edges. No text, no letters, no kanji, no watermark, no signature.

The scene is one step bigger than the attached shrine garden: an invisible giant glass jar now
stands in the middle of a grand Japanese temple courtyard and is as tall as the temple buildings.
Keep the attached background's layout exactly: the same mint rug at the bottom centre, the same
size and in the same place, its middle at 87% of the height; the ground across the bottom 15% is a
wide plaza of pale grey stone tiles seen slightly from above, with a straight horizon line.
Around the rug, tiny stone lanterns and a low red wooden fence only reach the rug's height.
In the middle distance, smaller than the jar would be: a big red temple gate on the left and a
five-storey red-and-cream pagoda on the right, both reaching only about 60% of the image height,
a long temple hall with dark tiled roofs behind, rows of pink sakura trees, soft green hills far
away. Big sakura branches reach in from the top-left and top-right corners.
The top 15% is only a soft cream-to-pale-peach sky that ends in one flat colour at the top edge,
plain enough to extend upwards. The centre column (the middle 85% of the width, from 30% to 87% of
the height) stays calm and low in contrast, because a glass jar will stand there and the scene
shows through it. A few sakura petals in the air. No jar, no cats, no people, no user interface.
Bright, warm, cosy, grand.
```

**Background 3** (`scene/background-3.png`), a hilltop above a shrine town:

```text
A vertical mobile-game background, portrait 9:16, the same shape and layout as the attached game
background, in the style of the attached reference: polished casual mobile-game art, cute chibi
kawaii illustration, thick warm dark-brown outlines (never black), soft pastel cel shading with
gentle gradients, light from the upper left, warm cream, peach and sakura-pink palette, clean crisp
vector-like edges. No text, no letters, no kanji, no watermark, no signature.

The scene is one step bigger again: an invisible giant glass jar now stands on a hilltop and is
taller than a whole town below. Keep the attached background's layout exactly: the same mint rug at
the bottom centre, the same size and in the same place, its middle at 87% of the height; the
ground across the bottom 15% is a flat stone terrace on the hilltop seen slightly from above, with
a straight horizon line and a few tiny stone lanterns at its edges.
Beyond the terrace and far below it, much smaller than the jar would be: a whole little Japanese
shrine town of tiny tiled rooftops, a winding river with small red arched bridges, a path of tiny
red torii gates climbing the hill, forests of sakura trees like pink clouds, rice fields, and on
the horizon a small snow-capped Mount Fuji. Big sakura branches reach in from the top-left and
top-right corners, close to the viewer.
The top 15% is only a soft peach-to-cream sky that ends in one flat colour at the top edge, plain
enough to extend upwards. The centre column (the middle 85% of the width, from 30% to 87% of the
height) stays calm and low in contrast, because a glass jar will stand there and the scene shows
through it. A few sakura petals in the air. No jar, no cats, no people, no user interface. Bright,
airy, cosy, a sense of height.
```

**Background 4** (`scene/background-4.png`), a wooden temple stage high on a mountainside, the
step between the hilltop (3) and the peak (5). Attach background 3 and the peak too, and say they
are the steps before and after it:

```text
A vertical mobile-game background, portrait 9:16, the same shape and layout as the attached game
background, in the style of the attached reference: polished casual mobile-game art, cute chibi
kawaii illustration, thick warm dark-brown outlines (never black), soft pastel cel shading with
gentle gradients, light from the upper left, warm cream, peach and sakura-pink palette with soft
greens, clean crisp vector-like edges. No text, no letters, no kanji, no watermark, no signature.

This scene is the step between the two attached scenes: higher than the hilltop above the shrine
town, but still below the mountain peak above the sea of clouds. An invisible giant glass jar now
stands on a big wooden temple stage built out from a steep mountainside, high above the forests.
Do not draw any jar, glass or container: the middle of the picture stays empty.
Keep the attached game background's layout exactly: the same mint rug at the bottom centre, the
same size and in the same place, its middle at 87% of the height; the ground across the bottom 15%
is the temple stage's warm wooden floorboards seen slightly from above, with a straight horizon
line, and a low red wooden railing and a tiny stone lantern at its left and right edges.
Beyond the railing and far, far below, much smaller than the jar would be: a deep green valley with
the shrine town from the hilltop scene now only a tiny patch of rooftops beside a thread-thin river,
layered forested mountain ridges dotted with pink sakura trees, a thin white waterfall on one
ridge, the first soft bands of cream cloud drifting below the stage, and on the horizon a bigger,
closer snow-capped Mount Fuji. A small temple roof with dark tiles peeks in at one side edge, and
sakura branches reach in from the top-left and top-right corners.
The top 15% is only a soft peach-to-cream sky that ends in one flat colour at the top edge, plain
enough to extend upwards. The centre column (the middle 85% of the width, from 30% to 87% of the
height) stays calm and low in contrast, because a glass jar will stand there and the scene shows
through it. A few sakura petals in the air. No jar, no cats, no people, no user interface. Bright,
airy, a sense of great height.
```

**Background 5** (`scene/background-5.jpg`, done), a mountain peak above a sea of clouds, kept for every jar after it:

```text
A vertical mobile-game background, portrait 9:16, the same shape and layout as the attached game
background, in the style of the attached reference: polished casual mobile-game art, cute chibi
kawaii illustration, thick warm dark-brown outlines (never black), soft pastel cel shading with
gentle gradients, light from the upper left, warm cream, peach, gold and sakura-pink palette, clean
crisp vector-like edges. No text, no letters, no kanji, no watermark, no signature.

The scene is one step bigger again: an invisible giant glass jar now stands on a mountain summit,
high above the clouds, as big as a mountain. Keep the attached background's layout exactly: the
same mint rug at the bottom centre, the same size and in the same place, its middle at 87% of the
height; the ground across the bottom 15% is the flat warm-grey rock of the summit seen slightly
from above, with a straight horizon line, a tiny red torii gate and a sacred rope with paper
streamers at its edges.
All around and below, much smaller than the jar would be: a soft sea of fluffy cream clouds, other
mountain peaks poking through it, the snowy tip of Mount Fuji far away, a big golden morning sun
low behind the clouds on one side, a few tiny white cranes flying. A gnarled pine branch with a few
sakura blossoms reaches in from the top-left corner, and a smaller one from the top-right.
The top 15% is only a soft pale-gold-to-cream sky that ends in one flat colour at the top edge,
plain enough to extend upwards. The centre column (the middle 85% of the width, from 30% to 87% of
the height) stays calm and low in contrast, because a glass jar will stand there and the scene
shows through it. No jar, no cats, no people, no user interface. Bright, serene, majestic.
```

If the rug moves or changes size, ask in the same chat: "Keep everything, but put the mint rug back
exactly where it is in the attached game background, the same size, its middle at 87% of the
height." If the scene doesn't feel bigger than the last one, ask for the buildings to be smaller
and further away, so the empty jar spot looks huge beside them.

### 4.11 Phase 10: the growth clouds

When the jar grows (every 5 stages, GAME_DESIGN §7.1) the shrine rises through the clouds: soft
clouds well up from the bottom of the screen and cover it, the next background comes in behind
them, and they part to the left and right, uncovering the new place, which settles from a little
close to its normal size, as if the camera pulled back. The clouds are the owner's art; the game
only moves them (the owner's choice, 2026-10-11, over a light burst or a ring of light drawn in
code).

The game builds the cloud wall from separate puffs, so it fits any screen: about fifteen of them in
three layers, the small ones behind, overlapping so no gap shows, each rising and parting on its
own path. One sheet holds them all.

**Clouds** (`transition/clouds.png`, a sheet). Attach the style reference and the game's last
background (`art-source/scene/background-5.jpg`, the peak above the sea of clouds), whose clouds
these must match:

```text
Style: match the attached images exactly (the game's style reference and the clouds in the attached
game background). Polished casual mobile-game art, cute chibi kawaii illustration, thick warm
dark-brown outlines (never black) of even weight, soft pastel cel shading with gentle gradients,
light from the upper left, clean crisp vector-like edges.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the objects. No text, no letters, no numbers, no kanji, no watermark.

A sheet of six separate fluffy cartoon clouds for a mobile game, in a 3×2 grid, evenly spaced, with
plenty of plain white space between them so they don't touch. They look exactly like the clouds in
the attached game background: warm cream (#FFF3DC) with soft peach shading on their lower bulges,
one thick dark-brown outline closed all the way round each cloud. Each cloud is a round puffy
cluster of five to seven bulges of different sizes, round on every side, the bottom too (no flat
or cut-off bottom), filled solid all the way through (no holes, no see-through parts), no face, no
sparkles, no sky around them. Top row: three big clouds, each wider than it is tall, about 1.6 : 1.
Bottom row: three smaller clouds, about 1.3 : 1. All six have different shapes. Nothing cropped at
the edges. Landscape 3:2.
```

**Done (2026-10-11):** the owner's sheet came with nine clouds in a 3×3 grid (all clean and closed)
and is in the game (v0.33.3); the pipeline takes any number of them.

Checks: six clouds with closed outlines on plain white, nothing touching or cropped; solid fill
with no holes; round bottoms; the same cream, peach and outline as the background's clouds.

### 4.12 Phase 11: new trials and rules (Batch 18)

Batch 18 (`docs/plans/batch-18.md`) adds three trials (Wind, Heavy Drop, Porcelain) and two rules
(Hubris, Echo). They need two effect sheets and five card pictures. Generate them **before** the
batch is built, so the agent can put them in from the start. Wind needs no effect art: its drifting
petals are drawn in code like the menu's.

The card pictures work like More Boulders' (§4.9): no medallion, the subject alone on white; the
game puts it in the card's medallion. Save them as `art-source/picks/<id>.png` (or .jpg/.webp).
The effect sheets go to `art-source/fx/`. One image per request, in a new chat each time.

**Fireball** (`fx/fireball.png`, a sheet). Heavy Drop's cats fall faster with each level; from
level 3 they leave a trail of embers and at level 5 they come down as a fireball. The game draws
the falling ball on top of the flame's round head, so the head must be a plain round glow. Attach
the lineup sheet (`art-source/style/lineup.webp`):

```text
Style: match the attached image exactly (the game's cat lineup). Polished casual mobile-game art,
cute chibi kawaii illustration, thick warm dark-brown outlines (never black) of even weight, soft
pastel cel shading with gentle gradients, light from the upper left, clean crisp vector-like edges.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark.

A sheet of two cartoon fireball flames for a mobile game, side by side, evenly spaced, with plenty
of plain white space between them. Both belong to a ball plunging STRAIGHT DOWN: each has a
perfectly round head at the BOTTOM and flames streaming straight UP from it. The round head is
plain glowing colour (pale yellow centre fading to warm orange at its edge), with no object, face
or ball drawn in it: the game draws a ball on top of it.
- Left: the small one. The round head with a short tail of three or four flickering flame tongues
  and a few loose embers, about 1.5 times as tall as it is wide.
- Right: the big one. The round head wrapped in flames that lick up around its sides, and a long
  blazing tail, about 2.5 times as tall as it is wide.
Warm palette: pale yellow, orange, coral red flame tips. One thick dark-brown outline closed all
the way round each flame (the tongues and embers too). Both point straight up, centred in their
half, nothing cropped. Landscape 3:2.
```

**Porcelain** (`fx/porcelain.png`, a sheet). With Porcelain a cat beside a merge can crack; a
cracked cat shows crack lines, and when it merges, gold seams flash on the new cat (kintsugi, the
art of mending pottery with gold). The game lays these lines over the cats, turned differently on
each cat. Attach the lineup sheet:

```text
Style: match the attached image exactly (the game's cat lineup). Polished casual mobile-game art,
clean crisp vector-like edges, thick warm dark-brown lines (never black).
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark.

A sheet of four line patterns in a 2×2 grid, evenly spaced, with plenty of plain white space
between them. Each pattern fits inside an imaginary circle of the same size; the circle itself is
NOT drawn. Only the lines: no plate, no ball, no fill, no shading, no background shape.
- Top row, two CRACK patterns, like the cracks across a broken porcelain plate seen from the front:
  thin jagged dark-brown crack lines, sharp zigzags, slightly thicker where they start and tapering
  to fine points. Left: one main crack across most of the circle with two short side branches.
  Right: two cracks that meet near the middle, with a few small splinter lines.
- Bottom row, two KINTSUGI seams: the same kind of jagged paths, but as bright shiny gold lines
  (warm yellow gold with a tiny white highlight along them) with a thin dark-brown edge on both
  sides, like a crack mended with gold. Left: one main seam with two short branches. Right: two
  seams meeting near the middle.
Nothing touches the edge of its cell, nothing cropped. Square 1:1.
```

**Card pictures.** Attach the cat art each prompt names (from `art-source/cats/`). Every cat in
them must stay the game's maneki-neko: the attached cat's exact design, with its raised paw, collar
and bell.

Wind (`picks/wind.png`); attach the lineup sheet. The game mirrors it when the run's wind blows to
the left:

```text
Style: match the attached image exactly (the game's cat lineup). Polished casual mobile-game art,
cute chibi kawaii illustration, thick warm dark-brown outlines (never black) of even weight, soft
pastel cel shading with gentle gradients and one small glossy highlight, light from the upper left,
clean crisp vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

A small game picture: a cute koinobori (Japanese carp streamer) in red and white with a big round
eye, flying straight out to the RIGHT from a short bamboo pole at the left, its tail fluttering,
with two curved wind lines and three pink sakura petals blowing to the right beside it. Centred,
fills about 75% of the canvas. No frame, no circle, no medallion, no ground, nothing else.
Square 1:1.
```

Heavy Drop (`picks/heavyDrop.png`); attach `art-source/cats/size-02.jpg`:

```text
Style: match the attached cat exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached image only shows what the cat looks like. A small game
picture: exactly the attached maneki-neko cat (same round body, colours, raised paw, collar and
bell), plunging straight down like a fireball: orange and yellow flames stream straight up behind
it in a comet tail, and three short speed lines beside it. The cat looks determined. The cat is in
the lower half, the flames above it. Centred, fills about 80% of the canvas. No frame, no circle,
no medallion, no ground, nothing else. Square 1:1.
```

Porcelain (`picks/porcelain.png`); attach `art-source/cats/size-01.jpg`:

```text
Style: match the attached cat exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached image only shows what the cat looks like. A small game
picture: exactly the attached maneki-neko cat (same round body, colours, raised paw, collar and
bell) as a glossy porcelain figurine, with one jagged crack running across its body that has been
mended with shiny gold (kintsugi): a bright gold zigzag seam with two short branches. Two tiny
porcelain chips float beside it. Centred, fills about 75% of the canvas. No frame, no circle, no
medallion, no ground, nothing else. Square 1:1.
```

Hubris (`picks/hubris.png`); attach `art-source/cats/size-01.jpg`:

```text
Style: match the attached cat exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached image only shows what the cat looks like. A small game
picture: exactly three of the attached maneki-neko cats (same round body, colours, raised paw,
collar and bell), all the same size, stacked in a neat little pyramid: two side by side at the
bottom, just touching, the third sitting in the dip between their tops. All three are fully
visible, each with its own complete outline. They look proud, noses up and eyes closed smugly, and
the top one wears a tiny gold crown. Centred, as wide as it is tall, fills about 75% of the canvas.
No frame, no circle, no medallion, no ground, nothing else. Square 1:1.
```

Echo (`picks/echo.png`); attach `art-source/cats/size-04.jpg`:

```text
Style: match the attached cat exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached image only shows what the cat looks like. A small game
picture: exactly the attached maneki-neko cat (same round body, colours, raised paw, collar and
bell) on the left, and at its lower right a smaller copy of the same cat in paler, washed-out
colours (solid, not see-through), as if it were its echo. Two or three curved ripple lines spread
from the big cat towards the small one. Both keep complete outlines. Centred, fills about 80% of
the canvas. No frame, no circle, no medallion, no ground, nothing else. Square 1:1.
```

Delivered (v0.34): all seven are in. The fireball's heads came with a line drawn inside them; the
game covers it with the ball (the head is fitted to the outline's bottom). Echo took three tries:
two cats of one design at two sizes kept merging or getting cut, and the kept picture still has the
small echo overlapping the big cat a little.

Checks for these: the general checklist (§2); each cat is the attached design with one raised paw,
collar and bell; the fireball heads are plain round glows with nothing drawn in them; the porcelain
sheet has only lines, the circle not drawn, nothing touching its cell's edge; the gold seams are
clearly gold, the cracks clearly dark brown.

### 4.13 Phase 12: Cursed Bell, Copycat and Dice (Batch 19)

Batch 19 (`docs/plans/batch-19.md`) adds the Cursed Bell trial with its two follow-ups (Quick Curse,
More Curses) and two rules (Copycat, Dice). They need two effect sheets and five card pictures.
Generate them **before** the batch is built. Every look comes from these images; the code only
moves, scales and fades them, and reuses the existing chips and puffs.

The card pictures work like the other cards' (§4.9, §4.12): no medallion, the subject alone on
white; the game puts it in the card's medallion. Save them as `art-source/picks/<id>.png` (or
.jpg/.webp); the effect sheets go to `art-source/fx/`. One image per request, in a new chat each
time.

**Stone** (`fx/stone.png`, a sheet). A cursed cat slowly turns to stone, like a cracked cat shows
its cracks under Porcelain: the game lays one of these four stone patterns over the cat, rolling
with it, and moves on to the next as the drops before the stone run out (the first just after the
curse begins, the last just before the cat becomes a boulder). Attach the lineup sheet
(`art-source/style/lineup.webp`) and the boulder sheet (`art-source/specials/boulders.jpg`):

```text
Style: match the attached images exactly (the game's cat lineup and its grey boulders). Polished
casual mobile-game art, thick warm dark-brown outlines (never black) of even weight, soft pastel
cel shading, clean crisp vector-like edges.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark.

A sheet of four STONE PATTERNS in a 2×2 grid, evenly spaced, with plenty of plain white space
between them. Each pattern fits inside an imaginary circle of the same size; the circle itself is
NOT drawn. Only the stone: no cat, no face, no ball, no plate, no background shape. Each pattern is
made of separate patches of stone, the same light blue-grey stone with darker speckles as the
attached boulders (not their iron bands), each patch with a thin dark-brown outline and one or two
short dark-brown cracks in it. The patches are spread over the whole circle, the outermost ones
reaching close to the circle's edge on every side, with plain white between them. From one pattern to the next the
stone grows, as if it were spreading over a cat:
- Top left: a few small patches, about a fifth of the circle stone.
- Top right: bigger patches, some of them joined, about two fifths.
- Bottom left: large joined patches, about three fifths, with gaps of white between them.
- Bottom right: almost all stone, about four fifths, with only a few small gaps of white.
Nothing touches the edge of its cell, nothing cropped. Square 1:1.
```

**Dice** (`fx/dice.png`, a sheet). Under the Dice rule a lucky merge goes up one size more and an
unlucky one fizzles; one of these dice pops up over the merge to show which. Attach the lineup sheet:

```text
Style: match the attached image exactly (the game's cat lineup). Polished casual mobile-game art,
cute chibi kawaii illustration, thick warm dark-brown outlines (never black) of even weight, soft
pastel cel shading with gentle gradients and one small glossy highlight, light from the upper left,
clean crisp vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark.

A sheet of two game dice side by side, evenly spaced, with plenty of plain white space between
them, both the same size, each a rounded cube seen at a slight angle so three faces show, with
round pips (dots only).
- Left: the lucky die. Shiny gold with warm cream highlights and red pips, the big single red pip
  of a Japanese die on its top face. It looks bright and festive.
- Right: the unlucky die. Dull cool grey with dark grey pips, a small crack across one face and a
  chipped corner. It looks gloomy.
Each centred in its half, nothing cropped. Landscape 3:2.
```

**Card pictures.** Attach what each prompt names. Every cat in them must stay the game's
maneki-neko: the attached cat's exact design, with its raised paw on the viewer's right, collar and
bell.

Cursed Bell (`picks/cursedBell.png`); attach `art-source/cats/size-03.jpg`:

```text
Style: match the attached cat exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached image only shows what the cat looks like. A small game
picture: exactly the attached maneki-neko cat (same round body, colours, raised paw, collar), but
the bell on its collar is a dark iron bell with a cold purple sheen instead of gold, and three
small purple ghostly flames (onibi) float round it. The cat looks worried, with a sweat drop. The
lower part of its body is starting to turn to grey stone. Centred, fills about 75% of the canvas.
No frame, no circle, no medallion, no ground, nothing else. Square 1:1.
```

Quick Curse (`picks/quickCurse.png`); attach the curse sheet (`art-source/fx/curse.*`):

```text
Style: match the attached image exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached image only shows what the cursed bell looks like. A small
game picture: the attached dark iron cursed bell on its red cord (without the paper tag), and in
front of it at its lower right a small wooden hourglass whose purple sand has nearly run out. Two
small purple ghostly flames beside them. Centred, fills about 75% of the canvas. No frame, no
circle, no medallion, no ground, nothing else. Square 1:1.
```

More Curses (`picks/moreCurses.png`); attach the curse sheet:

```text
Style: match the attached image exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached image only shows what the cursed bell looks like. A small
game picture: three of the attached dark iron cursed bells (without the paper tags), hanging at
different heights from one twisted red cord that curves across the top, with a few small purple
ghostly flames between them. All three fully visible. Centred, fills about 75% of the canvas. No
frame, no circle, no medallion, no ground, nothing else. Square 1:1.
```

Copycat (`picks/copycat.png`); attach `art-source/cats/size-02.jpg`:

```text
Style: match the attached cat exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached image only shows what one cat looks like. Do not edit, cut
or split the attached image. A small game picture of TWO separate, complete copies of the attached
maneki-neko cat side by side, with a clear gap of plain white between them: they do not touch or
overlap. Each cat is the whole attached design on its own: a full round body, two ears, two eyes,
its own collar with its own gold bell, its light belly, the paw on the viewer's right raised with
palm and pink pads forward, the other paw resting on its belly. Both face the viewer and are
exactly the same size, pose and colours: the right cat is a copy of the left, not a mirror image,
so on both cats the raised paw is on the viewer's right. The right cat has a cheeky grin. A curved
gold arrow arcs above them, from over the left cat to over the right cat. Each cat about 40% of the
canvas width; everything fully visible with complete outlines. No frame, no circle, no medallion,
no ground, nothing else. Square 1:1.
```

Dice (`picks/dice.png`); attach the dice sheet (`art-source/fx/dice.*`):

```text
Style: match the attached image exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached image only shows what the dice look like. A small game
picture: a Japanese dice cup (a round bamboo-woven tsubo, rust red inside) tipped on its side, and
two dice tumbling out of it: the attached gold lucky die and an ordinary cream die with red and
dark pips. Two small motion lines behind the dice. Centred, fills about 75% of the canvas. No
frame, no circle, no medallion, no ground, nothing else. Square 1:1.
```

Checks for these: the general checklist (§2); each cat is the attached design with one raised paw
on the viewer's right, collar and bell (the Cursed Bell cat's bell is iron, not gold); the stone
patterns are stone patches only (no cat, no ball, no circle drawn), spread over the whole circle,
growing from the first to the fourth; dice show pips only, no numbers.

**Status (v0.35.1):** the dice sheet and all five cards are in. The first Copycat picture failed
(the tool split the attached cat down the middle into one body with two half faces); its prompt
above now asks for two separate, complete cats, and the second came out right. v0.35.0 had a
cursed bell over the cat with the drops left on its tag and a ring of ghostly flames round it
(`fx/curse`); the owner found it a poor design, so the curse shows as stone spreading over the
cat instead, like Porcelain's cracks (`fx/stone`, above). The stone sheet came in v0.35.3: the game
uses its top row only (the owner's call), the first pattern for the first half of the count and
the second for the rest.

### 4.14 Phase 13: Settings, Pause and Game Over

These three panels are still the flat v0.14 cards (white card, flat coral and mint pills, thin
line icons), plainer than the menu, the game and the Upgrades screen. **The owner keeps their
layout as it is** (2026-10-12). Two tries were turned down: a whole-screen redesign in the
Upgrades style (big row cards, a title pill above the panel), and an edit of each panel's
screenshot alone, which kept the layout but invented its own fonts and colours, so the panels
matched neither the game nor each other. So each prompt now attaches the game's approved look
(the game screen, the main menu and the Upgrades screen) and says which of their pieces every
part of the panel copies; mint is dropped (no game button uses it): ON is the Buy button's gold.

Attach to every request, in this order:

1. a screenshot of the panel as it is today (from the phone);
2. the game screen, `docs/screenshots/v0.36.0/combo-390.png`;
3. the main menu, `art-source/menu/mockup.jpg`;
4. the Upgrades screen, `docs/screenshots/v0.36.0/shop-top-390.png`.

Make all three in **one chat**, Pause first, then Game Over, then Settings, so the later ones
match the first. Every prompt is complete: paste it whole.

**Pause** (`ui/pause-mockup.png`):

```text
Attached: (1) a screenshot of my mobile game's Pause panel as it is today, (2) the game screen,
(3) the main menu, (4) the Upgrades screen. Images 2, 3 and 4 are the approved look of the game.
The panel in image 1 is still plain and does not match them.

Redraw image 1 so the panel looks like it belongs to the same game as images 2, 3 and 4. Keep its
layout exactly: the panel's size, position and corner rounding, the same elements in the same
order, place and size, the same words. Do not add, remove, move or resize anything, and add no
decorations. Behind the panel the game screen stays as it is, dimmed with a soft warm-brown veil.
If you already made another panel of this game in this chat, match it exactly too.

Copy every colour, outline, font and button from images 2, 3 and 4; invent nothing new:
- The panel: like the cards in image 4: warm cream (not white), a thick dark-brown outline, soft
  rounded corners and a tan strip along the bottom.
- The title "Paused": the same chunky bubbly letters as the "Upgrades" title in image 4 (cream
  letters with a thick dark-brown outline), centred where it is now, nothing behind it.
- "Resume": exactly the PLAY button of image 3: a glossy coral-pink pill with a lighter shine
  along its top and a darker pink bottom edge, the word in the same chunky white letters with a
  dark-brown outline.
- "Sound" and "Haptics": two small pills like the UPGRADES button of image 3 (cream, dark-brown
  outline, tan bottom edge, chunky dark-brown letters), each with a small dark-brown icon (a
  speaker with sound waves; a vibrating phone). Sound is ON: its pill is the glossy gold of the
  Buy buttons in image 4. Haptics is OFF: plain cream, its icon with a thin slash.
- "Quit to Menu": a wide cream pill like the UPGRADES button of image 3, quieter than Resume.
Colours: only the cream, tan, dark brown, coral-pink and gold already in images 2, 3 and 4. No
mint, no grey, no white panel, no new colours, no new fonts. Thick warm dark-brown outlines (never
black), soft pastel cel shading, one small glossy highlight, light from the upper left. No
watermark, no signature. Portrait 9:16.
```

**Game Over** (`ui/gameover-mockup.png`):

```text
Attached: (1) a screenshot of my mobile game's Game Over panel as it is today, (2) the game
screen, (3) the main menu, (4) the Upgrades screen. Images 2, 3 and 4 are the approved look of the
game. The panel in image 1 is still plain and does not match them.

Redraw image 1 so the panel looks like it belongs to the same game as images 2, 3 and 4. Keep its
layout exactly: the panel's size, position and corner rounding, the same elements in the same
order, place and size, the same words and numbers. Do not add, remove, move or resize anything,
and add no decorations (no ribbon, no badges, no sparkles, no flowers). Behind the panel the game
screen stays as it is, dimmed with a soft warm-brown veil. If you already made another panel of
this game in this chat, match it exactly too.

Copy every colour, outline, font and button from images 2, 3 and 4; invent nothing new:
- The panel: like the cards in image 4: warm cream (not white), a thick dark-brown outline, soft
  rounded corners and a tan strip along the bottom.
- The title "Game Over": the same chunky bubbly letters as the "Upgrades" title in image 4 (cream
  letters with a thick dark-brown outline), centred where it is now, nothing behind it.
- The big score: the same chunky numbers as the score in the SCORE card of image 2 (cream with a
  thick dark-brown outline), as big as it is now.
- The four lines (Best, Stage, Biggest cat, Coins earned): labels in the same rounded bold brown
  letters as "Bigger cats come more often" in image 4, values in the same chunky dark-brown
  letters as "0/10" in image 4. The cat icon stays as it is. The small coin becomes the shiny
  gold coin with the paw print from the COINS card of image 2, the same size.
- "Play Again": exactly the PLAY button of image 3: a glossy coral-pink pill with a lighter shine
  along its top and a darker pink bottom edge, the words in the same chunky white letters with a
  dark-brown outline.
- "Menu": a wide cream pill like the UPGRADES button of image 3 (cream, dark-brown outline, tan
  bottom edge, chunky dark-brown letters).
Colours: only the cream, tan, dark brown, coral-pink and gold already in images 2, 3 and 4. No
mint, no grey, no white panel, no new colours, no new fonts. Thick warm dark-brown outlines (never
black), soft pastel cel shading, one small glossy highlight, light from the upper left. No
watermark, no signature. Portrait 9:16.
```

**Settings** (`ui/settings-mockup.png`):

```text
Attached: (1) a screenshot of my mobile game's Settings panel as it is today, over the main menu,
(2) the game screen, (3) the main menu, (4) the Upgrades screen. Images 2, 3 and 4 are the
approved look of the game. The panel in image 1 is still plain and does not match them.

Redraw image 1 so the panel looks like it belongs to the same game as images 2, 3 and 4. Keep its
layout exactly: the panel's size, position and corner rounding, the title on the left and the
close button on the right, the four rows with the dashed lines between them, the version line at
the bottom, every element in the same place and size, the same words. Do not add, remove, move or
resize anything, and add no decorations. Behind the panel the main menu stays as it is, dimmed
with a soft warm-brown veil. If you already made another panel of this game in this chat, match
it exactly too.

Copy every colour, outline, font and button from images 2, 3 and 4; invent nothing new:
- The panel: like the cards in image 4: warm cream (not white), a thick dark-brown outline, soft
  rounded corners and a tan strip along the bottom.
- The title "Settings": the same chunky bubbly letters as the "Upgrades" title in image 4 (cream
  letters with a thick dark-brown outline), on the left where it is now, nothing behind it.
- The close button: exactly the round close button of image 4 (cream, chunky dark-brown X), in
  the same place and size as now.
- Each row's name in the same rounded bold dark-brown letters as "Lucky Paw" in image 4, the line
  under it like "+15% coins from everything"; the dashed lines between the rows thin and tan.
- The four icons on the left: in place of today's square tiles, small round medallions like the
  icons in image 4 (cream face, gold rim, dark-brown outline), the same size and place; inside,
  the same pictures as now in dark brown: a speaker with sound waves, a vibrating phone, a circle
  with speed lines, a question mark.
- The switches, the same place, size and state (ON, ON, OFF): ON is a glossy gold pill like the
  Buy buttons of image 4 with a cream knob on the right and "ON" in chunky dark-brown letters;
  OFF is a sunken tan track like the well of the SCORE card in image 2, with a cream knob on the
  left and "OFF".
- The arrow on the last row: chunky dark brown. The version line: small, pale brown.
Colours: only the cream, tan, dark brown, coral-pink and gold already in images 2, 3 and 4. No
mint, no grey, no peach tiles, no white panel, no new colours, no new fonts. Thick warm dark-brown
outlines (never black), soft pastel cel shading, one small glossy highlight, light from the upper
left. No watermark, no signature. Portrait 9:16.
```

Every word and number stays live text (Fredoka).

**Approved and in the game (2026-10-12, v0.37):** `art-source/ui/pause-mockup.jpg`,
`gameover-mockup.jpg` and `settings-mockup.jpg` (768×1376). No new art was needed: the panels are
built in CSS (`src/ui/styles/panel-art.css`) from the pieces already cut, the Upgrades card as the
panel, the PLAY, UPGRADES and Buy pills as buttons and switches, the Upgrades close button and the
menu's coin. The settings and pause icons stay the code-drawn line icons in the medallions; icon-kit
art (§5) can replace them later. The mockups' heavier panel outline was left out: a ring round the
card art showed a double line at the corners, so the panels keep the Upgrades cards' outline.

### 4.15 Phase 14: how-it-works clips (Batch 21)

The shop's cards and the stage-clear picks get a small button that plays a short clip of the game
showing what the card does (docs/plans/batch-21.md). Two pieces of art:

**1. The clip button** (`art-source/icons/clip.png`): the icon kit's prompt (§5) filled in, gold
rim. It is drawn small, about 34 px on the phone, on the corner of a card's icon, so it must read
at 32 px. Attach the icon sheet (`art-source/ui/upgrade-icons.webp`) and the main menu
(`art-source/menu/mockup.jpg`, for the PLAY button). Paste this whole:

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 32 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a gold rim and
the same thick dark-brown outline round it. Inside, big and centred: a big rounded play triangle
pointing right, glossy coral-pink like the PLAY button of the attached main menu, with a lighter
shine along its top edge and its own dark-brown outline, set a little right of the middle so it
looks centred. It stands for "watch how this works": it plays a short clip. Nothing sticks out of
the circle. Square 1:1.
```

**2. The tap pointer** (`art-source/ui/tap-pointer.png`). Only the clips show it, where a clip
shows a tap or a drag (the magnet's tap, then Take). It is a hand, not a paw: the dropper is
already a paw. Attach the icon sheet and a cat from `art-source/cats/`. Paste this whole:

```text
Style: match the attached art exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 64 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no watermark, no signature.

One tutorial pointer for the mobile game "Maneki Merge": a cute, chubby cartoon hand in a soft
cream-white glove, seen from the back, its index finger pointing straight up and a little to the
left, the other fingers curled in a loose fist, the thumb tucked in. The fingertip is the very top
of the drawing: it marks the point being tapped. A small pink round cuff at the wrist, like the
pink pads of the game's paw. Simple, round shapes, no nails, no wrinkles, no sleeve, no arm beyond
the cuff. Nothing else in the picture. Centred, filling about 70% of the canvas. Square 1:1.
```

**Into the game.** Save them under those names and tell Claude. The badge goes through
`npm run art` like every icon; the pointer is used only by the clip recorder (`npm run clips`),
which draws it over the recorded taps and drags, and the clips are recorded again once it is in.

**Arrived (2026-10-12):** `art-source/icons/clip.jpg` (through `npm run art` as
`public/assets/icons/clip.webp`; it reads at 34 px) and `art-source/ui/tap-pointer.jpg` (the
recorder cuts its white when it is built).

### 4.16 Phase 15: the Lightning blessing (Batch 23)

Batch 23 (`docs/plans/batch-23.md`, GAME_DESIGN §15.15) adds a sixth blessing ball: the
**lightning ball**. The first cat it touches is struck, and with it every cat of that size in the
jar (or every boulder, if it touches a boulder first). Time stops for a moment while the lightning
**chains** from the ball to every struck cat at once, then they all pop into coins.

How the strike plays (the art below is made for it):

1. (Until v0.42.2 the jar darkened to a stormy indigo, and until v0.42.3 the screen flashed white;
   the owner took both out.)
2. A **sky bolt** slams down from the top of the screen onto the lightning ball.
3. **Chain bolts** jump from the ball to the cat it touched and on from cat to cat, each one to its
   nearest neighbours, reaching every struck cat within a tenth of a second. Every link swaps
   between the six bolt shapes many times a second (some flipped), so the lightning crackles.
4. Where a bolt lands, an **impact flash** and a **shock ring** go off, and **electric crackles**
   cover the struck cat, swapping between four patterns.
5. Then every struck cat pops at once in a **burst of sparks** with its "+coins", the ball bursts,
   and the ball is gone.

Waiting in the jar, the lightning ball gives off a **small crackling arc** now and then. The shop
card and the pick card show the ball itself in its gold medallion, like the hanabi's (§4.9), so
there is no card picture to make.

Five images: the ball on white, like the other balls (§4.8), and four effect sheets on **black**.
The effects are light, not objects: no outlines, and the game adds them with light (it turns the
black into transparency), so the background must be pure black. One image per request, in a new
chat each time. Save them under the names below (`.png`, `.jpg` or `.webp`).

**1. The lightning ball** (`specials/lightning.png`). Attach the lineup sheet
(`art-source/style/lineup.webp`), the game screenshot `docs/screenshots/v0.26.0/390-1-hud.png` and
the hanabi (`art-source/specials/hanabi.jpg`), so it comes out as a sibling of the hanabi but
clearly different:

```text
Style: match the attached images exactly (the game's cat lineup, a game screenshot and its
firework ball). Polished casual mobile-game art, cute chibi kawaii illustration, thick warm
dark-brown outlines (never black) of even weight, soft pastel cel shading with gentle gradients
and one small glossy highlight, light from the upper left, clean crisp vector-like edges,
readable at small sizes.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the object. No text, no letters, no numbers, no kanji, no watermark.

A thunder ball for a Suika-style merge game, the same size and drawing style as the cats in the
attached lineup and the attached firework ball: strictly front view, its outline a perfect
circle, centred, filling about 80% of the canvas. The ball is a little storm rolled into a
sphere: soft puffy storm-cloud swirls in deep indigo, violet and plum, with lighter lavender on
the tops of the clouds, all inside the round outline. Across its front, big and bold, one bright
lemon-yellow lightning bolt zigzags from the upper right to the lower left, with a white-hot line
along its middle and its own dark-brown outline. Two or three tiny yellow spark stars twinkle in
the clouds. It must look clearly different from the attached navy firework ball at a glance: no
paper band, no fuse, no firework rays. Nothing sticks out of the circle. No glow and no sparks
around it (the game adds them). Square 1:1.
```

If the storm reads too much like the hanabi at small size, try this one instead (Raijin's drum;
same attachments, same style paragraph as above, then):

```text
A thunder drum ball for a Suika-style merge game, the same size and drawing style as the cats in
the attached lineup: strictly front view, its outline a perfect circle, centred, filling about
80% of the canvas. It is the small round taiko drum of Raijin, the Japanese thunder god, seen
face-on: a cream drumhead with one big bold lemon-yellow lightning bolt zigzagging across it,
white-hot along its middle and with its own dark-brown outline, ringed by a glossy deep-violet
lacquer rim with a row of small round gold studs. Nothing sticks out of the circle. No glow and
no sparks around it. Square 1:1.
```

**The effect sheets.** Every one starts with this block (it is inside each prompt below). Attach
the game screenshot `docs/screenshots/v0.26.0/390-1-hud.png` and, once you have it, the lightning
ball you chose, so the yellow matches:

```text
Style: a polished casual mobile-game visual effect for the cute pastel game in the attached
screenshot: crisp, bright, clean shapes, readable at small sizes; glowing light with no outline.
Plain flat solid pure black background (#000000) everywhere around the effects: no gradient, no
stars, no clouds, no ground, no vignette, no texture, no frame. No text, no letters, no numbers,
no kanji, no watermark, no signature.
The colour of every effect: a thin white-hot core, a bright electric lemon-yellow glow round it,
and a faint soft violet haze at the outer edge of the glow.
```

**2. Chain bolts** (`fx/bolts.png`, landscape 3:2). The links between the ball and the struck
cats. The game stretches each bolt between two cats, so both of its ends must sit on its row's
middle line:

```text
Style: a polished casual mobile-game visual effect for the cute pastel game in the attached
screenshot: crisp, bright, clean shapes, readable at small sizes; glowing light with no outline.
Plain flat solid pure black background (#000000) everywhere around the effects: no gradient, no
stars, no clouds, no ground, no vignette, no texture, no frame. No text, no letters, no numbers,
no kanji, no watermark, no signature.
The colour of every effect: a thin white-hot core, a bright electric lemon-yellow glow round it,
and a faint soft violet haze at the outer edge of the glow.

A sheet of SIX separate horizontal lightning bolts for a chain-lightning effect, stacked one
above the other in six evenly spaced rows, with plain black between the rows: no bolt touches
another, and each bolt with its glow stays inside its own row. Every bolt runs from the far LEFT
of its row to the far RIGHT (only a small black margin at each end), and both of its ends lie
exactly on the row's middle line, so it can be stretched between two points. Each bolt is a
jagged zigzag path of light with sharp angular kinks, never smooth curves, glowing evenly along
its whole length, and each has a different shape:
- rows 1 and 2: a few big, bold zigzags with a thick bright core;
- rows 3 and 4: many small sharp kinks, a little thinner, nervous and crackling;
- rows 5 and 6: a main path with two or three thin short forks that split off and fade out in
  the air.
Landscape 3:2.
```

**3. Sky bolts** (`fx/skybolts.png`, portrait 2:3). The bolt that comes down from the sky onto
the lightning ball as it strikes; the game swaps between the three so it flickers:

```text
Style: a polished casual mobile-game visual effect for the cute pastel game in the attached
screenshot: crisp, bright, clean shapes, readable at small sizes; glowing light with no outline.
Plain flat solid pure black background (#000000) everywhere around the effects: no gradient, no
stars, no clouds, no ground, no vignette, no texture, no frame. No text, no letters, no numbers,
no kanji, no watermark, no signature.
The colour of every effect: a thin white-hot core, a bright electric lemon-yellow glow round it,
and a faint soft violet haze at the outer edge of the glow.

A sheet of THREE separate lightning bolts striking straight down from the sky, side by side in
three evenly spaced columns, with plain black between them: no bolt touches another. Each bolt
starts at the very TOP edge of the image and comes down to near the BOTTOM, where it strikes: its
lower tip lies on its column's middle line a little above the bottom edge, with a small bright
round flash right at the tip. Each is a jagged zigzag path with sharp angular kinks and a thick
white-hot core, and each has a different shape; two or three thin branches split off its upper
half and fade out in the air. Portrait 2:3.
```

**4. Impact pieces** (`fx/zap.png`, landscape 3:2). What goes off where a bolt lands, the sparks
of the pops, and the small arcs round a waiting lightning ball:

```text
Style: a polished casual mobile-game visual effect for the cute pastel game in the attached
screenshot: crisp, bright, clean shapes, readable at small sizes; glowing light with no outline.
Plain flat solid pure black background (#000000) everywhere around the effects: no gradient, no
stars, no clouds, no ground, no vignette, no texture, no frame. No text, no letters, no numbers,
no kanji, no watermark, no signature.
The colour of every effect: a thin white-hot core, a bright electric lemon-yellow glow round it,
and a faint soft violet haze at the outer edge of the glow.

A sheet of six separate lightning-impact pieces in a 3×2 grid (three columns, two rows), each
centred in its own cell with plain black all round it: nothing touches another piece or the edge
of the image.
- Top left: an impact flash, a bright starburst: a round white-hot centre with eight to ten
  sharp spiky rays of uneven length.
- Top middle: a shock ring, a thin, perfectly round ring of light with small jagged crackles
  along it, plain black inside.
- Top right: a burst of ten or so tiny sparks flying out from the centre, short bright streaks and
  dots, the middle empty.
- Bottom row: three small crackling electric arcs, each a short curved jagged spark about a third
  as long as its cell is wide, with one or two tiny forks: the left one curving up, the middle one
  wavy, the right one curving down.
Landscape 3:2.
```

**5. Electric crackles** (`fx/shock.png`, square 1:1). Laid over a struck cat like Porcelain's
cracks (§4.12), turned and swapped quickly so the cat crackles:

```text
Style: a polished casual mobile-game visual effect for the cute pastel game in the attached
screenshot: crisp, bright, clean shapes, readable at small sizes; glowing light with no outline.
Plain flat solid pure black background (#000000) everywhere around the effects: no gradient, no
stars, no clouds, no ground, no vignette, no texture, no frame. No text, no letters, no numbers,
no kanji, no watermark, no signature.
The colour of every effect: a thin white-hot core, a bright electric lemon-yellow glow round it,
and a faint soft violet haze at the outer edge of the glow.

A sheet of four ELECTRIC CRACKLE patterns in a 2×2 grid, evenly spaced, with plain black between
them. Each pattern fits inside an imaginary circle of the same size; the circle itself is NOT
drawn. Only crackling lines of light: no ball, no cat, no fill, no background shape. Each pattern
is a web of thin, branching, jagged electric arcs spread over the whole circle, as if a ball were
crackling with electricity, its outermost arcs running close along the circle's edge on every
side, with plenty of black between the arcs so whatever lies under them still shows. The four
look clearly different from each other (different paths), so swapping them quickly makes the
electricity flicker. Nothing touches the edge of its cell. Square 1:1.
```

Checks for these: the ball follows the general checklist (§2): a closed circular outline with
nothing sticking out, no glow or sparks round it, clearly different from the hanabi at 48 px. The
effect sheets: pure black everywhere around the pieces (no grey haze reaching the edges, no stars
or clouds), no outlines, nothing touching another piece or the image's edge, every piece white at
its core with a yellow glow and a faint violet edge; each chain bolt runs the full width of its
row with both ends on the row's middle line; the sky bolts' tips are near the bottom; the crackle
patterns are lines only.

**Into the game.** Tell Claude when they are in `art-source/specials/` and `art-source/fx/`. The
art pipeline (`npm run art`) cuts the ball's white like the other balls'; for the effect sheets it
turns the black into transparency (the brighter, the more opaque), splits the pieces and measures
each bolt's two ends, so the game can stretch it between two cats. Until they arrive the game
shows a plain stand-in (a flat circle and thin code-drawn lines); the clip for the cards is
recorded once the art is in.

**Arrived (2026-10-13, v0.42.1):** all five, from the first generation, in through `npm run art`
(`tools/buildSpecials.ts` for the ball, `tools/buildLightning.ts` for the sheets), and the
Lightning clip is recorded. Two of them differ from the prompt: the chain bolts came as a square
sheet whose rows are pairs of nearly the same bolt (three shapes, not six; the game also mirrors
them, so the links still change shape as they flicker), and each crackle pattern has its circle
drawn as a glowing ring, which lies at the struck cat's edge like an electric sphere round it. Both
are kept; regenerate only if the owner wants more shapes or no ring. With `?skin=vector` or
`placeholder` the game keeps the code-drawn stand-ins.

### 4.17 Phase 16: the loading screen (v0.42.10)

The loading screen (GAME_DESIGN §2.0) is the menu's garden, the logo and the golden cat, with a
bar near the bottom that fills while the game loads. **Done (v0.42.11):**
`art-source/loading/bar.jpg` and `bar-full.jpg`; until then the bar was drawn in CSS.
The bar is the in-game score card (`art-source/hud/score-card.jpg`, the card the menu's record
cards use) made long and thin: the paw on its left end, the caramel well running to its right
end; as the game loads, the well fills with gold from the paw to the right. Two images, in this
order, in one chat (the second is an edit of the first, so the gold fits the well exactly).
Save them as `.png`, `.jpg` or `.webp`.

**1. The empty bar** (`loading/bar.png`, 3:2, 1536×1024). Attach the score card
(`art-source/hud/score-card.jpg`) and the menu mockup (`art-source/menu/mockup.jpg`):

```text
Style: match the attached images exactly (the game's score card and its main menu). Polished
casual mobile-game art, cute chibi kawaii illustration, thick warm dark-brown outlines (never
black) of even weight, soft pastel cel shading with gentle gradients and one small glossy
highlight, light from the upper left, clean crisp vector-like edges.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the object. No text, no letters, no numbers, no kanji, no watermark, no signature.

A loading bar for the mobile game "Maneki Merge": the attached score card, drawn the same way
(the same cream card with its light top edge, the same thick dark-brown outline, the same white
cat paw with pink pads on its left end, the same sunken caramel-brown well), but much longer and
thinner: a straight horizontal pill about seven times as long as it is tall, centred, filling
about 90% of the canvas's width. The paw sits on the bar's left end; the well starts right after
the paw and runs almost to the bar's right end, where it ends in a round end like the card's.
The well is empty and plain: no marks, no ticks, no stripes, no shine. The middle of the bar is
the same all along (the game stretches it). Front view, flat, no perspective, perfectly
horizontal. Nothing else in the picture. Ratio 3:2.
```

**2. The full bar** (`loading/bar-full.png`): in the same chat, attach the bar from step 1 and ask
for an edit (with the tool's region edit, select the well only, if it has one):

```text
Edit the attached loading bar: keep everything exactly the same (the card, the outline, the paw,
the shape and size and position of every part, the white background) and change only the inside
of the caramel well: fill the whole well, from the paw to its round right end, with shiny gold,
like a polished gold koban coin: warm golden yellow, a lighter glossy stripe along its top, a
deeper amber gold along its bottom, smooth and even all along, no marks, no coins, no sparkles,
no text. Same size, same framing, same ratio 3:2.
```

**Into the game.** Claude cuts the white, makes the empty bar a three-slice strip (the paw's end,
a plain middle that stretches, the right end) and takes the gold from the difference between the
two images, so it fills the well exactly; the loading screen then shows the gold growing from the
paw to the right with the loading. If the second image moves or resizes anything outside the
well, generate it again (it has to match the first pixel for pixel outside the well). The tool is
`tools/buildLoading.ts` (`npm run art`): `public/assets/loading/bar.webp` and `fill.webp`, data in
`src/config/loadingSpriteData.ts`; both strips' caps sit on the same columns, so the full gold lies
exactly on the well.

### 4.18 Phase 17: the Google Play feature graphic

The wide banner at the top of the game's Google Play page (docs/PLAY_STORE.md §5). Play wants it
at exactly 1024×500 (JPG or PNG, no transparency), and shows it cropped and scaled in places, so
what matters sits in the middle. The image tools make 3:2, so generate 1536×1024: Claude cuts the
middle band (1536×750, the top and bottom 137 px go) and scales it to 1024×500, and nothing else.
Attach the menu mockup ([art-source/menu/mockup.jpg](../art-source/menu/mockup.jpg)), the hero
([art-source/menu/hero.jpg](../art-source/menu/hero.jpg)), the logo
([art-source/menu/logo.jpg](../art-source/menu/logo.jpg)) and the lineup sheet
([art-source/style/lineup.webp](../art-source/style/lineup.webp)). Save it as
`art-source/store/feature-graphic.png`. If the logo's letters come out wrong, generate it again
(a fresh chat, or the tool's region edit on the letters); the logo is the only text allowed.

```text
Style: match the attached images exactly (the game's main menu, its golden lucky cat, its logo and
its cat lineup). Polished casual mobile-game art, cute chibi kawaii illustration, thick warm
dark-brown outlines (never black) of even weight, soft pastel cel shading with gentle gradients and
one small glossy highlight, light from the upper left, warm cream and sakura-pink palette, clean
crisp vector-like edges. No watermark, no signature, and no text except the attached logo.

The Google Play banner for the mobile game "Maneki Merge": a wide view of the shrine garden from
the attached menu (cream sky with soft clouds, sakura branches, a red torii on one side, stone
lanterns, warm wooden floor). On the left half, the attached "Maneki Merge" logo exactly as it is
(the same rounded coral-pink letters with the dark-brown outline and the gold bell), big and easy
to read. On the right half, the golden maneki-neko from the attached hero picture on its pink
cushion, waving with its raised paw, and around it a happy tumble of the round lucky cats from the
attached lineup sheet in several sizes and colours, every one with its raised paw, red collar and
gold bell, with a few gold koban coins and sparkles bursting between two of them as if they just
merged. Everything important sits inside the middle band of the picture, between 15% and 85% of its
height, and away from the left and right edges: the top and bottom are cut off and the edges get
covered. Bright, cheerful, readable as a small thumbnail. Wide landscape, ratio 3:2.
```

### 4.19 Phase 18: the stage goal strip

Players don't see what a stage asks for or how close they are (2026-10-14 playtest: no goal cat,
no evolution order, no progress bar). The owner chose a strip across the top of the play screen
(option A): it replaces the words "STAGE N"; the torii with the stage number on its left end; the
cats 1 to 8 in order on a gold-filling well; the gold cat, the goal, bigger in a gold ring on its
right end. Cats made this stage are in colour, the rest are tan silhouettes. First a prototype:
two mockups of the whole play screen, in this order, in one chat; the game's pieces come once the
owner approves the look. The card is the loading bar (§4.17) without its paw.

Attach to the first request, in this order:

1. a screenshot of the play screen from the phone, a few stages in, with cats in the jar (or
   [docs/screenshots/v0.36.0/combo-390.png](screenshots/v0.36.0/combo-390.png));
2. the lineup sheet, [art-source/style/lineup.webp](../art-source/style/lineup.webp);
3. the torii, [art-source/menu/torii.jpg](../art-source/menu/torii.jpg);
4. the full loading bar, [art-source/loading/bar-full.jpg](../art-source/loading/bar-full.jpg).

**1. In progress** (`ui/goal-strip-mockup.png`, 9:16):

```text
Style: match the attached images exactly (my mobile game's play screen, its nine lucky cats, its
torii icon and its gold loading bar). Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, warm cream and
sakura-pink palette, clean crisp vector-like edges, readable at phone size. No watermark, no
signature.

Attached: (1) a screenshot of the game's play screen; (2) the game's nine lucky cats, in order,
read left to right and top to bottom: 1 white, 2 charcoal, 3 orange, 4 sky blue, 5 pink, 6 green,
7 purple, 8 red, 9 gold; (3) the game's red torii icon; (4) the game's loading bar, a long cream
card with a sunken well full of gold.

Edit image 1: add a stage goal strip at the top of the screen. Change nothing else: the score
card, the coins card, the pink pause button, the NEXT bubble, the paw, the jar, the cats in the jar
and the garden stay exactly as they are, in the same place and at the same size. Only the words
"STAGE N" at the top go away; the strip takes their place.

The strip:
- The card: the loading bar of image 4, drawn the same way (the same cream card, the same thick
  dark-brown outline and light top edge, the same sunken caramel well), but without the paw. It
  runs along the top of the screen, from the score card's left edge to just left of the pause
  button, centred on the pause button's height and about as tall as it.
- Left end: the torii of image 3, small, standing inside the card's left end, with the stage number
  from image 1 in chunky cream letters with a thick dark-brown outline between its two pillars.
  This number is the only text in the strip.
- The well runs from the torii to the card's right end. Its gold fill reaches only up to the sixth
  cat; to the right of it the well is empty caramel.
- On the well, evenly spaced from left to right: the cats 1 to 8 of image 2, in order, all the same
  small size, each drawn exactly as it is in image 2 (round body, raised paw, collar, gold bell)
  with its thick dark-brown outline. Cats 1 to 6 are in full colour: they have been made this
  stage. Cats 7 and 8 are flat silhouettes, their exact shapes filled with plain light tan
  (#E3CFAF) inside the dark-brown outline, no face, no colours: not made yet.
- Right end: cat 9, the gold cat, about 1.6 times as big as the others, in a round slot with a
  thick glossy gold ring that overlaps the card's right end. It is still a light-tan silhouette
  like cats 7 and 8, and a soft warm gold glow surrounds its ring: it is the stage's goal.
No arrows, no labels, no other decorations. Portrait 9:16, the same framing as image 1.
```

**1b. Plainer** (`ui/goal-strip-mockup.png` again), in the same chat, nothing new attached. The
first try (2026-10-15) was too shiny and showy for the owner: a big glossy gold ring with a glow
round the goal, a glossy gold fill, a big torii sticking out of the card, and only six cat slots.
This edit asks for a quiet strip, as plain as the coins card:

```text
Style: exactly the same as the image you just made and the images attached before it. Polished
casual mobile-game art, cute chibi kawaii illustration, thick warm dark-brown outlines (never
black) of even weight, soft pastel cel shading, light from the upper left, clean crisp vector-like
edges. Quiet and simple: no glow, no shine streaks, no sparkles, no glossy highlights. No
watermark, no signature.

Edit the image you just made. The strip at the top is too shiny and too showy; make it much
plainer and calmer, like the "COINS:" card on the right. Change only the strip; everything else
stays exactly as it is (the score card, the coins card, the pause button, the NEXT bubble, the
paw, the jar and its cats, the garden), in the same place and at the same size.

The plain strip:
- The card: a flat warm cream rounded bar with a thin dark-brown outline and a thin tan edge along
  its bottom, exactly like the coins card. A little thinner than now: about three quarters of the
  pause button's height. No highlight, no shine.
- Left end: a small torii, fully inside the card (it does not stick out above or below it), and
  right after it the stage number in dark brown chunky letters, like the word "NEXT".
- The track: a thin flat sunken caramel line along the card, with a flat soft gold fill (no shine,
  no gradient) from the left up to the sixth cat.
- On the track, evenly spaced: all eight small cats 1 to 8 of the lineup, in order, the same small
  size, with their usual dark-brown outline. Cats 1 to 6 in colour, cats 7 and 8 as flat light-tan
  silhouettes with no face.
- Right end: the gold cat as a flat light-tan silhouette, only a little bigger than the others
  (about 1.3 times), inside a plain cream circle with a thin flat gold outline. No thick ring, no
  glow, no sparkles; it stays inside the card's height or just slightly over it.
Everything flat and quiet; the strip should not catch the eye more than the score card does.
Portrait 9:16, the same framing as the image you just made.
```

**1c. No progress bar** (`ui/goal-strip-mockup.png` again), in the same chat after 1b, nothing new
attached. The owner liked 1b's plain strip (2026-10-15) but wants no gold progress bar: the
coloured cats alone show how far the stage has come. 1b also turned the NEXT cat and some cats in
the jar into silhouettes by mistake; this edit puts them back.

```text
Style: exactly the same as the image you just made and the images attached before it. Polished
casual mobile-game art, cute chibi kawaii illustration, thick warm dark-brown outlines (never
black) of even weight, soft pastel cel shading, light from the upper left, clean crisp vector-like
edges. Quiet and simple: no glow, no shine streaks, no sparkles, no glossy highlights. No
watermark, no signature.

Edit the image you just made. Keep the strip at the top exactly as plain as it is now, with these
changes only:
- Remove the progress bar completely: no gold fill and no sunken track. The small cats sit
  directly on the flat cream card, evenly spaced between the torii with its number and the goal
  circle at the right end.
- All eight small cats 1 to 8 are there, in the lineup's order: cats 1 to 6 in full colour, cats 7
  and 8 as flat light-tan silhouettes with no face.
- The gold cat at the right end stays as it is: a flat light-tan silhouette in a plain cream circle
  with a thin flat gold outline.
Also put back everything outside the strip exactly as in the very first screenshot: the cat in the
NEXT bubble and every cat in the jar are in full colour with their faces (none of them is a
silhouette). Everything else stays in the same place and at the same size. Portrait 9:16, the same
framing as the image you just made.
```

**2. One cat to go** (`ui/goal-strip-mockup-2.png`, 9:16), in the same chat after 1c, nothing new
attached:

```text
Style: exactly the same as the image you just made. Polished casual mobile-game art, cute chibi
kawaii illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel
shading, light from the upper left, clean crisp vector-like edges. Quiet and simple: no glow, no
shine streaks, no sparkles, no glossy highlights. No watermark, no signature.

Now the same screen a little later in the same stage. Keep everything exactly as in the image you
just made, the strip's size, place and plain look too, still with no progress bar, and change only
this: cats 1 to 8 on the strip are all in full colour. The gold cat at the right end is still a
light-tan silhouette in its plain circle; only its thin gold outline is a little thicker. No glow,
no sparkles, no other changes. Portrait 9:16.
```

Checks: nothing but the strip changed (lay it over image 1); the cats are in the lineup's order
and look like it; the silhouettes have no faces; the number is the only text; the strip stays
plain (no glow, shine or sparkles) and has no progress bar (the owner's call, 2026-10-15).

**Approved (2026-10-15):** 1c,
[art-source/ui/goal-strip-mockup.webp](../art-source/ui/goal-strip-mockup.webp): a plain strip, no
progress bar. The game builds it from these pieces:

- the card: CSS, the coins card's (cream, thin dark-brown outline, tan bottom edge), so the two
  cards side by side match exactly; no image;
- the torii: the menu's torii (`art-source/menu/torii.jpg`), with the stage number as live text;
- the cats: the HUD's cat icons (`public/assets/cats/look-NN.webp`), all nine always in full
  colour: no silhouettes (the owner's call, 2026-10-15; a generated tan silhouette was turned down
  as soon as it came);
- **new:** the goal's round slot, the image below. Save it as `.png`, `.jpg` or `.webp`. Until it
  comes (and if the owner keeps it so), the slot is CSS: a cream disc, a flat 3 px gold ring and thin
  dark-brown edges (v0.48).

**3. The goal slot** (`hud/goal-slot.png`, 1:1). Attach the approved mockup
([art-source/ui/goal-strip-mockup.webp](../art-source/ui/goal-strip-mockup.webp)):

```text
Style: match the attached play screen exactly. Clean crisp vector-like
edges, warm dark-brown outlines (never black) of even weight, flat colour. Quiet and simple: no
shading, no glow, no shine, no highlight, no gradient, no sparkles.
Plain flat solid white background (#FFFFFF), no texture, no checkerboard, no shadow under the
object. No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw one game asset, big and razor sharp: the empty round slot at the right end of the strip in
the attached play screen, where the gold cat goes. A perfect circle filling about 90% of the
canvas, centred: a flat warm cream disc (#FBE7CC), with a flat gold ring round it (#E9B42C) about
6% of the circle's width, a thin warm dark-brown line (#5B2517) round the outside of the ring and
a thinner one round its inside. The disc is empty: nothing in it. Square 1:1.
```

Checks: a closed, perfect, empty circle; flat, no shine; white background.

### 4.20 Phase 19: sunset and night backgrounds

The owner's idea (2026-10-15), like Pokémon GO: the backgrounds follow the phone's clock. Today's
pictures are the day; every background gets two more times of day, **sunset** and **night**. The
day ones already read as a soft morning, so there is no separate morning. The game picks the time
from the clock (no location), when a run starts and when the jar grows, never in the middle of a
jar; a setting can keep it always day. The details go into GAME_DESIGN when it is built. The menu
shows jar 1's garden at every time of day (the owner's call, 2026-10-15: the menu's own garden, with
its stone path, is dropped), so the menu needs no pictures of its own.

| Picture         | Day (attach this)        | Sunset                          | Night                          |
| --------------- | ------------------------ | ------------------------------- | ------------------------------ |
| Jar 1, garden   | `scene/background.jpg`   | `scene/background-sunset.png`   | `scene/background-night.png`   |
| Jar 2, temple   | `scene/background-2.jpg` | `scene/background-2-sunset.png` | `scene/background-2-night.png` |
| Jar 3, town     | `scene/background-3.jpg` | `scene/background-3-sunset.png` | `scene/background-3-night.png` |
| Jar 4, mountain | `scene/background-4.jpg` | `scene/background-4-sunset.png` | `scene/background-4-night.png` |
| Jar 5, peak     | `scene/background-5.jpg` | `scene/background-5-sunset.png` | `scene/background-5-night.png` |

**How to generate.** Every picture is an **edit** of its day picture, so nothing moves: the game
lays the times over each other, and the rug and the jar's spot must stay exactly in place. Attach
the day picture first. Do jar 1 first, sunset in one chat and night in another; once the owner
likes them, they are the **look reference**: attach `background-sunset` (or `-night`) as the second
image to every other picture of that time, so all five share one sky and one light. Ask for the
same shape as the attached picture (9:16; 1024×1536 also works, the pipeline crops the sides).

**Sunset**, the whole prompt for jar 1 (the others add the look-reference line after the first
paragraph and swap the scene line, see below):

```text
Edit the attached picture, a background from my mobile game. Keep the picture exactly as it is:
every object with its shape, size and place, the composition, the mint rug at the bottom, the thick
warm dark-brown outlines and the cute pastel cel-shaded style. Change only the time of day: the
sky, the light and the colours.

Make it a warm spring sunset. The sky is a soft dusty rose at the top edge, flowing down through
warm peach and coral to a glowing golden orange just above the horizon. The low sun is outside the
picture on the left: golden-orange light comes from the left, with long soft shadows to the right
and warm rim light on the left edges of things. Clouds are lit pink and gold from below, the sakura
blossoms glow a warmer coral pink, and the lanterns are just lit, with a small warm glow inside.
The torii and the shrine's red wood glow warm in the low light, and the two lanterns hanging at the
shrine are lit.

Keep it pastel, soft and cosy: not dark, not oversaturated. The top 15% stays plain sky that ends
in one flat colour at the top edge, so the game can extend it upwards. The centre column (the
middle 85% of the width, from 30% to 87% of the height) stays calm and low in contrast, because a
glass jar full of cats stands there. No jar, no cats, no people, no user interface, no text, no
letters, no kanji, no watermark, no signature. The same size and shape as the attached picture.
```

**Night**, the whole prompt for jar 1:

```text
Edit the attached picture, a background from my mobile game. Keep the picture exactly as it is:
every object with its shape, size and place, the composition, the mint rug at the bottom, the thick
warm dark-brown outlines and the cute pastel cel-shaded style. Change only the time of day: the
sky, the light and the colours.

Make it a calm spring night under a full moon. The sky is a soft deep indigo blue at the top edge,
flowing down to a lighter dusty blue-violet just above the horizon, with a round pale-cream full
moon and its soft halo high in the sky on the left (below the top 15%), and a few small soft cream
stars in the middle of the sky only. Cool soft moonlight comes from the upper left. Every lantern
is lit and glows warm gold with a soft round halo, casting a warm pool of light on the ground
around it. The sakura blossoms are a pale moonlit pink. The shrine's doorway glows softly from
inside, and the clouds are soft blue-grey with silver edges.

A cosy storybook night: clearly night, but never black or gloomy, soft mid-tone colours, the
outlines still warm dark brown, the mint rug still clearly mint. The sky is one smooth gradient all
the way up to the top edge, with no flat band, stripe or line anywhere in it, and the top 15% has
no stars, moon or clouds, so the game can extend it upwards. The centre column (the middle 85% of the width, from 30% to 87% of the height) stays calm,
low in contrast and mid-dark, never black, because a glass jar full of colourful cats stands there
and they must stay easy to see. No jar, no cats, no people, no user interface, no text, no letters,
no kanji, no watermark, no signature. The same size and shape as the attached picture.
```

**Look-reference line** (every picture after jar 1, after the first paragraph):
`The second attached picture is the same sunset (night) already done for another scene of my game:
match its sky colours, light and mood exactly.`

**Scene lines** (they replace jar 1's last sentence or two before the closing paragraph):

| Picture | Sunset                                                                                                                                                                                                                                                                                                                                     | Night                                                                                                                                                                                                                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jar 2   | The gate's and the pagoda's red wood glow warm orange in the low light, and the green hills turn soft violet.                                                                                                                                                                                                                              | Small warm lights glow in the temple hall's doorways and on each roof of the pagoda, the stone plaza is silvery blue with warm lantern pools, and the hills are a soft dark blue.                                                                                                                                                 |
| Jar 3   | Mount Fuji's snow glows pink, the river reflects the orange sky, the water in the rice fields shines gold, and the first windows in the town light up.                                                                                                                                                                                     | The whole little town's windows glow warm yellow, small lanterns line the path of red torii gates up the hill, the river and the rice fields reflect the moonlight, and Mount Fuji is soft blue-grey with moonlit snow.                                                                                                           |
| Jar 4   | Mount Fuji's snow glows pink, the bands of cloud below the stage turn peach and gold, the waterfall catches the orange light, and the valley sinks into soft violet shade.                                                                                                                                                                 | The tiny village far below has a few warm lights, the waterfall and the river shine silver in the moonlight, the bands of cloud below the stage are soft blue-grey with silver edges, and Mount Fuji is moonlit.                                                                                                                  |
| Jar 5   | Instead of "The low sun is outside the picture…": the sun already in the picture stays in its place and size, turns a deep golden orange and sinks halfway into the sea of clouds; the light comes from it. The clouds glow peach, coral and gold, lilac in their shade, Fuji's tip glows pink, and the cranes are small dark silhouettes. | Instead of the moon sentence: the sun in the picture becomes a big pale-cream full moon with a soft halo, in the same place and the same size (no other moon). The sea of clouds is soft silvery blue in the moonlight, Fuji is moonlit, the cranes are small and white, and the paper streamers on the sacred rope glow faintly. |

Checks: laid over its day picture, nothing moved (the rug, the jar's spot, the buildings, the
branches); the top edge is one flat colour; the centre column is calm; at night the cats will still
read (Claude tries a night background behind a full jar before the rest are made).

**First round (2026-10-15).** Nine came; the sunsets of jars 1, 3, 4 and 5 are good. Every picture
came about 1% zoomed in (the rug about 12 px lower); the pipeline measures that and the game
places each picture by it (no resampling, TECH_SPEC §14). Behind a full jar the night reads well, cats included. Two fixes:

- **Jar 2's sunset** drew jar 1's shrine in place of the pagoda: generate it again with jar 3's
  sunset as the look reference (not jar 1's) and the line `Take only the colours and the light from
the second picture; do not copy any building or object from it.` after the look-reference line.
- **Every night** has a flat darker band across the top with a straight edge (the old night prompt's
  "ends in one flat colour" read as a band). In the game it is a hard line under the score card.
  The night prompt above is fixed; the five pictures are mended with an edit of each one:

```text
Edit the attached picture. Keep everything exactly as it is: every object with its shape, size and
place, the colours, the moon, the stars, the branches, the outlines and the style. Change only one
thing: across the very top there is a flat darker blue band with a straight lower edge. Remove the
band and its edge: the night sky is one smooth, even gradient all the way up to the top edge, a
little deeper blue at the very top, with no band, no stripe and no line anywhere in the sky. The
same size and shape as the attached picture. No text, no watermark, no signature.
```

**Done (2026-10-15):** the mended nights (the peak's came back bigger, 937 × 1679: fine, it is
placed by its fit) and the new jar 2 sunset, with its pagoda, are in the game (v0.51.0). The menu
shows jar 1's pictures. Phase 19 is done.

### 4.21 Phase 20: the Katana (the first weapon)

The Katana (docs/plans/weapons-and-passives.md §3.1) is the first weapon of the weapons-and-passives
direction. Dropped from the paw, it falls point down, fast and dead straight, through everything in
the jar, and cuts every cat of sizes 1–4 its blade crosses (and every boulder); each cut cat splits
in two along the cut (the game splits the cat's own art) and pops into coins. With More Blades,
more katanas fall at once: diagonals from the jar's top corners (an X), then a horizontal one.

How it plays (the art below is made for it):

1. In the paw and in NEXT the **katana's ball** shows, round like the other special balls (v0.55.1,
   the owner's call: v0.55.0 hung the sword itself in the paw).
2. Dropped, a **swoosh** flashes at the paw with a steel "shing", and the katana shoots out of the
   ball, straight down. A
   **slash streak** stretches behind it along its path, with **glints** running along the line.
3. Each cat it crosses gets a **cut flash**, splits in two and pops in a **burst of sparks**.
4. The point hits the floor with a **strike burst** and a **soft flash**; the katana fades.

Seven images (the ball since v0.55.1): the katana and its ball on white, two effect sheets on **black** (the effects are light, like
Lightning's, §4.16: no outlines, and the game turns the black into transparency), and three pick
icons from the icon kit (§5); Quick Katana's card shows the Katana icon (the owner's call). One image per request, in a new chat each time. Make the katana
first: the icons are drawn from it.

**1. The katana** (`specials/katana.png`, portrait 9:16). Attach the lineup sheet
(`art-source/style/lineup.webp`), the game screenshot `docs/screenshots/v0.26.0/390-1-hud.png` and
the hanabi (`art-source/specials/hanabi.jpg`):

```text
Style: match the attached images exactly (the game's cat lineup, a game screenshot and one of its
special balls). Polished casual mobile-game art, cute chibi kawaii illustration, thick warm
dark-brown outlines (never black) of even weight, soft pastel cel shading with gentle gradients
and one small glossy highlight, light from the upper left, clean crisp vector-like edges,
readable at small sizes.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the object. No text, no letters, no numbers, no kanji, no watermark.

A katana for a Suika-style merge game with a lucky-cat (maneki-neko) theme, in the same cute
drawing style as the attached cats and ball, but with a real katana's long, slender proportions:
clearly a Japanese long sword, NOT a dagger, knife or tanto. Strictly side view, perfectly
vertical and centred: the hilt at the top, the point at the bottom, filling about 92% of the
canvas height. The blade is long and narrow, about four times as long as the hilt and no wider
than the hilt, single-edged, with a gentle even curve along its whole length and the katana's
angled tip (kissaki); polished silver steel with a cool pale-blue sheen, a soft wavy white temper
line along its cutting edge and one long glossy highlight. At the top of the blade a small gold
collar (habaki) with a tiny paw print on it, then a small oval gold guard (tsuba) seen edge-on as a
thin flat disc, then a hilt wrapped in vermilion cord in a diamond pattern over cream, ending in a
plain gold cap. Nothing hangs from the hilt: no bell, no cord, no tassel. No scabbard. No glow, no
sparkles and no motion lines around it (the game adds them). Nothing touches the edge of the image.
Portrait 9:16.
```

**The effect sheets.** Attach the game screenshot `docs/screenshots/v0.26.0/390-1-hud.png` and the
katana once you have it, so the steel's blue matches. Every prompt starts with the same style block
(already inside each one below).

**2. Slash streaks** (`fx/slashes.png`, landscape 16:9). The gleam the blade leaves along its path;
the game stretches one along each katana's line (straight down, diagonal or across), so both ends
must sit on the row's middle line:

```text
Style: a polished casual mobile-game visual effect for the cute pastel game in the attached
screenshot: crisp, bright, clean shapes, readable at small sizes; glowing light with no outline.
Plain flat solid pure black background (#000000) everywhere around the effects: no gradient, no
stars, no clouds, no ground, no vignette, no texture, no frame. No text, no letters, no numbers,
no kanji, no watermark, no signature.
The colour of every effect: a thin white-hot core, a cool pale steel-blue glow round it, and a
faint soft sakura-pink haze at the outer edge of the glow.

A sheet of FOUR separate sword-slash streaks, stacked one above the other in four evenly spaced
rows, with plain black between the rows: no streak touches another, and each streak with its glow
stays inside its own row. Every streak runs straight from the far LEFT of its row to the far RIGHT
(only a small black margin at each end), and both of its ends lie exactly on the row's middle
line, so it can be stretched along a sword's path. Each is a perfectly straight, razor-thin line
of light, brightest in the middle and tapering to fine points at both ends, like the gleam a
katana leaves in the air:
- row 1: bold, with a wide glow;
- row 2: thinner and sharper, with a narrow glow;
- row 3: like row 1, with three or four small four-pointed glint stars sitting on the line;
- row 4: like row 2, with a few tiny sparks peeling off it and fading.
Landscape 16:9.
```

**3. Cut pieces** (`fx/cut.png`, landscape 4:3). What goes off on a cut cat, along the blade, at
the paw and where the point hits the floor:

```text
Style: a polished casual mobile-game visual effect for the cute pastel game in the attached
screenshot: crisp, bright, clean shapes, readable at small sizes; glowing light with no outline.
Plain flat solid pure black background (#000000) everywhere around the effects: no gradient, no
stars, no clouds, no ground, no vignette, no texture, no frame. No text, no letters, no numbers,
no kanji, no watermark, no signature.
The colour of every effect: a thin white-hot core, a cool pale steel-blue glow round it, and a
faint soft sakura-pink haze at the outer edge of the glow.

A sheet of six separate sword-effect pieces in a 3×2 grid (three columns, two rows), each centred
in its own cell with plain black all round it: nothing touches another piece or the edge of the
image.
- Top left: a cut flash: a short, perfectly straight, razor-thin diagonal line of light from lower
  left to upper right, tapering at both ends, with a bright four-pointed star at its middle.
- Top middle: a glint: one bright four-pointed star with long thin rays up, down, left and right,
  and two shorter diagonal rays.
- Top right: a burst of ten or so tiny sparks flying out from the centre, short bright streaks and
  dots, the middle empty.
- Bottom left: a sword swoosh: a crescent-shaped arc of light, thick in the middle and thinning to
  sharp points at both ends, like a katana swung through the air.
- Bottom middle: a strike burst: a fan of short bright sparks flying UP and outward from one point
  at the bottom middle of its cell, as when a blade strikes stone.
- Bottom right: a soft round flash: a small bright white disc fading smoothly into the blue glow.
Landscape 4:3.
```

**4–6. The pick icons** (`icons/katana.png`, `icons/moreBlades.png`, `icons/wideBlade.png`, square
1:1; Quick Katana's card uses `icons/katana.png`, the owner's call). The icon kit (§5) with the gold rim, since they are blessings.
Attach the icon sheet (`art-source/ui/upgrade-icons.webp`) and the katana
(`art-source/specials/katana.png`) to each:

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a gold rim and
the same thick dark-brown outline round it.
Inside, centred: the attached katana, lying diagonally across the face, its gold guard and
vermilion hilt at the upper right, its point at the lower left. It keeps a real katana's long,
slender shape (the blade about three times as long as the hilt, never a dagger) and is sized so it
reaches from near the upper right of the cream face to near the lower left, with a small gap to
the gold rim at both ends. It stands for a sword that cuts the small cats in a straight line.
Nothing sticks out of the circle: not the hilt, not the point. Square 1:1.
```

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a gold rim and
the same thick dark-brown outline round it.
Inside, centred: three of the attached katanas, drawn shorter and a little chunkier so that
every sword, hilt and point included, lies inside the cream face with a clear gap to the gold rim.
They cross in a star, all with their hilts up and their points down: one straight up and down in
the middle, and two crossing it diagonally in an X, their hilts at the upper left and upper right,
their points at the lower right and lower left. It stands for more blades in every cut. Nothing
sticks out of the circle: no hilt, no point. The rim exactly like the attached icons: one single
closed ring of even width all the way round (no second ring, no extra arc, no gap), a wide gold
band with the thick dark-brown outline only on its outside, and only a thin light-tan line, never
a dark-brown one, where the gold meets the cream face. Square 1:1.
```

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a gold rim and
the same thick dark-brown outline round it.
Inside, centred: the attached katana pointing straight down, as long as a real katana (never a
dagger) but with an extra-broad gleaming blade, nearly twice as wide as usual, and one small chunky
gold arrow on each side of the blade pointing outward, away from it. It is sized so the whole
sword, hilt and point included, lies inside the cream face with a small gap to the gold rim at the
top and the bottom. It stands for a wider cut. Nothing sticks out of the circle. Square 1:1.
```

Checks for these: the katana follows the general checklist (§2): perfectly vertical with the point
straight down (the cut line runs along it), a long slender katana, not a dagger (blade about four times the hilt), nothing hanging from the
hilt, no
glow or lines round it, nothing touching the edge. The effect sheets: pure black everywhere around
the pieces, no outlines, nothing touching another piece or the image's edge, every piece white at
its core with a steel-blue glow and a faint pink edge; each slash streak straight, the full width
of its row, both ends on the row's middle line. The icons: §5's list; every sword wholly inside the circle (the first katana icon came
with its hilt and point outside the rim, and asked to draw it shorter, the next one
looked like a dagger again, 2026-10-16); every katana long and slender, never a dagger; the three katanas of More
Blades still read as katanas at 48 px.

**Into the game.** Tell Claude when they are in `art-source/specials/`, `art-source/fx/` and
`art-source/icons/`. The art pipeline (`npm run art`) cuts the katana's white like the balls', turns
the effect sheets' black into transparency, splits the pieces and measures each streak's two ends,
and fits the icons. Until they arrive the game shows plain stand-ins.

**7. The katana's ball** (`specials/katana-ball.png`, square 1:1; asked for in v0.55.1). Attach the
lineup sheet (`art-source/style/lineup.webp`), the hanabi (`art-source/specials/hanabi.jpg`), the
lightning ball (`art-source/specials/lightning.jpg`) and the katana (`art-source/specials/katana.jpg`),
so it comes out a sibling of the other special balls, with the same sword:

```text
Style: match the attached images exactly (the game's cat lineup, two of its special balls and its
katana). Polished casual mobile-game art, cute chibi kawaii illustration, thick warm dark-brown
outlines (never black) of even weight, soft pastel cel shading with gentle gradients and one small
glossy highlight, light from the upper left, clean crisp vector-like edges, readable at small sizes.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the object. No text, no letters, no numbers, no kanji, no watermark.

A katana ball for a Suika-style merge game, the same size and drawing style as the cats in the
attached lineup and the attached firework and thunder balls: strictly front view, its outline a
perfect circle, centred, filling about 80% of the canvas. The ball is glossy deep crimson-red
lacquer (urushi) with a faint pattern of small gold wave arcs (seigaiha) over it, clearly a
different colour from the attached navy firework ball and violet thunder ball. Across its front,
big and bold, lies the attached katana, shortened to fit: diagonally, its gold guard and vermilion
hilt at the upper right, its gleaming silver blade pointing to the lower left, the whole sword
inside the circle with a small gap to the ball's edge, with its own dark-brown outline. No
scabbard, nothing hanging from the hilt. Nothing sticks out of the circle. No glow and no sparkles
around it (the game adds them). Square 1:1.
```

**The ball arrived (2026-10-16, v0.55.2)** from the first generation, again saved from Gemini as
`.jfif` and copied in as `specials/katana-ball.jpg`: a closed circle, nothing outside it. Its
sword's hilt is plain red, without the diamond wrap; at the ball's size it doesn't show.

**Arrived (2026-10-16, v0.55.0):** all six (the katana, both sheets and the Katana, More Blades and
Wide Blade icons), generated with Gemini and saved from it as `.jfif` (JPEG), so they sit in
`art-source/` as `.jpg`. They came in 3:4 and 4:3 rather than 9:16 and 16:9; every piece is whole,
so nothing was regenerated. The katana's point lies a little left of its hilt (the blade's curve):
the game lays the hilt-to-point line along each cut. The first katana came out a dagger and the first
icons with the sword over the rim or a doubled rim; the prompts above carry the fixes.

**8–10. The Katana family's card pictures** (2026-10-16, the owner's call after v0.55.3). Like the
boulder family (§4.9: a heap of boulders, a big boulder with an arrow) and the curse family (§4.13:
the bell with an hourglass, three bells), every Katana pick shows **the red katana ball** with one
small addition that says what the pick does; the Katana's own card stays the plain ball. They
replace the icon-kit icons 4–6. They are card pictures: no medallion, the subject alone on white
(the game puts it in the card's medallion). Save them as `art-source/picks/<id>.png` (or
.jpg/.webp); a picture there wins over the ball (`ui/pickArt.ts`). One at a time, each checked
before the next, in a new chat each time: Quick Katana, then More Blades, then Wide Blade.

**8. Quick Katana** (`picks/quickKatana.png`, square 1:1): katanas come more often. Attach the
katana's ball (`art-source/specials/katana-ball.jpg`) and the Quick Curse picture
(`art-source/picks/quickCurse.jpg`, only for its hourglass):

```text
Style: match the attached images exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached images only show what the two things look like. A small
game picture of two things:
1. The first attached image, the katana ball, exactly as it is: a perfect circle of glossy deep
   crimson-red lacquer with small gold wave arcs, and across its front the same katana, its gold
   guard and red hilt at the upper right and its silver blade pointing to the lower left. Same
   colours, same sword, same size of sword on the ball. It fills about 70% of the canvas width,
   slightly up and to the left of the centre.
2. In front of the ball at its lower right, overlapping the ball's edge, a small wooden hourglass
   drawn like the one in the second attached image (ignore that image's bell, cord and flames),
   standing upright, about a third of the ball's height. Its sand is gold, not purple: most of it
   has already run into the bottom bulb and a thin stream is still falling.
The hourglass does not cover the katana's blade or hilt. Both are fully visible with complete
outlines, and nothing touches the edge of the image. No frame, no circle around them, no
medallion, no ground, no flames, no glow, no sparkles, nothing else. Square 1:1.
```

Checks: the ball is the attached one (crimson, gold waves, the same diagonal katana, a closed
circle); the hourglass is small, wooden, upright, with gold sand, at the lower right in front of
the ball and clear of the sword; no bell, no purple, no flames; plain white around.

**Arrived (2026-10-16, v0.55.4):** from the first generation, saved from Gemini as `.jfif` and copied in as
`picks/quickKatana.jpg`. Every check passes; on the card the hourglass still reads at 48 px.

**9. More Blades** (`picks/moreBlades.png`, square 1:1): more katanas in every cut. The katana
ball with the old More Blades icon's three crossed katanas on its front instead of its one: the
ball's own outline, nothing outside it. Attach the katana's ball
(`art-source/specials/katana-ball.jpg`) and the old icon (`art-source/icons/moreBlades.jpg`, only for
its three swords):

```text
Style: match the attached images exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached images only show what the two things look like. A small
game picture of one ball: the first attached image, the katana ball, the same perfect circle of
glossy deep crimson-red lacquer with small gold wave arcs and the same glossy highlight at the
upper left, filling about 80% of the canvas. Only one thing changes: instead of the single katana
across its front, it carries the three crossed katanas from the second attached image, in the
same arrangement: one straight up and down in the middle, and two crossing it in an X, all three
with their gold guards and vermilion cord-wrapped hilts up and their silver points down, crossing
at the ball's centre. Take only the three swords from the second image: not its cream disc, not
its gold rim. The three swords lie on the red ball, each with its own dark-brown outline, and all
three, hilts and points included, stay wholly inside the ball's circle with a clear gap of red
between them and the ball's edge. Each is a long, slender katana, never a dagger. Nothing sticks
out of the circle: the outline of the picture is the ball's circle alone. No frame, no extra
circle or rim, no medallion, no ground, no glow, no sparkles, no motion lines, nothing else.
Square 1:1.
```

Checks: one red ball, the attached ball's colour, waves and highlight; on it exactly three katanas
(one vertical, two in an X), hilts up, all wholly inside the circle; no cream disc, no gold rim,
nothing outside the ball; plain white around.

**Two tries rejected (2026-10-16):** the first design put two more katanas crossed behind the ball
like a shield. The tool drew the X at 45° both times, whatever the prompt asked, so one back
katana ran parallel to the ball's own; in the first the ball's katana also grew out of the circle
onto a back katana's guard. The design above keeps everything on the ball.

**Arrived (2026-10-16, v0.55.5):** the third try, saved from Gemini as `.jfif` and copied in as
`picks/moreBlades.jpg`. Every check passes. It is a little softer than the ball it was drawn from
(an edit of an edit: its wave arcs and outlines measure about 30% less sharp), but the card shows it
at 240 px, where it looks as crisp as Quick Katana's on a 3× phone screen, so it was kept.

**10. Wide Blade** (`picks/wideBlade.png`, square 1:1): a wider cut. Made like More Blades' picture,
which came out right: the katana ball with a different sword on its front, everything on the ball.
The sword is the game's own katana, thickened. Attach the katana's ball
(`art-source/specials/katana-ball.jpg`) and the katana (`art-source/specials/katana.jpg`):

```text
Style: match the attached images exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow.
No text, no letters, no numbers, no kanji, no watermark, no signature.

Draw a brand-new picture; the attached images only show what the two things look like. A small
game picture of one ball: the first attached image, the katana ball, the same perfect circle of
glossy deep crimson-red lacquer with small gold wave arcs and the same glossy highlight at the
upper left, filling about 80% of the canvas. Only one thing changes: instead of the diagonal
katana across its front, it carries the second attached katana standing straight up and down in
the middle of the ball, its hilt at the top and its point at the bottom, and made much thicker:
its blade about three times as wide as the attached katana's, a big, heavy, broad blade. It stays
a real katana in every other way: the same single-edged blade with its gentle even curve along
the whole length, the same angled katana tip, the same soft wavy white temper line along its
edge, the same gold paw-print collar, small oval gold guard and vermilion cord-wrapped hilt with a
gold cap. Only the blade's width changes; it never becomes a straight knife, a cleaver or a
dagger: the blade is about three times as long as the hilt, and the whole sword reaches from near
the top of the ball to near its bottom. Beside the blade, at its middle, one small chunky gold
arrow on each side, with a dark-brown outline, pointing outward, away from the blade: one to the
left, one to the right. The sword and the arrows lie on the red ball, each with its own dark-brown
outline, and stay wholly inside the ball's circle with a clear gap of red between them and the
ball's edge. Nothing sticks out of the circle: the outline of the picture is the ball's circle
alone. No frame, no extra circle or rim, no medallion, no ground, no glow, no sparkles, no motion
lines, nothing else. Square 1:1.
```

Checks: one red ball, the attached ball's colour, waves and highlight; on it one vertical katana,
hilt up, clearly a katana (gentle curve, angled tip, temper line, blade about three times the
hilt) with a clearly broad blade, never a straight knife; two gold arrows at the blade's sides
pointing outward; all inside the circle; nothing outside the ball; plain white around.

**First try (2026-10-16), rejected by the owner:** made from the old Wide Blade icon's sword, it
came out a straight, broad knife with a long hilt (blade about twice the hilt): too thin for a
wide blade and not a katana's shape. The prompt above starts from the game's katana instead and
only widens its blade.

**Second round (2026-10-16), two generations of the prompt above, neither taken:** one came out the
straight broad knife again (blade about 94 px wide on the 1024 px image, no curve, a long hilt);
the other kept the katana's curve and angled tip but its blade is only about 70 px wide, thinner
than the first try (about 90 px) that the owner found too thin, and its arrows are small. The
tool turns a wide blade into a knife when asked for a width in multiples, so the fix is an edit
of the second one in its own chat, sized against its own guard:

```text
Keep this picture exactly as it is: the same red ball, the same katana with the same hilt, guard,
curve and angled tip, the same place and length. Change only two things:
1. Make the katana's blade much wider: nearly as wide as its gold guard, about twice as wide as it
   is now, along its whole length. Keep the blade's gentle curve, its single cutting edge with the
   wavy white temper line and its angled katana tip: it must stay clearly a katana, never a
   straight knife, a cleaver or a dagger.
2. Make the two gold arrows about one and a half times as big, still pointing outward on each side
   of the blade at its middle, with a small gap to the blade and to the ball's edge.
Everything stays inside the ball's circle. Nothing else changes.
```

## 5. Icon kit (every new icon)

> Read this before writing a prompt for any new icon: an upgrade, a trial or blessing card, a
> setting, a new special ball's card. It keeps every icon in the game one family.

**The family.** Every icon is a **round medallion**, drawn like the four upgrade icons cut from the
approved Upgrades mockup (`ui/upgrade-icons.png`, §4.9):

- a perfect circle: a cream face (#fff6e7) inside a gold rim, with the game's thick warm dark-brown
  outline round it (never black);
- the rim as in the reference sheet: a wide gold band, the dark-brown outline only on its outside,
  and a thin light-tan line (never dark brown) where it meets the cream face; when a generated icon
  gets a thinner rim or a dark inner line, ask for this in words (the first More Blades icon did);
- inside, one subject, big and centred, filling most of the face: a Japanese lucky charm or a piece
  of the game (a paw, a koban, a tai fish, an omamori, a daruma, the game's own balls);
- the game's cel shading: soft pastel gradients, one small glossy highlight, light from the upper
  left;
- readable at 48 px: one clear shape, a few colours, no fine detail;
- no text, letters, numbers or kanji anywhere, not even on coins, charms or bags (they are blank);
- generated alone on plain white, one icon per image, square 1:1 (1024×1024).

**Rim variants.** The gold rim is the default (upgrades, blessings, anything good). Other kinds of
icon keep the medallion and change only the rim, named in the prompt below: trials (they make the
game harder) get a **cool grey stone rim**; more variants are added here when a mockup approves
them.

**References to attach.** Always the approved icon sheet (`art-source/ui/upgrade-icons.*`); for a
subject that is a game piece, its art too (a cat from `art-source/cats/`, a special ball from
`art-source/specials/`). Until the icon sheet exists, attach the Upgrades mockup
(`art-source/ui/upgrades-mockup.jpg`) instead.

**The prompt.** Fill in the three `<…>` parts and paste the whole block:

```text
Style: match the attached icons exactly. Polished casual mobile-game art, cute chibi kawaii
illustration, thick warm dark-brown outlines (never black) of even weight, soft pastel cel shading
with gentle gradients and one small glossy highlight, light from the upper left, clean crisp
vector-like edges, readable at 48 px.
Plain flat solid white background (#FFFFFF), no gradient, no texture, no checkerboard, no shadow
under the icon. No text, no letters, no numbers, no kanji, no watermark, no signature.

One round icon for the mobile game "Maneki Merge", drawn exactly like the attached icons: a
perfect circle, centred, filling about 80% of the canvas, with a cream face inside a
<gold / cool grey stone> rim and the same thick dark-brown outline round it. Inside, big and
centred: <the subject, e.g. "a red daruma doll with one eye painted in">. It stands for
<what the icon means in the game, e.g. "an extra life">. Any coin, charm or bag in it is blank.
Nothing sticks out of the circle. Square 1:1.
```

**Into the game.** Save the result as `art-source/icons/<id>.png` (or .jpg/.webp), where `<id>` is
the id the code uses (an upgrade's, a pick's, …), and tell Claude. The art pipeline (`npm run art`)
cuts the white, fits the medallion's circle and writes `public/assets/icons/<id>.webp`; a sheet like
`ui/upgrade-icons.png` is split into its named quarters the same way. Check each icon against §2 and
the list above; when one comes out wrong, fix the prompt and generate it again (Claude never
retouches the art).

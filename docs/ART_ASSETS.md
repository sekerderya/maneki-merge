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

| #   | Phase      | File (in `art-source/`)            | What                                                      | Generate          |
| --- | ---------- | ---------------------------------- | --------------------------------------------------------- | ----------------- |
| 0   | 0 style    | `style/lineup.png`                 | The 9 cats on one sheet (style lock, not used in game)    | 1:1, 1024×1024    |
| 1   | 1 cats     | `cats/size-01.png` … `size-09.png` | One cat per size (GAME_DESIGN §4)                         | 1:1, 1024×1024    |
| 2   | 2 scene    | `scene/background.png`             | Shrine garden behind and around the jar                   | 2:3, 1024×1536 ×2 |
| 2a  | 9 jars     | `scene/background-2` … `-5`        | The grown jars' backgrounds, a bigger place each (§4.10)  | 9:16              |
| 2b  | 10 clouds  | `transition/clouds.jpg`            | Sheet: the clouds for the growth transition (§4.11)       | 3:2, 1536×1024    |
| 3   | 2 scene    | `scene/jar.png`                    | Empty bamboo-framed glass jar, front view                 | 2:3, 1024×1536    |
| 4   | 2 scene    | `scene/rug.png`                    | Mint rug the jar stands on                                | 3:2, 1536×1024    |
| 5   | 2 scene    | `scene/paw.png`                    | Calico dropper arm hanging from the top                   | 2:3, 1024×1536    |
| 5a  | 2 scene    | `scene/noren-mockup.webp`          | Game screen with the noren, design reference (done)       | –                 |
| 5b  | 2 scene    | `scene/noren.jpg`                  | Noren curtain over the jar (v0.22–v0.24; gone in v0.25)   | 3:2, 1536×1024    |
| 6   | 3 HUD      | `hud/hud-kit.png`                  | Sheet: card, sunken well, pause button, NEXT bubble, …    | 1:1, 1024×1024    |
| 7   | 3 HUD      | `hud/icons.png`                    | Sheet: coin, paw badge, sparkle, petals, puff             | 1:1, 1024×1024    |
| 7a  | 3 HUD      | `hud/score-card.png`               | The whole score card, blank, copied from `ref-score.png`  | 3:2, 1536×1024    |
| 7b  | 3 HUD      | `hud/next-bubble.png`              | The round NEXT bubble, empty, copied from `ref-next.png`  | 1:1, 1024×1024    |
| 7c  | 3 HUD      | `hud/xp-empty`, `hud/xp-full`      | XP card, an edit of the score card (v0.25 only)           | 4:3, 1024×768     |
| 7b  | 4 menu     | `menu/mockup.jpg`                  | Whole main-menu screen, design reference (done)           | 2:3, 1024×1536    |
| 7c  | 4 menu     | `menu/background.png`              | Menu garden, the mockup without UI, logo and cat          | 2:3, 1024×1536    |
| 8   | 4 menu     | `menu/logo.png`                    | "Maneki Merge" logo (the only image with text)            | 3:2, 1536×1024    |
| 9   | 4 menu     | `menu/hero.png`                    | Big golden maneki-neko on a pink cushion                  | 1:1, 1024×1024    |
| 9b  | 4 menu     | `menu/buttons.png`                 | Sheet: blank PLAY, UPGRADES, record card, gear, coin pill | 3:2, 1536×1024    |
| 9c  | 4 menu     | `menu/menu-icons.png`              | Sheet: torii, paw badge, arrow, coin, sparkles, petals    | 1:1, 1024×1024    |
| 9d  | 4 menu     | `menu/record-card.png`             | One empty record card with its sunken well                | 3:2, 1536×1024    |
| 10  | 4 menu     | `menu/ui-kit.png`                  | Sheet: PLAY, secondary button, panel, card, close, gear   | 3:2, 1536×1024    |
| 11  | 4 menu     | `menu/upgrade-icons.png`           | Sheet: 5 upgrade icons                                    | 3:2, 1536×1024    |
| 12  | 4 menu     | `menu/settings-icons.png`          | Sheet: sound, haptics, reduce motion, how to play         | 1:1, 1024×1024    |
| 13  | 4 menu     | `menu/banner.png`                  | Blank ribbon banner for "The shrine grows!" etc.          | 3:2, 1536×1024    |
| 14  | 5 app      | `app-icon.png`                     | App icon                                                  | 1:1, 1024×1024    |
| 15  | 6 doors    | `doors/picture.png`                | Stage-door picture, cut into four strips by the game      | 9:16              |
| 16  | 6 doors    | `doors/panel.png`                  | One empty door frame, laid over each strip                | 2:3, 1024×1536    |
| 17  | 7 specials | `specials/magnet.png`              | The magnet token (in the paw and NEXT)                    | 1:1, 1024×1024    |
| 18  | 7 specials | `specials/hanabi.png`              | The firework ball                                         | 1:1, 1024×1024    |
| 19  | 7 specials | `specials/joker.png`               | The joker cat, a rainbow maneki-neko in a jester hat      | 1:1, 1024×1024    |
| 20  | 7 specials | `specials/boulders.png`            | Sheet: the boulder with 0, 1, 2 and 3 iron bands          | 1:1, 1024×1024    |
| 21  | 8 screens  | `ui/upgrades-mockup.png`           | Whole Upgrades screen, design reference (approved)        | 9:16 or 2:3       |
| 21a | 8 screens  | `ui/upgrade-icons.png`             | Sheet: the four upgrade icons, the icon kit's style (§5)  | 1:1, 1024×1024    |
| 21b | 8 screens  | `ui/upgrade-pieces.png`            | Sheet: empty card, Buy button, title card, close button   | 3:2, 1536×1024    |
| 22  | 8 screens  | `ui/trial-mockup.png`              | Trial pick over the shut doors, design reference          | 9:16 or 2:3       |
| 23  | 8 screens  | `ui/blessing-mockup.png`           | Blessing pick, an edit of the trial mockup                | 9:16 or 2:3       |

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

### 4.6 Phase 5: app icon

```text
A mobile app icon: the face and raised paw of cat number 9 (Kin, the golden maneki-neko) from the
attached lineup sheet, big and centered, with its red collar and gold bell, on a soft cream and
sakura-pink background filling the whole square. Keep everything important inside the centre 80%
(the corners get rounded and cropped). No text. Square 1:1.
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

## 5. Icon kit (every new icon)

> Read this before writing a prompt for any new icon: an upgrade, a trial or blessing card, a
> setting, a new special ball's card. It keeps every icon in the game one family.

**The family.** Every icon is a **round medallion**, drawn like the four upgrade icons cut from the
approved Upgrades mockup (`ui/upgrade-icons.png`, §4.9):

- a perfect circle: a cream face (#fff6e7) inside a gold rim, with the game's thick warm dark-brown
  outline round it (never black);
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

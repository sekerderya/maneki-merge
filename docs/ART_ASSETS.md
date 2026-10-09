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

| #   | Phase   | File (in `art-source/`)            | What                                                      | Generate          |
| --- | ------- | ---------------------------------- | --------------------------------------------------------- | ----------------- |
| 0   | 0 style | `style/lineup.png`                 | The 9 cats on one sheet (style lock, not used in game)    | 1:1, 1024×1024    |
| 1   | 1 cats  | `cats/size-01.png` … `size-09.png` | One cat per size (size 10 reuses size 1, GAME_DESIGN §4)  | 1:1, 1024×1024    |
| 2   | 2 scene | `scene/background.png`             | Shrine garden behind and around the jar                   | 2:3, 1024×1536 ×2 |
| 3   | 2 scene | `scene/jar.png`                    | Empty bamboo-framed glass jar, front view                 | 2:3, 1024×1536    |
| 4   | 2 scene | `scene/rug.png`                    | Mint rug the jar stands on                                | 3:2, 1536×1024    |
| 5   | 2 scene | `scene/paw.png`                    | Calico dropper arm hanging from the top                   | 2:3, 1024×1536    |
| 5a  | 2 scene | `scene/noren-mockup.webp`          | Game screen with the noren, design reference (done)       | –                 |
| 5b  | 2 scene | `scene/noren.jpg`                  | Noren curtain over the jar; the paw reaches out under it  | 3:2, 1536×1024    |
| 6   | 3 HUD   | `hud/hud-kit.png`                  | Sheet: card, sunken well, pause button, NEXT bubble, …    | 1:1, 1024×1024    |
| 7   | 3 HUD   | `hud/icons.png`                    | Sheet: coin, paw badge, sparkle, petals, puff             | 1:1, 1024×1024    |
| 7a  | 3 HUD   | `hud/score-card.png`               | The whole score card, blank, copied from `ref-score.png`  | 3:2, 1536×1024    |
| 7b  | 3 HUD   | `hud/next-bubble.png`              | The round NEXT bubble, empty, copied from `ref-next.png`  | 1:1, 1024×1024    |
| 7b  | 4 menu  | `menu/mockup.jpg`                  | Whole main-menu screen, design reference (done)           | 2:3, 1024×1536    |
| 7c  | 4 menu  | `menu/background.png`              | Menu garden, the mockup without UI, logo and cat          | 2:3, 1024×1536    |
| 8   | 4 menu  | `menu/logo.png`                    | "Maneki Merge" logo (the only image with text)            | 3:2, 1536×1024    |
| 9   | 4 menu  | `menu/hero.png`                    | Big golden maneki-neko on a pink cushion                  | 1:1, 1024×1024    |
| 9b  | 4 menu  | `menu/buttons.png`                 | Sheet: blank PLAY, UPGRADES, record card, gear, coin pill | 3:2, 1536×1024    |
| 9c  | 4 menu  | `menu/menu-icons.png`              | Sheet: torii, paw badge, arrow, coin, sparkles, petals    | 1:1, 1024×1024    |
| 9d  | 4 menu  | `menu/record-card.png`             | One empty record card with its sunken well                | 3:2, 1536×1024    |
| 10  | 4 menu  | `menu/ui-kit.png`                  | Sheet: PLAY, secondary button, panel, card, close, gear   | 3:2, 1536×1024    |
| 11  | 4 menu  | `menu/upgrade-icons.png`           | Sheet: 5 upgrade icons                                    | 3:2, 1536×1024    |
| 12  | 4 menu  | `menu/settings-icons.png`          | Sheet: sound, haptics, reduce motion, how to play         | 1:1, 1024×1024    |
| 13  | 4 menu  | `menu/banner.png`                  | Blank ribbon banner for "The shrine grows!" etc.          | 3:2, 1536×1024    |
| 14  | 5 app   | `app-icon.png`                     | App icon                                                  | 1:1, 1024×1024    |

How the pieces go into the game:

- **Cats**: `ArtSkin` (BallSkin) replaces the vector `CatSkin` as the default; the vector cats stay
  behind `?skin=vector`, the placeholder behind `?skin=placeholder`. The hit circle is measured from
  the art so touching cats touch on screen. Cats roll. The cats show no numbers (the owner's call).
- **Jar**: sliced into posts, bottom curve, rail and caps (9-slice), so it fits the physics walls
  exactly and still animates during the stage zoom. The glass tint and the dashed danger line stay
  in code.
- **Background**: anchored to the jar's floor line, scaled with the jar; extra sky is added on tall
  screens, so the top of the image must be plain sky.
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

Size 1 is also drawn as each stage's biggest cat (size 10), so it must look good at 1024 px too.

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

**Noren** (`scene/noren.png`, **done (2026-10-09), in the game in v0.22**; its rod came out tan and
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

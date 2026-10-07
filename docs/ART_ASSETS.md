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

| #   | Phase   | File (in `art-source/`)            | What                                                     | Generate          |
| --- | ------- | ---------------------------------- | -------------------------------------------------------- | ----------------- |
| 0   | 0 style | `style/lineup.png`                 | The 9 cats on one sheet (style lock, not used in game)   | 1:1, 1024×1024    |
| 1   | 1 cats  | `cats/size-01.png` … `size-09.png` | One cat per size (size 10 reuses size 1, GAME_DESIGN §4) | 1:1, 1024×1024    |
| 2   | 2 scene | `scene/background.png`             | Shrine garden behind and around the jar                  | 2:3, 1024×1536 ×2 |
| 3   | 2 scene | `scene/jar.png`                    | Empty bamboo-framed glass jar, front view                | 2:3, 1024×1536    |
| 4   | 2 scene | `scene/rug.png`                    | Mint rug the jar stands on                               | 3:2, 1536×1024    |
| 5   | 2 scene | `scene/paw.png`                    | Calico dropper arm hanging from the top                  | 2:3, 1024×1536    |
| 6   | 3 HUD   | `hud/hud-kit.png`                  | Sheet: card, sunken well, pause button, NEXT bubble, …   | 1:1, 1024×1024    |
| 7   | 3 HUD   | `hud/icons.png`                    | Sheet: coin, paw badge, sparkle, petals, puff            | 1:1, 1024×1024    |
| 8   | 4 menu  | `menu/logo.png`                    | "Maneki Merge" logo (the only image with text)           | 3:2, 1536×1024    |
| 9   | 4 menu  | `menu/hero.png`                    | Big golden maneki-neko on a pink cushion                 | 1:1, 1024×1024    |
| 10  | 4 menu  | `menu/ui-kit.png`                  | Sheet: PLAY, secondary button, panel, card, close, gear  | 3:2, 1536×1024    |
| 11  | 4 menu  | `menu/upgrade-icons.png`           | Sheet: 5 upgrade icons                                   | 3:2, 1536×1024    |
| 12  | 4 menu  | `menu/settings-icons.png`          | Sheet: sound, haptics, reduce motion, how to play        | 1:1, 1024×1024    |
| 13  | 4 menu  | `menu/banner.png`                  | Blank ribbon banner for "The shrine grows!" etc.         | 3:2, 1536×1024    |
| 14  | 5 app   | `app-icon.png`                     | App icon                                                 | 1:1, 1024×1024    |

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

### 4.4 Phase 3: HUD

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

### 4.5 Phase 4: menu

**Logo** (`menu/logo.png`):

```text
A cute mobile-game logo that reads exactly "Maneki Merge" (two words, spelled exactly like that),
chunky rounded bubbly letters in warm cream with a thick dark-brown outline and a soft pink-orange
gradient, a small gold bell hanging from the letter "M", a few sakura petals around. Plain flat
white background. Landscape 3:2, the logo as wide as the canvas. The text must be spelled correctly.
```

**Hero** (`menu/hero.png`): attach the lineup sheet too.

```text
Cat number 9 (Kin, the golden maneki-neko) from the attached lineup sheet, drawn larger and more
detailed as the main-menu hero: sitting on a plump pink silk cushion with gold tassels, raised
beckoning paw, red bib with gold trim, big gold bell, sakura flower on one ear, happy face. Front
view, centered. Plain flat solid white background, no floor shadow. Square 1:1.
```

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

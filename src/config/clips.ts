/**
 * The how-it-works clips (GAME_DESIGN §2.5; docs/plans/batch-21.md): short looping videos of
 * the game, recorded by `npm run clips` (tools/clips/scenes.ts) into `public/clips/<id>.mp4` with a
 * poster `<id>.webp`. A card whose effect can't be guessed from its line has a button that plays
 * its clip; one clip serves every card about the same thing.
 */
import type { PickId } from './picks';
import type { UpgradeId } from './upgrades';

export const CLIP_IDS = [
  'magnet',
  'boulder',
  'boulderIntro',
  'ironBands',
  'golden',
  'hanabi',
  'joker',
  'lightning',
  'windRight',
  'windLeft',
  'heavyDrop',
  'porcelain',
  'curse',
  'hubris',
  'echo',
  'copycat',
  'dice',
  'combo',
  'luckySave',
] as const;

export type ClipId = (typeof CLIP_IDS)[number];

/** Where the clips are, under the app's base. */
export const CLIP_DIR = 'clips/';

/** The line under each clip (live text, so it stays sharp and can be translated). */
export const CLIP_CAPTIONS: Readonly<Record<ClipId, string>> = {
  magnet: 'Tap a cat, then Take: it goes back to the paw and you drop it again.',
  boulder: 'Boulders never merge. A merge right beside one breaks it.',
  boulderIntro:
    'Now and then the paw drops a boulder. It never merges: merge two cats right beside it to break it.',
  ironBands: 'Each band takes one more merge beside the boulder.',
  golden: 'A golden cat merges two sizes up: two 3s make a 5.',
  hanabi: 'It goes off a second after it lands: small cats pop into coins, big ones get a push.',
  joker: 'The joker merges with the first cat it touches and makes it one size bigger.',
  lightning:
    'It strikes the first cat it touches and every cat of that size: they all pop into coins.',
  windRight: 'The wind pushes falling cats sideways, more at every level. Landed cats stay put.',
  windLeft: 'The wind pushes falling cats sideways, more at every level. Landed cats stay put.',
  heavyDrop: 'Cats shoot out of the paw, fall faster and knock aside the cat they land on.',
  porcelain:
    'A merge can crack the cats beside it. A cat cracked twice breaks into two smaller cats.',
  curse: 'A cursed cat turns to stone after a few drops. Merge it in time for double coins.',
  hubris: 'Three small cats that touch merge at once and skip a size. Two wait a moment first.',
  echo: 'Merging sizes 5–7 leaves a cat of their size behind, once per drop.',
  copycat: 'The cat in NEXT copies the size of your last merge, up to size 4.',
  dice: 'Every merge rolls a die: sometimes a size more, sometimes it fizzles into one cat.',
  combo:
    'Merges within a second of each other build a combo. Combo Charm makes every step pay more.',
  luckySave:
    'When the jar overflows, a Lucky Save pops the cats over the line and the six smallest instead.',
};

/** The clip a pick card opens; Wind's follows the run's wind. Null: the card has none. */
export function pickClip(id: PickId, windLeft = false): ClipId | null {
  switch (id) {
    case 'moreMagnets':
      return 'magnet';
    case 'moreBoulders':
    case 'bigBoulders':
      return 'boulder';
    case 'ironBands':
      return 'ironBands';
    case 'goldenCats':
      return 'golden';
    case 'hanabi':
    case 'joker':
    case 'lightning':
    case 'heavyDrop':
    case 'porcelain':
    case 'hubris':
    case 'echo':
    case 'copycat':
    case 'dice':
      return id;
    case 'wind':
      return windLeft ? 'windLeft' : 'windRight';
    case 'cursedBell':
    case 'quickCurse':
    case 'moreCurses':
      return 'curse';
    // The Katana's clip comes once its look is in the game.
    case 'bigDrops':
    case 'katana':
    case 'moreBlades':
    case 'quickKatana':
    case 'wideBlade':
      return null;
  }
}

/** The clip a shop card opens. Null: the card has none (Lucky Paw, Big Catch, Big Drops). */
export function upgradeClip(id: UpgradeId): ClipId | null {
  switch (id) {
    case 'comboCharm':
      return 'combo';
    case 'secondChance':
      return 'luckySave';
    case 'goldenCats':
    case 'moreMagnets':
    case 'hanabi':
    case 'joker':
    case 'bigDrops':
    case 'lightning':
      return pickClip(id);
    case 'luckyPaw':
    case 'bigCatch':
    case 'katana':
      return null;
  }
}

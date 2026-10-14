/**
 * The debug sound board (`?debug=1` → DBG → Sounds, GAME_DESIGN §12): every sound with an "Old"
 * (classic set) and a "New" (soft set) button, to compare them on a phone, and a switch for the
 * set the game itself plays until the page reloads (`?sfx=` keeps it across reloads).
 */
import { SOUND_SETS } from '../config/audio';
import type { SoundName, SoundSetId } from '../config/audio';
import type { AudioEngine } from '../audio';
import { button, el } from '../ui/dom';

/** One play of a sound: when (seconds after the tap) and its value (size, combo, seconds left). */
type Hit = readonly [delayS: number, value: number];

interface BoardEntry {
  readonly name: SoundName;
  readonly when: string;
  /** Several hits show how the sound changes with its value; default: one hit at 0. */
  readonly hits?: readonly Hit[];
}

const ENTRIES: readonly BoardEntry[] = [
  { name: 'drop', when: 'A cat leaves the paw' },
  {
    name: 'merge',
    when: 'Two cats merge (sizes 2, 5, 9)',
    hits: [
      [0, 2],
      [0.4, 5],
      [0.8, 9],
    ],
  },
  { name: 'coin', when: 'Coins from a merge' },
  {
    name: 'combo',
    when: 'Combo ×2 to ×7',
    hits: [2, 3, 4, 5, 6, 7].map((combo, i) => [i * 0.18, combo] as const),
  },
  { name: 'jackpot', when: 'Jackpot, stage clear' },
  { name: 'whoosh', when: 'The jar grows' },
  { name: 'chime', when: 'New stage, Lucky Save' },
  {
    name: 'dangerTick',
    when: 'Danger countdown 3, 2, 1',
    hits: [3, 2, 1].map((s, i) => [i * 0.6, s] as const),
  },
  { name: 'gameOver', when: 'Game over' },
  { name: 'click', when: 'Any button' },
  { name: 'purchase', when: 'Buying in the shop' },
  { name: 'take', when: 'The magnet catches a cat' },
  { name: 'clang', when: 'A boulder loses a band' },
  { name: 'crunch', when: 'A boulder crumbles' },
  { name: 'boom', when: 'A hanabi goes off' },
  { name: 'thud', when: "Heavy Drop's fireball lands" },
  { name: 'tink', when: 'A porcelain cat cracks' },
  { name: 'shatter', when: 'A cracked cat breaks' },
  { name: 'echo', when: 'An echo cat appears' },
  { name: 'curse', when: 'A curse begins' },
  { name: 'grind', when: 'A cursed cat turns to stone' },
  { name: 'clack', when: 'A die fizzles a merge' },
  { name: 'thunder', when: 'A lightning strike' },
];

const SET_LABEL: Readonly<Record<SoundSetId, string>> = { classic: 'Old', soft: 'New' };

/** Builds the board (hidden) and returns a function that opens it. */
export function createSoundBoard(audio: AudioEngine): () => void {
  const board = el('div', 'sound-board');
  board.dataset['testid'] = 'sound-board';
  // The board's buttons play their own sounds, not the click.
  board.dataset['sfx'] = 'none';
  board.hidden = true;

  const play = (set: SoundSetId, entry: BoardEntry): void => {
    for (const [delay, value] of entry.hits ?? [[0, 0]]) {
      window.setTimeout(() => audio.preview(set, entry.name, value), delay * 1000);
    }
  };

  const head = el('div', 'sound-board-head');
  const gameSet = el('div', 'sound-board-sets');
  const setButtons = SOUND_SETS.map((set) => {
    const node = button('debug-btn', `Game: ${SET_LABEL[set]}`);
    node.addEventListener('click', () => {
      audio.setSoundSet(set);
      sync();
    });
    return [set, node] as const;
  });
  const sync = (): void => {
    for (const [set, node] of setButtons) node.classList.toggle('is-on', set === audio.set);
  };
  gameSet.append(...setButtons.map(([, node]) => node));
  const close = button('debug-btn', 'Close');
  close.addEventListener('click', () => {
    board.hidden = true;
  });
  head.append(gameSet, close);

  const list = el('div', 'sound-board-list');
  for (const entry of ENTRIES) {
    const row = el('div', 'sound-board-row');
    const label = el('div', 'sound-board-label');
    label.append(el('b', '', entry.name), el('span', '', entry.when));
    row.append(label);
    for (const set of ['classic', 'soft'] as const) {
      const node = button(`debug-btn sound-board-${set}`, SET_LABEL[set]);
      node.addEventListener('click', () => play(set, entry));
      row.append(node);
    }
    list.append(row);
  }

  board.append(head, list);
  document.body.append(board);
  return () => {
    sync();
    board.hidden = false;
  };
}

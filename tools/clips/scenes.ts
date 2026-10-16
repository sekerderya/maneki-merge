/**
 * The scripted scenes behind the how-it-works clips (docs/plans/batch-21.md §5). Each one sets up
 * a run through the debug hooks (`setup`, not recorded) and then plays the moment the clip shows
 * (`play`, recorded). Sizes are the stage's sizes (1 = its smallest cat); x is in world units
 * from the jar's centre (the jar is 600 wide, so ±300 are its walls; the floor is y = 0).
 *
 * Functions passed to `scene.game` run in the page: they can only use their arguments.
 */
import type { PickId } from '../../src/config/picks.ts';
import type { Scene } from './recorder.ts';

export interface ClipScene {
  readonly id: string;
  readonly seed: number;
  setup(scene: Scene): Promise<void>;
  play(scene: Scene): Promise<void>;
}

/** A cat's radius by size (GAME_DESIGN §4): 41 × 1.19^(size − 1), rounded. */
const R = [0, 41, 49, 58, 69, 82, 98, 117, 139] as const;

/** World x that lays a cat of `size` against the left (−1) or right (1) wall. */
const atWall = (side: -1 | 1, size: number): number => side * (300 - R[size]! - 1);

/** Puts a cat of `size` (golden if asked) in the paw. */
function give(scene: Scene, size: number, golden = false): Promise<void> {
  return scene.game((g, [s, gold]) => g.giveCat(g.state().firstTier + s - 1, gold), [
    size,
    golden,
  ] as const);
}

function setPick(scene: Scene, id: PickId, level: number): Promise<void> {
  return scene.game((g, [pick, l]) => g.setPickLevel(pick, l), [id, level] as const);
}

/** A boulder of `size` needing `hits` merges, dropped at x (it lands in the setup). */
function boulder(scene: Scene, x: number, size: number, hits: number): Promise<void> {
  return scene.game((g, [at, s, h]) => g.spawnBoulder(at, s, h), [x, size, hits] as const);
}

/** The id of the newest ball in the jar. */
function newest(scene: Scene): Promise<number> {
  return scene.game((g) => g.balls().at(-1)!.id);
}

/** The Lucky Save scene's drop that stays over the line (measured: the first six roll off). */
const LUCKY_SAVE_DROP = 7;

/**
 * A 2 onto the top of the pile, then time while its countdown runs (up to 2.8 s; it stops when no
 * cat is over the line any more).
 */
async function pileDrop(scene: Scene): Promise<void> {
  const x = await scene.game((g) => {
    const top = [...g.balls()].sort((p, q) => p.y - p.radius - (q.y - q.radius))[0]!;
    return Math.max(-240, Math.min(240, top.x));
  });
  await scene.dragDrop(x, { ms: 450, holdMs: 100, then: () => give(scene, 2) });
  for (let t = 0; t < 4; t++) {
    await scene.advance(700);
    const { danger, luckySaves } = await scene.game((g) => g.state());
    if (!danger || luckySaves === 0) break;
  }
}

/** Shows the pointer resting at world (x, y) before the first move. */
async function pointerRest(scene: Scene, x: number, y: number): Promise<void> {
  const at = await scene.game((g, p) => g.screenPoint(p[0], p[1])!, [x, y] as const);
  await scene.pointerAtPoint(at.x, at.y);
}

export const SCENES: readonly ClipScene[] = [
  {
    id: 'magnet',
    seed: 7,
    async setup(scene) {
      await scene.play();
      // A 1 and a 2 against the left wall, a 3 in the middle, a lone 1 against the right wall.
      await scene.place(1, atWall(-1, 1));
      await scene.place(2, atWall(-1, 1) + R[1] + R[2]);
      await scene.place(3, 110);
      await scene.place(1, atWall(1, 1));
      await scene.advance(1500);
      await scene.game((g) => g.give('magnet'));
      await scene.advance(300);
    },
    async play(scene) {
      const lone = await newest(scene);
      await pointerRest(scene, 60, -330);
      await scene.advance(400);
      await scene.showPointer(true);
      await scene.tapBall(lone, 600);
      await scene.advance(450);
      await scene.tapTake(450);
      await scene.showPointer(false);
      await scene.advance(500);
      await scene.dragDrop(atWall(-1, 1), { ms: 700, holdMs: 150 });
      await scene.advance(2600);
    },
  },
  {
    id: 'boulder',
    seed: 11,
    async setup(scene) {
      await scene.play();
      // A bare boulder with a 2 just beside it; a 3 and a 1 further right.
      await boulder(scene, -40, 2, 1);
      await scene.place(2, -40 - R[2] - R[2] - 2);
      await scene.place(3, 140);
      await scene.place(1, atWall(1, 1));
      await scene.advance(1800);
      await give(scene, 2);
    },
    async play(scene) {
      await scene.advance(500);
      await scene.dragDrop(-40 - 2 * R[2] - 2, { ms: 650 });
      await scene.advance(2400);
    },
  },
  {
    // The card that brings boulders in at stage 2 (GAME_DESIGN §15.3): one drops from the paw like
    // a cat, then a merge right beside it breaks it.
    id: 'boulderIntro',
    seed: 14,
    async setup(scene) {
      await scene.play();
      // A 2 on the left, a 3 and a 1 on the right; a bare boulder in the paw.
      await scene.place(2, -150);
      await scene.place(3, 150);
      await scene.place(1, atWall(1, 1));
      await scene.advance(1500);
      await scene.game((g) => g.give('boulder'));
      await scene.advance(300);
    },
    async play(scene) {
      await scene.advance(500);
      // The boulder lands just right of the 2; the next 2 comes into the paw in the cooldown.
      await scene.dragDrop(-150 + 2 * R[2] + 6, { ms: 650, then: () => give(scene, 2) });
      await scene.advance(1300);
      // The 2 onto the 2: they merge right beside the boulder, which breaks.
      await scene.dragDrop(-150, { ms: 650 });
      await scene.advance(2600);
    },
  },
  {
    id: 'ironBands',
    seed: 12,
    async setup(scene) {
      await scene.play();
      // A boulder with one band (two merges), a 1 on each side of it. (With two bands the third
      // merge's new cat grows away from the boulder, out of its reach.)
      await boulder(scene, 0, 2, 2);
      await scene.place(1, -(R[2] + R[1] + 4));
      await scene.place(1, R[2] + R[1] + 4);
      await scene.advance(1800);
      await give(scene, 1);
    },
    async play(scene) {
      const side = R[2] + R[1] + 4;
      await scene.advance(400);
      // The first merge knocks the band off; the second breaks the bare boulder.
      await scene.dragDrop(-side, { ms: 500, then: () => give(scene, 1) });
      await scene.advance(1000);
      await scene.dragDrop(side, { ms: 700 });
      await scene.advance(2400);
    },
  },
  {
    id: 'golden',
    seed: 13,
    async setup(scene) {
      await scene.play();
      await scene.place(3, -150);
      await scene.place(1, 60);
      await scene.place(2, 170);
      await scene.advance(1500);
      await give(scene, 3, true);
    },
    async play(scene) {
      await scene.advance(600);
      await scene.dragDrop(-150, { ms: 600 });
      await scene.advance(2600);
    },
  },
  {
    id: 'hanabi',
    seed: 14,
    async setup(scene) {
      await scene.play();
      // A 6 on the left; small cats across the middle and right.
      await scene.place(6, atWall(-1, 6));
      await scene.place(2, -50);
      await scene.place(1, 42);
      await scene.place(3, 143);
      await scene.place(1, atWall(1, 1));
      await scene.advance(1800);
      await scene.game((g) => g.give('hanabi'));
    },
    async play(scene) {
      await scene.advance(500);
      await scene.dragDrop(10, { ms: 400 });
      await scene.advance(3600);
    },
  },
  {
    id: 'joker',
    seed: 15,
    async setup(scene) {
      await scene.play();
      await scene.place(1, atWall(-1, 1));
      await scene.place(4, -60);
      await scene.place(2, 140);
      await scene.advance(1500);
      await scene.game((g) => g.give('joker'));
    },
    async play(scene) {
      await scene.advance(500);
      await scene.dragDrop(-60, { ms: 500 });
      await scene.advance(2600);
    },
  },
  {
    // Three 3s apart on the floor, other sizes between them: the lightning lands on the middle 3,
    // chains to the other two, and all three pop.
    id: 'lightning',
    seed: 15,
    async setup(scene) {
      await scene.play();
      await scene.place(3, atWall(-1, 3));
      await scene.place(2, -130);
      await scene.place(3, -20);
      await scene.place(4, 110);
      await scene.place(3, atWall(1, 3));
      await scene.advance(1500);
      await scene.game((g) => g.give('lightning'));
    },
    async play(scene) {
      await scene.advance(500);
      await scene.dragDrop(-20, { ms: 450, then: () => give(scene, 1) });
      await scene.advance(2400);
    },
  },
  {
    // The aim sweeps over the jar, its rings showing what each line would cut; dropped beside the
    // 6, the sword cuts the 1 resting on it and the boulder under the 1, and leaves the 6 alone.
    id: 'katana',
    seed: 26,
    async setup(scene) {
      await scene.play();
      await setPick(scene, 'katana', 1);
      await scene.place(6, atWall(-1, 6));
      await boulder(scene, -50, 2, 1);
      await scene.place(3, 60);
      await scene.place(5, atWall(1, 5));
      await scene.advance(1500);
      // A 1 rolls onto the 6 and the boulder; a 2 into the valley between the 3 and the 5.
      await scene.game((g) => g.spawnTier(g.state().firstTier, -2));
      await scene.game((g) => g.spawnTier(g.state().firstTier + 1, 128));
      await scene.advance(2000);
      await scene.game((g) => g.give('katana'));
      await scene.advance(300);
    },
    async play(scene) {
      await scene.advance(400);
      await scene.dragDrop(-64, { ms: 800, via: [90], holdMs: 500 });
      await scene.advance(2600);
    },
  },
  {
    // A frog dropped into the jar eats the smallest cat (sizes 1–2) at every drop: five meals,
    // then it falls asleep and goes. The big cats are left alone.
    id: 'frog',
    seed: 27,
    async setup(scene) {
      await scene.play();
      await setPick(scene, 'frog', 1);
      // Five small cats across the floor, with room on the right for the frog.
      await scene.place(1, atWall(-1, 1));
      await scene.place(2, -150);
      await scene.place(1, -40);
      await scene.place(2, 90);
      await scene.place(1, atWall(1, 1));
      await scene.advance(1500);
      await scene.game((g) => g.give('frog'));
      await scene.advance(300);
    },
    async play(scene) {
      await scene.advance(400);
      await scene.dragDrop(180, { ms: 500, then: () => give(scene, 3) });
      await scene.advance(900);
      // Five quick drops of 3s and a 4, which the frog doesn't eat: a meal at each.
      const drops = [-150, -150, 20, 20, -150];
      const next = [3, 3, 3, 4];
      for (const [i, x] of drops.entries()) {
        const size = next[i];
        await scene.tapDrop(x, {
          ms: 320,
          then: async () => {
            if (size) await give(scene, size);
          },
        });
        await scene.advance(200);
      }
      await scene.showPointer(false);
      await scene.advance(2200);
    },
  },
  ...([1, -1] as const).map((direction): ClipScene => ({
    id: direction === 1 ? 'windRight' : 'windLeft',
    seed: 16,
    async setup(scene) {
      await scene.play();
      await scene.game((g, d) => g.setWind(d), direction);
      await setPick(scene, 'wind', 3);
      await scene.place(3, -170 * direction);
      await scene.advance(1500);
      await give(scene, 2);
    },
    async play(scene) {
      await scene.advance(700);
      await scene.dragDrop(-40 * direction, { ms: 400, then: () => give(scene, 1) });
      await scene.advance(1400);
      await scene.dragDrop(-40 * direction, { ms: 300 });
      await scene.advance(2200);
    },
  })),
  {
    id: 'heavyDrop',
    seed: 17,
    async setup(scene) {
      await scene.play();
      await setPick(scene, 'heavyDrop', 1);
      await scene.place(1, atWall(-1, 1));
      await scene.place(3, 0);
      await scene.place(1, atWall(1, 1));
      await scene.advance(1500);
      await give(scene, 2);
    },
    async play(scene) {
      await scene.advance(500);
      await scene.dragDrop(12, { ms: 400, then: () => give(scene, 1) });
      await scene.advance(1600);
      await scene.dragDrop(-120, { ms: 500 });
      await scene.advance(1800);
    },
  },
  {
    id: 'porcelain',
    seed: 18,
    async setup(scene) {
      await scene.play();
      // Level 0: no cracks by chance, only the two the scene forces at its merges.
      await scene.place(2, -(R[4] + R[2] + 1));
      await scene.place(4, 0);
      await scene.place(1, R[4] + R[1] + 1);
      await scene.advance(1500);
      await give(scene, 2);
    },
    async play(scene) {
      const four = await scene.game((g) => g.balls().find((b) => b.size === 4)!.id);
      const left = await scene.game((g) => g.balls().find((b) => b.size === 2)!.id);
      const right = await scene.game((g) => g.balls().find((b) => b.size === 1)!.id);
      await scene.advance(400);
      // The 2s merge beside the 4: it cracks.
      await scene.dragDrop(-(R[4] + R[2] + 1), { ms: 600, then: () => give(scene, 1) });
      await scene.advanceUntil((g, id) => !g.balls().some((b) => b.id === id), left, 2000);
      await scene.game((g, id) => g.crackCat(id), four);
      await scene.advance(1000);
      // The 1s merge beside it: the cracked 4 breaks into two 3s, which merge once apart.
      await scene.dragDrop(R[4] + R[1] + 1, { ms: 700 });
      await scene.advanceUntil((g, id) => !g.balls().some((b) => b.id === id), right, 2000);
      await scene.game((g, id) => g.crackCat(id), four);
      await scene.advance(3000);
    },
  },
  {
    id: 'curse',
    seed: 19,
    async setup(scene) {
      await scene.play();
      await setPick(scene, 'cursedBell', 1);
      await scene.place(3, -170);
      await scene.place(1, -50);
      await scene.place(2, 120);
      await scene.place(1, atWall(1, 1));
      await scene.advance(1500);
      const three = await scene.game((g) => g.balls().find((b) => b.size === 3)!.id);
      await scene.game((g, id) => g.curseCat(id, 2), three);
      await give(scene, 1);
    },
    async play(scene) {
      // Three drops elsewhere: the bell runs out and the cursed 3 turns to stone.
      await scene.advance(600);
      await scene.dragDrop(30, { ms: 500, then: () => give(scene, 1) });
      await scene.advance(700);
      await scene.dragDrop(atWall(1, 1), { ms: 600, then: () => give(scene, 2) });
      await scene.advance(700);
      // The paw gets the 2 for the last drop now, in the cooldown, where the swap doesn't show.
      await scene.dragDrop(-60, { ms: 600, then: () => give(scene, 2) });
      await scene.advance(1200);
      // A new curse on the 2, merged in time: double coins.
      const two = await scene.game(
        (g) => g.balls().find((b) => b.size === 2 && b.kind === 'cat')!.id,
      );
      await scene.game((g, id) => g.curseCat(id, 3), two);
      const x = await scene.game((g, id) => g.balls().find((b) => b.id === id)!.x, two);
      await scene.advance(900);
      await scene.dragDrop(x, { ms: 600 });
      await scene.advance(2400);
    },
  },
  {
    id: 'hubris',
    seed: 20,
    async setup(scene) {
      await scene.play();
      await setPick(scene, 'hubris', 1);
      // Two 2s with a gap between them; a 1 against the right wall.
      await scene.place(2, -120);
      await scene.place(2, -120 + 2 * R[2] + 14);
      await scene.place(1, atWall(1, 1));
      await scene.advance(1500);
      await give(scene, 2);
    },
    async play(scene) {
      await scene.advance(500);
      // The third 2 lands in the gap, touching both: the three make a 4 at once.
      await scene.dragDrop(-120 + R[2] + 7, { ms: 600, then: () => give(scene, 1) });
      await scene.advance(1300);
      // A pair waits half a second, then merges one size up.
      // Dropped against the wall, it lands on the 1 there and the wall keeps it on top, touching.
      // (Dropped beside it, it rolled off and stopped a few units away: no contact, no merge.)
      await scene.dragDrop(300 - R[1], { ms: 700 });
      await scene.advance(2600);
    },
  },
  {
    id: 'echo',
    seed: 21,
    async setup(scene) {
      await scene.play();
      await setPick(scene, 'echo', 1);
      // A 4 and, touching it, a 5: a 4 dropped on the 4 makes a 5, and the two 5s echo.
      await scene.place(4, -170);
      await scene.place(5, -170 + R[4] + R[5] + 1);
      await scene.place(1, atWall(1, 1));
      await scene.advance(1500);
      await give(scene, 4);
    },
    async play(scene) {
      await scene.advance(500);
      await scene.dragDrop(-170, { ms: 600 });
      await scene.advance(3200);
    },
  },
  {
    id: 'copycat',
    seed: 22,
    async setup(scene) {
      await scene.play();
      await setPick(scene, 'copycat', 1);
      await scene.place(3, -130);
      await scene.place(1, 60);
      await scene.place(2, 180);
      await scene.advance(1500);
      await give(scene, 3);
    },
    async play(scene) {
      const three = await scene.game((g) => g.balls().find((b) => b.size === 3)!.id);
      await scene.advance(600);
      await scene.dragDrop(-130, { ms: 600 });
      // At the merge NEXT pops to a 3: the finger shows it.
      await scene.advanceUntil((g, id) => !g.balls().some((b) => b.id === id), three, 3000);
      await scene.advance(250);
      await scene.pointAt('hud-next', 1000);
      // The paw's cat goes by the wall; then the copied 3 comes into the paw and drops too.
      await scene.dragDrop(atWall(-1, 1), { ms: 600 });
      await scene.advance(900);
      await scene.dragDrop(250, { ms: 900 });
      await scene.advance(1600);
    },
  },
  {
    id: 'dice',
    seed: 23,
    async setup(scene) {
      await scene.play();
      await setPick(scene, 'dice', 1);
      await scene.place(2, -170);
      await scene.place(3, 140);
      await scene.advance(1500);
      await give(scene, 2);
      await scene.game((g) => g.forceDice('lucky'));
    },
    async play(scene) {
      await scene.advance(500);
      // A lucky roll: two 2s make a 4. Then a fizzle: two 3s make one 3.
      await scene.dragDrop(-170, { ms: 550, then: () => give(scene, 3) });
      await scene.advance(1500);
      await scene.game((g) => g.forceDice('fizzle'));
      await scene.dragDrop(140, { ms: 800 });
      await scene.advance(2200);
    },
  },
  {
    id: 'combo',
    seed: 24,
    async setup(scene) {
      await scene.play();
      // Three pairs to make in quick taps.
      await scene.place(2, -200);
      await scene.place(3, -20);
      await scene.place(1, 120);
      await scene.place(2, 220);
      await scene.advance(1500);
      await give(scene, 2);
    },
    async play(scene) {
      await scene.advance(500);
      await scene.tapDrop(-200, { ms: 350, then: () => give(scene, 3) });
      await scene.advance(220);
      await scene.tapDrop(-20, { ms: 280, then: () => give(scene, 1) });
      await scene.advance(220);
      await scene.tapDrop(120, { ms: 280, then: () => give(scene, 2) });
      await scene.advance(220);
      await scene.tapDrop(220, { ms: 250 });
      await scene.showPointer(false);
      await scene.advance(2400);
    },
  },
  {
    id: 'luckySave',
    seed: 25,
    async setup(scene) {
      await scene.game((g) => g.setUpgrade('secondChance', 1));
      await scene.play();
      // Fill the jar with cats until the pile is near the rim but not over the line (y = −870).
      // Sizes up to 6: with 7s, merges made two 8s, the last cat, and cleared the stage.
      const sizes = [6, 5, 4, 6, 3, 5, 6, 4, 5, 3];
      for (let i = 0; i < 60; i++) {
        const top = await scene.game((g) => Math.min(0, ...g.balls().map((b) => b.y - b.radius)));
        if (top < -800) break;
        const size = sizes[i % sizes.length]!;
        const x = ((i * 137) % 400) - 200;
        await scene.game((g, [s, at]) => g.spawnTier(g.state().firstTier + s - 1, at), [
          size,
          x,
        ] as const);
        // A cat falls for about a second: measure the pile once it has landed.
        await scene.advance(1200);
      }
      await scene.advance(1500);
      const state = await scene.game((g) => g.state());
      if (state.runState !== 'playing' || state.danger) {
        throw new Error(`luckySave: the fill went too far (${state.runState})`);
      }
      // 2s (the fill has none to merge with) come onto the top of the pile. The first six roll
      // into gaps (the run is the same every time); the clip starts with the seventh, which stays
      // over the line.
      await give(scene, 2);
      await scene.advance(400);
      for (let drop = 0; drop < LUCKY_SAVE_DROP - 1; drop++) await pileDrop(scene);
      if (await scene.game((g) => g.state().luckySaves === 0)) {
        throw new Error('luckySave: the save came before the recording');
      }
    },
    async play(scene) {
      // Its countdown runs out, and the Lucky Save pops the cats over the line and the six smallest.
      await pileDrop(scene);
      await scene.advanceUntil((g) => g.state().luckySaves === 0, undefined, 3000);
      await scene.advance(2600);
    },
  },
];

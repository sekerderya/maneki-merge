/**
 * The scripted scenes behind the how-it-works clips (docs/plans/batch-21.md §5). Each one sets up
 * a run through the debug hooks (`setup`, not recorded) and then plays the moment the clip shows
 * (`play`, recorded). Sizes are the stage's sizes (1 = its smallest cat); x is in world units
 * from the jar's centre (the jar is 600 wide, so ±300 are its walls).
 */
import type { Scene } from './recorder.ts';

export interface ClipScene {
  readonly id: string;
  readonly seed: number;
  setup(scene: Scene): Promise<void>;
  play(scene: Scene): Promise<void>;
}

/** World x that lays a cat of radius r against the left (−1) or right (1) wall. */
const atWall = (side: -1 | 1, radius: number): number => side * (300 - radius - 1);

export const SCENES: readonly ClipScene[] = [
  {
    id: 'magnet',
    seed: 7,
    async setup(scene) {
      await scene.play();
      // A 1 and a 2 against the left wall, a 3 in the middle, a lone 1 against the right wall.
      await scene.place(1, atWall(-1, 41));
      await scene.place(2, atWall(-1, 41) + 41 + 49);
      await scene.place(3, 110);
      await scene.place(1, atWall(1, 41));
      await scene.advance(1500);
      await scene.game((g) => g.give('magnet'));
      await scene.advance(300);
    },
    async play(scene) {
      const lone = await scene.game((g) => {
        const ids = g.catIds();
        return ids[ids.length - 1]!;
      });
      const start = await scene.game((g) => g.screenPoint(60, -330)!);
      await scene.pointerAtPoint(start.x, start.y);
      await scene.advance(400);
      await scene.showPointer(true);
      await scene.tapBall(lone, 600);
      await scene.advance(450);
      await scene.tapTake(450);
      await scene.showPointer(false);
      await scene.advance(500);
      await scene.dragDrop(atWall(-1, 41), 700, 150);
      await scene.advance(2600);
    },
  },
];

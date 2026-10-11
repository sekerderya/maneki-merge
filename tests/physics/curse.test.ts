import { describe, expect, it } from 'vitest';
import {
  CURSE_DROPS,
  CURSE_FIRST_DROP,
  CURSE_INTERVALS,
  CURSE_MAX_SIZE,
} from '../../src/config/picks';
import type { PickId } from '../../src/config/picks';
import { stageInfo } from '../../src/config/stages';
import { sizeRadius, tierCoins } from '../../src/config/tiers';
import { coinPayout } from '../../src/core/economy';
import type { GameEvents } from '../../src/core/events';
import { decodeRunSave, RUN_SAVE_VERSION } from '../../src/core/runSave';
import type { RunSnapshot } from '../../src/core/runSave';
import { Rng } from '../../src/core/rng';
import { isOverLine } from '../../src/physics/danger';
import { RunController } from '../../src/run/RunController';
import { botMove, upgrades } from './fixtures';

/** A run with Cursed Bell (and these levels) that logs the curse's events. */
function setup(seed = 3, levels: Partial<Record<PickId, number>> = {}, secondChance = 0) {
  const run = new RunController({ seed, upgrades: upgrades({ secondChance }) });
  run.setPickLevel('cursedBell', 1);
  for (const [id, level] of Object.entries(levels)) run.setPickLevel(id as PickId, level);
  const log = {
    began: [] as GameEvents['curseBegan'][],
    ticked: [] as GameEvents['curseTicked'][],
    ended: [] as GameEvents['curseEnded'][],
    stones: [] as GameEvents['catPetrified'][],
    merges: [] as GameEvents['merged'][],
  };
  run.events.on('curseBegan', (e) => log.began.push(e));
  run.events.on('curseTicked', (e) => log.ticked.push(e));
  run.events.on('curseEnded', (e) => log.ended.push(e));
  run.events.on('catPetrified', (e) => log.stones.push(e));
  run.events.on('merged', (e) => log.merges.push(e));
  return { run, log };
}

/** Waits for the cooldown (and anything to land), then drops at `x`. */
function dropAt(run: RunController, x: number): void {
  for (let i = 0; i < 600 && !run.canDrop; i++) run.tick();
  expect(run.drop(x)).toBe(true);
}

/** Drops `n` balls spread over the jar, letting each settle a moment. */
function dropMany(run: RunController, n: number, seed = 1): void {
  const aim = new Rng(seed);
  for (let i = 0; i < n; i++) {
    for (let t = 0; t < 600 && !run.canDrop; t++) {
      if (run.canTake) run.take(run.balls.find((b) => run.takeable(b))!.id);
      run.tick();
    }
    run.drop((aim.next() * 2 - 1) * 280);
  }
}

/** Drops a hanabi at `x`: a ball that is never cursed and never merges. */
function dropHanabi(run: RunController, x = 250): void {
  run.giveSpecial('hanabi');
  dropAt(run, x);
}

/** Puts a cat of `size` on the floor at `x` and lets it land. */
function landedCat(run: RunController, size: number, x: number) {
  const r = sizeRadius(size);
  const cat = run.spawnBall(stageInfo(run.stage).firstTier + size - 1, x, -r);
  run.tick();
  return run.balls.find((b) => b.id === cat.id)!;
}

describe('Cursed Bell (GAME_DESIGN §15.12): when a curse comes', () => {
  it("curses a cat right after the stage's 15th drop, not before", () => {
    const { run, log } = setup();
    dropMany(run, CURSE_FIRST_DROP - 1);
    expect(log.began).toEqual([]);
    dropMany(run, 1, 9);
    expect(log.began).toHaveLength(1);
    expect(log.began[0]!.dropsLeft).toBe(CURSE_DROPS[0]);
    expect(run.curse).toEqual({
      id: log.began[0]!.id,
      dropsLeft: CURSE_DROPS[0],
      total: CURSE_DROPS[0],
    });
  });

  it('never comes without Cursed Bell', () => {
    const run = new RunController({ seed: 3 });
    let began = 0;
    run.events.on('curseBegan', () => began++);
    run.setPickLevel('quickCurse', 3);
    run.setPickLevel('moreCurses', 3);
    dropMany(run, 60);
    expect(began).toBe(0);
  });

  it.each([0, 1, 2, 3])(
    'comes again the More Curses (level %i) interval after the last began',
    (level) => {
      const { run, log } = setup(4, { moreCurses: level });
      let dropped = 0;
      const at: number[] = [];
      run.events.on('catDropped', () => dropped++);
      // Each curse ends at once (its cat breaks), so the next one never has to wait.
      run.events.on('curseBegan', (e) => {
        at.push(dropped);
        run.crackCat(e.id);
        run.crackCat(e.id);
      });
      dropMany(run, CURSE_FIRST_DROP + CURSE_INTERVALS[level]!, level);
      expect(at).toEqual([CURSE_FIRST_DROP, CURSE_FIRST_DROP + CURSE_INTERVALS[level]!]);
      expect(log.ended.map((e) => e.reason)).toEqual(['gone', 'gone']);
    },
  );

  it('comes one at a time: a curse that comes due waits until the last one ends', () => {
    const { run, log } = setup(5, { moreCurses: 3 });
    // One cat far from the hanabi dropped on the other side: nothing merges or pops it.
    const six = landedCat(run, 6, -200);
    for (let i = 0; i < CURSE_FIRST_DROP; i++) dropHanabi(run);
    expect(log.began.map((e) => e.id)).toEqual([six.id]);
    run.setCurseDrops(99);
    for (let i = 0; i < CURSE_INTERVALS[3] + 2; i++) dropHanabi(run);
    expect(log.began).toHaveLength(1);
    // The curse ends (the cat breaks in two 5s); the next drop brings the one that waited.
    run.crackCat(six.id);
    run.crackCat(six.id);
    expect(run.curse).toBeNull();
    dropHanabi(run);
    expect(log.began).toHaveLength(2);
    expect(log.began[1]!.tier).toBe(5);
  });

  it('only curses a cat that has landed, is grown, of sizes 1–6 and under the rim', () => {
    for (let seed = 0; seed < 3; seed++) {
      const { run, log } = setup(seed, { moreCurses: 3, quickCurse: 3 });
      run.events.on('curseBegan', (e) => {
        const cat = run.balls.find((b) => b.id === e.id)!;
        expect(cat.kind).toBe('cat');
        expect(cat.landedMs).toBeGreaterThanOrEqual(0);
        expect(cat.growing).toBe(false);
        expect(cat.size).toBeLessThanOrEqual(CURSE_MAX_SIZE);
        expect(isOverLine(cat, run.geometry.rimY)).toBe(false);
      });
      dropMany(run, 40, seed);
      expect(log.began.length).toBeGreaterThan(1);
    }
  });

  it('tries again after the next drop when no cat fits, and counts again at a new stage', () => {
    const { run, log } = setup(7);
    // Fifteen hanabi: no cat in the jar when the curse comes due.
    for (let i = 0; i < CURSE_FIRST_DROP; i++) dropHanabi(run, ((i % 5) - 2) * 120);
    expect(run.balls.some((b) => b.kind === 'cat')).toBe(false);
    expect(log.began).toEqual([]);
    // Once the hanabi are gone, a cat: still falling when the drop is counted, so nothing fits.
    for (let i = 0; i < 600 && run.balls.length > 0; i++) run.tick();
    dropAt(run, -200);
    expect(log.began).toEqual([]);
    for (let i = 0; i < 200; i++) run.tick();
    dropHanabi(run, 250);
    expect(log.began).toHaveLength(1);
    // A new stage counts from 0 again.
    run.jumpToStage(2);
    for (let i = 0; i < 2000 && run.state !== 'playing'; i++) run.tick();
    expect(run.curse).toBeNull();
    dropMany(run, CURSE_FIRST_DROP - 1, 3);
    expect(log.began).toHaveLength(1);
    dropMany(run, 2, 4);
    expect(log.began.length).toBeGreaterThan(1);
  });
});

describe('Cursed Bell: the countdown and the stone', () => {
  it.each([0, 1, 2, 3])('counts down from Quick Curse level %i, then turns to stone', (level) => {
    const { run, log } = setup(8, { quickCurse: level, ironBands: 3, bigBoulders: 4 });
    const cat = landedCat(run, 3, -220);
    expect(run.curseCat(cat.id)).toBe(true);
    const count = CURSE_DROPS[level]!;
    expect(run.curse!.dropsLeft).toBe(count);
    for (let i = 1; i <= count; i++) {
      dropHanabi(run);
      expect(run.curse?.dropsLeft).toBe(count - i);
    }
    expect(log.ticked.map((e) => e.dropsLeft)).toEqual(
      Array.from({ length: count }, (_, i) => count - 1 - i),
    );
    // The drop that brings it to 0 can still merge; the next one turns it to stone first.
    expect(log.stones).toEqual([]);
    const at = run.balls.find((b) => b.id === cat.id)!;
    const where = { x: at.x, y: at.y, angle: at.angle };
    let stonesAtDrop = -1;
    run.events.on('catDropped', () => (stonesAtDrop = log.stones.length));
    dropHanabi(run);
    expect(stonesAtDrop).toBe(1);
    expect(log.stones[0]).toMatchObject({ id: cat.id, tier: cat.tier });
    expect(log.ended.at(-1)).toEqual({ id: cat.id, reason: 'stone', bonus: 0 });
    expect(run.curse).toBeNull();
    // A bare boulder of the cat's size, whatever Iron Bands and Big Boulders say.
    const stone = run.balls.find((b) => b.id === log.stones[0]!.boulder)!;
    expect(stone).toMatchObject({ kind: 'boulder', tier: cat.tier, hitsLeft: 1, golden: false });
    expect(stone.x).toBeCloseTo(where.x, 6);
    expect(stone.y).toBeCloseTo(where.y, 6);
    expect(stone.angle).toBeCloseTo(where.angle, 6);
    expect(stone.landedMs).toBe(at.landedMs);
    expect(run.balls.some((b) => b.id === cat.id)).toBe(false);
  });

  it('is an ordinary boulder: one merge beside it breaks it, paying nothing', () => {
    const { run, log } = setup(9);
    const cat = landedCat(run, 2, 0);
    run.curseCat(cat.id, 0);
    dropAt(run, -260);
    const stone = log.stones[0]!.boulder;
    const coins = run.coins;
    let broken = 0;
    run.events.on('boulderBroken', (e) => {
      if (e.id === stone) broken++;
    });
    // A pair of 1s merging beside it.
    const r = sizeRadius(1);
    const edge = sizeRadius(2);
    run.spawnBall(1, edge + r - 1, -r);
    run.spawnBall(1, edge + 3 * r - 3, -r);
    for (let i = 0; i < 5 && broken === 0; i++) run.tick();
    expect(broken).toBe(1);
    expect(run.coins).toBe(coins + coinPayout(tierCoins(1), 1, 0));
  });
});

describe('Cursed Bell: the ways a curse ends', () => {
  it('a merge lifts it and pays its coins twice', () => {
    const { run, log } = setup(10);
    const r = sizeRadius(4);
    const cat = run.spawnBall(4, -r + 1, -r);
    run.spawnBall(4, r - 1, -r);
    run.curseCat(cat.id);
    run.tick();
    const merge = log.merges[0]!;
    const coins = coinPayout(tierCoins(4), 1, 0);
    expect(merge).toMatchObject({ tier: 4, curseLifted: true, coins: 2 * coins });
    expect(run.coins).toBe(2 * coins);
    expect(log.ended).toEqual([{ id: cat.id, reason: 'lifted', bonus: coins }]);
    expect(run.curse).toBeNull();
  });

  it('a Hubris three, a joker and a Dice fizzle lift it too', () => {
    const three = setup(11, { hubris: 1 });
    const r = sizeRadius(2);
    const cats = [0, 1, 2].map((i) => three.run.spawnBall(2, -150 + r + i * (2 * r - 2), -r));
    three.run.curseCat(cats[1]!.id);
    three.run.tick();
    expect(three.log.merges[0]).toMatchObject({ parts: 3, curseLifted: true });

    const joker = setup(12);
    const r1 = sizeRadius(1);
    const small = joker.run.spawnBall(1, 100, -r1);
    joker.run.spawnBall(2, 100, -2 * r1 - sizeRadius(2) + 2, { kind: 'joker' });
    joker.run.curseCat(small.id);
    for (let i = 0; i < 5; i++) joker.run.tick();
    expect(joker.log.merges[0]).toMatchObject({ joker: true, curseLifted: true });
    expect(joker.log.ended[0]!.reason).toBe('lifted');

    const fizzle = setup(13, { dice: 1 });
    fizzle.run.forceDice('fizzle');
    const r3 = sizeRadius(3);
    const left = fizzle.run.spawnBall(3, -r3 + 1, -r3);
    fizzle.run.spawnBall(3, r3 - 1, -r3);
    fizzle.run.curseCat(left.id);
    fizzle.run.tick();
    expect(fizzle.log.merges[0]).toMatchObject({ dice: 'fizzle', curseLifted: true });
  });

  it('the magnet lifts it with no bonus; the cat goes into the paw as a normal cat', () => {
    const { run, log } = setup(14);
    const cat = landedCat(run, 3, 100);
    run.curseCat(cat.id);
    run.giveSpecial('magnet');
    for (let i = 0; i < 600 && !run.canTake; i++) run.tick();
    expect(run.take(cat.id)).toBe(true);
    expect(log.ended).toEqual([{ id: cat.id, reason: 'taken', bonus: 0 }]);
    expect(run.curse).toBeNull();
    expect(run.current).toMatchObject({ kind: 'cat', tier: cat.tier });
    // Dropping it again doesn't curse or count anything.
    dropAt(run, 0);
    expect(log.ticked).toEqual([]);
  });

  it('a break, a Lucky Save, a hanabi or a stage clear just ends it', () => {
    // Porcelain breaks it.
    const broken = setup(15);
    const a = landedCat(broken.run, 3, 0);
    broken.run.curseCat(a.id);
    broken.run.crackCat(a.id);
    expect(broken.run.curse).not.toBeNull();
    broken.run.crackCat(a.id);
    expect(broken.log.ended).toEqual([{ id: a.id, reason: 'gone', bonus: 0 }]);
    // Neither piece is cursed.
    expect(broken.run.curse).toBeNull();

    // A Lucky Save pops it (it is among the 6 smallest cats).
    const saved = setup(16, {}, 1);
    const b = landedCat(saved.run, 1, 0);
    saved.run.curseCat(b.id);
    saved.run.forceDangerTimeout();
    expect(saved.log.ended).toEqual([{ id: b.id, reason: 'gone', bonus: 0 }]);

    // A hanabi pops it.
    const blast = setup(17);
    const c = landedCat(blast.run, 2, 0);
    blast.run.curseCat(c.id);
    blast.run.spawnBall(2, 0, -2 * sizeRadius(2) - sizeRadius(2) + 2, { kind: 'hanabi' });
    for (let i = 0; i < 400 && blast.log.ended.length === 0; i++) blast.run.tick();
    expect(blast.log.ended).toEqual([{ id: c.id, reason: 'gone', bonus: 0 }]);

    // A stage clear pops it.
    const clear = setup(18);
    const d = landedCat(clear.run, 2, 200);
    clear.run.curseCat(d.id);
    clear.run.jumpToStage(2);
    expect(clear.log.ended).toEqual([{ id: d.id, reason: 'gone', bonus: 0 }]);
  });

  it('never passes to the merged cat, an echo or a piece', () => {
    const { run, log } = setup(19, { echo: 1 });
    const r = sizeRadius(5);
    const cat = run.spawnBall(5, -120 - r + 1, -r);
    run.spawnBall(5, -120 + r - 1, -r);
    run.curseCat(cat.id);
    run.tick();
    expect(log.merges[0]!.curseLifted).toBe(true);
    expect(run.curse).toBeNull();
  });
});

describe('Cursed Bell: determinism and saves', () => {
  const LEVELS = { quickCurse: 2, moreCurses: 3 };

  function play(seed: number): RunController {
    const { run } = setup(seed, LEVELS);
    const aim = new Rng(seed + 1);
    for (let t = 0; t < 2400 && run.state !== 'over'; t++) {
      botMove(run, (aim.next() * 2 - 1) * 280, aim.next());
      run.tick();
    }
    return run;
  }

  it('plays the same for the same seed and inputs', () => {
    expect(play(21).stateHash()).toBe(play(21).stateHash());
  });

  it('keeps the curse through a save, and refuses a curse on a cat that is not there', () => {
    const { run, log } = setup(22);
    const cat = landedCat(run, 3, 0);
    run.curseCat(cat.id, 4);
    dropAt(run, -250);
    run.pause();
    const text = JSON.stringify({
      version: RUN_SAVE_VERSION,
      save: { run: run.snapshot(), recordsBefore: { bestScore: 0, bestStage: 1, highestTier: 0 } },
    });
    const decoded = decodeRunSave(text);
    if (!('save' in decoded)) throw new Error(decoded.error);
    const saved: RunSnapshot = decoded.save.run;
    expect(saved.curse).toEqual({ id: cat.id, dropsLeft: 3, total: 4 });
    expect(saved.curseDue).toBe(CURSE_FIRST_DROP);
    const back = RunController.restore(saved);
    expect(back.curse).toEqual({ id: cat.id, dropsLeft: 3, total: 4 });
    expect(back.stateHash()).toBe(run.stateHash());
    for (const curse of [
      { id: 999, dropsLeft: 3 },
      { id: saved.world.balls.at(-1)!.id + 1, dropsLeft: 1 },
    ]) {
      expect(() => RunController.restore({ ...saved, curse })).toThrow(RangeError);
    }
    // An old snapshot (no curse fields) loads with none.
    const old = { ...saved } as Record<string, unknown>;
    for (const key of ['curse', 'curseDue', 'curseRng', 'diceRng']) delete old[key];
    const plain = RunController.restore(old as unknown as RunSnapshot);
    expect(plain.curse).toBeNull();
    expect(log.began).toHaveLength(1);
  });
});

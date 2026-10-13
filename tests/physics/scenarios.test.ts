import { describe, expect, it } from 'vitest';
import { stepsFor } from '../../src/config/physics';
import {
  SCENARIO_GROUP_INFO,
  SCENARIO_GROUPS,
  SCENARIOS,
  scenarioById,
} from '../../src/config/scenarios';
import type { ScenarioDef } from '../../src/config/scenarios';
import { stageInfo } from '../../src/config/stages';
import { EventBus } from '../../src/core/events';
import type { GameEvents } from '../../src/core/events';
import { maxUpgradeLevels } from '../../src/core/upgrades';
import type { RunController } from '../../src/run/RunController';
import { startScenarioRun } from '../../src/run/scenario';

/** What a scene's moment did. */
interface Moment {
  readonly run: RunController;
  readonly merges: GameEvents['merged'][];
  readonly struck: GameEvents['lightningStruck'][];
  readonly popped: GameEvents['catPopped'][];
  readonly broken: number;
  readonly hanabi: number;
  readonly saves: number;
  readonly cleared: boolean;
  readonly maxCombo: number;
  /** The biggest size a merge made. */
  readonly maxSize: number;
}

type Step = { readonly drop: number } | { readonly wait: number } | { readonly take: number };

/** Plays a scene: waits for the paw before each drop or take, then runs `afterMs` of play. */
function play(def: ScenarioDef, steps: readonly Step[], afterMs = 4000): Moment {
  const events = new EventBus<GameEvents>();
  const run = startScenarioRun(def, { events });
  const merges: GameEvents['merged'][] = [];
  const struck: GameEvents['lightningStruck'][] = [];
  const popped: GameEvents['catPopped'][] = [];
  let broken = 0;
  let hanabi = 0;
  let saves = 0;
  let cleared = false;
  let maxCombo = 0;
  events.on('merged', (e) => merges.push(e));
  events.on('lightningStruck', (e) => struck.push(e));
  events.on('catPopped', (e) => popped.push(e));
  events.on('boulderBroken', () => broken++);
  events.on('hanabiExploded', () => hanabi++);
  events.on('luckySave', () => saves++);
  events.on('stageCleared', () => (cleared = true));
  events.on('comboChanged', (e) => (maxCombo = Math.max(maxCombo, e.combo)));
  const ticks = (ms: number): void => {
    for (let i = 0; i < stepsFor(ms) && run.state !== 'over'; i++) run.tick();
  };
  const waitFor = (ready: () => boolean): void => {
    for (let i = 0; i < 1000 && !ready(); i++) run.tick();
  };
  for (const step of steps) {
    if ('wait' in step) ticks(step.wait);
    else if ('take' in step) {
      waitFor(() => run.canTake);
      expect(run.take(step.take), 'take').toBe(true);
    } else {
      waitFor(() => run.canDrop);
      expect(run.drop(step.drop), 'drop').toBe(true);
    }
  }
  ticks(afterMs);
  const first = stageInfo(def.stage).firstTier;
  const maxSize = Math.max(0, ...merges.map((e) => e.newTier - first + 1));
  return { run, merges, struck, popped, broken, hanabi, saves, cleared, maxCombo, maxSize };
}

/** The scene by id. */
function scene(id: string): ScenarioDef {
  const def = scenarioById(id);
  if (!def) throw new Error(`No scene ${id}`);
  return def;
}

/** The cat of `size` nearest x (a scene's settled jar). */
function catNear(run: RunController, stage: number, size: number, x: number): number {
  const tier = stageInfo(stage).firstTier + size - 1;
  const cats = run.balls.filter((b) => b.kind === 'cat' && b.tier === tier);
  cats.sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x));
  const found = cats[0];
  if (!found) throw new Error(`No ${size} near ${x}`);
  return found.id;
}

describe('Scenes (GAME_DESIGN §2.6)', () => {
  it('has two scenes for each group, with unique ids', () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const group of SCENARIO_GROUPS) {
      expect(
        SCENARIOS.filter((s) => s.group === group),
        group,
      ).toHaveLength(2);
      expect(SCENARIO_GROUP_INFO[group].name).not.toBe('');
    }
    expect(scenarioById('nope')).toBeNull();
  });

  it('starts every scene at its stage with the top upgrades, its picks, paw, NEXT, score and coins', () => {
    for (const def of SCENARIOS) {
      const run = startScenarioRun(def);
      const first = stageInfo(def.stage).firstTier;
      expect(run.stage, def.id).toBe(def.stage);
      expect(run.upgrades).toEqual(maxUpgradeLevels());
      expect(run.state).toBe('playing');
      expect(run.score).toBe(def.score);
      expect(run.coins).toBe(def.coins);
      expect(run.current.kind).toBe(def.paw.kind ?? 'cat');
      expect(run.next.kind).toBe(def.next.kind ?? 'cat');
      if (def.paw.kind === undefined)
        expect(run.current.tier).toBe(first + (def.paw.size ?? 1) - 1);
      expect(run.current.golden).toBe(def.paw.golden ?? false);
      for (const [id, level] of Object.entries(def.picks ?? {})) {
        expect(run.levelOf(id as keyof typeof run.pickLevels), `${def.id} ${id}`).toBe(level);
      }
      expect(run.canDrop || run.canTake, def.id).toBe(true);
    }
  });

  // Every scene's jar must hold still on its own: no merge while it settles or after, nothing over
  // the line, until the player drops.
  for (const def of SCENARIOS) {
    it(`keeps ${def.id}'s jar still until the player drops`, () => {
      const m = play(def, [], 5000);
      expect(m.run.balls, 'nothing merged while settling').toHaveLength(def.balls.length);
      expect(m.merges).toHaveLength(0);
      expect(m.run.dangerActive).toBe(false);
      expect(m.run.state).toBe('playing');
      const rim = m.run.geometry.rimY;
      for (const ball of m.run.balls) expect(ball.y - ball.radius, def.id).toBeGreaterThan(rim);
    });
  }

  it('Boulder storm: lightning on any boulder breaks them all and the 8s make the last cat', () => {
    const def = scene('lightningBoulders');
    for (const x of [-200, 0, 40, 200]) {
      const m = play(def, [{ drop: x }]);
      expect(m.struck[0]?.kind, `x ${x}`).toBe('boulder');
      expect(m.broken).toBeGreaterThanOrEqual(14);
      expect(m.cleared).toBe(true);
    }
  });

  it('Full house: lightning on the top-right 3 pops every 3, and the jar chains as it caves in', () => {
    const def = scene('lightningRescue');
    for (const x of [175, 225]) {
      const m = play(def, [{ drop: x }]);
      const first = stageInfo(def.stage).firstTier;
      expect(m.struck[0]?.tier, `x ${x}`).toBe(first + 2);
      expect(m.struck[0]?.targets.length).toBeGreaterThanOrEqual(6);
      expect(m.merges.length).toBeGreaterThanOrEqual(5);
      expect(m.maxCombo).toBeGreaterThanOrEqual(5);
    }
  });

  it('Firework shelf: the hanabi in the gap on the right drops the top 8 on the other', () => {
    const def = scene('hanabiShelf');
    for (const x of [100, 200, 250]) {
      const m = play(def, [{ drop: x }]);
      expect(m.hanabi, `x ${x}`).toBe(1);
      expect(m.cleared).toBe(true);
    }
  });

  it('Crowd pleaser: the hanabi pops a crowd of small cats', () => {
    const def = scene('hanabiCrowd');
    for (const x of [-50, 0, 50]) {
      const m = play(def, [{ drop: x }]);
      expect(m.hanabi, `x ${x}`).toBe(1);
      expect(m.popped.filter((e) => e.reason === 'hanabi').length).toBeGreaterThanOrEqual(6);
    }
  });

  it('Wild finish: the joker on the 8 makes the last cat', () => {
    const def = scene('jokerClear');
    for (const x of [-50, 0, 100]) {
      const m = play(def, [{ drop: x }]);
      expect(m.merges[0]?.joker, `x ${x}`).toBe(true);
      expect(m.cleared).toBe(true);
    }
  });

  it('Joker chain: the joker on the top 4 runs a chain up to an 8', () => {
    const def = scene('jokerChain');
    for (const x of [-150, -100, -75]) {
      const m = play(def, [{ drop: x }]);
      expect(m.merges[0]?.joker, `x ${x}`).toBe(true);
      expect(m.maxSize).toBe(8);
      expect(m.merges.length).toBeGreaterThanOrEqual(4);
      expect(m.cleared).toBe(false);
    }
  });

  it('Golden staircase: the golden 3 skips to a 5 and the chain makes the last cat', () => {
    const def = scene('goldenClear');
    for (const x of [50, 100, 150]) {
      const m = play(def, [{ drop: x }]);
      expect(m.merges[0]?.golden, `x ${x}`).toBe(true);
      expect(m.cleared).toBe(true);
    }
  });

  it('Double gold: two golden drops, two skipped sizes', () => {
    const def = scene('goldenDouble');
    for (const x of [100, 150, 200]) {
      const first = play(def, [{ drop: x }]);
      expect(first.merges[0]?.golden, `x ${x}`).toBe(true);
      expect(first.maxSize).toBe(8);
      const three = first.run.balls.find(
        (b) => b.tier === stageInfo(def.stage).firstTier + 2 && b.kind === 'cat',
      );
      expect(three).toBeDefined();
      const second = play(def, [{ drop: x }, { wait: 2500 }, { drop: three?.x ?? 0 }]);
      expect(second.merges.filter((e) => e.golden)).toHaveLength(2);
    }
  });

  it('Magnet match: the 8 taken from the right makes the last cat on the other 8', () => {
    const def = scene('magnetClear');
    for (const x of [-200, -161, -100]) {
      const run = startScenarioRun(def);
      const right8 = catNear(run, def.stage, 8, 161);
      const m = play(def, [{ take: right8 }, { drop: x }]);
      expect(m.cleared, `x ${x}`).toBe(true);
    }
  });

  it('Magnet chain: the 4 taken from the right runs the chain up to an 8', () => {
    const def = scene('magnetChain');
    for (const x of [-120, -75, -40]) {
      const run = startScenarioRun(def);
      const four = catNear(run, def.stage, 4, 200);
      const m = play(def, [{ take: four }, { drop: x }]);
      expect(m.maxSize, `x ${x}`).toBe(8);
      expect(m.cleared).toBe(false);
    }
  });

  it('Brim full: a drop anywhere overflows the jar into a Lucky Save', () => {
    const def = scene('luckySaveBrim');
    for (const x of [-200, 0, 200]) {
      const m = play(def, [{ drop: x }], 5000);
      expect(m.saves, `x ${x}`).toBe(1);
      expect(m.run.state).toBe('playing');
    }
  });

  it('Saved and cleared: the Lucky Save sets off a chain to the last cat', () => {
    const def = scene('luckySaveChain');
    for (const x of [-200, 0, 200]) {
      const m = play(def, [{ drop: x }], 5000);
      expect(m.saves, `x ${x}`).toBe(1);
      expect(m.cleared).toBe(true);
    }
  });

  it('Three and three: two Hubris threes, then the chain makes the last cat', () => {
    const def = scene('hubrisThree');
    for (const x of [130, 140, 150]) {
      const m = play(def, [{ drop: x }]);
      expect(
        m.merges.filter((e) => e.parts === 3),
        `x ${x}`,
      ).toHaveLength(2);
      expect(m.cleared).toBe(true);
    }
  });

  it('Hubris cascade: two Hubris threes, then a chain up to an 8', () => {
    const def = scene('hubrisCascade');
    for (const x of [150, 175, 200]) {
      const m = play(def, [{ drop: x }]);
      expect(
        m.merges.filter((e) => e.parts === 3),
        `x ${x}`,
      ).toHaveLength(2);
      expect(m.maxSize).toBe(8);
    }
  });

  it('Fireball chain: the heavy 4 on the top 4 runs the chain to the last cat', () => {
    const def = scene('heavyChain');
    for (const x of [-150, -50, 0]) {
      const m = play(def, [{ drop: x }]);
      expect(m.cleared, `x ${x}`).toBe(true);
    }
  });

  it('Knockout: a fireball on an 8 by the wall knocks it into the other 8', () => {
    const def = scene('heavyKnock');
    for (const x of [-240, 230]) {
      const m = play(def, [{ drop: x }]);
      expect(m.cleared, `x ${x}`).toBe(true);
    }
  });

  it('Lucky roll: the scripted lucky die skips a size and the chain makes the last cat', () => {
    const def = scene('diceLucky');
    for (const x of [100, 150, 200]) {
      const m = play(def, [{ drop: x }]);
      expect(m.merges[0]?.dice, `x ${x}`).toBe('lucky');
      expect(m.cleared).toBe(true);
    }
  });

  it('Fizzle, then luck: the first merge fizzles, the second is lucky and chains up to an 8', () => {
    const def = scene('diceComeback');
    for (const x of [-150, -100]) {
      const m = play(def, [{ drop: x }, { wait: 1500 }, { drop: x }]);
      expect(m.merges.map((e) => e.dice).slice(0, 2), `x ${x}`).toEqual(['fizzle', 'lucky']);
      expect(m.maxSize).toBe(8);
    }
  });
});

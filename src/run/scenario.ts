/**
 * The scenes (GAME_DESIGN §2.6): a run set up for one of the game's big moments, for the owner's
 * clips. It starts at the scene's stage with every shop card at its top, the scene's picks, its
 * cats and balls already settled in the jar, and the scene's two balls in the paw and in NEXT. The
 * player plays it from there: nothing plays by itself.
 */
import { HANABI_SIZE, JOKER_SIZE, LIGHTNING_SIZE, MAGNET_SIZE, PICK_IDS } from '../config/picks';
import { SCENARIO_SETTLE_MS } from '../config/scenarios';
import type { ScenarioBall, ScenarioDef, ScenarioDrop } from '../config/scenarios';
import { stageInfo } from '../config/stages';
import { stepsFor } from '../config/physics';
import { sizeRadius } from '../config/tiers';
import type { Drop } from '../core/dropQueue';
import type { EventBus, GameEvents } from '../core/events';
import { maxUpgradeLevels } from '../core/upgrades';
import { RunController } from './RunController';

export interface ScenarioRunOptions {
  /** Subscribe after the run is built: the settling makes no events anyone needs. */
  readonly events?: EventBus<GameEvents>;
  readonly gravityScale?: number;
}

/** The size a special ball always has (GAME_DESIGN §15). */
const SPECIAL_SIZES = {
  magnet: MAGNET_SIZE,
  hanabi: HANABI_SIZE,
  joker: JOKER_SIZE,
  lightning: LIGHTNING_SIZE,
} as const;

/** The tier of a scene's ball at `stage`. */
function tierOf(stage: number, ball: ScenarioDrop): number {
  const size =
    ball.kind === 'magnet' ||
    ball.kind === 'hanabi' ||
    ball.kind === 'joker' ||
    ball.kind === 'lightning'
      ? SPECIAL_SIZES[ball.kind]
      : (ball.size ?? 1);
  return stageInfo(stage).firstTier + size - 1;
}

function dropOf(stage: number, ball: ScenarioDrop): Drop {
  const kind = ball.kind ?? 'cat';
  return {
    kind,
    tier: tierOf(stage, ball),
    golden: kind === 'cat' && (ball.golden ?? false),
    hits: kind === 'boulder' ? 1 : 0,
  };
}

/** Puts a scene's ball in the jar: its bottom `h` above the floor (y grows downward from it). */
function place(run: RunController, stage: number, ball: ScenarioBall): void {
  const tier = tierOf(stage, ball);
  const radius = sizeRadius(tier - stageInfo(stage).firstTier + 1);
  const kind = ball.kind ?? 'cat';
  run.spawnBall(tier, ball.x, -((ball.h ?? 0) + radius), {
    kind,
    golden: kind === 'cat' && (ball.golden ?? false),
    ...(kind === 'boulder' ? { hits: 1 } : {}),
  });
}

/**
 * Builds the run of a scene: the jar settles before anyone sees it (SCENARIO_SETTLE_MS of play),
 * then the paw gets its ball, the HUD its score and coins, and Dice its script.
 */
export function startScenarioRun(
  def: ScenarioDef,
  options: ScenarioRunOptions = {},
): RunController {
  const run = new RunController({
    seed: def.seed,
    upgrades: maxUpgradeLevels(),
    stage: def.stage,
    ...(options.events ? { events: options.events } : {}),
    ...(options.gravityScale === undefined ? {} : { gravityScale: options.gravityScale }),
  });
  // The jar settles under the plain rules: with Heavy Drop its cats would shoot down and bounce.
  for (const ball of def.balls) place(run, def.stage, ball);
  const steps = stepsFor(SCENARIO_SETTLE_MS);
  for (let i = 0; i < steps; i++) run.tick();
  for (const id of PICK_IDS) {
    const level = def.picks?.[id];
    if (level !== undefined) run.setPickLevel(id, level);
  }
  run.setDrops(dropOf(def.stage, def.paw), dropOf(def.stage, def.next));
  if (def.dice) run.scriptDice(def.dice);
  run.setScore(def.score);
  run.setRunCoins(def.coins);
  return run;
}

import { AD_PLACEMENTS } from '../config/ads';
import type { AdPlacement } from '../config/ads';
import { PICK_IDS, PICKS } from '../config/picks';
import type { PickId } from '../config/picks';
import { stageHoldsTier, stageInfo } from '../config/stages';
import { SIZE_COUNT } from '../config/tiers';
import { AudioEngine } from '../audio';
import type { SoundName } from '../audio';
import { UPGRADE_IDS, UPGRADES } from '../config/upgrades';
import type { UpgradeId } from '../config/upgrades';
import type { UrlFlags } from '../core/urlFlags';
import type { GameView } from '../game';
import type { AdResult, AdService, AdsStatus } from '../platform';
import type { GameSession } from '../session';
import { button, el } from '../ui/dom';
import type { ScreenId } from '../ui/screenManager';

/** The stage jump lists stages 2 to this + 1 (the jar grows at 5, 10, 15 and 20). */
const DEBUG_STAGE_JUMPS = 20;

export interface DebugContext {
  readonly flags: UrlFlags;
  readonly session: GameSession;
  readonly game: GameView;
  readonly audio: AudioEngine;
  screen(): ScreenId;
  /** Pretends a new service worker is waiting, to test the update badge policy. */
  simulateUpdateReady(): void;
  /** The rewarded ads (TECH_SPEC §16). */
  readonly ads: AdService;
  /** The Android app's build, where AdMob's test ads can be chosen. */
  readonly nativeApp: boolean;
  /** The hashed ID AdMob knows this phone by (the dev app), or null. */
  readonly testDeviceId: string | null;
  /** Stores a debug flag on the device (`platform/debugFlags.ts`) and reloads. */
  storeFlag(key: string, value: string | null): void;
}

/** A snapshot for tests; `run*` fields are null on the menu before the first run. */
export interface GameStateSnapshot {
  readonly screen: ScreenId;
  readonly runState: string | null;
  /** The scene being played (GAME_DESIGN §2.6), or null for a real run. */
  readonly scene: string | null;
  readonly score: number;
  readonly runCoins: number;
  /** The persistent wallet (GAME_DESIGN §11). */
  readonly wallet: number;
  /** The combo as it stands (0 once its window has passed). */
  readonly combo: number;
  readonly luckySaves: number;
  readonly stage: number;
  /** The profile's best stage, which opens the shop's cards (GAME_DESIGN §2.2). */
  readonly bestStage: number;
  /** The run's play time in ms (paused time, the picks and the jar's growth don't count). */
  readonly playMs: number;
  readonly balls: number;
  readonly canDrop: boolean;
  /** The dropper holds a ready magnet (GAME_DESIGN §15.2). */
  readonly canTake: boolean;
  /**
   * What the dropper holds and what comes next: 'cat', 'magnet', 'boulder', 'hanabi', 'joker' or
   * 'lightning'.
   */
  readonly current: string | null;
  readonly next: string | null;
  /** The pick waiting for a choice (GAME_DESIGN §15.5), or null. */
  readonly pick: { readonly kind: string; readonly options: readonly string[] } | null;
  /** The trials' and blessings' levels this run. */
  readonly pickLevels: Readonly<Record<string, number>> | null;
  /** Which way the run's wind blows (1 right, −1 left), or null. */
  readonly wind: 1 | -1 | null;
  /** The cursed cat and what its bell shows (Cursed Bell, GAME_DESIGN §15.12), or null. */
  readonly curse: { readonly id: number; readonly dropsLeft: number } | null;
  /** The tier of the ball in NEXT (Copycat, §15.13), or null. */
  readonly nextTier: number | null;
  /** The danger countdown is running (a cat is over the line). */
  readonly danger: boolean;
  /** The stage's smallest and last cat (making the last one clears the stage). */
  readonly firstTier: number;
  readonly lastTier: number;
  /** The HUD bar: the biggest cat in the jar against the last cat, 0–1. */
  readonly progress: number;
  /** The running expansion, or null. */
  readonly expansion: {
    readonly from: number;
    readonly to: number;
    readonly phase: 'clear' | 'zoom' | 'reveal';
  } | null;
  /** A lightning strike holding time still (GAME_DESIGN §15.15): its balls and how far it is. */
  readonly lightning: {
    readonly id: number;
    readonly targets: readonly number[];
    readonly elapsedMs: number;
  } | null;
  readonly ticks: number;
  /** The bonus ball a rewarded ad can give now (GAME_DESIGN §2.7), or null. */
  readonly adBall: string | null;
  /** One more Lucky Save was taken for an ad this run. */
  readonly lastChanceTaken: boolean;
  /** Device pixels per CSS pixel the canvas renders at (adaptive, TECH_SPEC §6). */
  readonly resolution: number;
}

/** A ball in the jar (`GameHooks.balls`), in world units. */
export interface DebugBall {
  readonly id: number;
  readonly kind: string;
  readonly size: number;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/** The jar on the page (`GameHooks.jarRect`), in CSS pixels. */
export interface JarRect {
  readonly left: number;
  readonly right: number;
  readonly rim: number;
  readonly floor: number;
}

/** Test hooks on `window.__game` (TECH_SPEC §11), installed only with `?debug=1`. */
export interface GameHooks {
  readonly flags: UrlFlags;
  screen(): ScreenId;
  simulateUpdateReady(): void;
  state(): GameStateSnapshot;
  /** World x of every cat in the jar, oldest first. */
  ballXs(): number[];
  /** Every ball in the jar, oldest first, in world units (y grows downward; the floor is 0). */
  balls(): DebugBall[];
  /** Drops the dropper's cat at world x (0 is the jar's centre). False during the cooldown. */
  dropAt(x: number): boolean;
  /** Ids of the balls a magnet could take (landed), oldest first. */
  takeableIds(): number[];
  /** Where the ball `id` is on the page, in CSS pixels (to tap it), or null. */
  ballPoint(id: number): { readonly x: number; readonly y: number } | null;
  /** Where the world point (x, y) is on the page, in CSS pixels, or null without a run. */
  screenPoint(x: number, y: number): { readonly x: number; readonly y: number } | null;
  /** The jar on the page in CSS pixels: its inner walls, rim and floor; null without a run. */
  jarRect(): JarRect | null;
  /** The magnet in the dropper takes the ball `id` (the oldest takeable one by default). */
  take(id?: number): boolean;
  /** Chooses an option of the waiting pick (its first by default). */
  choose(id?: PickId): boolean;
  /** Puts a magnet, a boulder, a hanabi, a joker, a lightning ball or a golden cat in the dropper. */
  give(kind: 'magnet' | 'boulder' | 'hanabi' | 'joker' | 'lightning' | 'golden'): void;
  /** Puts a cat of `tier` (golden if asked) in the dropper; ignored if the stage can't hold it. */
  giveCat(tier: number, golden?: boolean): void;
  /** Sets a trial's, rule's (0 or 1) or blessing's level for this run. */
  setPickLevel(id: PickId, level: number): void;
  /** Opens a stage clear's picks now: a trial first, or a rule first with `rule`. */
  offerPicks(rule?: boolean): void;
  /** Turns the run's wind the other way, or sets it (1 right, −1 left). */
  setWind(direction?: 1 | -1): void;
  /** Puts a boulder of the stage's `size` needing `hits` merges into the jar at world x. */
  spawnBoulder(x?: number, size?: number, hits?: number): void;
  addCoins(coins: number): void;
  /** Applies from the next run. */
  setUpgrade(id: UpgradeId, level: number): void;
  /** Sets the profile's best stage, which opens the shop's cards. */
  setBestStage(stage: number): void;
  /** Every shop card at its max level and every gate open: a maxed profile, from the next run. */
  maxProfile(): void;
  /** Clears stage after stage up to `stage`, playing each expansion in turn. */
  setStage(stage: number): void;
  /** Sets the run score (records only). */
  setScore(score: number): void;
  /**
   * Puts a cat of `tier` at world x, at the dropper's height or at world y (its centre; −radius
   * lays it on the floor). Returns its id, or null when the stage can't hold the tier.
   */
  spawnTier(tier: number, x?: number, y?: number): number | null;
  /** The radius of a cat of `tier` at the current stage, in world units. */
  radiusOf(tier: number): number;
  /** Drops a cracked cat (Porcelain) of the stage's `size` at world x; returns its id or null. */
  spawnCracked(size?: number, x?: number): number | null;
  /** Cracks the cat `id` as a merge beside it would (a cracked one breaks). */
  crackCat(id: number): boolean;
  /** The ids of the cracked cats in the jar. */
  crackedIds(): number[];
  /** The ids of the cats in the jar, oldest first. */
  catIds(): number[];
  /**
   * Curses the cat `id` (the newest one that can be when omitted), with `dropsLeft` on its bell
   * (Quick Curse's count by default). Returns whether it did.
   */
  curseCat(id?: number, dropsLeft?: number): boolean;
  /** Sets what the cursed cat's bell shows. */
  setCurseDrops(dropsLeft: number): boolean;
  /** The next merge that rolls a die (Dice, §15.14) shows this. */
  forceDice(roll: 'lucky' | 'fizzle' | 'normal'): void;
  /**
   * Places `pairs` touching pairs of `tier` cats in rows on the jar floor, so they all merge on
   * the next physics step (M9: many simultaneous merges). `tier` defaults to the stage's smallest
   * and must be below its last cat.
   */
  mergeBurst(pairs?: number, tier?: number): void;
  /** The audio context's state and the output's current peak (0–1; ≥ 1 clips). */
  audio(): { readonly state: string; readonly peak: number };
  /**
   * Renders `merges` simultaneous merges (pops, chings and rising combo notes) offline through
   * the real mixer and returns the output peak (≥ 1 would clip).
   */
  renderPeak(merges: number): Promise<number>;
  forceGameOver(): void;
  /** Acts as if the danger timer ran out: a Lucky Save if one is left, else game over. */
  forceDangerTimeout(): void;
  /** Wipes the save back to defaults and reloads the page. */
  resetSave(): void;
  /** The ads' state (TECH_SPEC §16), with each placement's `ready` and whether one shows. */
  adsState(): AdsStatus & {
    readonly ready: Readonly<Record<AdPlacement, boolean>>;
    readonly showing: boolean;
  };
  /** Shows a rewarded ad for the placement and resolves with its result. */
  showAd(placement: AdPlacement): Promise<AdResult>;
}

declare global {
  interface Window {
    __game?: GameHooks;
  }
}

export function installDebugHooks(ctx: DebugContext): GameHooks {
  const { session } = ctx;
  const hooks: GameHooks = {
    flags: ctx.flags,
    screen: ctx.screen,
    simulateUpdateReady: ctx.simulateUpdateReady,
    state() {
      const run = session.run;
      return {
        screen: ctx.screen(),
        runState: run?.state ?? null,
        scene: session.scene?.id ?? null,
        score: run?.score ?? 0,
        runCoins: run?.coins ?? 0,
        wallet: session.profile.coins,
        combo: run?.combo ?? 0,
        luckySaves: run?.luckySavesLeft ?? 0,
        stage: run?.stage ?? 1,
        bestStage: session.profile.records.bestStage,
        playMs: run?.playTimeMs ?? 0,
        balls: run?.balls.length ?? 0,
        canDrop: run?.canDrop ?? false,
        canTake: run?.canTake ?? false,
        current: run?.current.kind ?? null,
        next: run?.next.kind ?? null,
        pick: run?.pickOffer
          ? { kind: run.pickOffer.kind, options: [...run.pickOffer.options] }
          : null,
        pickLevels: run?.pickLevels ?? null,
        wind: run?.windDirection ?? null,
        curse: run?.curse ?? null,
        nextTier: run?.next.tier ?? null,
        danger: run?.dangerActive ?? false,
        firstTier: stageInfo(run?.stage ?? 1).firstTier,
        lastTier: stageInfo(run?.stage ?? 1).lastTier,
        progress: run?.progress.fraction ?? 0,
        expansion: run?.expansion
          ? { from: run.expansion.from, to: run.expansion.to, phase: run.expansion.phase }
          : null,
        lightning: run?.lightning
          ? {
              id: run.lightning.id,
              targets: [...run.lightning.targets],
              elapsedMs: run.lightning.elapsedMs,
            }
          : null,
        ticks: run?.ticks ?? 0,
        adBall: run?.adBall?.kind ?? null,
        lastChanceTaken: run?.lastChanceTaken ?? false,
        resolution: ctx.game.resolution,
      };
    },
    ballXs() {
      return session.run?.balls.map((ball) => ball.x) ?? [];
    },
    balls() {
      return (session.run?.balls ?? []).map(({ id, kind, size, x, y, radius }) => ({
        id,
        kind,
        size,
        x,
        y,
        radius,
      }));
    },
    dropAt(x) {
      return session.run?.drop(x) ?? false;
    },
    takeableIds() {
      const run = session.run;
      return run ? run.balls.filter((ball) => run.takeable(ball)).map((ball) => ball.id) : [];
    },
    ballPoint(id) {
      const ball = session.run?.balls.find((b) => b.id === id);
      return ball ? hooks.screenPoint(ball.x, ball.y) : null;
    },
    screenPoint(x, y) {
      const run = session.run;
      const jar = hooks.jarRect();
      if (!run || !jar) return null;
      const unit = (jar.right - jar.left) / run.geometry.width;
      return { x: (jar.left + jar.right) / 2 + x * unit, y: jar.floor + y * unit };
    },
    jarRect() {
      const box = ctx.game.jarBox();
      const canvas = document.querySelector('#game-screen canvas');
      if (!box || !canvas) return null;
      const area = canvas.getBoundingClientRect();
      return {
        left: area.left + box.left,
        right: area.left + box.right,
        rim: area.top + box.top,
        floor: area.top + box.bottom,
      };
    },
    take(id) {
      const target = id ?? hooks.takeableIds()[0];
      return target === undefined ? false : (session.run?.take(target) ?? false);
    },
    choose(id) {
      const offer = session.run?.pickOffer;
      const target = id ?? offer?.options[0];
      return target === undefined ? false : (session.run?.choose(target) ?? false);
    },
    give(kind) {
      session.run?.giveSpecial(kind);
    },
    giveCat(tier, golden = false) {
      session.run?.giveCat(tier, golden);
    },
    setPickLevel(id, level) {
      session.run?.setPickLevel(id, level);
    },
    offerPicks(rule = false) {
      session.run?.offerPicks(rule);
    },
    setWind(direction) {
      session.run?.setWindDirection(direction);
    },
    spawnBoulder(x = 0, size = 2, hits = 1) {
      const run = session.run;
      if (!run) return;
      const tier = stageInfo(run.stage).firstTier + size - 1;
      if (!stageHoldsTier(run.stage, tier)) return;
      run.spawnBall(tier, x, undefined, { kind: 'boulder', hits: Math.max(1, Math.round(hits)) });
    },
    addCoins(coins) {
      session.addCoins(Math.max(0, Math.round(coins)));
    },
    setBestStage(stage) {
      session.setBestStage(stage);
    },
    maxProfile() {
      for (const id of UPGRADE_IDS) session.setUpgrade(id, UPGRADES[id].maxLevel);
      const gates = Math.max(...UPGRADE_IDS.map((id) => UPGRADES[id].gate));
      session.setBestStage(Math.max(session.profile.records.bestStage, gates));
    },
    setUpgrade(id, level) {
      session.setUpgrade(id, level);
    },
    setStage(stage) {
      session.run?.jumpToStage(Math.round(stage));
    },
    setScore(score) {
      session.run?.setScore(Math.max(0, Math.round(score)));
    },
    spawnTier(tier, x = 0, y) {
      const run = session.run;
      if (!run || !stageHoldsTier(run.stage, tier)) return null;
      return run.spawnBall(tier, x, y).id;
    },
    radiusOf(tier) {
      return session.run?.radiusOf(tier) ?? 0;
    },
    spawnCracked(size = 3, x = 0) {
      const run = session.run;
      if (!run) return null;
      const tier = stageInfo(run.stage).firstTier + size - 1;
      if (!stageHoldsTier(run.stage, tier)) return null;
      return run.spawnBall(tier, x, undefined, { cracked: true }).id;
    },
    crackCat(id) {
      return session.run?.crackCat(id) ?? false;
    },
    catIds() {
      return (session.run?.balls ?? []).filter((b) => b.kind === 'cat').map((b) => b.id);
    },
    crackedIds() {
      return (session.run?.balls ?? []).filter((b) => b.cracked).map((b) => b.id);
    },
    curseCat(id, dropsLeft) {
      return session.run?.curseCat(id, dropsLeft) ?? false;
    },
    setCurseDrops(dropsLeft) {
      return session.run?.setCurseDrops(dropsLeft) ?? false;
    },
    forceDice(roll) {
      session.run?.forceDice(roll);
    },
    mergeBurst(pairs = 10, tier) {
      const run = session.run;
      if (!run) return;
      const { firstTier, lastTier } = stageInfo(run.stage);
      const t = tier ?? firstTier;
      if (!stageHoldsTier(run.stage, t) || t >= lastTier) return;
      const r = run.radiusOf(t);
      const half = run.geometry.halfWidth;
      const slot = 4 * r + 16;
      const perRow = Math.max(1, Math.floor((2 * half) / slot));
      for (let i = 0; i < pairs; i++) {
        const row = Math.floor(i / perRow);
        const x = -half + slot * ((i % perRow) + 0.5);
        const y = -r - row * (2 * r + 12);
        run.spawnBall(t, x - r + 1, y);
        run.spawnBall(t, x + r - 1, y);
      }
    },
    audio() {
      return ctx.audio.debugMeter();
    },
    renderPeak(merges) {
      const sounds: [SoundName, number][] = [];
      for (let i = 0; i < merges; i++) {
        sounds.push(['merge', 2 + (i % 12)], ['coin', 0], ['combo', i + 2]);
      }
      sounds.push(['jackpot', 0], ['whoosh', 0], ['chime', 0]);
      return AudioEngine.renderPeak(sounds);
    },
    forceGameOver() {
      session.run?.forceGameOver();
    },
    forceDangerTimeout() {
      session.run?.forceDangerTimeout();
    },
    resetSave() {
      // The run ends first, so the page hide doesn't save it again.
      session.endRun();
      session.profile.reset();
      window.location.reload();
    },
    adsState() {
      const ads = ctx.ads;
      const ready = Object.fromEntries(AD_PLACEMENTS.map((p) => [p, ads.ready(p)]));
      return {
        ...ads.status(),
        ready: ready as Record<AdPlacement, boolean>,
        showing: ads.showing,
      };
    },
    showAd(placement) {
      return ctx.ads.show(placement);
    },
  };
  window.__game = hooks;
  createDebugPanel(ctx, hooks);
  return hooks;
}

/** The `?debug=1` panel: FPS, body count and the hooks as buttons. */
function createDebugPanel(ctx: DebugContext, hooks: GameHooks): void {
  const panel = el('aside', 'debug-panel');
  panel.dataset['testid'] = 'debug-panel';
  const toggle = button('debug-toggle', 'DBG');
  const body = el('div', 'debug-body');
  body.hidden = true;
  // Taller than a small phone's screen: it scrolls under a finger.
  body.dataset['scrollable'] = '';
  toggle.addEventListener('click', () => {
    body.hidden = !body.hidden;
  });

  const stats = el('pre', 'debug-stats');
  const adsText = el('pre', 'debug-stats');
  adsText.dataset['testid'] = 'debug-ads';
  const row = (...children: HTMLElement[]): HTMLElement => {
    const node = el('div', 'debug-row');
    node.append(...children);
    return node;
  };
  const action = (label: string, fn: () => void): HTMLButtonElement => {
    const node = button('debug-btn', label);
    node.addEventListener('click', fn);
    return node;
  };
  const select = (values: number[], initial: number): HTMLSelectElement => {
    const node = el('select', 'debug-input');
    for (const v of values) node.append(new Option(String(v), String(v), false, v === initial));
    return node;
  };

  // Sizes 1–9: the buttons spawn the current stage's tier of that size.
  const size = select(
    Array.from({ length: SIZE_COUNT }, (_, i) => i + 1),
    1,
  );
  size.title = "Size (1 = the stage's smallest cat)";
  const tierOfSize = (): number =>
    stageInfo(hooks.state().stage).firstTier + Number(size.value) - 1;
  // Stages have no end; the list goes far enough to see a few jar growths (every 5 stages).
  const stage = select(
    Array.from({ length: DEBUG_STAGE_JUMPS }, (_, i) => i + 2),
    2,
  );
  const score = el('input', 'debug-input');
  score.type = 'number';
  score.value = '5000';
  const upgrade = el('select', 'debug-input');
  for (const id of UPGRADE_IDS) upgrade.append(new Option(UPGRADES[id].name, id));
  const level = el('input', 'debug-input');
  level.type = 'number';
  level.min = '0';
  level.value = '1';
  // The level field follows the chosen upgrade's range (start level…max).
  const syncLevelRange = (): void => {
    const { startLevel, maxLevel } = UPGRADES[upgrade.value as UpgradeId];
    level.min = String(startLevel);
    level.max = String(maxLevel);
    if (Number(level.value) > maxLevel) level.value = String(maxLevel);
    if (Number(level.value) < startLevel) level.value = String(startLevel);
  };
  upgrade.addEventListener('change', syncLevelRange);
  syncLevelRange();
  const best = el('input', 'debug-input');
  best.type = 'number';
  best.min = '1';
  best.value = '8';
  best.title = 'Best stage (opens the shop cards)';
  // Trials and blessings (GAME_DESIGN §15.5): this run only.
  const pick = el('select', 'debug-input');
  for (const id of PICK_IDS) pick.append(new Option(PICKS[id].name, id));
  const pickLevel = el('input', 'debug-input');
  pickLevel.type = 'number';
  pickLevel.min = '0';
  pickLevel.value = '1';
  // Cursed Bell and Dice (GAME_DESIGN §15.12, §15.14).
  const bell = el('input', 'debug-input');
  bell.type = 'number';
  bell.min = '0';
  bell.value = '3';
  bell.title = 'Drops left on the bell';
  const die = el('select', 'debug-input');
  for (const face of ['lucky', 'fizzle', 'normal']) die.append(new Option(face, face));

  body.append(
    stats,
    row(
      size,
      action('Spawn size', () => hooks.spawnTier(tierOfSize(), 0)),
      action('Merge ×10', () => hooks.mergeBurst(10, tierOfSize())),
    ),
    row(
      score,
      action('Set score', () => hooks.setScore(Number(score.value))),
    ),
    row(
      stage,
      action('Jump to stage', () => hooks.setStage(Number(stage.value))),
    ),
    row(
      upgrade,
      level,
      action('Set', () => hooks.setUpgrade(upgrade.value as UpgradeId, Number(level.value))),
    ),
    row(
      best,
      action('Set best stage', () => hooks.setBestStage(Number(best.value))),
      action('Max profile', () => hooks.maxProfile()),
    ),
    row(
      action('Magnet', () => hooks.give('magnet')),
      action('Boulder', () => hooks.give('boulder')),
      action('Golden', () => hooks.give('golden')),
      action('Hanabi', () => hooks.give('hanabi')),
      action('Joker', () => hooks.give('joker')),
      action('Lightning', () => hooks.give('lightning')),
      action('Picks', () => hooks.offerPicks()),
      action('Rule pick', () => hooks.offerPicks(true)),
    ),
    row(
      // A real stage clear (GAME_DESIGN §7.1): two of the stage's size 8 meet at the dropper and
      // make its last cat, so the pops, the doors, the picks and the zoom all play.
      action('Clear stage', () => {
        const tier = hooks.state().lastTier - 1;
        hooks.spawnTier(tier, 0);
        hooks.spawnTier(tier, 0);
      }),
    ),
    row(
      pick,
      pickLevel,
      action('Set run', () => hooks.setPickLevel(pick.value as PickId, Number(pickLevel.value))),
    ),
    row(
      action('Flip wind', () => hooks.setWind()),
      action('Cracked cat', () => hooks.spawnCracked(Number(size.value), 0)),
      action('Crack newest', () => {
        const newest = hooks.catIds().at(-1);
        if (newest !== undefined) hooks.crackCat(newest);
      }),
    ),
    row(
      bell,
      action('Curse newest', () => hooks.curseCat(undefined, Number(bell.value))),
      action('Set bell', () => hooks.setCurseDrops(Number(bell.value))),
      die,
      action('Force die', () => hooks.forceDice(die.value as 'lucky' | 'fizzle' | 'normal')),
    ),
    row(
      action('+1000 coins', () => hooks.addCoins(1000)),
      action('+50K coins', () => hooks.addCoins(50_000)),
      action('Game over', () => hooks.forceGameOver()),
    ),
    row(
      action('Danger timeout', () => hooks.forceDangerTimeout()),
      action('Reset save', () => {
        if (window.confirm('Reset the save?')) hooks.resetSave();
      }),
    ),
    ...adsRows(ctx, hooks, adsText),
  );
  panel.append(toggle, body);
  document.body.append(panel);

  // Stage times (play time) of this run, for pacing (docs/plans/batch-20.md §9): each stage's
  // time is written down when the next one starts.
  let timedStage = 1;
  let stageStartMs = 0;
  let stageTimes: number[] = [];
  const clock = (ms: number): string => {
    const total = Math.floor(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };
  window.setInterval(() => {
    const s = hooks.state();
    if (s.playMs < stageStartMs || s.stage < timedStage) {
      // A new run.
      timedStage = s.stage;
      stageStartMs = s.playMs;
      stageTimes = [];
    } else if (s.stage > timedStage) {
      stageTimes.push(s.playMs - stageStartMs);
      timedStage = s.stage;
      stageStartMs = s.playMs;
    }
    if (body.hidden) return;
    const recent = stageTimes.slice(-6).map(clock).join(' ');
    stats.textContent =
      `fps ${ctx.game.fps.toFixed(0)}  bodies ${s.balls}  res ${s.resolution}\n` +
      `${s.screen} · ${s.runState ?? '-'} · stage ${s.stage}\n` +
      `score ${s.score}  wallet ${s.wallet}\n` +
      `combo ${s.combo}  saves ${s.luckySaves}  best stage ${s.bestStage}\n` +
      `time ${clock(s.playMs)}  this stage ${clock(s.playMs - stageStartMs)}\n` +
      `stages ${recent || '-'}`;
    adsText.textContent = describeAds(hooks, ctx.testDeviceId, lastAd);
  }, 250);
}

/** The placements' short names on the debug panel's buttons. */
const AD_LABELS: Readonly<Record<AdPlacement, string>> = {
  specialBall: 'special ball',
  luckySave: 'Lucky Save',
  doubleCoins: 'double coins',
};

/** The last test ad's placement and result, for the Ads group's text. */
let lastAd = '-';

/**
 * The Ads group (TECH_SPEC §16): the online check, consent and each placement's ad; a test ad per
 * placement; which ads to use; the EEA consent test and its reset (the Android app).
 */
function adsRows(ctx: DebugContext, hooks: GameHooks, text: HTMLElement): HTMLElement[] {
  const node = (...children: HTMLElement[]): HTMLElement => {
    const row = el('div', 'debug-row');
    row.append(...children);
    return row;
  };
  const action = (label: string, fn: () => void): HTMLButtonElement => {
    const btn = button('debug-btn', label);
    btn.addEventListener('click', fn);
    return btn;
  };
  const show = (placement: AdPlacement): void => {
    lastAd = `${placement} …`;
    void hooks.showAd(placement).then((result) => (lastAd = `${placement} → ${result}`));
  };
  const rows = [
    text,
    node(...AD_PLACEMENTS.map((p) => action(`Ad: ${AD_LABELS[p]}`, () => show(p)))),
    node(
      action('Use fake ads', () => ctx.storeFlag('ads', 'fake')),
      ctx.nativeApp
        ? action('Use AdMob test ads', () => ctx.storeFlag('ads', 'admob'))
        : action('No ads', () => ctx.storeFlag('ads', null)),
    ),
  ];
  if (ctx.nativeApp) {
    const eea = hooks.flags.consent === 'eea';
    rows.push(
      node(
        action(eea ? 'EEA consent: on' : 'EEA consent: off', () =>
          ctx.storeFlag('consent', eea ? null : 'eea'),
        ),
        action('Reset consent', () => {
          void ctx.ads.resetConsent().then(() => window.location.reload());
        }),
      ),
    );
  }
  const device = ctx.testDeviceId;
  if (device) {
    rows.push(
      node(
        action('Copy device ID', () => {
          void navigator.clipboard?.writeText(device).catch(() => undefined);
        }),
      ),
    );
  }
  return rows;
}

function describeAds(hooks: GameHooks, device: string | null, last: string): string {
  const s = hooks.adsState();
  const lines = [
    `ads ${s.kind} · ${s.online ? 'online' : 'offline'} · sdk ${s.sdk}`,
    `consent ${s.consent}`,
    ...AD_PLACEMENTS.map((p) => `${p}: ${s.placements[p]}`),
    `last ad ${last}`,
  ];
  if (device) lines.push(`device ${device}`);
  return lines.join('\n');
}

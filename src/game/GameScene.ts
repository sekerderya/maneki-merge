/**
 * The game scene (TECH_SPEC §3, §4, §6): renders a RunController and forwards pointer input to
 * it. It owns no rules: everything it shows is read from the run each frame, and the only things
 * it sends back are `drop(x)` and, with a magnet in the paw, `take(id)` for the ball the player
 * selected and confirmed (GAME_DESIGN §15.2).
 *
 * Stage clears (GAME_DESIGN §7.1) are drawn from the run's timeline every frame: the staggered
 * pops, with the next stage's textures prepared during the clear and switched in at the reveal.
 * The jar stays still when it grows (v0.33.3): the DOM's clouds and background show the growth.
 */
import Phaser from 'phaser';
import {
  BOULDER_CHIPS,
  BOULDER_SPARKS,
  COUNTDOWN_FILL,
  HANABI_SPARKS,
  COUNTDOWN_STROKE,
  SELECT_RING,
} from '../config/skin';
import { HEAVY_FIREBALL_LEVEL } from '../config/picks';
import { FIRST_STAGE, JAR_WIDTH, tierSize } from '../config/stages';
import { PAW_GRIP } from '../config/pawArt';
import { MAGNET_TAKE_MS } from '../config/timings';
import {
  AIM_DOT_SPACING,
  BOULDER_BREAK_CHIPS,
  BOULDER_HIT_SPARKS,
  BURST_SPARKS,
  COUNTDOWN_PULSE_MS,
  COUNTDOWN_PULSE_SCALE,
  DANGER_FLASH_PERIOD_MS,
  DROPPER_POP_IN_MS,
  GOLDEN_GLOW_SCALE,
  HANABI_BLAST_SPARKS,
  REDUCED_MOTION_PARTICLES,
  SELECT_RING_GAP,
  SELECT_RING_PERIOD_MS,
  SELECT_RING_WIDTH,
  SHAKE,
  SKIN_PREPARE_BUDGET_MS,
} from '../config/view';
import { PAW_ART_FADE, PAW_ART_SHOWN } from '../config/sceneSprites';
import { hexToNumber } from '../core/color';
import type { Drop } from '../core/dropQueue';
import type { GameEvents } from '../core/events';
import type { BallView } from '../physics/balls';
import { clampDropX, dropStartY, jarGeometry, MAX_DROP_RADIUS } from '../physics/geometry';
import { reducedMotion } from '../platform/motion';
import type { RunController } from '../run/RunController';
import { landingY } from './aim';
import { AimGuide } from './AimGuide';
import { BallRenderer, glowAlpha } from './BallRenderer';
import type { CatSprite } from './BallRenderer';
import { fitCamera, worldToView } from './cameraFit';
import type { CameraFit, JarFrame } from './cameraFit';
import { FallFx } from './fx/FallFx';
import { LastCatFx } from './fx/LastCatFx';
import { MergeFx } from './fx/MergeFx';
import type { PayoutKind } from './fx/MergeFx';
import { PopFx } from './fx/PopFx';
import type { PopRequest } from './fx/PopFx';
import { SparkFx } from './fx/SparkFx';
import { JarView } from './JarView';
import { PawView, pawLift } from './PawView';
import { comboShake, mergeParticleCount, mergeShake, Shake } from './shake';
import type { BallSkin, SkinFrame } from './skins/BallSkin';
import type { ArtImages } from './artImages';
import { ArtSkin } from './skins/ArtSkin';
import { CatSkin } from './skins/CatSkin';
import { PlaceholderSkin } from './skins/PlaceholderSkin';
import { SpecialSkin } from './skins/SpecialSkin';

/**
 * Which cat art the scene draws: the raster cats, the earlier vector cats (`?skin=vector`) or flat
 * placeholders (`?skin=placeholder`).
 */
export type SceneSkin = 'art' | 'vector' | 'placeholder';

export const GAME_SCENE_KEY = 'game';

/** A payout showed up on screen at (x, y) in canvas pixels. */
export type ScreenCoinsListener = (x: number, y: number, kind: PayoutKind) => void;

/**
 * Where the magnet's Take button goes (GAME_DESIGN §15.2): just above the selected ball `id`, at
 * (x, y) in canvas pixels (the top of its ring), or null when nothing is selected.
 */
export type TakePrompt = { readonly id: number; readonly x: number; readonly y: number } | null;

/** The current stage's jar on screen, in canvas pixels: its inner walls, rim and floor. */
export interface JarBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** A ball the magnet took, flying from the jar up into the paw. */
interface Flight {
  readonly sprite: CatSprite;
  readonly fromX: number;
  readonly fromY: number;
  readonly fromScale: number;
  readonly fromRotation: number;
  readonly startMs: number;
}

export class GameScene extends Phaser.Scene {
  private run: RunController | null = null;
  private unsubscribe: (() => void)[] = [];
  private skin!: BallSkin;
  private special!: SpecialSkin;
  private balls!: BallRenderer;
  private jar!: JarView;
  private fx!: MergeFx;
  private pops!: PopFx;
  private sparks!: SparkFx;
  /** The stage's last cat shining while it waits alone (GAME_DESIGN §7.1). */
  private lastCat!: LastCatFx;
  private fall!: FallFx;
  private aimGuide!: AimGuide;
  private selectRing!: Phaser.GameObjects.Graphics;
  private dropperGlow!: Phaser.GameObjects.Image;
  private dropperBody!: Phaser.GameObjects.Image;
  private dropperNumber!: Phaser.GameObjects.Image;
  private paw!: PawView;
  private countdown!: Phaser.GameObjects.Text;
  private coinsListener: ScreenCoinsListener | null = null;
  private jarBoxListener: ((box: JarBox, growing: boolean) => void) | null = null;
  private takePromptListener: ((prompt: TakePrompt) => void) | null = null;
  private shownPrompt: TakePrompt = null;
  private shownBox: JarBox | null = null;
  private shownGrowing = false;
  /** Canvas pixels at the top covered by the HUD; the jar and the dropper fit below them. */
  private insetTop = 0;
  /** Where the paw hangs (world x) and when it last let go of a cat. */
  private pawX = 0;
  private liftFromMs = -Infinity;

  /** Where the player aims, in world x (clamped per cat when shown or dropped). */
  private aimX = 0;
  private aiming = false;
  /** The ball the magnet will take once the player confirms (GAME_DESIGN §15.2), or null. */
  private selectedId: number | null = null;
  /** A touch that started with a magnet in the paw: its release selects a ball. */
  private selecting = false;
  private readonly flights: Flight[] = [];
  private popInFromMs = -Infinity;
  private nowMs = 0;
  private fit: CameraFit = { zoom: 1, centerX: 0, centerY: 0 };
  private readonly point = new Phaser.Math.Vector2();
  /** Balls popped during this frame's ticks; they pop on screen together, staggered. */
  private readonly popped: PopRequest[] = [];
  private readonly shake = new Shake();
  private readonly shakeOffset = { x: 0, y: 0 };
  /** When the danger countdown last reached a new second (it pulses). */
  private countdownPulseMs = -Infinity;
  /** The stage whose textures are being drawn ahead of an expansion's reveal (0: none). */
  private preparing = 0;

  /** `art`: the raster art (game/artImages.ts), needed by the `art` skin. */
  constructor(
    private readonly skinId: SceneSkin = 'art',
    private readonly art: ArtImages | null = null,
  ) {
    super(GAME_SCENE_KEY);
  }

  create(): void {
    this.skin =
      this.skinId === 'placeholder'
        ? new PlaceholderSkin(this.textures)
        : this.skinId === 'art' && this.art
          ? new ArtSkin(this.textures, this.art.cats)
          : new CatSkin(this.textures);
    this.skin.prepare(FIRST_STAGE, Infinity);
    this.special = new SpecialSkin(
      this.textures,
      this.skinId === 'placeholder',
      this.skinId === 'art' ? (this.art?.specials ?? null) : null,
    );

    const layer = (): Phaser.GameObjects.Layer => this.add.layer();
    const jarBack = layer();
    const aim = layer();
    const glows = layer();
    const bodies = layer();
    const numbers = layer();
    const jarFront = layer();
    const dropper = layer();
    const fx = layer();

    const art = this.skinId === 'art' ? this.art : null;
    this.jar = new JarView(this, jarBack, jarFront, this.add.graphics(), art);

    this.aimGuide = new AimGuide(this, aim);
    this.balls = new BallRenderer(this, this.skin, this.special, glows, bodies, numbers);

    const first = this.skin.body(1);
    this.dropperGlow = this.add.image(0, 0, this.special.glow().key).setVisible(false);
    this.dropperBody = this.add.image(0, 0, first.key, first.frame).setVisible(false);
    this.dropperNumber = this.add.image(0, 0, first.key, first.frame).setVisible(false);
    dropper.add([this.dropperGlow, this.dropperBody, this.dropperNumber]);
    // The paw holds the cat by the head, so it is drawn over it.
    this.paw = new PawView(this, dropper, art);

    this.fx = new MergeFx(
      this,
      fx,
      (x, y, kind) => this.reportCoins(x, y, kind),
      (tier) => this.skin.color(tier),
    );
    this.pops = new PopFx(this.balls, this.fx);
    this.sparks = new SparkFx(this, fx);
    // Heavy Drop's trails go behind the balls.
    this.fall = new FallFx(this, glows, this.sparks, (count) => this.particles(count));
    this.lastCat = new LastCatFx(
      this,
      glows,
      this.sparks,
      (count) => this.particles(count),
      () => reducedMotion(),
    );
    this.selectRing = this.add.graphics();
    fx.add(this.selectRing);
    this.countdown = this.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontStyle: '700',
        fontSize: '96px',
        color: COUNTDOWN_FILL,
        stroke: COUNTDOWN_STROKE,
        strokeThickness: 16,
      })
      .setOrigin(0.5)
      .setVisible(false);
    fx.add(this.countdown);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    this.renderer.on(Phaser.Renderer.Events.RESTORE_WEBGL, () => {
      this.skin.restore();
      this.special.restore();
      this.aimGuide.restore();
      this.jar.restore();
      this.paw.restore();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.detach());
  }

  /** Whether the player is playing (not paused, picking, expanding or over): frames that count. */
  get playing(): boolean {
    return this.run?.state === 'playing';
  }

  /** Shows a new run (the previous one, if any, is dropped). */
  attach(run: RunController): void {
    this.detach();
    this.run = run;
    this.aimX = 0;
    this.pawX = 0;
    this.aiming = false;
    this.popInFromMs = this.nowMs;
    this.liftFromMs = -Infinity;
    this.skin.setStage(run.stage);
    const on = <K extends keyof GameEvents>(type: K, fn: (p: GameEvents[K]) => void): void => {
      this.unsubscribe.push(run.events.on(type, fn));
    };
    on('dropReady', () => {
      this.popInFromMs = this.nowMs;
    });
    // The paw lets go: it lifts a little and settles back.
    on('catDropped', () => {
      this.liftFromMs = this.nowMs;
    });
    // Merge juice (GAME_DESIGN §12): pop ring, "+coins", the new cat's bump, particles in its
    // colour, gold sparks when a golden cat skipped a tier, and a shake for big cats.
    on('merged', (e) => {
      const reduced = reducedMotion();
      const { x, y } = e.at;
      const kind = e.golden ? 'golden' : 'plain';
      this.fx.payout(this.nowMs, x, y, e.newTier, run.radiusOf(e.newTier), e.coins, kind);
      this.balls.bump(e.id, this.nowMs);
      const color = hexToNumber(this.skin.color(e.newTier));
      this.sparks.mergeBurst(x, y, mergeParticleCount(e.newSize, reduced), color);
      if (e.golden) this.sparks.burst(x, y, this.particles(BURST_SPARKS.golden));
      this.addShake(mergeShake(e.newSize), SHAKE.mergeMs);
    });
    on('jackpot', (e) => {
      const { x, y } = e.at;
      this.fx.payout(this.nowMs, x, y, e.tier, run.radiusOf(e.tier), e.coins, 'jackpot');
      this.sparks.burst(x, y, this.particles(BURST_SPARKS.jackpot));
      this.addShake(SHAKE.jackpot, SHAKE.jackpotMs);
    });
    on('comboChanged', (e) => {
      this.addShake(comboShake(e.combo), SHAKE.comboMs);
    });
    on('dangerTick', () => {
      this.countdownPulseMs = this.nowMs;
    });
    on('catPopped', (e) => {
      const { x, y } = e.at;
      const radius = run.radiusOf(e.tier);
      this.popped.push({ id: e.id, tier: e.tier, radius, x, y, coins: e.coins });
    });
    // Boulders (GAME_DESIGN §15.3): a band knocked off throws steel sparks; a crumbling boulder
    // pops like a cat, without a payout, in a shower of stone chips.
    on('boulderHit', (e) => {
      this.sparks.mergeBurst(e.at.x, e.at.y, this.particles(BOULDER_HIT_SPARKS), BOULDER_SPARKS);
    });
    on('boulderBroken', (e) => {
      const { x, y } = e.at;
      this.popped.push({ id: e.id, tier: e.tier, radius: run.radiusOf(e.tier), x, y, coins: null });
      this.sparks.mergeBurst(x, y, this.particles(BOULDER_BREAK_CHIPS), BOULDER_CHIPS);
    });
    // A hanabi goes off (GAME_DESIGN §15.6): a burst of sparks and a shake; the cats it pops
    // come as `catPopped`. A hanabi or joker that just vanishes pops like a boulder.
    on('hanabiExploded', (e) => {
      const { x, y } = e.at;
      this.sparks.mergeBurst(x, y, this.particles(HANABI_BLAST_SPARKS), HANABI_SPARKS);
      this.sparks.burst(x, y, this.particles(BURST_SPARKS.golden));
      this.addShake(SHAKE.hanabi, SHAKE.hanabiMs);
    });
    // Heavy Drop's fireball lands (GAME_DESIGN §15.9): fire sparks under it and a small shake.
    on('heavyLanded', (e) => {
      if (e.level < HEAVY_FIREBALL_LEVEL) return;
      const ball = run.balls.find((b) => b.id === e.id);
      this.fall.landing(e.at.x, e.at.y + (ball?.radius ?? 0));
      this.addShake(SHAKE.heavy, SHAKE.heavyMs);
    });
    on('specialPopped', (e) => {
      const { x, y } = e.at;
      this.popped.push({ id: e.id, tier: e.tier, radius: run.radiusOf(e.tier), x, y, coins: null });
    });
    // The magnet took a ball: it flies up into the paw.
    on('ballTaken', (e) => {
      this.clearSelection();
      const sprite = this.balls.detach(e.id);
      if (!sprite) return;
      this.flights.push({
        sprite,
        fromX: e.at.x,
        fromY: e.at.y,
        fromScale: sprite.body.scaleX,
        fromRotation: sprite.body.rotation,
        startMs: this.nowMs,
      });
    });
    on('pickOffered', () => {
      this.aiming = false;
      this.clearSelection();
    });
    on('stageCleared', (e) => {
      // The last cat is the only ball left: it shines until it pops.
      const last = run.balls.find((b) => b.tier === e.tier);
      if (last) this.lastCat.start(last.id, this.nowMs);
      // The next stage's textures get drawn while the last cat settles and the picks wait.
      this.preparing = e.stage + 1;
    });
    on('expansionStarted', (e) => {
      // The shrine grows: the rim sparkles (the next stage's textures may still be drawing).
      this.preparing = e.to;
      const geo = jarGeometry(e.from);
      this.sparks.rim(geo.width, geo.rimY);
    });
    on('expansionRevealed', (e) => {
      this.preparing = 0;
      this.skin.setStage(e.stage);
      // The grown jar's rim sparkles as it settles.
      const geo = jarGeometry(e.stage);
      this.sparks.rim(geo.width, geo.rimY);
    });
    on('paused', () => {
      this.aiming = false;
      this.selecting = false;
      this.shake.clear();
      this.sparks.pause();
    });
    on('resumed', () => this.sparks.resume());
  }

  /** Particle counts shrink with `prefers-reduced-motion`. */
  private particles(count: number): number {
    return reducedMotion() ? Math.max(1, Math.round(count * REDUCED_MOTION_PARTICLES)) : count;
  }

  /** A shake of `amplitude` world units; none with `prefers-reduced-motion`. */
  private addShake(amplitude: number, durationMs: number): void {
    if (amplitude <= 0 || reducedMotion()) return;
    this.shake.add(this.nowMs, amplitude, durationMs);
  }

  /** Where payouts appear on screen, for the coin flights to the HUD. */
  setCoinsListener(listener: ScreenCoinsListener | null): void {
    this.coinsListener = listener;
  }

  /** Where the magnet's Take button goes, whenever it changes (GAME_DESIGN §15.2). */
  setTakePromptListener(listener: ((prompt: TakePrompt) => void) | null): void {
    this.takePromptListener = listener;
    this.shownPrompt = null;
  }

  /**
   * The player confirmed the selection (the Take button): the magnet takes the selected ball.
   * Returns whether it did.
   */
  confirmTake(): boolean {
    const id = this.selectedId;
    const run = this.run;
    if (id === null || !run) return false;
    const taken = run.take(id);
    this.clearSelection();
    return taken;
  }

  private reportCoins(x: number, y: number, kind: PayoutKind): void {
    if (!this.coinsListener) return;
    const cam = this.cameras.main;
    const at = worldToView(this.fit, cam.width, cam.height, x, y);
    this.coinsListener(at.x, at.y, kind);
  }

  /** The HUD covers this many canvas pixels at the top; the jar fits below them. */
  setInsetTop(pixels: number): void {
    this.insetTop = Math.max(0, pixels);
  }

  /**
   * Called whenever the jar's box on screen changes (resize, HUD size), in canvas pixels, and
   * when the jar starts or stops growing (the DOM hides its glass meanwhile).
   */
  setJarBoxListener(listener: ((box: JarBox, growing: boolean) => void) | null): void {
    this.jarBoxListener = listener;
    this.shownBox = null;
  }

  /**
   * The current stage's jar on screen in canvas pixels, or null without a run. At both ends of
   * an expansion the jar fills the same box, so banners and the garden behind it anchor to it.
   */
  jarBox(): JarBox | null {
    const run = this.run;
    if (!run) return null;
    const cam = this.cameras.main;
    const geo = run.geometry;
    const fit = fitCamera(geo, cam.width, cam.height, undefined, this.insetTop);
    const rim = worldToView(fit, cam.width, cam.height, -geo.halfWidth, geo.rimY);
    const floor = worldToView(fit, cam.width, cam.height, geo.halfWidth, 0);
    return { left: rim.x, right: floor.x, top: rim.y, bottom: floor.y };
  }

  detach(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    this.run = null;
    this.popped.length = 0;
    this.preparing = 0;
    this.shake.clear();
    this.countdownPulseMs = -Infinity;
    this.clearSelection();
    this.paw?.hide();
    this.pops?.clear();
    this.endFlights();
    this.balls?.clear();
    this.fx?.clear();
    this.sparks?.clear();
    this.fall?.clear();
    this.lastCat?.clear();
  }

  override update(time: number, delta: number): void {
    this.nowMs = time;
    const run = this.run;
    if (!run) return;
    run.update(delta);
    if (this.popped.length > 0) {
      this.pops.popAll(this.nowMs, this.popped);
      this.popped.length = 0;
    }
    // Physics is paused during the zoom, so drawing the next stage's textures costs no frames.
    if (this.preparing && this.skin.prepare(this.preparing, SKIN_PREPARE_BUDGET_MS)) {
      this.preparing = 0;
    }
    this.render(run);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  private render(run: RunController): void {
    // The camera frames the jar (TECH_SPEC §4); it holds still through a growth too.
    const geo = run.geometry;
    const cam = this.cameras.main;
    this.fit = fitCamera(geo, cam.width, cam.height, undefined, this.insetTop);
    this.reportJarBox(false);
    const shake = this.shake.offset(this.nowMs, this.shakeOffset);
    cam.setZoom(this.fit.zoom).centerOn(this.fit.centerX + shake.x, this.fit.centerY + shake.y);
    this.fx.setResolution(this.fit.zoom);

    const danger = run.dangerActive;
    const flash = danger ? Math.floor(this.nowMs / (DANGER_FLASH_PERIOD_MS / 2)) % 2 === 0 : null;
    this.jar.draw(geo.width, flash, false);
    this.balls.sync(run.balls, this.nowMs);
    this.renderDropper(run);
    this.renderSelection(run);
    this.renderFlights(run);
    this.renderCountdown(run, geo);
    this.lastCat.update(this.nowMs, run.balls, run.state === 'paused');
    this.fall.update(this.nowMs, run.balls, run.levelOf('heavyDrop'), run.state === 'paused');
    this.pops.update(this.nowMs);
    this.fx.update(this.nowMs);
  }

  /** The texture of the dropper's ball: a cat, a boulder, a hanabi, a joker or the magnet. */
  private dropFrame(item: Drop, stage: number): SkinFrame {
    if (item.kind === 'magnet') return this.special.magnet();
    if (item.kind === 'cat') return this.skin.body(item.tier);
    const { kind, tier, hits } = item;
    return this.balls.frameOf({ kind, tier, size: tierSize(tier, stage), hitsLeft: hits });
  }

  private renderDropper(run: RunController): void {
    const geo = run.geometry;
    const item = run.current;
    const radius = run.radiusOf(item.tier);
    // A ball bigger than the biggest drop (a magnet's catch) is shown at the biggest drop's size.
    const shown = Math.min(radius, MAX_DROP_RADIUS);
    // The magnet hangs in the middle; it isn't aimed.
    if (item.kind === 'magnet') this.pawX = 0;
    else if (run.state === 'playing') this.pawX = clampDropX(this.aimX, radius, geo);
    const x = this.pawX;
    this.aimGuide.hide();

    // The paw hangs over the jar whenever the jar is not growing; it keeps its place while the
    // next cat comes, and lifts a little when it lets go of one. With the raster art it floats,
    // its arm fading out a little above the wrist; otherwise the arm reaches up off the screen.
    if (run.expansion) {
      this.paw.hide();
    } else {
      const top = this.fit.centerY - this.cameras.main.height / this.fit.zoom / 2;
      const y = geo.dropY - PAW_GRIP * shown - pawLift(this.nowMs - this.liftFromMs);
      if (this.art) this.paw.show(x, y, y - PAW_ART_SHOWN, PAW_ART_FADE);
      else this.paw.show(x, y, top - AIM_DOT_SPACING);
    }

    const show = run.state === 'playing' && (run.canDrop || run.canTake);
    this.dropperBody.setVisible(show);
    this.dropperGlow.setVisible(show && item.golden);
    if (!show) {
      this.dropperNumber.setVisible(false);
      return;
    }

    const t = Math.min(1, (this.nowMs - this.popInFromMs) / DROPPER_POP_IN_MS);
    const pop = backOut(t) * (shown / radius);
    const body = this.dropFrame(item, run.stage);
    this.dropperBody
      .setTexture(body.key, body.frame)
      .setPosition(x, geo.dropY)
      .setRotation(0)
      .setScale(body.unitsPerPixel * pop);
    if (item.golden) {
      const glow = this.special.glow();
      this.dropperGlow
        .setPosition(x, geo.dropY)
        .setScale(glow.unitsPerPixel * radius * GOLDEN_GLOW_SCALE * pop)
        .setAlpha(glowAlpha(this.nowMs));
    }
    const number = item.kind === 'cat' ? this.skin.number(item.tier) : null;
    this.dropperNumber.setVisible(number !== null);
    if (number) {
      this.dropperNumber
        .setTexture(number.key)
        .setPosition(x, geo.dropY + number.offset * radius * pop)
        .setScale(number.unitsPerPixel * pop);
    }
    // The magnet is used on a ball in the jar, not dropped: no aim guide.
    if (item.kind === 'magnet') return;

    // Aim guide: a dotted line from the ball down to where it first touches something, and a
    // faint ghost of the ball there, at its true size.
    const fromY = dropStartY(radius, geo);
    const land = landingY(x, radius, fromY, run.balls);
    this.aimGuide.draw(x, geo.dropY + shown + AIM_DOT_SPACING, land + radius, land, radius);
  }

  /**
   * The magnet's selection (GAME_DESIGN §15.2): a pulsing gold ring round the selected ball, and
   * the Take button's place above it. The selection ends when the ball leaves the jar, the magnet
   * leaves the paw, or a stage clear starts.
   */
  private renderSelection(run: RunController): void {
    const g = this.selectRing.clear();
    const id = this.selectedId;
    if (id === null) return;
    const ball = this.findBall(run, id);
    const stillMagnet =
      run.current.kind === 'magnet' && (run.state === 'playing' || run.state === 'paused');
    if (!ball || !stillMagnet) {
      this.clearSelection();
      return;
    }
    const phase = (this.nowMs % SELECT_RING_PERIOD_MS) / SELECT_RING_PERIOD_MS;
    const alpha = 0.7 + 0.3 * Math.sin(phase * 2 * Math.PI);
    const ring = ball.radius + SELECT_RING_GAP;
    g.lineStyle(SELECT_RING_WIDTH, SELECT_RING, alpha);
    g.strokeCircle(ball.x, ball.y, ring);
    if (run.state !== 'playing') {
      this.reportPrompt(null);
      return;
    }
    const cam = this.cameras.main;
    const top = worldToView(this.fit, cam.width, cam.height, ball.x, ball.y - ring);
    this.reportPrompt({ id, x: Math.round(top.x), y: Math.round(top.y) });
  }

  /** Taken balls fly up into the paw over MAGNET_TAKE_MS, shrinking to the dropper's size. */
  private renderFlights(run: RunController): void {
    if (this.flights.length === 0) return;
    const geo = run.geometry;
    const radius = run.radiusOf(run.current.tier);
    const shrink = Math.min(radius, MAX_DROP_RADIUS) / radius;
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i] as Flight;
      const t = Math.min(1, (this.nowMs - f.startMs) / MAGNET_TAKE_MS);
      if (t >= 1 || run.state === 'over') {
        this.balls.recycle(f.sprite);
        this.flights.splice(i, 1);
        continue;
      }
      const ease = 1 - (1 - t) * (1 - t);
      const scale = f.fromScale * (1 + (shrink - 1) * ease);
      f.sprite.body
        .setPosition(f.fromX + (this.pawX - f.fromX) * ease, f.fromY + (geo.dropY - f.fromY) * ease)
        .setRotation(f.fromRotation * (1 - ease))
        .setScale(scale);
      f.sprite.number.setVisible(false);
    }
  }

  private endFlights(): void {
    for (const f of this.flights) this.balls?.recycle(f.sprite);
    this.flights.length = 0;
  }

  private findBall(run: RunController, id: number): BallView | null {
    for (const ball of run.balls) if (ball.id === id) return ball;
    return null;
  }

  private clearSelection(): void {
    this.selectedId = null;
    this.selecting = false;
    this.selectRing?.clear();
    this.reportPrompt(null);
  }

  private reportPrompt(prompt: TakePrompt): void {
    const old = this.shownPrompt;
    const same =
      old === prompt ||
      (old !== null &&
        prompt !== null &&
        old.id === prompt.id &&
        old.x === prompt.x &&
        old.y === prompt.y);
    if (same) return;
    this.shownPrompt = prompt;
    this.takePromptListener?.(prompt);
  }

  /** Tells the listener when the stage jar's box on screen moved, or the jar starts or stops growing. */
  private reportJarBox(growing: boolean): void {
    if (!this.jarBoxListener) return;
    const box = this.jarBox();
    const old = this.shownBox;
    const same =
      old !== null &&
      box !== null &&
      old.left === box.left &&
      old.right === box.right &&
      old.top === box.top &&
      old.bottom === box.bottom &&
      growing === this.shownGrowing;
    if (!box || same) return;
    this.shownBox = box;
    this.shownGrowing = growing;
    this.jarBoxListener(box, growing);
  }

  private renderCountdown(run: RunController, frame: JarFrame): void {
    const show = run.dangerActive && run.state === 'playing';
    this.countdown.setVisible(show);
    if (!show) return;
    // The jar grows during the zoom; the countdown grows with it.
    const scale = frame.width / JAR_WIDTH;
    const resolution = this.fit.zoom * scale * (1 + COUNTDOWN_PULSE_SCALE);
    const t = (this.nowMs - this.countdownPulseMs) / COUNTDOWN_PULSE_MS;
    const pulse = t >= 0 && t < 1 ? 1 + COUNTDOWN_PULSE_SCALE * (1 - t) * (1 - t) : 1;
    if (this.countdown.style.resolution !== resolution) this.countdown.setResolution(resolution);
    this.countdown
      .setText(String(Math.max(1, Math.ceil(run.dangerRemainingMs / 1000))))
      .setScale(scale * pulse)
      .setPosition(0, -frame.height * 0.82);
  }

  // ── Input (GAME_DESIGN §3, §15.2) ──────────────────────────────────────────

  private worldPoint(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y, this.point);
  }

  /** With a magnet in the paw, a touch selects a ball instead of aiming. */
  private get magnetMode(): boolean {
    return this.run?.state === 'playing' && this.run.current.kind === 'magnet';
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.run?.state !== 'playing') return;
    if (this.magnetMode) {
      this.selecting = true;
      return;
    }
    this.aiming = true;
    this.aimX = this.clampAim(this.worldPoint(pointer).x);
  }

  /** Drag to aim; a mouse aims by moving without a button too. */
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.run?.state !== 'playing' || this.magnetMode) return;
    if (!this.aiming && pointer.wasTouch) return;
    this.aimX = this.clampAim(this.worldPoint(pointer).x);
  }

  /**
   * Release drops (ignored during the cooldown); a tap drops at the tapped x. With a magnet, a tap
   * on a landed ball selects it and a tap anywhere else clears the selection.
   */
  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    const run = this.run;
    if (this.selecting) {
      this.selecting = false;
      if (!run || !this.magnetMode || !run.canTake) return;
      const { x, y } = this.worldPoint(pointer);
      const ball = this.ballAt(run, x, y);
      if (ball) this.selectedId = ball.id;
      else this.clearSelection();
      return;
    }
    if (!this.aiming) return;
    this.aiming = false;
    if (run?.state !== 'playing') return;
    this.aimX = this.clampAim(this.worldPoint(pointer).x);
    run.drop(this.aimX);
  }

  /** The takeable ball under a world point: the one whose centre is nearest, relative to its size. */
  private ballAt(run: RunController, x: number, y: number): BallView | null {
    let best: BallView | null = null;
    let bestScore = 1;
    for (const ball of run.balls) {
      if (!run.takeable(ball)) continue;
      const score = Math.hypot(ball.x - x, ball.y - y) / ball.radius;
      if (score <= bestScore) {
        best = ball;
        bestScore = score;
      }
    }
    return best;
  }

  private clampAim(x: number): number {
    const half = this.run?.geometry.halfWidth ?? 0;
    return Math.max(-half, Math.min(half, x));
  }
}

/** Ease-out with a small overshoot, for the next cat popping into the dropper. */
function backOut(t: number): number {
  const c = 1.70158;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

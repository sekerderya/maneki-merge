/**
 * The game scene (TECH_SPEC §3, §4, §6): renders a RunController and forwards pointer input to
 * it. It owns no rules: everything it shows is read from the run each frame, and the only thing
 * it sends back is `drop(x)`.
 *
 * Expansions (GAME_DESIGN §7.1) are drawn from the run's timeline every frame: the stage clear as
 * staggered pops, then camera, walls and rim from `expansionFrames`, with the next stage's
 * textures prepared during the zoom and switched in at the reveal.
 */
import Phaser from 'phaser';
import { AIM_LINE_ALPHA, AIM_LINE_COLOR, COUNTDOWN_FILL, COUNTDOWN_STROKE } from '../config/skin';
import { FIRST_STAGE, JAR_WIDTH } from '../config/stages';
import { PAW_GRIP } from '../config/pawArt';
import {
  AIM_DOT_RADIUS,
  AIM_DOT_SPACING,
  AIM_GHOST_ALPHA,
  AIM_LINE_WIDTH,
  BURST_SPARKS,
  COUNTDOWN_PULSE_MS,
  COUNTDOWN_PULSE_SCALE,
  DANGER_FLASH_PERIOD_MS,
  DROPPER_POP_IN_MS,
  REDUCED_MOTION_PARTICLES,
  SHAKE,
  SKIN_PREPARE_BUDGET_MS,
} from '../config/view';
import { hexToNumber } from '../core/color';
import type { GameEvents } from '../core/events';
import { clampDropX, floorRestY, jarGeometry } from '../physics/geometry';
import { reducedMotion } from '../platform/motion';
import type { RunController } from '../run/RunController';
import { landingY } from './aim';
import { BallRenderer } from './BallRenderer';
import { fitCamera, worldToView } from './cameraFit';
import type { CameraFit, JarFrame } from './cameraFit';
import { expansionFrames } from './expansionView';
import { MergeFx } from './fx/MergeFx';
import type { PayoutKind } from './fx/MergeFx';
import { PopFx } from './fx/PopFx';
import type { PopRequest } from './fx/PopFx';
import { SparkFx } from './fx/SparkFx';
import { JarView } from './JarView';
import { PawView, pawLift } from './PawView';
import { comboShake, mergeParticleCount, mergeShake, Shake } from './shake';
import type { BallSkin } from './skins/BallSkin';
import type { ArtImages } from './artImages';
import { ArtSkin } from './skins/ArtSkin';
import { CatSkin } from './skins/CatSkin';
import { PlaceholderSkin } from './skins/PlaceholderSkin';

/**
 * Which cat art the scene draws: the raster cats, the earlier vector cats (`?skin=vector`) or flat
 * placeholders (`?skin=placeholder`).
 */
export type SceneSkin = 'art' | 'vector' | 'placeholder';

export const GAME_SCENE_KEY = 'game';

/** A payout showed up on screen at (x, y) in canvas pixels. */
export type ScreenCoinsListener = (x: number, y: number, kind: PayoutKind) => void;

/** The current stage's jar on screen, in canvas pixels: its inner walls, rim and floor. */
export interface JarBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export class GameScene extends Phaser.Scene {
  private run: RunController | null = null;
  private unsubscribe: (() => void)[] = [];
  private skin!: BallSkin;
  private balls!: BallRenderer;
  private jar!: JarView;
  private fx!: MergeFx;
  private pops!: PopFx;
  private sparks!: SparkFx;
  private aimLine!: Phaser.GameObjects.Graphics;
  private dropperBody!: Phaser.GameObjects.Image;
  private dropperNumber!: Phaser.GameObjects.Image;
  private paw!: PawView;
  private countdown!: Phaser.GameObjects.Text;
  private coinsListener: ScreenCoinsListener | null = null;
  private jarBoxListener: ((box: JarBox, growing: boolean) => void) | null = null;
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
  private popInFromMs = -Infinity;
  private nowMs = 0;
  private fit: CameraFit = { zoom: 1, centerX: 0, centerY: 0 };
  private readonly point = new Phaser.Math.Vector2();
  /** Cats popped during this frame's ticks; they pop on screen together, staggered. */
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

    const layer = (): Phaser.GameObjects.Layer => this.add.layer();
    const jarBack = layer();
    const aim = layer();
    const bodies = layer();
    const numbers = layer();
    const jarFront = layer();
    const dropper = layer();
    const fx = layer();

    const art = this.skinId === 'art' ? this.art : null;
    this.jar = new JarView(this, jarBack, jarFront, this.add.graphics(), art);

    this.aimLine = this.add.graphics();
    aim.add(this.aimLine);
    this.balls = new BallRenderer(this, this.skin, bodies, numbers);

    const first = this.skin.body(1).key;
    this.dropperBody = this.add.image(0, 0, first).setVisible(false);
    this.dropperNumber = this.add.image(0, 0, first).setVisible(false);
    dropper.add([this.dropperBody, this.dropperNumber]);
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
      this.jar.restore();
      this.paw.restore();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.detach());
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
    // colour, gold sparks for golden merges, and a shake for big cats.
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
      if (e.golden) this.sparks.burst(x, y, this.particles(BURST_SPARKS.golden));
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
    on('expansionStarted', (e) => {
      // The zoom starts: the rim sparkles, and the next stage's textures get drawn meanwhile.
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
    this.paw?.hide();
    this.pops?.clear();
    this.balls?.clear();
    this.fx?.clear();
    this.sparks?.clear();
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
    // Camera, walls and rim all come from the run's timeline (TECH_SPEC §4), so a resize or a
    // pause in the middle of an expansion simply shows the right frame next time.
    const frames = expansionFrames(run.geometry, run.expansion, run.renderAlpha);
    const cam = this.cameras.main;
    this.fit = fitCamera(frames.camera, cam.width, cam.height, undefined, this.insetTop);
    this.reportJarBox(run.expansion !== null);
    const shake = this.shake.offset(this.nowMs, this.shakeOffset);
    cam.setZoom(this.fit.zoom).centerOn(this.fit.centerX + shake.x, this.fit.centerY + shake.y);
    this.fx.setResolution(this.fit.zoom);

    const danger = run.dangerActive;
    const flash = danger ? Math.floor(this.nowMs / (DANGER_FLASH_PERIOD_MS / 2)) % 2 === 0 : null;
    this.jar.draw(frames.jar.width, flash, run.expansion !== null);
    this.balls.sync(run.balls, this.nowMs);
    this.renderDropper(run);
    this.renderCountdown(run, frames.jar);
    this.pops.update(this.nowMs);
    this.fx.update(this.nowMs);
  }

  private renderDropper(run: RunController): void {
    const geo = run.geometry;
    const cat = run.current;
    const radius = run.radiusOf(cat.tier);
    if (run.state === 'playing') this.pawX = clampDropX(this.aimX, radius, geo);
    const x = this.pawX;
    this.aimLine.clear();

    // The paw hangs over the jar whenever the jar is not growing; it keeps its place while the
    // next cat comes, and lifts a little when it lets go of one.
    if (run.expansion) {
      this.paw.hide();
    } else {
      const top = this.fit.centerY - this.cameras.main.height / this.fit.zoom / 2;
      const y = geo.dropY - PAW_GRIP * radius - pawLift(this.nowMs - this.liftFromMs);
      this.paw.show(x, y, top - AIM_DOT_SPACING);
    }

    const show = run.state === 'playing' && run.canDrop;
    this.dropperBody.setVisible(show);
    this.dropperNumber.setVisible(show);
    if (!show) return;

    const t = Math.min(1, (this.nowMs - this.popInFromMs) / DROPPER_POP_IN_MS);
    const pop = backOut(t);
    const body = this.skin.body(cat.tier);
    this.dropperBody
      .setTexture(body.key)
      .setPosition(x, geo.dropY)
      .setRotation(0)
      .setScale(body.unitsPerPixel * pop);
    const number = this.skin.number(cat.tier);
    this.dropperNumber.setVisible(number !== null);
    if (number) {
      this.dropperNumber
        .setTexture(number.key)
        .setPosition(x, geo.dropY + number.offset * radius * pop)
        .setScale(number.unitsPerPixel * pop);
    }

    // Aim guide: a dotted line from the cat down to where it first touches something, and a
    // faint ghost of the cat there.
    const land = landingY(x, radius, geo.dropY, run.balls, floorRestY(x, radius, geo));
    const g = this.aimLine;
    g.fillStyle(AIM_LINE_COLOR, AIM_LINE_ALPHA);
    for (let y = geo.dropY + radius + AIM_DOT_SPACING; y < land + radius; y += AIM_DOT_SPACING) {
      g.fillCircle(x, y, AIM_DOT_RADIUS);
    }
    g.lineStyle(AIM_LINE_WIDTH, AIM_LINE_COLOR, AIM_LINE_ALPHA * AIM_GHOST_ALPHA);
    g.strokeCircle(x, land, radius);
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

  // ── Input (GAME_DESIGN §3) ─────────────────────────────────────────────────

  private worldX(pointer: Phaser.Input.Pointer): number {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y, this.point).x;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.run?.state !== 'playing') return;
    this.aiming = true;
    this.aimX = this.clampAim(this.worldX(pointer));
  }

  /** Drag to aim; a mouse aims by moving without a button too. */
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.run?.state !== 'playing') return;
    if (!this.aiming && pointer.wasTouch) return;
    this.aimX = this.clampAim(this.worldX(pointer));
  }

  /** Release drops (ignored during the cooldown); a tap drops at the tapped x. */
  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.aiming) return;
    this.aiming = false;
    const run = this.run;
    if (run?.state !== 'playing') return;
    this.aimX = this.clampAim(this.worldX(pointer));
    run.drop(this.aimX);
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

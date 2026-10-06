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
import {
  AIM_DASH,
  AIM_GAP,
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
import { clampDropX, jarGeometry } from '../physics/geometry';
import { reducedMotion } from '../platform/motion';
import type { RunController } from '../run/RunController';
import { landingY } from './aim';
import { BallRenderer } from './BallRenderer';
import { fitCamera, worldToView } from './cameraFit';
import type { CameraFit, JarFrame } from './cameraFit';
import { expansionFrames } from './expansionView';
import { createGlintTexture, GLINT_KEY, placeGlint } from './fx/glint';
import { MergeFx } from './fx/MergeFx';
import { PopFx } from './fx/PopFx';
import type { PopRequest } from './fx/PopFx';
import { SparkFx } from './fx/SparkFx';
import { JarView } from './JarView';
import { comboShake, mergeParticleCount, mergeShake, Shake } from './shake';
import type { BallSkin } from './skins/BallSkin';
import { CatSkin } from './skins/CatSkin';
import { PlaceholderSkin } from './skins/PlaceholderSkin';

/** Which cat art the scene draws: the lucky cats, or flat placeholders (`?skin=placeholder`). */
export type SceneSkin = 'cat' | 'placeholder';

export const GAME_SCENE_KEY = 'game';

/** A payout showed up on screen at (x, y) in canvas pixels; `big` for a Jackpot. */
export type ScreenCoinsListener = (x: number, y: number, big: boolean) => void;

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
  private dropperGlint!: Phaser.GameObjects.Image;
  private countdown!: Phaser.GameObjects.Text;
  private coinsListener: ScreenCoinsListener | null = null;

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

  constructor(private readonly skinId: SceneSkin = 'cat') {
    super(GAME_SCENE_KEY);
  }

  create(): void {
    this.skin =
      this.skinId === 'placeholder'
        ? new PlaceholderSkin(this.textures)
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

    const back = this.add.graphics();
    const front = this.add.graphics();
    const rim = this.add.graphics();
    jarBack.add(back);
    jarFront.add([front, rim]);
    this.jar = new JarView(back, front, rim);

    this.aimLine = this.add.graphics();
    aim.add(this.aimLine);
    this.balls = new BallRenderer(this, this.skin, bodies, numbers);

    const first = this.skin.body(1, false).key;
    this.dropperBody = this.add.image(0, 0, first).setVisible(false);
    this.dropperNumber = this.add.image(0, 0, first).setVisible(false);
    createGlintTexture(this.textures);
    this.dropperGlint = this.add.image(0, 0, GLINT_KEY).setVisible(false);
    dropper.add([this.dropperBody, this.dropperNumber, this.dropperGlint]);

    this.fx = new MergeFx(
      this,
      fx,
      (x, y, big) => this.reportCoins(x, y, big),
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
    this.renderer.on(Phaser.Renderer.Events.RESTORE_WEBGL, () => this.skin.restore());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.detach());
  }

  /** Shows a new run (the previous one, if any, is dropped). */
  attach(run: RunController): void {
    this.detach();
    this.run = run;
    this.aimX = 0;
    this.aiming = false;
    this.popInFromMs = this.nowMs;
    this.skin.setStage(run.stage);
    const on = <K extends keyof GameEvents>(type: K, fn: (p: GameEvents[K]) => void): void => {
      this.unsubscribe.push(run.events.on(type, fn));
    };
    on('dropReady', () => {
      this.popInFromMs = this.nowMs;
    });
    // Merge juice (GAME_DESIGN §12): pop ring, "+coins", the new cat's bump, particles in its
    // colour, gold sparks for golden merges, and a shake for big cats.
    on('merged', (e) => {
      const reduced = reducedMotion();
      const { x, y } = e.at;
      this.fx.payout(this.nowMs, x, y, e.newTier, run.radiusOf(e.newTier), e.coins);
      this.balls.bump(e.id, this.nowMs);
      const color = hexToNumber(this.skin.color(e.newTier));
      this.sparks.mergeBurst(x, y, mergeParticleCount(e.newSize, reduced), color);
      if (e.golden) this.sparks.burst(x, y, this.particles(BURST_SPARKS.golden));
      this.addShake(mergeShake(e.newSize), SHAKE.mergeMs);
    });
    on('jackpot', (e) => {
      const { x, y } = e.at;
      this.fx.payout(this.nowMs, x, y, e.tier, run.radiusOf(e.tier), e.coins, true);
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

  private reportCoins(x: number, y: number, big: boolean): void {
    if (!this.coinsListener) return;
    const cam = this.cameras.main;
    const at = worldToView(this.fit, cam.width, cam.height, x, y);
    this.coinsListener(at.x, at.y, big);
  }

  /**
   * The current stage's jar on screen: rim and floor y in canvas pixels, or null without a run.
   * At both ends of an expansion the jar fills the same box, so banners can anchor to it.
   */
  jarBox(): { top: number; bottom: number } | null {
    const run = this.run;
    if (!run) return null;
    const cam = this.cameras.main;
    const fit = fitCamera(run.geometry, cam.width, cam.height);
    return {
      top: worldToView(fit, cam.width, cam.height, 0, run.geometry.rimY).y,
      bottom: worldToView(fit, cam.width, cam.height, 0, 0).y,
    };
  }

  detach(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    this.run = null;
    this.popped.length = 0;
    this.preparing = 0;
    this.shake.clear();
    this.countdownPulseMs = -Infinity;
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
    this.fit = fitCamera(frames.camera, cam.width, cam.height);
    const shake = this.shake.offset(this.nowMs, this.shakeOffset);
    cam.setZoom(this.fit.zoom).centerOn(this.fit.centerX + shake.x, this.fit.centerY + shake.y);
    this.fx.setResolution(this.fit.zoom);

    const danger = run.dangerActive;
    const flash = danger ? Math.floor(this.nowMs / (DANGER_FLASH_PERIOD_MS / 2)) % 2 === 0 : null;
    this.jar.draw(frames.jar.width, frames.jar.height, flash);
    this.balls.sync(run.balls, this.nowMs);
    this.renderDropper(run);
    this.renderCountdown(run, frames.jar);
    this.pops.update(this.nowMs);
    this.fx.update(this.nowMs);
  }

  private renderDropper(run: RunController): void {
    const show = run.state === 'playing' && run.canDrop;
    this.dropperBody.setVisible(show);
    this.dropperNumber.setVisible(show);
    this.dropperGlint.setVisible(false);
    this.aimLine.clear();
    if (!show) return;

    const geo = run.geometry;
    const cat = run.current;
    const radius = run.radiusOf(cat.tier);
    const x = clampDropX(this.aimX, radius, geo);
    const t = Math.min(1, (this.nowMs - this.popInFromMs) / DROPPER_POP_IN_MS);
    const pop = backOut(t);

    const body = this.skin.body(cat.tier, cat.golden);
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
    if (cat.golden) placeGlint(this.dropperGlint, x, geo.dropY, radius * pop, this.nowMs, 0);

    // Aim guide: a dashed line from the cat down to where it first touches something.
    const land = landingY(x, radius, geo.dropY, run.balls);
    const g = this.aimLine;
    g.lineStyle(AIM_LINE_WIDTH, AIM_LINE_COLOR, AIM_LINE_ALPHA);
    const top = geo.dropY + radius;
    const bottom = land + radius;
    for (let y = top + AIM_GAP; y < bottom; y += AIM_DASH + AIM_GAP) {
      g.lineBetween(x, y, x, Math.min(y + AIM_DASH, bottom));
    }
    // A faint ghost of the cat where it lands.
    g.lineStyle(AIM_LINE_WIDTH, AIM_LINE_COLOR, AIM_LINE_ALPHA * 0.6);
    g.strokeCircle(x, land, radius);
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

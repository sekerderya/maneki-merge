/**
 * Game layer (TECH_SPEC §3, §6): the Phaser game that renders a run and forwards input.
 *
 * The canvas fills the play area, the whole screen; the DOM HUD floats over its top, and the jar
 * fits below the HUD. It renders at devicePixelRatio (capped at MAX_RENDER_RESOLUTION) and is
 * shown at CSS size, so cats and numbers stay sharp. The game loop sleeps while the menu is up.
 */
import Phaser from 'phaser';
import { MAX_RENDER_RESOLUTION } from '../config/view';
import type { RunController } from '../run/RunController';
import { GAME_SCENE_KEY, GameScene } from './GameScene';
import type { JarBox, SceneSkin } from './GameScene';
import type { ArtImages } from './artImages';
import type { PayoutKind } from './fx/MergeFx';

export { loadArt } from './artImages';
export type { ArtImages } from './artImages';

export interface GameView {
  /** Shows a run (replacing the previous one) and wakes the loop. */
  show(run: RunController): void;
  /** Stops rendering (menu visible). */
  sleep(): void;
  /** Re-reads the play area's size (also done automatically on resize). */
  refit(): void;
  /** The jar's inner walls, rim and floor in CSS pixels of the play area, or null. */
  jarBox(): JarBox | null;
  /**
   * Called with the jar's box (CSS pixels of the play area) whenever it moves on screen, and
   * whether the jar is growing (the canvas draws the glass then).
   */
  onJarBox(listener: (box: JarBox, growing: boolean) => void): void;
  /**
   * Called whenever a payout shows up on screen (merge, Jackpot, popping cat), with its point in
   * CSS pixels from the play area's top-left corner, and what paid.
   */
  onCoins(listener: (x: number, y: number, kind: PayoutKind) => void): void;
  /** Frames per second actually rendered, for the debug panel. */
  readonly fps: number;
}

/**
 * `insetTop` tells how many CSS pixels at the top of the play area the HUD covers; the jar and
 * the dropper fit below them.
 */
export function createGame(
  parent: HTMLElement,
  skin: SceneSkin = 'art',
  insetTop: () => number = () => 0,
  art: ArtImages | null = null,
): GameView {
  let resolution = 1;
  let pending: RunController | null = null;
  let scene: GameScene | null = null;
  /** Whether the loop should run (a run is on screen). */
  let awake = false;
  /** Set after the first frame: before it, Phaser hasn't started its loop yet. */
  let looping = false;
  let coinsListener: ((x: number, y: number, kind: PayoutKind) => void) | null = null;
  let jarBoxListener: ((box: JarBox, growing: boolean) => void) | null = null;
  const forwardCoins = (x: number, y: number, kind: PayoutKind): void =>
    coinsListener?.(x / resolution, y / resolution, kind);
  const toCss = (box: JarBox): JarBox => ({
    left: box.left / resolution,
    right: box.right / resolution,
    top: box.top / resolution,
    bottom: box.bottom / resolution,
  });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    banner: false,
    disableContextMenu: true,
    autoFocus: false,
    scale: { mode: Phaser.Scale.NONE, width: 1, height: 1 },
    input: { activePointers: 1, keyboard: false, gamepad: false },
    render: { antialias: true, powerPreference: 'high-performance' },
    scene: new GameScene(skin, art),
    callbacks: {
      postBoot: (booted) => {
        scene = booted.scene.getScene(GAME_SCENE_KEY) as GameScene;
        scene.setCoinsListener(forwardCoins);
        scene.setJarBoxListener((box, growing) => jarBoxListener?.(toCss(box), growing));
        // The loop starts right after postBoot; put it to sleep until a run is shown.
        booted.events.once(Phaser.Core.Events.POST_RENDER, () => {
          looping = true;
          if (!awake) booted.loop.sleep();
        });
        refit();
        if (pending) show(pending);
      },
    },
  });

  function refit(): void {
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    // Hidden (the menu is up): keep the last size.
    if (width === 0 || height === 0 || !game.isBooted) return;
    const next = Math.min(window.devicePixelRatio || 1, MAX_RENDER_RESOLUTION);
    if (next !== resolution) {
      resolution = next;
      game.scale.setZoom(1 / resolution);
    }
    const w = Math.round(width * resolution);
    const h = Math.round(height * resolution);
    if (w !== game.scale.width || h !== game.scale.height) game.scale.resize(w, h);
    // Exactly the play area's CSS size, whatever the rounding above did.
    game.canvas.style.width = `${width}px`;
    game.canvas.style.height = `${height}px`;
    game.scale.updateBounds();
    scene?.cameras.main.setSize(w, h);
    scene?.setInsetTop(insetTop() * resolution);
  }

  function show(run: RunController): void {
    if (!scene) {
      pending = run;
      return;
    }
    pending = null;
    awake = true;
    scene.attach(run);
    refit();
    if (looping && !game.loop.running) game.loop.wake();
  }

  new ResizeObserver(() => refit()).observe(parent);
  window.addEventListener('resize', refit);

  return {
    show,
    sleep() {
      awake = false;
      if (looping && game.loop.running) game.loop.sleep();
    },
    refit,
    onCoins(listener) {
      coinsListener = listener;
    },
    jarBox() {
      const box = scene?.jarBox();
      return box ? toCss(box) : null;
    },
    onJarBox(listener) {
      jarBoxListener = listener;
    },
    get fps() {
      return game.loop?.actualFps ?? 0;
    },
  };
}

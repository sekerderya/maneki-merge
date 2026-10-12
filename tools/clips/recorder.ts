/**
 * Records one scene of the running game into an MP4 clip (docs/plans/batch-21.md §4).
 *
 * - **Fixed time.** Playwright's clock, installed and paused (installed alone it still follows real
 *   time), fakes `Date`, `performance.now` and the timers, and the page's
 *   `requestAnimationFrame` is a queue this file flushes: each video frame (1/30 s) is two flushes
 *   with exact 1/60 s timestamps, so Phaser sees 16.67 ms frames and the run steps exactly two
 *   fixed ticks per flush, as on a 60 Hz phone, however long a screenshot takes. (The clock's own
 *   rAF fires on a 16 ms grid, which gave frames of 3 to 6 ticks and uneven motion.)
 * - **DOM animations** (banners, coin flights, the Take button, the wind's petals) follow the
 *   compositor's clock, so the document timelines are stopped through CDP and every running
 *   animation is moved on by 1/30 s before each frame.
 * - **Frames** are screenshots of the play area (canvas and DOM together), encoded in a second page
 *   with WebCodecs (H.264 Main) and muxed by mp4-muxer: no ffmpeg.
 */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { chromium } from '@playwright/test';
import type { Browser, CDPSession, Page } from '@playwright/test';
import type * as Mp4MuxerModule from 'mp4-muxer';
import type { GameHooks, JarRect } from '../../src/debug/index.ts';
import { crop, cutBackground, findSource, loadRgba, opaqueBox } from '../artImage.ts';

export const FPS = 30;
const FRAME_MS = 1000 / FPS;
const HALF_MS = FRAME_MS / 2;
/** The phone the clips are recorded on (CSS pixels) and its pixel ratio. */
const VIEWPORT = { width: 390, height: 844 };
const DPR = 2;
const CLOCK_START = Date.parse('2026-10-12T10:00:00Z');
/** The clip: from this far above the rim (the paw and NEXT) to this far below the floor (the rug). */
const ABOVE_RIM = 200;
const BELOW_FLOOR = 80;
/** The encoded video. */
export const VIDEO_WIDTH = 480;
const VIDEO_BITRATE = 300_000;
/** The pointer's height on the page, in CSS pixels. */
const POINTER_HEIGHT = 58;

/** A world point (jar units: x from the centre, y up from the floor is negative). */
export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

export interface SceneOptions {
  readonly seed: number;
}

/** Calls `fn` with the page's `window.__game` (serialised, so it can't close over Node values). */
type HookFn<A, R> = (game: GameHooks, arg: A) => R;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

interface Pointer {
  readonly url: string;
  readonly tipX: number;
  readonly width: number;
}

/** The pointer art with its white cut away, as a PNG data URL, and where its fingertip is. */
async function loadPointer(): Promise<Pointer> {
  const image = await loadRgba(await findSource('art-source/ui', 'tap-pointer'));
  cutBackground(image);
  const box = opaqueBox(image);
  const hand = crop(image, box);
  // The fingertip: the middle of the top rows' opaque pixels.
  let sum = 0;
  let count = 0;
  for (let y = 0; y < Math.max(2, Math.round(hand.height * 0.02)); y++) {
    for (let x = 0; x < hand.width; x++) {
      if ((hand.data[4 * (y * hand.width + x) + 3] ?? 0) > 128) {
        sum += x;
        count++;
      }
    }
  }
  const height = POINTER_HEIGHT * DPR;
  const scale = height / hand.height;
  const png = await sharp(Buffer.from(hand.data.buffer, hand.data.byteOffset, hand.data.length), {
    raw: { width: hand.width, height: hand.height, channels: 4 },
  })
    .resize({ height })
    .png()
    .toBuffer();
  return {
    url: `data:image/png;base64,${png.toString('base64')}`,
    tipX: ((count ? sum / count : hand.width / 2) * scale) / DPR,
    width: (hand.width * scale) / DPR,
  };
}

/** The browser the clips are recorded in: one per `npm run clips`, one page per scene. */
export class ClipBrowser {
  readonly browser: Browser;
  private readonly encoderPage: Page;
  private readonly pointer: Pointer;

  private constructor(browser: Browser, encoderPage: Page, pointer: Pointer) {
    this.browser = browser;
    this.encoderPage = encoderPage;
    this.pointer = pointer;
  }

  static async launch(): Promise<ClipBrowser> {
    const browser = await chromium.launch({
      args: ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'],
    });
    const encoderPage = await browser.newPage();
    // WebCodecs needs a secure context: a fake localhost page.
    await encoderPage.route('http://localhost:5999/', (route) =>
      route.fulfill({ body: '<html></html>', contentType: 'text/html' }),
    );
    await encoderPage.goto('http://localhost:5999/');
    const require = createRequire(import.meta.url);
    await encoderPage.addScriptTag({
      content: await readFile(require.resolve('mp4-muxer') /* the UMD build: `require` */, 'utf8'),
    });
    const renderer = await encoderPage.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'none';
    });
    if (/swiftshader|none/i.test(renderer)) {
      await browser.close();
      throw new Error(
        `No GPU renderer (${renderer}): software rendering drops parts of the sprites. ` +
          'Record the clips on a machine with a GPU.',
      );
    }
    return new ClipBrowser(browser, encoderPage, await loadPointer());
  }

  async close(): Promise<void> {
    await this.browser.close();
  }

  /** Opens the game at `url` for a scene, its clock and rAF under the recorder's control. */
  async open(url: string, options: SceneOptions): Promise<Scene> {
    const context = await this.browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DPR,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    // Installed and paused: time moves only when the recorder runs the clock.
    await page.clock.install({ time: CLOCK_START });
    await page.clock.pauseAt(CLOCK_START + 1000);
    await page.addInitScript(() => {
      const queue: [number, FrameRequestCallback][] = [];
      let next = 0;
      window.requestAnimationFrame = (callback) => {
        queue.push([++next, callback]);
        return next;
      };
      window.cancelAnimationFrame = (handle) => {
        const i = queue.findIndex(([id]) => id === handle);
        if (i >= 0) queue.splice(i, 1);
      };
      (window as unknown as { __flushRaf: (time: number) => void }).__flushRaf = (time) => {
        for (const [, callback] of queue.splice(0)) callback(time);
      };
    });
    const flags = `?debug=1&seed=${options.seed}&res=2`;
    await page.goto(url + flags);
    await page.addStyleTag({
      content:
        '[data-testid=hint],[data-testid=debug-panel]{display:none!important}' +
        '#clip-pointer{position:fixed;z-index:2147483647;pointer-events:none;left:0;top:0;' +
        `width:${this.pointer.width}px;transform-origin:${this.pointer.tipX}px 0;opacity:0}`,
    });
    await page.evaluate((src) => {
      const img = document.createElement('img');
      img.id = 'clip-pointer';
      img.src = src;
      document.body.append(img);
    }, this.pointer.url);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Animation.enable');
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
    const scene = new Scene(page, cdp, this.encoderPage, this.pointer.tipX, errors);
    await scene.advance(3000);
    return scene;
  }
}

/**
 * One scene being set up and recorded. Before `record()` time moves without frames (setup); after
 * it, every 1/30 s of game time is a frame of the clip.
 */
export class Scene {
  private elapsedMs = 0;
  private clockMs = 0;
  private recording = false;
  private frames = 0;
  private crop: { x: number; y: number; width: number; height: number } | null = null;
  private videoHeight = 0;
  private firstFrame: Buffer | null = null;
  private pointerShown = 0;
  private pointerPress = 1;
  private pointerAt = { x: 0, y: 0 };
  /** Where the paw aims (world x): the mouse moves it, as on a desktop. */
  aimX = 0;

  readonly page: Page;
  /** Kept so the stopped document timelines stay stopped while the scene lives. */
  readonly cdp: CDPSession;
  private readonly encoder: Page;
  private readonly tipX: number;
  readonly errors: string[];

  constructor(page: Page, cdp: CDPSession, encoder: Page, tipX: number, errors: string[]) {
    this.page = page;
    this.cdp = cdp;
    this.encoder = encoder;
    this.tipX = tipX;
    this.errors = errors;
  }

  /** Runs `fn(window.__game, arg)` in the page. */
  async game<A, R>(fn: HookFn<A, R>, arg?: A): Promise<R> {
    return this.page.evaluate(
      ([source, value]) => {
        const hooks = window.__game;
        if (!hooks) throw new Error('Debug hooks missing');
        return new Function('game', 'arg', `return (${source})(game, arg);`)(hooks, value);
      },
      [fn.toString(), arg] as const,
    ) as Promise<R>;
  }

  /** Moves game time on by `ms`, recording frames when recording. */
  async advance(ms: number): Promise<void> {
    const end = this.elapsedMs + ms;
    while (this.elapsedMs + HALF_MS / 2 < end) await this.step();
  }

  /** Taps the PLAY button and waits for the run. */
  async play(): Promise<void> {
    await this.page.getByTestId('play').click();
    await this.advance(1500);
  }

  /** Lays a cat of `size` (1 = the stage's smallest) on the floor at world x; returns its id. */
  async place(size: number, x: number): Promise<number> {
    return this.game(
      (g, [s, at]) => {
        const tier = g.state().firstTier + s - 1;
        const id = g.spawnTier(tier, at, -g.radiusOf(tier));
        if (id === null) throw new Error(`Can't place size ${s}`);
        return id;
      },
      [size, x] as const,
    );
  }

  /** Starts recording: from here every 1/30 s is a frame. */
  async record(): Promise<void> {
    const jar = await this.game<undefined, JarRect | null>((g) => g.jarRect());
    if (!jar) throw new Error('No jar on screen');
    const top = Math.max(0, Math.round(jar.rim - ABOVE_RIM));
    const bottom = Math.min(VIEWPORT.height, Math.round(jar.floor + BELOW_FLOOR));
    this.crop = { x: 0, y: top, width: VIEWPORT.width, height: bottom - top };
    this.videoHeight = Math.round((VIDEO_WIDTH * this.crop.height) / this.crop.width / 2) * 2;
    await this.encoder.evaluate(
      ({ width, height, fps, bitrate }) => {
        const Mp4 = (window as unknown as { Mp4Muxer: typeof Mp4MuxerModule }).Mp4Muxer;
        const muxer = new Mp4.Muxer({
          target: new Mp4.ArrayBufferTarget(),
          video: { codec: 'avc', width, height, frameRate: fps },
          fastStart: 'in-memory',
        });
        const encoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: (error) => console.error(String(error)),
        });
        encoder.configure({
          codec: 'avc1.4d0028',
          width,
          height,
          bitrate,
          framerate: fps,
          avc: { format: 'avc' },
          latencyMode: 'quality',
          // The hardware encoder overshoots the bitrate (465 KB for 7 s against 270).
          hardwareAcceleration: 'prefer-software',
        });
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext('2d')!;
        context.imageSmoothingQuality = 'high';
        Object.assign(window, { clip: { muxer, encoder, canvas, context, frames: 0, fps } });
      },
      { width: VIDEO_WIDTH, height: this.videoHeight, fps: FPS, bitrate: VIDEO_BITRATE },
    );
    this.recording = true;
  }

  /** Ends the clip: the MP4 and its first frame as a WebP poster. */
  async finish(): Promise<{ mp4: Buffer; poster: Buffer; frames: number }> {
    if (!this.recording || !this.firstFrame) throw new Error('Nothing recorded');
    const base64 = await this.encoder.evaluate(async () => {
      const clip = (
        window as unknown as {
          clip: {
            encoder: VideoEncoder;
            muxer: { finalize(): void; target: { buffer: ArrayBuffer } };
          };
        }
      ).clip;
      await clip.encoder.flush();
      clip.muxer.finalize();
      const bytes = new Uint8Array(clip.muxer.target.buffer);
      let text = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(text);
    });
    const poster = await sharp(this.firstFrame)
      .resize({ width: VIDEO_WIDTH })
      .webp({ quality: 82 })
      .toBuffer();
    await this.page.context().close();
    return { mp4: Buffer.from(base64, 'base64'), poster, frames: this.frames };
  }

  // ── The pointer and input ───────────────────────────────────────────────

  private async screen(point: WorldPoint): Promise<{ x: number; y: number }> {
    const at = await this.game((g, p) => g.screenPoint(p.x, p.y), point);
    if (!at) throw new Error('No run on screen');
    return at;
  }

  /** A world y in the middle of the jar, where a finger drags to aim. */
  async dragY(): Promise<number> {
    return this.game((g) => {
      const jar = g.jarRect()!;
      return (jar.rim + jar.floor) / 2;
    });
  }

  /** Fades the pointer in or out over `ms`. */
  async showPointer(shown: boolean, ms = 200): Promise<void> {
    const from = this.pointerShown;
    const to = shown ? 1 : 0;
    await this.animate(ms, (t) => {
      this.pointerShown = from + (to - from) * t;
    });
  }

  /** Moves the pointer (and the mouse) to a page point over `ms`. */
  async pointerTo(x: number, y: number, ms: number, drag = false): Promise<void> {
    const from = { ...this.pointerAt };
    await this.animate(ms, async (t) => {
      const e = easeInOut(t);
      this.pointerAt = { x: from.x + (x - from.x) * e, y: from.y + (y - from.y) * e };
      if (drag) await this.page.mouse.move(this.pointerAt.x, this.pointerAt.y);
    });
    this.pointerAt = { x, y };
  }

  /** Puts the pointer at a page point without showing a move. */
  async pointerAtPoint(x: number, y: number): Promise<void> {
    this.pointerAt = { x, y };
    await this.page.mouse.move(x, y);
  }

  /** Presses the pointer (it sinks a little) and clicks at its point. */
  async tap(): Promise<void> {
    await this.animate(120, (t) => {
      this.pointerPress = 1 - 0.14 * t;
    });
    await this.page.mouse.click(this.pointerAt.x, this.pointerAt.y);
    await this.animate(160, (t) => {
      this.pointerPress = 0.86 + 0.14 * t;
    });
  }

  /** Shows the pointer on a ball, taps it (a magnet selects it). */
  async tapBall(id: number, moveMs = 500): Promise<void> {
    const at = await this.game((g, ball) => g.ballPoint(ball), id);
    if (!at) throw new Error(`No ball ${id}`);
    await this.pointerTo(at.x, at.y, moveMs);
    await this.tap();
  }

  /** Moves the pointer onto the magnet's Take button and taps it. */
  async tapTake(moveMs = 450): Promise<void> {
    const box = await this.page.getByTestId('take').boundingBox();
    if (!box) throw new Error('No Take button');
    await this.pointerTo(box.x + box.width / 2, box.y + box.height * 0.6, moveMs);
    await this.tap();
  }

  /**
   * Aims and drops like a finger: the pointer appears over the jar where the paw aims, presses,
   * drags to world x `toX` over `ms` (the paw follows), waits `holdMs`, and lets go.
   */
  async dragDrop(toX: number, ms = 600, holdMs = 200): Promise<void> {
    const y = await this.dragY();
    const from = await this.screen({ x: this.aimX, y: 0 });
    const to = await this.screen({ x: toX, y: 0 });
    await this.pointerAtPoint(from.x, y);
    await this.showPointer(true, 180);
    await this.animate(100, (t) => {
      this.pointerPress = 1 - 0.14 * t;
    });
    await this.page.mouse.down();
    await this.pointerTo(to.x, y, ms, true);
    await this.advance(holdMs);
    await this.page.mouse.up();
    this.aimX = toX;
    await this.animate(140, (t) => {
      this.pointerPress = 0.86 + 0.14 * t;
    });
    await this.showPointer(false, 180);
  }

  // ── Time ────────────────────────────────────────────────────────────────

  /** Runs `each(t)` (t from 0 to 1) on every half frame for `ms` of game time. */
  private async animate(ms: number, each: (t: number) => void | Promise<void>): Promise<void> {
    const start = this.elapsedMs;
    const end = start + ms;
    while (this.elapsedMs + HALF_MS / 2 < end) {
      await each(Math.min(1, (this.elapsedMs + HALF_MS - start) / ms));
      await this.step();
    }
    await each(1);
  }

  /** Half a frame (1/60 s): the clock, the rAF queue, and a frame every second half. */
  private async step(): Promise<void> {
    const next = this.elapsedMs + HALF_MS;
    const clockTarget = Math.round(next);
    await this.page.clock.runFor(clockTarget - this.clockMs);
    this.clockMs = clockTarget;
    this.elapsedMs = next;
    const half = Math.round(next / HALF_MS);
    await this.page.evaluate(
      ([ahead, frame, dt, pointer]) => {
        if (frame) {
          for (const animation of document.getAnimations()) {
            if (animation.playState === 'paused' || animation.playState === 'finished') continue;
            animation.currentTime = (Number(animation.currentTime) || 0) + dt;
          }
          const img = document.getElementById('clip-pointer');
          if (img) {
            img.style.opacity = String(pointer.shown);
            img.style.transform = `translate(${pointer.x - pointer.tipX}px, ${pointer.y}px) scale(${pointer.press})`;
          }
        }
        // The rAF time: the fake clock's whole millisecond plus the exact 1/60 s remainder.
        (window as unknown as { __flushRaf: (t: number) => void }).__flushRaf(
          performance.now() + ahead,
        );
      },
      [
        next - clockTarget,
        half % 2 === 0,
        FRAME_MS,
        {
          shown: this.pointerShown,
          press: this.pointerPress,
          x: this.pointerAt.x,
          y: this.pointerAt.y,
          tipX: this.tipX,
        },
      ] as const,
    );
    if (this.recording && half % 2 === 0) await this.capture();
  }

  private async capture(): Promise<void> {
    const png = await this.page.screenshot({ clip: this.crop!, type: 'png' });
    this.firstFrame ??= png;
    await this.encoder.evaluate(
      async ([b64, index]) => {
        const clip = (
          window as unknown as {
            clip: {
              encoder: VideoEncoder;
              canvas: OffscreenCanvas;
              context: OffscreenCanvasRenderingContext2D;
              fps: number;
            };
          }
        ).clip;
        const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
        const bitmap = await createImageBitmap(blob);
        clip.context.drawImage(bitmap, 0, 0, clip.canvas.width, clip.canvas.height);
        bitmap.close();
        const frame = new VideoFrame(clip.canvas, {
          timestamp: Math.round((index * 1e6) / clip.fps),
          duration: Math.round(1e6 / clip.fps),
        });
        clip.encoder.encode(frame, { keyFrame: index === 0 });
        frame.close();
      },
      [png.toString('base64'), this.frames] as const,
    );
    this.frames++;
  }
}

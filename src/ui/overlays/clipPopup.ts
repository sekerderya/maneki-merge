import { CLIP_CAPTIONS, CLIP_DIR } from '../../config/clips';
import type { ClipId } from '../../config/clips';
import { SHOP_ART, SHOP_SPRITE_DIR } from '../../config/shopSprites';
import { PICK_ARM_MS } from '../../config/view';
import { reducedMotion } from '../../platform/motion';
import { button, el } from '../dom';
import { ICON_CLOSE, ICON_PLAY } from '../icons';
import { artImage, setUiArtProperties } from '../uiArt';

export interface ClipPopupActions {
  /** A clip was opened (its buttons lose the new dot). */
  onOpen(id: ClipId): void;
  onClose(): void;
}

/**
 * A popup with a button under its caption instead of the close button (the boulders' card,
 * GAME_DESIGN §15.3): only the button (or the back button) closes it, never a tap outside, and the
 * button ignores taps for its first PICK_ARM_MS, so a tap still in flight can't close it unread.
 */
export interface ClipPopupOptions {
  /** The button's label. */
  readonly button: string;
  readonly testId: string;
}

export interface ClipPopupView {
  readonly visible: boolean;
  /** Plays clip `id` under the card's name, with its caption or `caption`. */
  show(id: ClipId, name: string, caption?: string): void;
  hide(): void;
}

/**
 * The how-it-works clip (GAME_DESIGN §2.5) over the shop or the picks: the card's name, the
 * clip looping without sound, and its caption. The clip is fetched and played from a blob URL: iOS
 * asks for videos in byte ranges, which the service worker's precached copy doesn't answer, so a
 * plain `src` would fail offline on iPhones. With reduced motion the clip waits on its first frame
 * for a tap. Time is stopped under the picks anyway, so the popup changes nothing in a run.
 * With `options`, a button under the caption closes it instead (ClipPopupOptions).
 */
export function createClipPopup(
  root: HTMLElement,
  actions: ClipPopupActions,
  art = false,
  options?: ClipPopupOptions,
): ClipPopupView {
  const base = import.meta.env.BASE_URL;
  const testId = options?.testId ?? 'clip-popup';
  const part = (name: string): string => (options ? `${testId}-${name}` : `clip-${name}`);
  const overlay = el('div', 'overlay clip-overlay');
  overlay.classList.toggle('is-art', art);
  overlay.classList.toggle('has-button', options !== undefined);
  if (art) setUiArtProperties(overlay);
  overlay.dataset['testid'] = testId;
  overlay.setAttribute('role', 'dialog');
  overlay.hidden = true;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && !options) actions.onClose();
  });

  const card = el('section', 'clip-card');
  const header = el('header', 'clip-header');
  const title = el('h2', 'clip-title');
  const close = button('icon-btn clip-close', '', art ? '' : ICON_CLOSE);
  if (art) close.append(artImage(`${SHOP_SPRITE_DIR}${SHOP_ART.close.file}`, 'clip-close-art'));
  close.setAttribute('aria-label', 'Close');
  close.dataset['testid'] = 'clip-close';
  close.addEventListener('click', actions.onClose);
  header.append(title);
  if (!options) header.append(close);

  const frame = el('div', 'clip-frame');
  const video = el('video', 'clip-video');
  video.dataset['testid'] = part('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.disablePictureInPicture = true;
  const play = button('clip-play', '', ICON_PLAY);
  play.setAttribute('aria-label', 'Play');
  play.dataset['testid'] = part('play');
  play.hidden = true;
  play.addEventListener('click', () => {
    play.hidden = true;
    void video.play().catch(() => (play.hidden = false));
  });
  frame.append(video, play);

  const caption = el('p', 'clip-caption');
  caption.dataset['testid'] = part('caption');
  card.append(header, frame, caption);
  let armedAt = 0;
  if (options) {
    const ok = button('btn btn-primary overlay-main-btn clip-ok', options.button);
    ok.dataset['testid'] = part('ok');
    ok.addEventListener('click', () => {
      if (performance.now() >= armedAt) actions.onClose();
    });
    card.append(ok);
  }
  overlay.append(card);
  root.append(overlay);

  // Each clip is fetched once; a failed fetch is tried again next time.
  const urls = new Map<ClipId, Promise<string>>();
  const load = (id: ClipId): Promise<string> => {
    let url = urls.get(id);
    if (!url) {
      url = fetch(`${base}${CLIP_DIR}${id}.mp4`)
        .then((response) => {
          if (!response.ok) throw new Error(`clip ${id}: ${response.status}`);
          return response.blob();
        })
        .then((blob) => URL.createObjectURL(blob));
      url.catch(() => urls.delete(id));
      urls.set(id, url);
    }
    return url;
  };

  let current: ClipId | null = null;

  return {
    get visible() {
      return !overlay.hidden;
    },
    show(id, name, text) {
      current = id;
      title.textContent = name;
      overlay.setAttribute('aria-label', options ? name : `How ${name} works`);
      armedAt = performance.now() + PICK_ARM_MS;
      caption.textContent = text ?? CLIP_CAPTIONS[id];
      video.pause();
      video.removeAttribute('src');
      video.poster = `${base}${CLIP_DIR}${id}.webp`;
      video.load();
      const still = reducedMotion();
      play.hidden = !still;
      overlay.hidden = false;
      actions.onOpen(id);
      void load(id)
        .then((url) => {
          if (current !== id) return;
          video.src = url;
          if (!still) void video.play().catch(() => (play.hidden = false));
        })
        .catch(() => undefined);
    },
    hide() {
      current = null;
      video.pause();
      overlay.hidden = true;
    },
  };
}

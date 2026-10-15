import { FAKE_AD_SECONDS } from '../../config/ads';
import type { AdPlacement } from '../../config/ads';
import { button, el } from '../dom';

/**
 * The fake rewarded ad (`?ads=fake`, platform/ads.ts `FakeAds`): a test card over everything with
 * a countdown, then "Get reward"; "Close" ends it early without the reward, as closing a real ad
 * does. Resolves with what the player chose.
 */
export function showFakeAd(
  root: HTMLElement,
  placement: AdPlacement,
  seconds = FAKE_AD_SECONDS,
): Promise<'rewarded' | 'closed'> {
  const overlay = el('div', 'fake-ad');
  overlay.dataset['testid'] = 'fake-ad';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Test ad');
  const card = el('section', 'fake-ad-card');
  const count = el('p', 'fake-ad-count');
  count.dataset['testid'] = 'fake-ad-count';
  const reward = button('fake-ad-btn', 'Get reward');
  reward.dataset['testid'] = 'fake-ad-reward';
  reward.disabled = true;
  const close = button('fake-ad-btn', 'Close');
  close.dataset['testid'] = 'fake-ad-close';
  const buttons = el('div', 'fake-ad-buttons');
  buttons.append(reward, close);
  card.append(
    el('p', 'fake-ad-tag', 'Test ad'),
    el('p', 'fake-ad-placement', placement),
    count,
    buttons,
  );
  overlay.append(card);
  root.append(overlay);

  let left = seconds;
  let timer = 0;
  const tick = (): void => {
    count.textContent = left > 0 ? `Reward in ${left} s` : 'Reward earned';
    reward.disabled = left > 0;
    if (left-- <= 0) window.clearInterval(timer);
  };
  tick();
  timer = window.setInterval(tick, 1000);

  return new Promise((resolve) => {
    const finish = (result: 'rewarded' | 'closed'): void => {
      window.clearInterval(timer);
      overlay.remove();
      resolve(result);
    };
    reward.addEventListener('click', () => finish('rewarded'));
    close.addEventListener('click', () => finish('closed'));
  });
}

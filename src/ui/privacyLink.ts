import { PRIVACY_POLICY_PATH, PRIVACY_POLICY_URL } from '../config/app';
import { el } from './dom';

/**
 * A link to the privacy policy (Settings, the statistics card). On the web it opens in a new tab,
 * so the game stays as it is (Google Play wants the policy reachable in the app). The Android app
 * opens the live page in the phone's browser: Capacitor sends every link off its own origin there,
 * so the game never leaves the WebView.
 */
export function privacyLink(className: string, text = 'Privacy policy'): HTMLAnchorElement {
  const link = el('a', className, text);
  if (__NATIVE_APP__) {
    link.href = PRIVACY_POLICY_URL;
  } else {
    link.href = `${import.meta.env.BASE_URL}${PRIVACY_POLICY_PATH}`;
    link.target = '_blank';
  }
  link.rel = 'noopener';
  return link;
}

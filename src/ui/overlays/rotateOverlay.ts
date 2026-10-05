import { el } from '../dom';
import { ICON_ROTATE } from '../icons';

/** Full-screen "Please rotate your device" overlay for phones in landscape (TECH_SPEC §10). */
export function createRotateOverlay(root: HTMLElement): (visible: boolean) => void {
  const overlay = el('div', 'overlay rotate-overlay');
  overlay.dataset['testid'] = 'rotate-overlay';
  overlay.setAttribute('role', 'alert');
  overlay.insertAdjacentHTML('beforeend', ICON_ROTATE);
  overlay.append(el('p', '', 'Please rotate your device'));
  overlay.hidden = true;
  root.append(overlay);

  return (visible) => {
    overlay.hidden = !visible;
  };
}

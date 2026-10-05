import { APP_NAME } from '../config/app';
import { formatVersionLabel } from '../core/version';

/** Temporary M1 screen: title and version. Replaced by the real menu in M2. */
export function renderBootScreen(root: HTMLElement): void {
  root.innerHTML = '';

  const title = document.createElement('h1');
  title.className = 'title';
  title.textContent = APP_NAME;

  const subtitle = document.createElement('p');
  subtitle.className = 'subtitle';
  subtitle.textContent = 'Coming soon';

  const version = document.createElement('p');
  version.className = 'version';
  version.dataset['testid'] = 'version';
  version.textContent = formatVersionLabel(__APP_VERSION__, __BUILD_HASH__);

  root.append(title, subtitle, version);
}

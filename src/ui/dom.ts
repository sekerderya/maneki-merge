/** Tiny DOM helpers for the vanilla UI. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A `<button type="button">` with an optional inline SVG icon before the label. */
export function button(className: string, label: string, icon?: string): HTMLButtonElement {
  const node = el('button', className);
  node.type = 'button';
  if (icon) node.insertAdjacentHTML('beforeend', icon);
  if (label) node.append(el('span', 'btn-label', label));
  return node;
}

export function byId(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node;
}

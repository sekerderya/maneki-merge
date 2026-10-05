/** Formats the version label shown on the main menu, e.g. "v0.1.0 (a1b2c3d)". */
export function formatVersionLabel(version: string, buildHash: string): string {
  const hash = buildHash.trim();
  return hash.length > 0 ? `v${version} (${hash})` : `v${version}`;
}

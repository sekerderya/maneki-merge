import { describe, expect, it } from 'vitest';
import { APP_NAME, STORAGE_PREFIX } from '../../src/config/app';
import { formatVersionLabel } from '../../src/core/version';

describe('formatVersionLabel', () => {
  it('includes the build hash when present', () => {
    expect(formatVersionLabel('0.1.0', 'a1b2c3d')).toBe('v0.1.0 (a1b2c3d)');
  });

  it('omits an empty build hash', () => {
    expect(formatVersionLabel('0.1.0', '  ')).toBe('v0.1.0');
  });
});

describe('app config', () => {
  it('uses the working title and a namespaced storage prefix', () => {
    expect(APP_NAME).toBe('Maneki Merge');
    expect(STORAGE_PREFIX).toBe('maneki-merge:');
  });
});

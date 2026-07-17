import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { isPathInside } from './html-files-middleware';

describe('isPathInside', () => {
  const root = resolve('/srv/app/dist');

  it('accepts the root itself and children', () => {
    expect(isPathInside(root, root)).toBe(true);
    expect(isPathInside(root, resolve(root, 'assets/app.js'))).toBe(true);
  });

  it('rejects traversal outside the root', () => {
    expect(isPathInside(root, resolve(root, '../../../etc/passwd'))).toBe(false);
    expect(isPathInside(root, resolve('/etc/passwd'))).toBe(false);
  });

  it('rejects sibling directories sharing the root as a string prefix', () => {
    expect(isPathInside(root, resolve('/srv/app/dist-other/file'))).toBe(false);
  });
});

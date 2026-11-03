import { describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { docsAssetsPlugin } from './docs-assets';

describe('docs assets', () => {
  it('copies regular assets and excludes symlinks to files outside docs', () => {
    const root = mkdtempSync(join(tmpdir(), 'dory-assets-'));
    try {
      mkdirSync(join(root, 'docs'));
      writeFileSync(join(root, 'secret'), 'private');
      writeFileSync(join(root, 'docs', 'safe.svg'), '<svg />');
      symlinkSync(join(root, 'secret'), join(root, 'docs', 'leak.svg'));
      vi.spyOn(process, 'cwd').mockReturnValue(root);
      const closeBundle = docsAssetsPlugin().closeBundle as () => void;
      closeBundle();
      expect(existsSync(join(root, 'dist', 'safe.svg'))).toBe(true);
      expect(existsSync(join(root, 'dist', 'leak.svg'))).toBe(false);
    } finally {
      vi.restoreAllMocks();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

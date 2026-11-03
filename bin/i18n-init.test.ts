import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initLocale } from './i18n-init';

describe('i18n init', () => {
  it('creates unpublished templates and does not overwrite a translation', () => {
    const root = mkdtempSync(join(tmpdir(), 'dory-i18n-'));
    try {
      mkdirSync(join(root, 'docs', 'guide'), { recursive: true });
      writeFileSync(join(root, 'dory.json'), JSON.stringify({ name: 'Test' }));
      writeFileSync(join(root, 'docs', 'guide', 'intro.mdx'), '# Hello');

      expect(initLocale(root, 'fr').templatesCreated).toBe(1);
      const template = join(root, 'docs', 'fr', 'guide', 'intro.mdx.template');
      expect(existsSync(template)).toBe(true);
      expect(JSON.parse(readFileSync(join(root, 'dory.json'), 'utf8')).i18n.locales).toHaveLength(2);
      expect(initLocale(root, 'fr').templatesCreated).toBe(0);
      expect(readFileSync(template, 'utf8')).toBe('# Hello');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

import { describe, expect, it } from 'vitest';
import { assetUrl, joinBasePath, normalizeBasePath } from './base-path';

describe('normalizeBasePath', () => {
  it('normalizes slashes', () => {
    for (const value of ['docs', '/docs', '/docs/', ' /docs/ ', '//docs//']) {
      expect(normalizeBasePath(value)).toBe('/docs');
    }
    expect(normalizeBasePath('/a/b/')).toBe('/a/b');
  });

  it('treats root and non-strings as no base', () => {
    for (const value of ['', '/', '   ', undefined, null, 3]) {
      expect(normalizeBasePath(value)).toBe('');
    }
  });
});

describe('joinBasePath', () => {
  it('prefixes root-relative paths', () => {
    expect(joinBasePath('/docs', '/intro')).toBe('/docs/intro');
    expect(joinBasePath('/docs', '/')).toBe('/docs/');
    expect(joinBasePath('/docs', '/frontmatter.json')).toBe('/docs/frontmatter.json');
  });

  it('is a no-op without a base', () => {
    expect(joinBasePath('', '/intro')).toBe('/intro');
  });

  it('does not double-prefix or touch non-root URLs', () => {
    expect(joinBasePath('/docs', '/docs/intro')).toBe('/docs/intro');
    expect(joinBasePath('/docs', '/docs')).toBe('/docs');
    expect(joinBasePath('/docs', '/docsy/intro')).toBe('/docs/docsy/intro');
    for (const url of ['https://x.dev/a', '//cdn.dev/a', '#top', 'relative/a', 'mailto:a@b.c']) {
      expect(joinBasePath('/docs', url)).toBe(url);
    }
  });
});

describe('assetUrl', () => {
  it('strips config-style prefixes', () => {
    expect(assetUrl('./logo/logo.png')).toBe('/logo/logo.png');
    expect(assetUrl('logo/logo.png')).toBe('/logo/logo.png');
    expect(assetUrl('/logo/logo.png')).toBe('/logo/logo.png');
  });
});

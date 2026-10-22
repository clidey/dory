import { describe, expect, it } from 'vitest';
import { resolveAssetUrl } from './relative-assets';

const docsDir = '/site/docs';

describe('resolveAssetUrl', () => {
  it('resolves against the MDX file directory', () => {
    expect(resolveAssetUrl('./assets/a.png', '/site/docs/features.mdx', docsDir)).toBe('/assets/a.png');
    expect(resolveAssetUrl('../assets/a.png', '/site/docs/components/images.mdx', docsDir)).toBe('/assets/a.png');
    expect(resolveAssetUrl('shots/b.png', '/site/docs/guides/intro.mdx', docsDir)).toBe('/guides/shots/b.png');
  });

  it('keeps query strings and fragments', () => {
    expect(resolveAssetUrl('./a.svg?v=2#icon', '/site/docs/page.mdx', docsDir)).toBe('/a.svg?v=2#icon');
  });

  it('leaves absolute, protocol and anchor URLs alone', () => {
    for (const url of ['/assets/a.png', 'https://x.dev/a.png', '//cdn.dev/a.png', 'data:image/png;base64,AA', '#top']) {
      expect(resolveAssetUrl(url, '/site/docs/page.mdx', docsDir)).toBeNull();
    }
  });

  it('leaves paths that escape the docs directory alone', () => {
    expect(resolveAssetUrl('../../outside.png', '/site/docs/components/x.mdx', docsDir)).toBeNull();
  });
});

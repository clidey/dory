import { expect, test } from 'vitest';
import { buildPageMetadata, isNoindex, seoAssetUrl } from '../utils/seo';
import { metadataHtml } from './seo-html';
import type { DoryConfig } from '../types/config';

const config = {
  name: 'Example', url: 'https://docs.example.com', basePath: '/manual',
  navigation: { tabs: [] }, seo: { titleTemplate: '%s — Example' },
} as unknown as DoryConfig;

test('canonical, social and schema URLs agree under a base path', () => {
  const metadata = buildPageMetadata(config, { path: '/guide/start', title: 'Start $&', description: 'Read <this> guide.' }, [], '/_dory/social/start.png');
  expect(metadata.canonical).toBe('https://docs.example.com/manual/guide/start');
  expect(metadata.meta['og:url']).toBe(metadata.canonical);
  expect(metadata.title).toBe('Start $& — Example');
  expect(metadata.meta['og:image']).toBe('https://docs.example.com/manual/_dory/social/start.png');
  expect(metadata.meta['og:image:width']).toBe('1200');
  expect(metadata.schema['@graph']).toEqual(expect.arrayContaining([expect.objectContaining({ '@type': 'WebPage', url: metadata.canonical }), expect.objectContaining({ '@type': 'TechArticle', url: metadata.canonical })]));
  expect(seoAssetUrl(config, '/manual/image.png')).toBe('https://docs.example.com/manual/image.png');
});

test('metadata replacement is idempotent and removes previous image, indexing and schema values', () => {
  const first = buildPageMetadata(config, { path: '/first', title: 'First', robots: 'noindex' }, [], '/_dory/social/first.png');
  const next = buildPageMetadata({ ...config, seo: { generateSocialImages: false } }, { path: '/next', title: '</script><script>bad</script>' });
  const html = metadataHtml(metadataHtml('<html lang="en"><head><title>Original</title></head><body></body></html>', first), next);
  expect(html).not.toContain('noindex');
  expect(html).not.toContain('first.png');
  expect(html).not.toContain('image:width');
  expect(html.match(/data-dory-seo/g)).toHaveLength(1);
  expect(html.match(/rel="canonical"/g)).toHaveLength(1);
  expect(html).toContain('\\u003c/script>');
  expect(metadataHtml(html, next).replace(/\s+/g, ' ')).toBe(html.replace(/\s+/g, ' '));
});

test('site noindex wins over page robots; no configured origin invents no canonical', () => {
  expect(buildPageMetadata({ ...config, seo: { noindex: true } }, { path: '/staging', robots: 'index' }).meta.robots).toBe('noindex, nofollow');
  expect(buildPageMetadata({ ...config, url: undefined }, { path: '/local' }).canonical).toBe('');
  for (const value of ['NOINDEX, follow', 'none', 'index, noindex']) expect(isNoindex(value)).toBe(true);
  expect(isNoindex('index, noimageindex')).toBe(false);
});

test('alternate languages include only published indexable translations of the same version', () => {
  const localized = { ...config, i18n: { defaultLocale: 'en', locales: [{ code: 'en', label: 'English' }, { code: 'fr', label: 'French' }, { code: 'de', label: 'German' }] }, versions: [{ id: 'v1', label: '1' }] };
  const pages = [{ path: '/v1/start' }, { path: '/fr/v1/start' }, { path: '/de/v1/start', robots: 'noindex' }];
  const metadata = buildPageMetadata(localized, { path: '/fr/v1/start', title: 'Commencer' }, pages);
  expect(metadata.lang).toBe('fr');
  expect(metadata.alternates.map(link => link.lang)).toEqual(['en', 'fr', 'x-default']);
  expect(metadata.alternates[0].href).toBe('https://docs.example.com/manual/v1/start');
});

import { describe, expect, it } from 'vitest';
import { contentScope, scopedPath } from './content-scope';
import type { DoryConfig } from '../types/config';

const navigation = { tabs: [{ tab: 'Guides', groups: [{ group: 'Start', pages: ['intro'] }] }] };
const config = {
  name: 'Example', favicon: 'favicon.svg', logo: { light: 'logo.svg', dark: 'logo.svg' },
  navigation,
  i18n: { defaultLocale: 'en', locales: [{ code: 'en', label: 'English' }, { code: 'fr', label: 'Français' }] },
  versions: [{ id: 'v1', label: 'Version 1' }],
} satisfies DoryConfig;

describe('content scope', () => {
  it('preserves current URLs for the default language and version', () => {
    expect(contentScope(config, '/intro')).toMatchObject({ locale: 'en', version: '', prefix: '', page: '/intro' });
  });

  it('resolves a translated, versioned page', () => {
    expect(contentScope(config, '/fr/v1/intro')).toMatchObject({ locale: 'fr', version: 'v1', prefix: '/fr/v1', page: '/intro' });
  });

  it('keeps the page when switching language and version', () => {
    expect(scopedPath(config, '/fr/v1/intro', 'en', '')).toBe('/intro');
    expect(scopedPath(config, '/intro', 'fr', 'v1')).toBe('/fr/v1/intro');
  });
});

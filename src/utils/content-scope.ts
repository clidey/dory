import type { DoryConfig, DoryNavigation } from '../types/config.ts';

export interface ContentScope {
  locale: string;
  version: string;
  prefix: string;
  page: string;
  navigation: DoryNavigation;
}

/** Content lives at the route it publishes: docs/fr/intro.mdx -> /fr/intro. */
export function contentScope(config: DoryConfig, pathname: string): ContentScope {
  const parts = pathname.split('/').filter(Boolean);
  const locales = config.i18n?.locales ?? [];
  const defaultLocale = config.i18n?.defaultLocale ?? locales[0]?.code ?? 'en';
  const localeEntry = locales.find(entry => entry.code === parts[0] && entry.code !== defaultLocale);
  if (localeEntry) parts.shift();

  const versionEntry = config.versions?.find(entry => entry.id && entry.id === parts[0]);
  if (versionEntry) parts.shift();

  const locale = localeEntry?.code ?? defaultLocale;
  const version = versionEntry?.id ?? '';
  const prefix = [localeEntry?.code, version].filter(Boolean).map(segment => `/${segment}`).join('');
  return {
    locale,
    version,
    prefix,
    page: `/${parts.join('/')}`,
    navigation: (version ? localeEntry?.versions?.[version] : undefined) ?? localeEntry?.navigation ?? versionEntry?.navigation ?? config.navigation,
  };
}

export function scopedPath(config: DoryConfig, pathname: string, locale: string, version: string): string {
  const current = contentScope(config, pathname);
  const defaultLocale = config.i18n?.defaultLocale ?? config.i18n?.locales[0]?.code ?? 'en';
  const prefix = [locale !== defaultLocale ? locale : '', version].filter(Boolean).map(segment => `/${segment}`).join('');
  return `${prefix}${current.page}`;
}

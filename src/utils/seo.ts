import type { DoryConfig } from '../types/config.ts';
import { normalizeBasePath, joinBasePath } from './base-path.ts';
import { contentScope, scopedPath } from './content-scope.ts';

export const notFoundSocialImage = '/_dory/social/not-found.png';

export interface PageMetadata {
  title: string;
  lang: string;
  canonical: string;
  meta: Record<string, string>;
  alternates: Array<{ lang: string; href: string }>;
  schema: Record<string, unknown>;
}

export type SeoPage = Record<string, any> & { path: string };

export function siteUrl(config: Partial<DoryConfig>): string {
  const origin = config.url?.trim().replace(/\/+$/, '') || '';
  return origin ? origin + normalizeBasePath(config.basePath) : '';
}

/** Local asset paths are relative to the docs site, including its base path once. */
export function seoAssetUrl(config: Partial<DoryConfig>, source: string): string {
  if (!source || /^https?:\/\//i.test(source)) return source;
  if (source.startsWith('//')) return `https:${source}`;
  const path = joinBasePath(normalizeBasePath(config.basePath), `/${source.replace(/^\.?\/+/, '')}`);
  return `${config.url?.trim().replace(/\/+$/, '') || ''}${path}`;
}

export function pageTitle(title: string, config: Partial<DoryConfig>): string {
  const name = config.name || 'Documentation';
  if (title === name) return title;
  return (config.seo?.titleTemplate ?? `%s — ${name}`).replace('%s', () => title);
}

export function isoDate(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
}

export function isNoindex(robots: unknown): boolean {
  return typeof robots === 'string' && /(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(robots);
}

/** Shared by static rendering and client navigation. Only describe real page content. */
export function buildPageMetadata(config: Partial<DoryConfig>, page: SeoPage, pages: SeoPage[] = [], generatedImage = ''): PageMetadata {
  const seo = config.seo || {};
  const name = config.name || 'Documentation';
  const base = siteUrl(config);
  const canonical = base ? `${base}${page.path === '/' ? '/' : page.path.replace(/\/+$/, '')}` : '';
  const title = pageTitle(page.title || config.title || name, config);
  const description = page.description || config.description || `Read ${page.title || name} in the ${name} documentation.`;
  const scope = contentScope(config as DoryConfig, page.path);
  const lang = config.i18n ? scope.locale : (seo.locale || 'en').replace(/_/g, '-');
  const rawImage = page.image || page.ogImage || generatedImage || seo.ogImage || config.image || '';
  const image = seoAssetUrl(config, rawImage);
  const generated = Boolean(generatedImage && !page.image && !page.ogImage);
  const imageAlt = page.imageAlt || `${page.title || config.title || name} — ${name} documentation`;
  const modified = isoDate(page.lastUpdated);
  const published = isoDate(page.datePublished);
  const robots = seo.noindex ? 'noindex, nofollow' : page.robots || 'index, follow, max-image-preview:large';
  const meta: Record<string, string> = {
    description, robots,
    'og:title': title, 'og:description': description, 'og:site_name': name,
    'og:type': page.path === '/' ? 'website' : 'article', 'og:locale': lang.replace(/-/g, '_'),
    'twitter:card': image ? seo.twitterCard || 'summary_large_image' : 'summary',
    'twitter:title': title, 'twitter:description': description,
    ...(canonical ? { 'og:url': canonical } : {}),
    ...(seo.author ? { author: seo.author } : {}),
    ...(seo.keywords?.length ? { keywords: seo.keywords.join(', ') } : {}),
    ...(config.twitter ? { 'twitter:site': config.twitter, 'twitter:creator': config.twitter } : {}),
    ...(modified ? { 'article:modified_time': modified } : {}),
    ...(published ? { 'article:published_time': published } : {}),
    ...(image ? { 'og:image': image, ...(image.startsWith('https://') ? { 'og:image:secure_url': image } : {}), 'og:image:alt': imageAlt, 'twitter:image': image, 'twitter:image:alt': imageAlt } : {}),
    ...(generated ? { 'og:image:type': 'image/png', 'og:image:width': '1200', 'og:image:height': '630' } : {}),
  };
  const alternates: PageMetadata['alternates'] = [];
  if (base && config.i18n) {
    for (const locale of config.i18n.locales) {
      const path = scopedPath(config as DoryConfig, page.path, locale.code, scope.version);
      if (!pages.some(entry => entry.path === path && !isNoindex(entry.robots))) continue;
      alternates.push({ lang: locale.code, href: `${base}${path}` });
    }
    const defaultLink = alternates.find(entry => entry.lang === config.i18n?.defaultLocale);
    if (defaultLink) alternates.push({ ...defaultLink, lang: 'x-default' });
  }
  const organization = {
    '@type': 'Organization', name: seo.author || name,
    ...(base ? { '@id': `${base}/#organization`, url: `${base}/` } : {}),
    ...(config.logo?.light || config.logo?.dark ? { logo: seoAssetUrl(config, config.logo?.light || config.logo!.dark) } : {}),
  };
  const website = {
    '@type': 'WebSite', name, inLanguage: lang,
    ...(base ? { '@id': `${base}/#website`, url: `${base}/`, publisher: { '@id': `${base}/#organization` } } : {}),
  };
  const webpage = {
    '@type': 'WebPage', name: title, description, inLanguage: lang,
    ...(canonical ? { '@id': `${canonical}#webpage`, url: canonical, isPartOf: { '@id': `${base}/#website` } } : {}),
    ...(image ? { primaryImageOfPage: { '@type': 'ImageObject', url: image, ...(generated ? { width: 1200, height: 630 } : {}) } } : {}),
    ...(modified ? { dateModified: modified } : {}),
  };
  const article = {
    '@type': 'TechArticle', headline: title, description, inLanguage: lang,
    ...(canonical ? { '@id': `${canonical}#article`, url: canonical, mainEntityOfPage: { '@id': `${canonical}#webpage` }, isPartOf: { '@id': `${base}/#website` } } : {}),
    publisher: organization, author: { '@type': 'Organization', name: page.author || seo.author || name },
    ...(image ? { image } : {}), ...(modified ? { dateModified: modified } : {}), ...(published ? { datePublished: published } : {}),
  };
  // Include only ancestors which have published pages, never invented folder URLs.
  const ancestors = pages.filter(entry => entry.path !== '/' && entry.path !== page.path && page.path.startsWith(`${entry.path}/`) && !isNoindex(entry.robots))
    .sort((a, b) => a.path.length - b.path.length);
  const crumbs = [{ path: '/', title: name }, ...ancestors, ...(page.path === '/' ? [] : [page])];
  const breadcrumb = {
    '@type': 'BreadcrumbList', ...(canonical ? { '@id': `${canonical}#breadcrumb` } : {}),
    itemListElement: crumbs.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, name: entry.title || name, ...(base ? { item: `${base}${entry.path}` } : {}) })),
  };
  return { title, lang, canonical, meta, alternates, schema: { '@context': 'https://schema.org', '@graph': [organization, website, webpage, ...(page.path === '/' ? [] : [article, breadcrumb])] } };
}

export function isManagedMeta(key: string): boolean {
  return /^(?:og:|twitter:|article:)/.test(key) || ['description', 'robots', 'author', 'keywords'].includes(key);
}

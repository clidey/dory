import { escapeHtml } from './shared.ts';
import { isManagedMeta, type PageMetadata } from '../utils/seo.ts';

/** Retain scripts/assets while replacing the complete page metadata in static HTML. */
export function metadataHtml(html: string, metadata: PageMetadata): string {
  html = html.replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*>/gi, tag => {
      const key = tag.match(/(?:name|property)="([^"]+)"/i)?.[1] || '';
      return isManagedMeta(key) ? '' : tag;
    })
    .replace(/<link\b[^>]*>/gi, tag => /rel="canonical"|hreflang=/i.test(tag) ? '' : tag)
    .replace(/<script\b[^>]*(?:data-dory-seo|data-dory-site-schema)[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<html\b([^>]*)>/i, (_match, attrs: string) => `<html${attrs.replace(/\s+lang="[^"]*"/i, '')} lang="${escapeHtml(metadata.lang)}">`);
  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    ...Object.entries(metadata.meta).map(([key, value]) => `<meta ${key.startsWith('og:') || key.startsWith('article:') ? 'property' : 'name'}="${key}" content="${escapeHtml(value)}" />`),
    ...(metadata.canonical ? [`<link rel="canonical" href="${escapeHtml(metadata.canonical)}" />`] : []),
    ...metadata.alternates.map(link => `<link rel="alternate" hreflang="${escapeHtml(link.lang)}" href="${escapeHtml(link.href)}" />`),
    `<script type="application/ld+json" data-dory-seo>${JSON.stringify(metadata.schema).replace(/</g, '\\u003c')}</script>`,
  ];
  return html.replace('</head>', () => `${tags.join('\n')}\n</head>`);
}

import type { Plugin } from 'vite';
import type { DoryConfig } from '../types/config.ts';
import { readDoryConfig, escapeHtml, getBasePath } from './shared.ts';
import { socialPreviewPath } from './social-preview.ts';
import { buildPageMetadata, seoAssetUrl } from '../utils/seo.ts';
import { metadataHtml } from './seo-html.ts';
import { socialTheme } from './social-theme.ts';

/** Site defaults for development; prerender replaces them with complete route metadata. */
export function htmlMetadataInjector(): Plugin {
  return {
    name: 'html-metadata-injector',
    transformIndexHtml(html) {
      const config = readDoryConfig() as DoryConfig | null;
      if (!config) return html;
      const page = { path: '/', title: config.title || config.name, description: config.description };
      html = metadataHtml(html, buildPageMetadata(config, page, [], config.seo?.generateSocialImages !== false ? socialPreviewPath('/') : ''));
      html = html.replace(/<meta name="theme-color" content="[^"]*" \/>/, () => `<meta name="theme-color" content="${escapeHtml(socialTheme(config).background)}" />`);
      const favicon = config.favicon || config.logo?.light || config.logo?.dark;
      html = html.replace(/<link rel="(icon|apple-touch-icon)" href="[^"]*" \/>/g, (_tag, rel) => favicon ? `<link rel="${rel}" href="${escapeHtml(seoAssetUrl({ ...config, url: '' }, favicon))}" />` : '');
      return html.replace('</head>', () => `<link rel="alternate" type="text/plain" title="LLM documentation index" href="${escapeHtml(getBasePath(config))}/llms.txt" />\n</head>`);
    },
  };
}

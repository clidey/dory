import type { Plugin } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Vite plugin that injects site metadata from dory.json into index.html
 * This provides proper defaults before JavaScript hydrates the page
 */
export function htmlMetadataInjector(): Plugin {
  return {
    name: 'html-metadata-injector',
    transformIndexHtml(html) {
      // Read dory.json configuration
      const doryJsonPath = resolve(process.cwd(), 'docs', 'dory.json');

      if (!existsSync(doryJsonPath)) {
        console.warn('⚠️  dory.json not found, using default metadata');
        return html;
      }

      try {
        const config = JSON.parse(readFileSync(doryJsonPath, 'utf-8'));
        const siteName = config.name || 'Documentation';
        const defaultTitle = config.title || siteName;
        const defaultDescription = config.description || `${siteName} - Technical Documentation`;
        const siteUrl = config.url || '';
        const siteImage = config.image || './docs/favicon.svg';

        // Replace title
        html = html.replace(
          /<title>.*?<\/title>/,
          `<title>${defaultTitle}</title>`
        );

        // Replace meta description
        html = html.replace(
          /<meta name="description" content=".*?" \/>/,
          `<meta name="description" content="${defaultDescription}" />`
        );

        // Replace Open Graph title
        html = html.replace(
          /<meta property="og:title" content=".*?" \/>/,
          `<meta property="og:title" content="${defaultTitle}" />`
        );

        // Replace Open Graph description
        html = html.replace(
          /<meta property="og:description" content=".*?" \/>/,
          `<meta property="og:description" content="${defaultDescription}" />`
        );

        // Replace Open Graph site name
        html = html.replace(
          /<meta property="og:site_name" content=".*?" \/>/,
          `<meta property="og:site_name" content="${siteName}" />`
        );

        // Replace Open Graph image
        html = html.replace(
          /<meta property="og:image" content=".*?" \/>/,
          `<meta property="og:image" content="${siteImage}" />`
        );

        // Replace Open Graph URL
        if (siteUrl) {
          html = html.replace(
            /<meta property="og:url" content=".*?" \/>/,
            `<meta property="og:url" content="${siteUrl}" />`
          );
        }

        // Replace Twitter title
        html = html.replace(
          /<meta name="twitter:title" content=".*?" \/>/,
          `<meta name="twitter:title" content="${defaultTitle}" />`
        );

        // Replace Twitter description
        html = html.replace(
          /<meta name="twitter:description" content=".*?" \/>/,
          `<meta name="twitter:description" content="${defaultDescription}" />`
        );

        // Replace Twitter image
        html = html.replace(
          /<meta name="twitter:image" content=".*?" \/>/,
          `<meta name="twitter:image" content="${siteImage}" />`
        );

        return html;
      } catch (error) {
        console.error('❌ Failed to parse dory.json for metadata injection:', error);
        return html;
      }
    },
  };
}

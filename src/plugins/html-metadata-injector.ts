import type { Plugin } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Vite plugin that injects site metadata from dory.json into index.html.
 * Provides proper defaults before JavaScript hydrates the page.
 */
export function htmlMetadataInjector(): Plugin {
  return {
    name: 'html-metadata-injector',
    transformIndexHtml(html) {
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
        const twitterHandle = config.twitter || '';

        // Resolve image to absolute URL
        const rawImage = config.image || '';
        const siteImage = rawImage && siteUrl && !rawImage.startsWith('http')
          ? `${siteUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
          : rawImage;

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

        // Replace Open Graph tags
        html = html.replace(
          /<meta property="og:title" content=".*?" \/>/,
          `<meta property="og:title" content="${defaultTitle}" />`
        );
        html = html.replace(
          /<meta property="og:description" content=".*?" \/>/,
          `<meta property="og:description" content="${defaultDescription}" />`
        );
        html = html.replace(
          /<meta property="og:site_name" content=".*?" \/>/,
          `<meta property="og:site_name" content="${siteName}" />`
        );
        if (siteImage) {
          html = html.replace(
            /<meta property="og:image" content=".*?" \/>/,
            `<meta property="og:image" content="${siteImage}" />`
          );
        }
        if (siteUrl) {
          html = html.replace(
            /<meta property="og:url" content=".*?" \/>/,
            `<meta property="og:url" content="${siteUrl}" />`
          );
        }

        // Replace Twitter tags
        html = html.replace(
          /<meta name="twitter:title" content=".*?" \/>/,
          `<meta name="twitter:title" content="${defaultTitle}" />`
        );
        html = html.replace(
          /<meta name="twitter:description" content=".*?" \/>/,
          `<meta name="twitter:description" content="${defaultDescription}" />`
        );
        if (siteImage) {
          html = html.replace(
            /<meta name="twitter:image" content=".*?" \/>/,
            `<meta name="twitter:image" content="${siteImage}" />`
          );
        }
        html = html.replace(
          /<meta name="twitter:site" content=".*?" \/>/,
          `<meta name="twitter:site" content="${twitterHandle}" />`
        );
        html = html.replace(
          /<meta name="twitter:creator" content=".*?" \/>/,
          `<meta name="twitter:creator" content="${twitterHandle}" />`
        );

        // Set canonical URL for the base page
        if (siteUrl) {
          html = html.replace(
            /<link rel="canonical" href=".*?" \/>/,
            `<link rel="canonical" href="${siteUrl}" />`
          );
        }

        return html;
      } catch (error) {
        console.error('❌ Failed to parse dory.json for metadata injection:', error);
        return html;
      }
    },
  };
}

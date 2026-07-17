import type { Plugin } from 'vite';
import { readDoryConfig, escapeHtml, applyTitleTemplate } from './shared';

/**
 * Vite plugin that injects site metadata from dory.json into index.html.
 * Provides proper defaults before JavaScript hydrates the page.
 */
export function htmlMetadataInjector(): Plugin {
  return {
    name: 'html-metadata-injector',
    transformIndexHtml(html) {
      const config = readDoryConfig();
      if (!config) {
        console.warn('⚠️  dory.json not found, using default metadata');
        return html;
      }

      try {
        const seo = config.seo || {};
        const siteName: string = config.name || 'Documentation';
        const defaultTitle = applyTitleTemplate(config.title || siteName, seo.titleTemplate, siteName);
        const defaultDescription: string = config.description || `${siteName} - Technical Documentation`;
        const siteUrl: string = config.url || '';
        const twitterHandle: string = config.twitter || '';

        // Resolve image to absolute URL
        const rawImage: string = config.image || '';
        const siteImage = rawImage && siteUrl && !rawImage.startsWith('http')
          ? `${siteUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
          : rawImage;

        // Function replacements everywhere so `$&` etc. in config values
        // cannot corrupt the output.
        const setTag = (re: RegExp, replacement: string) => {
          html = html.replace(re, () => replacement);
        };
        const removeTag = (re: RegExp) => {
          html = html.replace(re, '');
        };
        const injectHeadTag = (tag: string) => {
          html = html.replace('</head>', () => `  ${tag}\n  </head>`);
        };

        // Title
        setTag(/<title>.*?<\/title>/, `<title>${escapeHtml(defaultTitle)}</title>`);

        // Description
        setTag(
          /<meta name="description" content=".*?" \/>/,
          `<meta name="description" content="${escapeHtml(defaultDescription)}" />`
        );

        // Keywords / author — injected only when configured
        if (Array.isArray(seo.keywords) && seo.keywords.length > 0) {
          injectHeadTag(`<meta name="keywords" content="${escapeHtml(seo.keywords.join(', '))}" />`);
        }
        if (seo.author) {
          injectHeadTag(`<meta name="author" content="${escapeHtml(seo.author)}" />`);
        }

        // Site-wide noindex (staging)
        if (seo.noindex) {
          injectHeadTag('<meta name="robots" content="noindex" />');
        }

        // Locale — html lang + og:locale
        if (seo.locale) {
          setTag(/<html lang=".*?">/, `<html lang="${escapeHtml(seo.locale.replace(/_/g, '-'))}">`);
          setTag(
            /<meta property="og:locale" content=".*?" \/>/,
            `<meta property="og:locale" content="${escapeHtml(seo.locale)}" />`
          );
        }

        // Open Graph tags
        setTag(
          /<meta property="og:title" content=".*?" \/>/,
          `<meta property="og:title" content="${escapeHtml(defaultTitle)}" />`
        );
        setTag(
          /<meta property="og:description" content=".*?" \/>/,
          `<meta property="og:description" content="${escapeHtml(defaultDescription)}" />`
        );
        setTag(
          /<meta property="og:site_name" content=".*?" \/>/,
          `<meta property="og:site_name" content="${escapeHtml(siteName)}" />`
        );
        if (siteImage) {
          setTag(
            /<meta property="og:image" content=".*?" \/>/,
            `<meta property="og:image" content="${escapeHtml(siteImage)}" />`
          );
        }

        // og:url and canonical — absolute when config.url is set, removed otherwise
        if (siteUrl) {
          setTag(
            /<meta property="og:url" content=".*?" \/>/,
            `<meta property="og:url" content="${escapeHtml(siteUrl)}" />`
          );
          setTag(
            /<link rel="canonical" href=".*?" \/>/,
            `<link rel="canonical" href="${escapeHtml(siteUrl)}" />`
          );
        } else {
          removeTag(/[ \t]*<meta property="og:url" content=".*?" \/>\n?/);
          removeTag(/[ \t]*<link rel="canonical" href=".*?" \/>\n?/);
        }

        // Twitter tags
        if (seo.twitterCard) {
          setTag(
            /<meta name="twitter:card" content=".*?" \/>/,
            `<meta name="twitter:card" content="${escapeHtml(seo.twitterCard)}" />`
          );
        }
        setTag(
          /<meta name="twitter:title" content=".*?" \/>/,
          `<meta name="twitter:title" content="${escapeHtml(defaultTitle)}" />`
        );
        setTag(
          /<meta name="twitter:description" content=".*?" \/>/,
          `<meta name="twitter:description" content="${escapeHtml(defaultDescription)}" />`
        );
        if (siteImage) {
          setTag(
            /<meta name="twitter:image" content=".*?" \/>/,
            `<meta name="twitter:image" content="${escapeHtml(siteImage)}" />`
          );
        }
        if (twitterHandle) {
          setTag(
            /<meta name="twitter:site" content=".*?" \/>/,
            `<meta name="twitter:site" content="${escapeHtml(twitterHandle)}" />`
          );
          setTag(
            /<meta name="twitter:creator" content=".*?" \/>/,
            `<meta name="twitter:creator" content="${escapeHtml(twitterHandle)}" />`
          );
        } else {
          removeTag(/[ \t]*<meta name="twitter:site" content=".*?" \/>\n?/);
          removeTag(/[ \t]*<meta name="twitter:creator" content=".*?" \/>\n?/);
        }

        return html;
      } catch (error) {
        console.error('❌ Failed to inject metadata from dory.json:', error);
        return html;
      }
    },
  };
}

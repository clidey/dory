import type { Plugin, ResolvedConfig } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  readDoryConfig,
  findMdxFilesMap,
  pathFromFilename,
  parseFrontmatter,
  stripMdxToText,
  escapeHtml,
  applyTitleTemplate,
  getBasePath,
  getSiteUrl,
} from './shared.ts';
import { contentScope, scopedPath } from '../utils/content-scope.ts';
import type { DoryConfig } from '../types/config.ts';
import { renderSocialPreview } from './social-preview.ts';

/**
 * Generates per-route HTML files with page-specific meta tags and JSON-LD
 * at build time. The SSR step (render-routes.mjs) later injects rendered
 * content into these files. Also emits a prerendered 404.html.
 */
export function prerender(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'prerender',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    closeBundle() {
      const outDir = config.build.outDir;
      const frontmatterPath = resolve(outDir, 'frontmatter.json');
      const indexHtmlPath = resolve(outDir, 'index.html');

      if (!existsSync(frontmatterPath) || !existsSync(indexHtmlPath)) {
        console.warn('prerender: frontmatter.json or index.html not found, skipping');
        return;
      }

      try {
        const frontmatter: Array<Record<string, any>> = JSON.parse(readFileSync(frontmatterPath, 'utf-8'));
        const baseHtml = readFileSync(indexHtmlPath, 'utf-8');

        const siteConfig = readDoryConfig() || {};
        const typedConfig = siteConfig as DoryConfig;
        const seo = siteConfig.seo || {};
        const baseUrl: string = getSiteUrl(siteConfig);
        const siteName: string = siteConfig.name || 'Documentation';

        if (!baseUrl) {
          console.warn(
            '⚠️  prerender: `url` is not set in dory.json — canonical and og:url tags will be omitted from all pages. Set `url` for proper SEO.'
          );
        }

        // Resolve seo.ogImage to an absolute URL when possible
        const rawOgImage: string = seo.ogImage || '';
        const ogImage = rawOgImage && baseUrl && !rawOgImage.startsWith('http')
          ? `${baseUrl}${rawOgImage.startsWith('/') ? '' : '/'}${rawOgImage}`
          : rawOgImage;

        // Map route paths to MDX source files for description fallbacks
        const docsDir = resolve(process.cwd(), 'docs');
        const mdxFilesMap = existsSync(docsDir) ? findMdxFilesMap(docsDir, docsDir) : {};
        const fileByRoute: Record<string, string> = {};
        for (const filePath of Object.values(mdxFilesMap)) {
          fileByRoute[pathFromFilename(filePath, docsDir)] = filePath;
        }

        const missingDescriptions: string[] = [];
        let count = 0;
        if (seo.generateSocialImages !== false) {
          renderSocialPreview({ route: '/', title: siteConfig.title || siteName, description: siteConfig.description || '', config: typedConfig, docsDir, outDir });
        }

        for (const page of frontmatter) {
          const routePath = page.path;
          if (!routePath || routePath === '/') continue;

          const title = applyTitleTemplate(page.title || siteName, seo.titleTemplate, siteName);
          const description = page.description || fallbackDescription(fileByRoute[routePath]);
          if (!page.description) {
            missingDescriptions.push(routePath);
          }
          const fullUrl = baseUrl ? `${baseUrl}${routePath}` : '';
          const scope = contentScope(typedConfig, routePath);
          const customImage = typeof page.image === 'string' ? page.image : typeof page.ogImage === 'string' ? page.ogImage : '';
          let image = customImage;
          if (!image && seo.generateSocialImages !== false) {
            image = renderSocialPreview({ route: routePath, title: page.title || siteName, description, config: typedConfig, docsDir, outDir });
          }
          image ||= ogImage || siteConfig.image || '';
          if (image && !/^https?:\/\//i.test(image)) image = `${baseUrl || getBasePath(siteConfig)}/${image.replace(/^\.?\//, '')}`;

          // Route-specific structured data replaces the homepage graph.
          let html = baseHtml.replace(/<script type="application\/ld\+json" data-dory-site-schema>[\s\S]*?<\/script>/, '');
          html = html.replace(/<html\b([^>]*)>/, (_match, attrs: string) => {
            const withoutLang = attrs.replace(/\s+lang="[^"]*"/, '');
            return `<html${withoutLang} lang="${escapeHtml(scope.locale)}">`;
          });
          // Function replacements so `$&` etc. in values cannot corrupt output
          const setTag = (re: RegExp, replacement: string) => {
            html = html.replace(re, () => replacement);
          };
          const injectHeadTag = (tag: string) => {
            html = html.replace('</head>', () => `  ${tag}\n  </head>`);
          };

          setTag(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
          setTag(
            /<meta name="description" content=".*?" \/>/,
            `<meta name="description" content="${escapeHtml(description)}" />`
          );

          // Open Graph tags
          setTag(
            /<meta property="og:title" content=".*?" \/>/,
            `<meta property="og:title" content="${escapeHtml(title)}" />`
          );
          setTag(
            /<meta property="og:description" content=".*?" \/>/,
            `<meta property="og:description" content="${escapeHtml(description)}" />`
          );
          if (typedConfig.i18n) {
            setTag(
              /<meta property="og:locale" content=".*?" \/>/,
              `<meta property="og:locale" content="${escapeHtml(scope.locale.replace(/-/g, '_'))}" />`
            );
          }
          setTag(
            /<meta property="og:type" content=".*?" \/>/,
            '<meta property="og:type" content="article" />'
          );
          if (image) {
            setTag(
              /<meta property="og:image" content=".*?" \/>/,
              `<meta property="og:image" content="${escapeHtml(image)}" />`
            );
            setTag(
              /<meta name="twitter:image" content=".*?" \/>/,
              `<meta name="twitter:image" content="${escapeHtml(image)}" />`
            );
          }
          setTag(
            /<meta name="twitter:card" content=".*?" \/>/,
            `<meta name="twitter:card" content="${image ? escapeHtml(seo.twitterCard || 'summary_large_image') : 'summary'}" />`
          );

          // Twitter tags
          setTag(
            /<meta name="twitter:title" content=".*?" \/>/,
            `<meta name="twitter:title" content="${escapeHtml(title)}" />`
          );
          setTag(
            /<meta name="twitter:description" content=".*?" \/>/,
            `<meta name="twitter:description" content="${escapeHtml(description)}" />`
          );

          // Canonical + og:url — only when config.url is set. When it is not,
          // the metadata injector already removed these tags from the base HTML.
          if (fullUrl) {
            setTag(
              /<meta property="og:url" content=".*?" \/>/,
              `<meta property="og:url" content="${escapeHtml(fullUrl)}" />`
            );
            setTag(
              /<link rel="canonical" href=".*?" \/>/,
              `<link rel="canonical" href="${escapeHtml(fullUrl)}" />`
            );
          }

          if (baseUrl && typedConfig.i18n) {
            for (const locale of typedConfig.i18n.locales) {
              const alternate = scopedPath(typedConfig, routePath, locale.code, scope.version);
              if (!fileByRoute[alternate]) continue;
              injectHeadTag(`<link rel="alternate" hreflang="${escapeHtml(locale.code)}" href="${escapeHtml(`${baseUrl}${alternate}`)}" />`);
            }
          }

          // Per-page robots directive from frontmatter
          if (page.robots) {
            injectHeadTag(`<meta name="robots" content="${escapeHtml(String(page.robots))}" />`);
          }

          // JSON-LD structured data
          const dateModified = toIsoDate(page.lastUpdated);
          const jsonLd = JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebSite',
                'name': siteName,
                ...(baseUrl ? { '@id': `${baseUrl}/#website`, 'url': baseUrl } : {}),
              },
              {
                '@type': 'Article',
                'headline': title,
                'description': description,
                ...(fullUrl ? { 'url': fullUrl } : {}),
                ...(dateModified ? { 'dateModified': dateModified } : {}),
                'publisher': { '@type': 'Organization', 'name': siteName },
                'isPartOf': baseUrl
                  ? { '@id': `${baseUrl}/#website` }
                  : { '@type': 'WebSite', 'name': siteName },
              },
              {
                '@type': 'BreadcrumbList',
                'itemListElement': [
                  {
                    '@type': 'ListItem',
                    'position': 1,
                    'name': 'Home',
                    ...(baseUrl ? { 'item': baseUrl } : {}),
                  },
                  {
                    '@type': 'ListItem',
                    'position': 2,
                    'name': title,
                    ...(fullUrl ? { 'item': fullUrl } : {}),
                  }
                ]
              }
            ]
          }).replace(/</g, '\\u003c');

          injectHeadTag(`<script type="application/ld+json">${jsonLd}</script>`);

          // Write to route directory
          const routeDir = resolve(outDir, routePath.replace(/^\//, ''));
          mkdirSync(routeDir, { recursive: true });
          writeFileSync(resolve(routeDir, 'index.html'), html, 'utf-8');
          count++;
        }

        if (missingDescriptions.length > 0) {
          console.warn(
            `⚠️  prerender: ${missingDescriptions.length} page(s) missing a frontmatter description (using page text fallback): ${missingDescriptions.join(', ')}`
          );
        }

        write404(outDir, baseHtml, siteName, frontmatter, getBasePath(siteConfig));

        console.log(`✅ Prerendered ${count} routes with page-specific meta tags`);
      } catch (error) {
        console.error('prerender failed:', error);
      }
    }
  };
}

/** Builds a ~155 char description from the page's stripped MDX text. */
function fallbackDescription(mdxFilePath: string | undefined): string {
  if (!mdxFilePath || !existsSync(mdxFilePath)) return '';
  const { content } = parseFrontmatter(readFileSync(mdxFilePath, 'utf-8'));
  const text = stripMdxToText(content).replace(/\s+/g, ' ').trim();
  if (text.length <= 155) return text;
  return `${text.slice(0, 155).replace(/\s+\S*$/, '')}…`;
}

/** Normalizes a frontmatter lastUpdated value (string or Date) to an ISO date. */
function toIsoDate(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string | number | Date);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

/** Emits a prerendered 404.html with noindex and a link to the first nav page. */
function write404(
  outDir: string,
  baseHtml: string,
  siteName: string,
  frontmatter: Array<Record<string, any>>,
  basePath: string
): void {
  const firstPage = frontmatter.find(page => page.path && page.path !== '/');
  const firstHref: string = `${basePath}${firstPage?.path || '/'}`;
  const firstTitle: string = firstPage?.title || siteName;

  let html = baseHtml;
  html = html.replace(/<title>.*?<\/title>/, () => `<title>Page not found — ${escapeHtml(siteName)}</title>`);
  html = html.replace('</head>', () => '  <meta name="robots" content="noindex" />\n  </head>');
  // Leave #app empty so the client renders the same UX NotFoundPage used for unknown routes.
  // A separate noscript fallback keeps the static 404 useful without JavaScript.
  html = html.replace(
    '<noscript>You need to enable JavaScript to run this app.</noscript>',
    () => `<noscript><main><h1>Page not found</h1><p>The page you are looking for does not exist.</p><p><a href="${escapeHtml(firstHref)}">Go to ${escapeHtml(firstTitle)}</a></p></main></noscript>`
  );
  writeFileSync(resolve(outDir, '404.html'), html, 'utf-8');
}

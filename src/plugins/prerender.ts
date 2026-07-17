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
} from './shared';

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
        const seo = siteConfig.seo || {};
        const baseUrl: string = siteConfig.url || '';
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
        const hasImage = Boolean(ogImage || siteConfig.image);

        // Map route paths to MDX source files for description fallbacks
        const docsDir = resolve(process.cwd(), 'docs');
        const mdxFilesMap = existsSync(docsDir) ? findMdxFilesMap(docsDir, docsDir) : {};
        const fileByRoute: Record<string, string> = {};
        for (const filePath of Object.values(mdxFilesMap)) {
          fileByRoute[pathFromFilename(filePath, docsDir)] = filePath;
        }

        const missingDescriptions: string[] = [];
        let count = 0;

        for (const page of frontmatter) {
          const routePath = page.path;
          if (!routePath || routePath === '/') continue;

          const title = applyTitleTemplate(page.title || siteName, seo.titleTemplate, siteName);
          const description = page.description || fallbackDescription(fileByRoute[routePath]);
          if (!page.description) {
            missingDescriptions.push(routePath);
          }
          const fullUrl = baseUrl ? `${baseUrl}${routePath}` : '';

          let html = baseHtml;
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
          setTag(
            /<meta property="og:type" content=".*?" \/>/,
            '<meta property="og:type" content="article" />'
          );
          if (ogImage) {
            setTag(
              /<meta property="og:image" content=".*?" \/>/,
              `<meta property="og:image" content="${escapeHtml(ogImage)}" />`
            );
            setTag(
              /<meta name="twitter:image" content=".*?" \/>/,
              `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
            );
          }
          if (!hasImage) {
            // No shareable image — a large-image card would render broken
            setTag(
              /<meta name="twitter:card" content=".*?" \/>/,
              '<meta name="twitter:card" content="summary" />'
            );
          }

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

        write404(outDir, baseHtml, siteName, frontmatter);

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
  frontmatter: Array<Record<string, any>>
): void {
  const firstPage = frontmatter.find(page => page.path && page.path !== '/');
  const firstHref: string = firstPage?.path || '/';
  const firstTitle: string = firstPage?.title || siteName;

  let html = baseHtml;
  html = html.replace(/<title>.*?<\/title>/, () => `<title>Page not found — ${escapeHtml(siteName)}</title>`);
  html = html.replace('</head>', () => '  <meta name="robots" content="noindex" />\n  </head>');
  html = html.replace(
    '<div id="app"></div>',
    () =>
      '<div id="app"><main style="max-width:36rem;margin:6rem auto;padding:0 1.5rem;font-family:sans-serif;text-align:center">' +
      '<h1>Page not found</h1>' +
      '<p>The page you are looking for does not exist.</p>' +
      `<p><a href="${escapeHtml(firstHref)}">Go to ${escapeHtml(firstTitle)}</a></p>` +
      '</main></div>'
  );
  writeFileSync(resolve(outDir, '404.html'), html, 'utf-8');
}

import type { Plugin, ResolvedConfig } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readDoryConfig, escapeHtml, getBasePath } from './shared.ts';
import type { DoryConfig } from '../types/config.ts';
import { renderSocialPreview } from './social-preview.ts';
import { buildPageMetadata, type SeoPage } from '../utils/seo.ts';
import { metadataHtml } from './seo-html.ts';

/** Emit complete page metadata before SSR inserts visible content. */
export function prerender(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'prerender',
    configResolved(resolvedConfig) { config = resolvedConfig; },
    async closeBundle() {
      const outDir = config.build.outDir;
      const frontmatterPath = resolve(outDir, 'frontmatter.json');
      const indexHtmlPath = resolve(outDir, 'index.html');
      if (!existsSync(frontmatterPath) || !existsSync(indexHtmlPath)) return;
      const pages: SeoPage[] = JSON.parse(readFileSync(frontmatterPath, 'utf8'));
      const baseHtml = readFileSync(indexHtmlPath, 'utf8');
      const site = (readDoryConfig() || {}) as DoryConfig;
      if (!site.url) console.warn('⚠️  Set `url` in dory.json for absolute canonicals, sitemap and social image URLs.');
      const docsDir = resolve(process.cwd(), 'docs');
      // An explicit index.mdx is a real homepage; otherwise / aliases the first nav page.
      const home = pages.find(page => page.path === '/') || pages[0];
      for (const page of pages) {
        const image = !page.image && !page.ogImage && site.seo?.generateSocialImages !== false
          ? await renderSocialPreview({ route: page.path, title: page.title || site.name, description: page.description || site.description || '', config: site, docsDir, outDir })
          : '';
        page._dorySocialImage = image;
        const html = metadataHtml(baseHtml, buildPageMetadata(site, page, pages, image));
        const routeDir = resolve(outDir, page.path.replace(/^\//, ''));
        mkdirSync(routeDir, { recursive: true });
        writeFileSync(resolve(routeDir, 'index.html'), html);
        if (page === home && page.path !== '/') writeFileSync(indexHtmlPath, html);
      }
      // Share the generated image path; the browser uses the same metadata builder.
      writeFileSync(frontmatterPath, JSON.stringify(pages));
      const notFoundPage = { path: '/404', title: 'Page not found', description: 'The page you are looking for does not exist.', robots: 'noindex, nofollow' };
      const notFoundImage = site.seo?.generateSocialImages !== false
        ? await renderSocialPreview({ route: '/404', title: notFoundPage.title, description: notFoundPage.description, config: site, docsDir, outDir })
        : '';
      const notFound = buildPageMetadata(site, notFoundPage, [], notFoundImage);
      notFound.canonical = '';
      delete notFound.meta['og:url'];
      notFound.schema = { '@context': 'https://schema.org', '@type': 'WebPage', name: notFound.title };
      let html404 = metadataHtml(baseHtml, notFound);
      html404 = html404.replace('<noscript>You need to enable JavaScript to run this app.</noscript>', () => `<noscript><main><h1>Page not found</h1><p>The page you are looking for does not exist.</p><a href="${escapeHtml(`${getBasePath(site)}${home?.path || '/'}`)}">Go to ${escapeHtml(site.name || 'documentation')}</a></main></noscript>`);
      writeFileSync(resolve(outDir, '404.html'), html404);
      console.log(`✅ Prerendered ${pages.length} routes with canonical, social and structured metadata`);
    },
  };
}

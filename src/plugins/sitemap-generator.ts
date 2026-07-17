import type { Plugin } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  readDoryConfig,
  findMdxFilesMap,
  pathFromFilename,
  parseFrontmatter,
  escapeHtml,
} from './shared';

/**
 * Generates sitemap.xml at build time from all MDX files (not just those in
 * navigation). Uses frontmatter `lastUpdated` for lastmod when present and
 * calculates priority based on route depth. Skipped entirely when
 * `url` is missing or `seo.noindex` is set.
 */
export function sitemapGenerator(): Plugin {
  return {
    name: 'sitemap-generator',
    generateBundle() {
      const docsDir = resolve(process.cwd(), 'docs');
      const config = readDoryConfig(docsDir);
      if (!config) {
        console.warn('sitemap-generator: dory.json not found, skipping');
        return;
      }

      const baseUrl: string = config.url || '';
      if (!baseUrl) {
        console.warn(
          '⚠️  sitemap-generator: `url` is not set in dory.json — sitemap.xml will NOT be generated. Set `url` to enable it.'
        );
        return;
      }
      if (config.seo?.noindex) {
        console.warn('⚠️  sitemap-generator: seo.noindex is set — sitemap.xml will NOT be generated.');
        return;
      }

      try {
        const mdxFilesMap = existsSync(docsDir) ? findMdxFilesMap(docsDir, docsDir) : {};

        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Root URL first
        sitemap += '  <url>\n';
        sitemap += `    <loc>${escapeHtml(`${baseUrl}/`)}</loc>\n`;
        sitemap += '    <priority>1.0</priority>\n';
        sitemap += '  </url>\n';

        let count = 1;
        for (const filePath of Object.values(mdxFilesMap).sort()) {
          const routePath = pathFromFilename(filePath, docsDir);
          if (routePath === '/') continue;

          const { data } = parseFrontmatter(readFileSync(filePath, 'utf-8'));
          // Exclude pages marked noindex in frontmatter
          if (typeof data.robots === 'string' && data.robots.includes('noindex')) continue;

          const lastmod = toIsoDate(data.lastUpdated);

          // Priority based on route depth: fewer segments = higher priority
          const depth = routePath.replace(/^\//, '').split('/').length;
          const priority = Math.max(0.3, 1.0 - (depth - 1) * 0.2).toFixed(1);

          sitemap += '  <url>\n';
          sitemap += `    <loc>${escapeHtml(`${baseUrl}${routePath}`)}</loc>\n`;
          if (lastmod) {
            sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
          }
          sitemap += `    <priority>${priority}</priority>\n`;
          sitemap += '  </url>\n';
          count++;
        }

        sitemap += '</urlset>';

        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: sitemap
        });

        console.log(`✅ Generated sitemap.xml with ${count} URLs`);
      } catch (error) {
        const detail = error instanceof SyntaxError ? error.message : String(error);
        console.error(`Failed to generate sitemap: ${detail}`);
      }
    }
  };
}

/** Normalizes a frontmatter lastUpdated value (string or Date) to an ISO date. */
function toIsoDate(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string | number | Date);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

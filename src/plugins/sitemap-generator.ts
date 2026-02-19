import type { Plugin } from 'vite';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';

/**
 * Generates sitemap.xml from dory.json navigation structure at build time.
 * Uses actual file modification times for lastmod and calculates priority
 * based on route depth.
 */
export function sitemapGenerator(): Plugin {
  return {
    name: 'sitemap-generator',
    generateBundle() {
      const docsDir = resolve(process.cwd(), 'docs');
      const doryJsonPath = resolve(docsDir, 'dory.json');
      if (!existsSync(doryJsonPath)) {
        console.warn('sitemap-generator: dory.json not found, skipping');
        return;
      }

      try {
        const config = JSON.parse(readFileSync(doryJsonPath, 'utf-8'));
        const baseUrl = config.url || '';

        // Extract all routes from navigation
        const routes: string[] = [];
        function walkPages(pages: any[]) {
          for (const page of pages) {
            if (typeof page === 'string') {
              routes.push(page);
            } else if (typeof page === 'object' && page.pages) {
              walkPages(page.pages);
            }
          }
        }

        if (config.navigation?.tabs) {
          for (const tab of config.navigation.tabs) {
            if (tab.groups) {
              for (const group of tab.groups) {
                if (group.pages) {
                  walkPages(group.pages);
                }
              }
            }
          }
        }

        const fallbackDate = new Date().toISOString().split('T')[0];
        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        for (const route of routes) {
          // Get actual file modification time
          const mdxPath = resolve(docsDir, `${route}.mdx`);
          let lastmod = fallbackDate;
          if (existsSync(mdxPath)) {
            lastmod = statSync(mdxPath).mtime.toISOString().split('T')[0];
          }

          // Priority based on route depth: fewer segments = higher priority
          const depth = route.split('/').length;
          const priority = Math.max(0.3, 1.0 - (depth - 1) * 0.2).toFixed(1);

          sitemap += '  <url>\n';
          sitemap += `    <loc>${baseUrl}/${route}</loc>\n`;
          sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
          sitemap += `    <priority>${priority}</priority>\n`;
          sitemap += '  </url>\n';
        }

        sitemap += '</urlset>';

        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: sitemap
        });

        console.log(`✅ Generated sitemap.xml with ${routes.length} URLs`);
      } catch (error) {
        const detail = error instanceof SyntaxError ? error.message : String(error);
        console.error(`Failed to generate sitemap: ${detail}`);
      }
    }
  };
}

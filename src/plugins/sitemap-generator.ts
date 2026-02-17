import type { Plugin } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Generates sitemap.xml from dory.json navigation structure at build time.
 * Uses the `url` field from dory.json as the base URL.
 */
export function sitemapGenerator(): Plugin {
  return {
    name: 'sitemap-generator',
    generateBundle() {
      const doryJsonPath = resolve(process.cwd(), 'docs', 'dory.json');
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
              routes.push(`/${page}`);
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

        const now = new Date().toISOString().split('T')[0];
        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        for (const route of routes) {
          sitemap += '  <url>\n';
          sitemap += `    <loc>${baseUrl}${route}</loc>\n`;
          sitemap += `    <lastmod>${now}</lastmod>\n`;
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

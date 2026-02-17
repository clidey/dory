import type { Plugin } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Generates robots.txt with a sitemap reference at build time.
 */
export function robotsGenerator(): Plugin {
  return {
    name: 'robots-generator',
    generateBundle() {
      const doryJsonPath = resolve(process.cwd(), 'docs', 'dory.json');

      let sitemapLine = '';
      if (existsSync(doryJsonPath)) {
        try {
          const config = JSON.parse(readFileSync(doryJsonPath, 'utf-8'));
          if (config.url) {
            sitemapLine = `\nSitemap: ${config.url}/sitemap.xml\n`;
          }
        } catch {
          // Non-critical, continue without sitemap reference
        }
      }

      const robots = `User-agent: *\nAllow: /\n${sitemapLine}`;

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robots
      });

      console.log('✅ Generated robots.txt');
    }
  };
}

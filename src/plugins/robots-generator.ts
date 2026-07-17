import type { Plugin } from 'vite';
import { readDoryConfig } from './shared';

/**
 * Generates robots.txt at build time. Emits `Disallow: /` when seo.noindex
 * is set, appends any seo.robotsTxt lines, and references the sitemap when
 * `url` is configured.
 */
export function robotsGenerator(): Plugin {
  return {
    name: 'robots-generator',
    generateBundle() {
      const config = readDoryConfig() || {};
      const seo = config.seo || {};

      const lines = ['User-agent: *'];
      lines.push(seo.noindex ? 'Disallow: /' : 'Allow: /');

      if (Array.isArray(seo.robotsTxt) && seo.robotsTxt.length > 0) {
        lines.push('', ...seo.robotsTxt);
      }

      if (config.url && !seo.noindex) {
        lines.push('', `Sitemap: ${config.url}/sitemap.xml`);
      }

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: lines.join('\n') + '\n'
      });

      console.log('✅ Generated robots.txt');
    }
  };
}

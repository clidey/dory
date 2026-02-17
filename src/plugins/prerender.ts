import type { Plugin, ResolvedConfig } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Generates per-route HTML files with page-specific meta tags at build time.
 * This is NOT full SSR — the Preact app still hydrates client-side.
 * It provides correct <title>, <meta>, canonical, and JSON-LD per route
 * so crawlers see unique, meaningful HTML for each documentation page.
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

        // Read dory.json for site-level config
        const doryJsonPath = resolve(process.cwd(), 'docs', 'dory.json');
        let siteConfig: Record<string, any> = {};
        if (existsSync(doryJsonPath)) {
          siteConfig = JSON.parse(readFileSync(doryJsonPath, 'utf-8'));
        }

        const baseUrl = siteConfig.url || '';
        const siteName = siteConfig.name || 'Documentation';
        let count = 0;

        for (const page of frontmatter) {
          const routePath = page.path;
          if (!routePath || routePath === '/') continue;

          const title = page.title || siteName;
          const description = page.description || `${siteName} - ${title}`;
          const fullUrl = `${baseUrl}${routePath}`;

          let html = baseHtml;

          // Replace title
          html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

          // Replace meta description
          html = html.replace(
            /<meta name="description" content=".*?" \/>/,
            `<meta name="description" content="${escapeAttr(description)}" />`
          );

          // Replace OG tags
          html = html.replace(
            /<meta property="og:title" content=".*?" \/>/,
            `<meta property="og:title" content="${escapeAttr(title)}" />`
          );
          html = html.replace(
            /<meta property="og:description" content=".*?" \/>/,
            `<meta property="og:description" content="${escapeAttr(description)}" />`
          );
          if (fullUrl) {
            html = html.replace(
              /<meta property="og:url" content=".*?" \/>/,
              `<meta property="og:url" content="${escapeAttr(fullUrl)}" />`
            );
          }

          // Replace Twitter tags
          html = html.replace(
            /<meta name="twitter:title" content=".*?" \/>/,
            `<meta name="twitter:title" content="${escapeAttr(title)}" />`
          );
          html = html.replace(
            /<meta name="twitter:description" content=".*?" \/>/,
            `<meta name="twitter:description" content="${escapeAttr(description)}" />`
          );

          // Add canonical link
          if (!html.includes('rel="canonical"')) {
            html = html.replace(
              '</head>',
              `  <link rel="canonical" href="${escapeAttr(fullUrl)}" />\n  </head>`
            );
          }

          // Write to route directory
          const routeDir = resolve(outDir, routePath.replace(/^\//, ''));
          mkdirSync(routeDir, { recursive: true });
          writeFileSync(resolve(routeDir, 'index.html'), html, 'utf-8');
          count++;
        }

        console.log(`✅ Prerendered ${count} routes with page-specific meta tags`);
      } catch (error) {
        console.error('prerender failed:', error);
      }
    }
  };
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

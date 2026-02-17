import type { Plugin } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Generates a Content-Security-Policy meta tag based on dory.json config.
 * Dynamically adds font sources and analytics domains as needed.
 */
export function cspGenerator(): Plugin {
  return {
    name: 'csp-generator',
    transformIndexHtml(html) {
      const doryJsonPath = resolve(process.cwd(), 'docs', 'dory.json');
      if (!existsSync(doryJsonPath)) return html;

      try {
        const config = JSON.parse(readFileSync(doryJsonPath, 'utf-8'));

        const scriptSrc = ["'self'", "'unsafe-inline'", "'unsafe-eval'"];
        const styleSrc = ["'self'", "'unsafe-inline'"];
        const fontSrc = ["'self'", "data:"];
        const connectSrc = ["'self'"];
        const imgSrc = ["'self'", "data:", "https:"];

        // Add Google Fonts if fonts are configured with external source
        if (config.fonts?.source) {
          try {
            const fontUrl = new URL(config.fonts.source);
            fontSrc.push(fontUrl.origin);
          } catch {
            // Not a URL, skip
          }
        }
        styleSrc.push("https://fonts.googleapis.com");
        fontSrc.push("https://fonts.gstatic.com");

        // Add PostHog if analytics configured
        if (config.analytics?.posthog?.token) {
          const apiHost = config.analytics.posthog.apiHost || 'https://us.i.posthog.com';
          const assetsHost = apiHost.replace('.i.posthog.com', '-assets.i.posthog.com');
          scriptSrc.push(apiHost);
          scriptSrc.push(assetsHost);
          connectSrc.push(apiHost);
        }

        // Note: frame-ancestors is omitted because it's ignored in <meta> CSP tags.
        // Clickjacking protection is handled via X-Frame-Options in nginx config.
        const csp = [
          `default-src 'self'`,
          `script-src ${scriptSrc.join(' ')}`,
          `style-src ${styleSrc.join(' ')}`,
          `font-src ${fontSrc.join(' ')}`,
          `img-src ${imgSrc.join(' ')}`,
          `connect-src ${connectSrc.join(' ')}`,
        ].join('; ');

        return html.replace(
          '</head>',
          `  <meta http-equiv="Content-Security-Policy" content="${csp}">\n  </head>`
        );
      } catch (error) {
        const detail = error instanceof SyntaxError ? error.message : String(error);
        console.error(`Failed to generate CSP: ${detail}`);
        return html;
      }
    },
  };
}

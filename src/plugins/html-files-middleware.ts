import type { Plugin } from 'vite';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, extname, sep } from 'path';

/**
 * Returns true if `target` is the `root` path itself or is contained within it.
 * Both paths must already be resolved (absolute, normalized).
 */
export function isPathInside(root: string, target: string): boolean {
  return target === root || target.startsWith(root + sep);
}

/**
 * Vite plugin to serve HTML files and assets directly from the docs directory
 * and static files from the dist directory without routing them through the SPA
 */
export function htmlFilesMiddleware(): Plugin {
  // Define asset extensions
  const assetExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
    '.pdf', '.mp4', '.webm', '.mp3', '.wav', '.mov',
    '.woff', '.woff2', '.ttf', '.eot',
  ]);

  // Map extensions to MIME types
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
  };

  return {
    name: 'html-files-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        // Remove query params
        const url = req.url.split('?')[0];

        // Check if the request is for a file in the dist directory
        if (url.startsWith('/dist/')) {
          const distRoot = resolve(process.cwd(), 'dist');
          const distPath = resolve(process.cwd(), url.slice(1));

          // Reject paths that escape the dist directory (e.g. /dist/../../etc/passwd)
          if (!isPathInside(distRoot, distPath)) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }

          if (existsSync(distPath)) {
            try {
              const content = readFileSync(distPath);
              const ext = extname(url).toLowerCase();
              const contentType = mimeTypes[ext] || 'application/octet-stream';

              res.setHeader('Content-Type', contentType);
              res.setHeader('Cache-Control', 'no-cache');
              res.end(content);
              return;
            } catch (error) {
              console.error(`Error reading ${distPath}:`, error);
            }
          }
        }

        // Check if the request is for a file in the docs directory
        // This handles both direct file requests and directory requests
        const docsRoot = resolve(process.cwd(), 'docs');
        const docsPath = resolve(docsRoot, url.slice(1));

        // Reject paths that escape the docs directory
        if (!isPathInside(docsRoot, docsPath)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        if (existsSync(docsPath)) {
          try {
            const stats = statSync(docsPath);

            // If it's a file, serve it
            if (stats.isFile()) {
              const ext = extname(url).toLowerCase();

              // Only serve HTML files and assets, not MDX files
              if (url.endsWith('.html') || assetExtensions.has(ext)) {
                const content = readFileSync(docsPath);
                const contentType = mimeTypes[ext] || 'application/octet-stream';

                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'no-cache');
                res.end(content);
                return;
              }
            }
          } catch (error) {
            console.error(`Error reading ${docsPath}:`, error);
          }
        }

        next();
      });
    },
  };
}

import type { Plugin } from 'vite';
import { readFileSync, existsSync, realpathSync, statSync } from 'fs';
import { resolve, extname, sep } from 'path';
import { getBasePath, readDoryConfig } from './shared.ts';

/**
 * Returns true if `target` is the `root` path itself or is contained within it.
 * Both paths must already be resolved (absolute, normalized).
 */
export function isPathInside(root: string, target: string): boolean {
  return target === root || target.startsWith(root + sep);
}

/** Resolve symlinks before serving a file so a path inside docs cannot point outside it. */
export function isRealPathInside(root: string, target: string): boolean {
  try {
    return isPathInside(realpathSync(root), realpathSync(target));
  } catch {
    return false;
  }
}

/**
 * Vite plugin to serve HTML files and assets directly from the docs directory
 * and static files from the dist directory without routing them through the SPA
 */
export function htmlFilesMiddleware(): Plugin {
  // Define asset extensions
  const assetExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico',
    '.pdf', '.mp4', '.webm', '.ogv', '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.mov',
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
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogv': 'video/ogg',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.mdx': 'text/markdown; charset=utf-8',
  };

  return {
    name: 'html-files-middleware',
    configureServer(server) {
      // Plugin middlewares run before Vite strips `base`, so strip it here.
      const basePath = getBasePath(readDoryConfig());

      server.middlewares.use((req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        // Remove query params and the base path prefix
        let url = req.url.split('?')[0];
        if (basePath && (url === basePath || url.startsWith(`${basePath}/`))) {
          url = url.slice(basePath.length) || '/';
        }

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
              if (!isRealPathInside(distRoot, distPath)) {
                res.statusCode = 403;
                res.end('Forbidden');
                return;
              }
              const content = readFileSync(realpathSync(distPath));
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
            if (!isRealPathInside(docsRoot, docsPath)) {
              res.statusCode = 403;
              res.end('Forbidden');
              return;
            }
            const stats = statSync(docsPath);

            // If it's a file, serve it
            if (stats.isFile()) {
              const ext = extname(url).toLowerCase();

              // HTML, assets, and MDX sources (the build copies these too, for Open MDX / Copy page)
              if (url.endsWith('.html') || ext === '.mdx' || assetExtensions.has(ext)) {
                const content = readFileSync(realpathSync(docsPath));
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

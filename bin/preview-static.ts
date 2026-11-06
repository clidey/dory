import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';
import sirv from 'sirv';

/** Reject hidden files and traversal before sirv's development lookup. */
function publicPath(url: string): string | undefined {
  let path: string;
  try { path = decodeURIComponent(url.split('?')[0]); }
  catch { return undefined; }
  if (!path.startsWith('/') || path.includes('\\') || path.includes('\0')) return undefined;
  if (path.split('/').some(segment => segment.startsWith('.'))) return undefined;
  return path;
}

function isPublicFile(root: string, path: string): boolean {
  try {
    const actual = realpathSync(join(root, path));
    const local = relative(root, actual);
    return !isAbsolute(local) && local !== '..' && !local.startsWith(`..${sep}`)
      && !local.split(sep).some(segment => segment.startsWith('.'));
  } catch (error) {
    // Missing candidates are harmless; fail closed on access or lookup errors.
    return (error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ENOTDIR';
  }
}

/**
 * Re-stat rebuilt files while keeping static responses inside the public tree.
 * This is a file-serving boundary, not a sandbox for local build code.
 */
export function createPreviewStatic(distDir: string) {
  const root = realpathSync(distDir);
  const serve = sirv(root, { dev: true, single: false, etag: true, gzip: true, brotli: true });
  const extensions = ['', '.html', '.htm', '.gz', '.html.gz', '.htm.gz', '.br', '.html.br', '.htm.br'];
  return (req: IncomingMessage, res: ServerResponse): void => {
    const path = publicPath(req.url ?? '/');
    const uri = path?.replace(/\/$/, '') ?? '';
    // Include compressed and extensionless index files used by sirv's lookup.
    const candidates = extensions.flatMap(extension => [uri + extension, `${uri}/index${extension}`]);
    if (path === undefined || candidates.some(candidate => !isPublicFile(root, candidate))) {
      res.statusCode = 404;
      res.setHeader('Cache-Control', 'no-store');
      res.end();
      return;
    }
    serve(req, res, () => {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      let body: Buffer | string = 'Page not found';
      // Custom 404 pages receive the same symlink-containment checks.
      if (isPublicFile(root, '/404.html')) {
        try { body = readFileSync(join(root, '404.html')); } catch { /* Use the public fallback. */ }
      }
      res.end(req.method === 'HEAD' ? undefined : body);
    });
  };
}

import type { Plugin } from 'vite';
import path from 'path';
import { generateFrontmatterJson, generateSearchContentJson } from './frontmatter-generator';

/**
 * Dev server plugin that serves frontmatter.json and search-content.json
 * on demand, generated fresh per request from the docs directory.
 */
export function frontmatterDevServer(): Plugin {
  return {
    name: 'frontmatter-dev-server',
    configureServer(server) {
      // Serve search content for client-side indexing
      server.middlewares.use('/search-content.json', (req, res, next) => {
        if (req.method !== 'GET') return next();
        try {
          const docsDir = path.join(process.cwd(), 'docs');
          const frontmatterArray = generateFrontmatterJson(docsDir);
          const searchContent = generateSearchContentJson(docsDir, frontmatterArray);
          const json = JSON.stringify(searchContent);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(json);
        } catch (error) {
          console.error('Error generating search content:', error);
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });

      server.middlewares.use('/frontmatter.json', (req, res, next) => {
        if (req.method !== 'GET') {
          return next();
        }

        try {
          const docsDir = path.join(process.cwd(), 'docs');
          const frontmatterArray = generateFrontmatterJson(docsDir);
          const jsonContent = JSON.stringify(frontmatterArray, null, 2);

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Length', Buffer.byteLength(jsonContent));
          res.end(jsonContent);
        } catch (error) {
          console.error('Error generating frontmatter JSON:', error);
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });
    }
  };
}

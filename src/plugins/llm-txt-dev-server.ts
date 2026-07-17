import type { Plugin } from 'vite';
import path from 'path';
import { generateLlmsIndex, generateLlmContent } from './llm-txt-generator';

/**
 * Dev server plugin that serves llms.txt and llms-full.txt on demand,
 * generated fresh per request from the docs directory.
 */
export function llmTxtDevServer(): Plugin {
  const serveText = (generate: (docsDir: string) => string) =>
    (req: any, res: any, next: () => void) => {
      if (req.method !== 'GET') {
        return next();
      }

      try {
        const docsDir = path.join(process.cwd(), 'docs');
        const content = generate(docsDir);

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Length', Buffer.byteLength(content));
        res.end(content);
      } catch (error) {
        console.error('Error generating LLM text:', error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    };

  return {
    name: 'llm-txt-dev-server',
    configureServer(server) {
      server.middlewares.use('/llms.txt', serveText(generateLlmsIndex));
      server.middlewares.use('/llms-full.txt', serveText(generateLlmContent));
    }
  };
}

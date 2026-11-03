import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';
import { listPages, readPage } from './automation.js';

const result = (value: unknown) => ({ content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value) }] });
const maxBody = 64 * 1024;

/** Public, read-only MCP endpoint for a built Dory site. */
export function createDocsMcp(distDir: string, version: string) {
  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: 'dory-docs', version });

    server.registerTool('list_pages', {
      description: 'List the published MDX source paths available in this Dory documentation site. Read llms.txt for the navigation index.',
      inputSchema: z.object({}),
    }, () => result(listPages(distDir)));

    server.registerTool('read_page', {
      description: 'Read one published MDX source page by the relative path returned by list_pages.',
      inputSchema: z.object({ page: z.string().min(1).max(500) }),
    }, ({ page }) => {
      try {
        return result(readPage(distDir, page));
      } catch {
        return { ...result('Page not found'), isError: true };
      }
    });

    server.registerTool('search_docs', {
      description: 'Search documentation page titles and content. Returns paths and short excerpts; call read_page for full text.',
      inputSchema: z.object({ query: z.string().trim().min(2).max(200) }),
    }, ({ query }) => {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const matches = listPages(distDir).flatMap(page => {
        const content = readPage(distDir, page);
        const lower = content.toLowerCase();
        const path = page.toLowerCase();
        const score = words.reduce((sum, word) => sum + (path.includes(word) ? 5 : 0) + (lower.includes(word) ? 1 : 0), 0);
        if (!score) return [];
        const first = Math.max(0, lower.indexOf(words.find(word => lower.includes(word)) ?? '') - 80);
        return [{ page, score, excerpt: content.slice(first, first + 400).replace(/\s+/g, ' ') }];
      });
      return result(matches.sort((a, b) => b.score - a.score).slice(0, 12));
    });

    server.registerTool('site_guide', {
      description: 'Read the Dory llms.txt navigation and agent instructions for this site.',
      inputSchema: z.object({}),
    }, () => {
      try {
        return result(readFileSync(resolve(distDir, 'llms.txt'), 'utf8'));
      } catch {
        return result('Use list_pages to discover documentation pages.');
      }
    });

    return server;
  }, { maxRequestBodySize: maxBody, maxSubscriptions: 0 });
  const nodeHandler = toNodeHandler(handler, { maxRequestBodySize: maxBody });
  return {
    fetch: handler.fetch,
    async serve(req: IncomingMessage, res: ServerResponse) {
      if (req.method !== 'POST') {
        res.writeHead(405, { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method not allowed');
        return;
      }
      await nodeHandler(req, res);
    },
    close: () => handler.close(),
  };
}

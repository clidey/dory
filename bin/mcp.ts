import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { dirname, resolve } from 'node:path';
import { discoverSite, listPages, pagePath, projectInfo, readPage, readRemotePage, runDory, screenshot, writePage } from './automation.js';

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
const root = () => process.env.DORY_PROJECT_ROOT || process.cwd();

export function serveMcp(entrypoint: string, version: string) {
  const referenceRoot = resolve(dirname(dirname(entrypoint)), 'docs');
  void serveStdio(() => {
    const server = new McpServer({ name: 'dory', version });

    server.registerTool('dory_guide', {
      description: 'How to build, inspect, capture, and iterate on Dory documentation. Call this first for a new documentation project.',
      inputSchema: z.object({}),
    }, async () => text('Start with dory_project to read dory.json and page paths. Use dory_reference to inspect Dory component and configuration documentation. Use dory_read_page or dory_write_page for MDX, dory_verify_page to check compilation, dory_check to find navigation and link issues, dory_build to create dist, and dory_screenshot to inspect a route in light or dark mode. Iterate until checks, build, and screenshots look correct. For a hosted Dory URL, use dory_discover_site to find llms.txt and every published .mdx source, then dory_read_remote_page to fetch one. All local paths are relative to DORY_PROJECT_ROOT.'));

    server.registerTool('dory_reference', {
      description: 'List or read Dory’s packaged MDX component, configuration, and automation reference pages. Call without page to list paths.',
      inputSchema: z.object({ page: z.string().optional() }),
    }, async ({ page }) => text(page ? readPage(referenceRoot, page) : listPages(referenceRoot)));

    server.registerTool('dory_project', {
      description: 'Read dory.json and list all local MDX page paths.',
      inputSchema: z.object({}),
    }, async () => text(projectInfo(root())));

    server.registerTool('dory_read_page', {
      description: 'Read one local MDX page by relative path.',
      inputSchema: z.object({ page: z.string() }),
    }, async ({ page }) => text(readPage(root(), page)));

    server.registerTool('dory_write_page', {
      description: 'Create or replace one local MDX page. Use dory_verify_page and dory_build afterward.',
      inputSchema: z.object({ page: z.string(), content: z.string() }),
    }, async ({ page, content }) => text({ path: writePage(root(), page, content) }));

    server.registerTool('dory_verify_page', {
      description: 'Compile an MDX page with the same processor used by Dory builds.',
      inputSchema: z.object({ page: z.string() }),
    }, async ({ page }) => {
      pagePath(root(), page);
      const result = await runDory(root(), entrypoint, ['verify:content', '--file', page]);
      return { ...text(result.code === 0 ? 'MDX compiles successfully' : result.output), isError: result.code !== 0 };
    });

    server.registerTool('dory_check', {
      description: 'Check the local project navigation, links, and content before building.',
      inputSchema: z.object({}),
    }, async () => {
      const result = await runDory(root(), entrypoint, ['check']);
      return { ...text(result.output), isError: result.code !== 0 };
    });

    server.registerTool('dory_build', {
      description: 'Build the documentation site, including HTML, source MDX, llms.txt, sitemap, and embed files. Returns the build log.',
      inputSchema: z.object({}),
    }, async () => {
      const result = await runDory(root(), entrypoint, ['build']);
      return { ...text({ success: result.code === 0, output: result.output }), isError: result.code !== 0 };
    });

    server.registerTool('dory_screenshot', {
      description: 'Capture a full-page PNG of a built Dory route. Run dory_build first. Output must be inside .dory/screenshots. Returns the file path and image.',
      inputSchema: z.object({
        route: z.string().optional(),
        output: z.string().optional(),
        width: z.number().int().min(320).max(3840).optional(),
        height: z.number().int().min(240).max(2160).optional(),
        theme: z.enum(['light', 'dark']).optional(),
      }),
    }, async (options) => {
      const result = await screenshot(root(), options);
      return { content: [
        { type: 'text' as const, text: JSON.stringify({ output: result.output, url: result.url }) },
        { type: 'image' as const, data: result.data.toString('base64'), mimeType: 'image/png' as const },
      ] };
    });

    server.registerTool('dory_discover_site', {
      description: 'Discover a hosted Dory site from one URL. Returns its llms.txt instructions, all linked MDX source URLs, and llms-full.txt URL.',
      inputSchema: z.object({ url: z.url() }),
    }, async ({ url }) => text(await discoverSite(url)));

    server.registerTool('dory_read_remote_page', {
      description: 'Fetch a published .mdx source URL returned by dory_discover_site.',
      inputSchema: z.object({ url: z.url() }),
    }, async ({ url }) => text(await readRemotePage(url)));

    return server;
  });
}

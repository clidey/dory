import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createDocsMcp } from './mcp-http';

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

test('hosted MCP serves built pages and rejects paths outside dist', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'dory-mcp-test-'));
  folders.push(root);
  const dist = resolve(root, 'dist');
  mkdirSync(resolve(dist, 'guide'), { recursive: true });
  writeFileSync(resolve(dist, 'llms.txt'), '# Test docs\n');
  writeFileSync(resolve(dist, 'guide', 'start.mdx'), '# Start\nConnect the app.\n');
  writeFileSync(resolve(root, 'private.mdx'), '# Private\n');
  const mcp = createDocsMcp(dist, 'test');
  let id = 0;
  const call = async (method: string, params: unknown) => {
    const response = await mcp.fetch(new Request('http://localhost/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
    }));
    expect(response.status).toBe(200);
    const body = await response.text();
    return JSON.parse(body.match(/^data: (.+)$/m)![1]);
  };
  try {
    expect((await call('tools/list', {})).result.tools.map((tool: { name: string }) => tool.name)).toEqual(['list_pages', 'read_page', 'search_docs', 'site_guide']);
    expect((await call('tools/call', { name: 'list_pages', arguments: {} })).result.content[0].text).toContain('guide/start.mdx');
    expect((await call('tools/call', { name: 'read_page', arguments: { page: 'guide/start.mdx' } })).result.content[0].text).toContain('Connect the app');
    expect((await call('tools/call', { name: 'read_page', arguments: { page: '../private.mdx' } })).result.isError).toBe(true);
    expect((await call('tools/call', { name: 'search_docs', arguments: { query: 'Connect' } })).result.content[0].text).toContain('guide/start.mdx');
  } finally {
    await mcp.close();
  }
});

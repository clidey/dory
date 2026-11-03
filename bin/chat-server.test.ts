import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

describe('documentation chat endpoint', () => {
  let server: Server;
  let base: string;
  let docsDir: string;
  let localDevelopment: boolean;
  let handleChatRequest: (req: IncomingMessage, res: ServerResponse, options: { docsDir: string; localDevelopment?: boolean }) => Promise<boolean>;
  const previous = { ...process.env };

  beforeEach(async () => {
    vi.resetModules();
    ({ handleChatRequest } = await import('./chat-server'));
    docsDir = mkdtempSync(join(tmpdir(), 'dory-chat-test-'));
    writeFileSync(join(docsDir, 'getting-started.mdx'), '---\ntitle: Getting Started\n---\n# Getting Started\nInstall Dory with pnpm and run dory build to create a documentation site.\n');
    process.env.DORY_CHAT_API_KEY = 'test-secret-that-must-never-appear';
    process.env.DORY_CHAT_MODEL = 'test-model';
    process.env.DORY_CHAT_BASE_URL = 'https://provider.example/v1';
    process.env.DORY_CHAT_GLOBAL_DAY = '100';
    process.env.DORY_CHAT_PER_MINUTE = '3';
    localDevelopment = false;
    server = createServer((req, res) => { void handleChatRequest(req, res, { docsDir, localDevelopment }); });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test port');
    base = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise<void>(resolve => server.close(() => resolve()));
    rmSync(docsDir, { recursive: true, force: true });
    process.env = { ...previous };
  });

  const post = (base: string, body: unknown, origin = base) => fetch(`${base}/api/chat`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

  it('keeps the provider key server-side and returns only verified source links', async () => {
    const fetchReal = globalThis.fetch.bind(globalThis);
    const provider = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://provider.example')) {
        expect(init?.headers).toMatchObject({ Authorization: `Bearer ${process.env.DORY_CHAT_API_KEY}` });
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: 'Run dory build.', answerable: true, citations: ['S1', 'made-up'], followUps: ['What next?'] }) } }] }), { status: 200 });
      }
      return fetchReal(input, init);
    });
    const response = await post(base, { message: 'How do I build Dory?' });
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain('/getting-started');
    expect(body).not.toContain('test-secret');
    expect(body).not.toContain('made-up');
    provider.mockRestore();
  });

  it('redirects an unrelated question to documentation topics without calling the model', async () => {
    writeFileSync(join(docsDir, 'dory.json'), JSON.stringify({ name: 'Dory', chat: { suggestedQuestions: ['How do I install Dory?', 'How do I build a site?'] } }));
    const fetchReal = globalThis.fetch.bind(globalThis);
    let providerCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (String(input).startsWith('https://provider.example')) providerCalls++;
      return fetchReal(input, init);
    });
    const response = await post(base, { message: 'How does TallyPrime work?', pathname: '/getting-started' });
    const result = await response.json() as { answer: string; citations: unknown[]; followUps: string[] };
    expect(response.status).toBe(200);
    expect(result.citations).toEqual([]);
    expect(result.followUps).toEqual(['How do I install Dory?', 'How do I build a site?']);
    expect(result.answer).toContain('these docs');
    expect(providerCalls).toBe(0);
  });

  it('uses documentation prompts when retrieved excerpts cannot answer a related question', async () => {
    writeFileSync(join(docsDir, 'dory.json'), JSON.stringify({ name: 'Dory' }));
    const fetchReal = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://provider.example')) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: 'The excerpts do not explain that.', answerable: false, citations: ['S1'], followUps: ['Could you share TallyPrime docs?'] }) } }] }), { status: 200 });
      }
      return fetchReal(input, init);
    });
    const response = await post(base, { message: 'How do I install TallyPrime?', pathname: '/getting-started' });
    const result = await response.json() as { citations: unknown[]; followUps: string[] };
    expect(response.status).toBe(200);
    expect(result.citations).toEqual([]);
    expect(result.followUps).toEqual(['How do I get started with Dory?', 'What can I do with Dory?']);
  });

  it('rejects cross-origin requests before contacting the provider', async () => {
    const provider = vi.spyOn(globalThis, 'fetch');
    const response = await post(base, { message: 'How do I build Dory?' }, 'https://attacker.example');
    expect(response.status).toBe(403);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it('enforces a strict per-IP request limit', async () => {
    const fetchReal = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://provider.example')) return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: 'Run dory build.', answerable: true, citations: ['S1'] }) } }] }), { status: 200 });
      return fetchReal(input, init);
    });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await post(base, { message: 'How do I build Dory?' })).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('skips time quotas only for loopback requests to the dev server', async () => {
    localDevelopment = true;
    process.env.DORY_CHAT_PER_MINUTE = '1';
    process.env.DORY_CHAT_PER_IP_DAY = '1';
    process.env.DORY_CHAT_GLOBAL_DAY = '1';
    const fetchReal = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://provider.example')) return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: 'Run dory build.', answerable: true, citations: ['S1'] }) } }] }), { status: 200 });
      return fetchReal(input, init);
    });
    const question = { message: 'How do I build Dory?' };
    const localStatuses = [];
    for (let i = 0; i < 4; i++) localStatuses.push((await post(base, question)).status);
    expect(localStatuses).toEqual([200, 200, 200, 200]);

    const publicRequest = () => new Promise<number>((resolve, reject) => {
      const body = JSON.stringify(question);
      const req = request(`${base}/api/chat`, {
        method: 'POST',
        headers: { Host: 'docs.example', Origin: 'http://docs.example', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, res => {
        res.resume();
        res.on('end', () => resolve(res.statusCode ?? 0));
      });
      req.on('error', reject);
      req.end(body);
    });
    expect(await publicRequest()).toBe(200);
    expect(await publicRequest()).toBe(429);
  });

  it('keeps translated answers in the requested locale', async () => {
    mkdirSync(join(docsDir, 'fr'));
    writeFileSync(join(docsDir, 'dory.json'), JSON.stringify({ i18n: { defaultLocale: 'en', locales: [{ code: 'en' }, { code: 'fr' }] } }));
    writeFileSync(join(docsDir, 'fr', 'getting-started.mdx'), '---\ntitle: Commencer\n---\n# Commencer\nInstallez Dory avec pnpm et lancez dory build pour créer votre documentation.\n');
    const fetchReal = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://provider.example')) {
        const request = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
        expect(request.messages[1].content).toContain('/fr/getting-started');
        expect(request.messages[1].content).not.toContain('(\/getting-started)');
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: 'Lancez dory build.', answerable: true, citations: ['S1'] }) } }] }), { status: 200 });
      }
      return fetchReal(input, init);
    });
    const response = await post(base, { message: 'Comment utiliser Dory avec pnpm?', pathname: '/fr/getting-started' });
    expect(response.status).toBe(200);
    const result = JSON.parse(await response.text()) as { citations: Array<{ url: string }> };
    expect(result.citations[0].url).toMatch(/^\/fr\//);
  });

  it('rejects oversized questions before a model call', async () => {
    const fetchReal = globalThis.fetch.bind(globalThis);
    const provider = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => fetchReal(input, init));
    const response = await post(base, { message: 'x'.repeat(601) });
    expect(response.status).toBe(400);
    expect(provider).toHaveBeenCalledTimes(1);
  });
});

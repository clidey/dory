import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, symlinkSync } from 'node:fs';
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

  it('does not spend request quotas on malformed JSON or invalid questions', async () => {
    process.env.DORY_CHAT_PER_MINUTE = '1';
    process.env.DORY_CHAT_PER_IP_DAY = '1';
    process.env.DORY_CHAT_GLOBAL_DAY = '1';
    const fetchReal = globalThis.fetch.bind(globalThis);
    let providerCalls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://provider.example')) {
        providerCalls++;
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: 'Run dory build.', answerable: true, citations: ['S1'] }) } }] }));
      }
      return fetchReal(input, init);
    });
    for (let i = 0; i < 4; i++) {
      const malformed = await fetch(`${base}/api/chat`, {
        method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{',
      });
      expect(malformed.status).toBe(400);
      expect((await post(base, { message: 'x'.repeat(601) })).status).toBe(400);
    }
    expect((await post(base, { message: 'How do I build Dory?' })).status).toBe(200);
    expect((await post(base, { message: 'How do I build Dory?' })).status).toBe(429);
    expect(providerCalls).toBe(1);
  });

  it('holds concurrency admission while an incomplete body is being read', async () => {
    const received = new Promise<void>(resolve => server.once('request', () => resolve()));
    const slow = request(`${base}/api/chat`, {
      method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', 'Content-Length': '1024' },
    });
    slow.on('error', () => {});
    slow.write('{');
    await received;
    try {
      expect((await post(base, { message: 'How do I build Dory?' })).status).toBe(429);
    } finally { slow.destroy(); }
  });

  it('uses only trusted proxy-appended client addresses for quotas', async () => {
    process.env.DORY_CHAT_TRUSTED_PROXY_CIDRS = '127.0.0.0/8';
    process.env.DORY_CHAT_PROXY_HOPS = '2';
    process.env.DORY_CHAT_PER_MINUTE = '1';
    const ask = (forwarded: string) => fetch(`${base}/api/chat`, {
      method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', 'X-Forwarded-For': forwarded },
      body: JSON.stringify({ message: 'Unrelated topic xyzzy' }),
    });
    expect((await ask('198.51.100.1, 203.0.113.5')).status).toBe(200);
    expect((await ask('198.51.100.2, 203.0.113.5')).status).toBe(200);
    expect((await ask('192.0.2.99, 198.51.100.1, 203.0.113.5')).status).toBe(429);
  });

  it('ignores forwarded addresses from untrusted peers', async () => {
    process.env.DORY_CHAT_TRUSTED_PROXY_CIDRS = '192.0.2.0/24';
    process.env.DORY_CHAT_PROXY_HOPS = '2';
    process.env.DORY_CHAT_PER_MINUTE = '1';
    const ask = (forwarded: string) => fetch(`${base}/api/chat`, {
      method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', 'X-Forwarded-For': forwarded },
      body: JSON.stringify({ message: 'Unrelated topic xyzzy' }),
    });
    expect((await ask('198.51.100.1, 203.0.113.5')).status).toBe(200);
    expect((await ask('198.51.100.2, 203.0.113.5')).status).toBe(429);
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

  it('preserves complete Mermaid diagrams and code examples in bounded source evidence', async () => {
    const diagram = '```mermaid\nflowchart LR\n  A[Write MDX] --> B[Build Dory]\n```';
    const example = '```mdx\n# Heading inside example\n<Callout title="Dory">Build docs</Callout>\n```';
    writeFileSync(join(docsDir, 'diagrams.mdx'), `# Dory diagrams\nExplain the Dory build process.\n${diagram}\n${example}\n`);
    const fetchReal = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://provider.example')) {
        const body = JSON.parse(String(init?.body)) as { max_completion_tokens: number; messages: Array<{ content: string }> };
        expect(body.messages[0].content).toContain('complete fenced mermaid diagram');
        expect(body.messages[1].content).toContain(diagram);
        expect(body.messages[1].content).toContain(example);
        expect(body.max_completion_tokens).toBe(1000);
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: `The Dory build process:\n${diagram}`, answerable: true, citations: ['S1'] }) } }] }));
      }
      return fetchReal(input, init);
    });
    const response = await post(base, { message: 'Explain Dory diagrams', pathname: '/diagrams' });
    expect(response.status).toBe(200);
    expect((await response.json() as { answer: string }).answer).toContain(diagram);
  });

  it('returns only selected source-owned media and never trusts provider URLs', async () => {
    mkdirSync(join(docsDir, 'assets'));
    for (const name of ['architecture.png', 'demo.webp', 'tour.mp4', 'guide.mp3']) writeFileSync(join(docsDir, 'assets', name), 'test-media');
    writeFileSync(join(docsDir, 'media.mdx'), '# Dory media guide\nSee the Dory architecture and follow the tour.\n![Architecture](./assets/architecture.png)\n<Image src="/assets/demo.webp" alt="Dory demo" />\n<video src="./assets/tour.mp4" title="Dory tour" />\n<audio><source src="./assets/guide.mp3" /></audio>\n');
    const fetchReal = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://provider.example')) {
        const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
        expect(body.messages[1].content).toContain('"id":"S1M1","type":"image","url":"/assets/architecture.png","alt":"Architecture","sourceId":"S1"');
        expect(body.messages[1].content).toContain('"type":"video"');
        expect(body.messages[1].content).toContain('"type":"audio"');
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: 'See this Dory architecture and tour.', answerable: true, citations: ['S1'], media: ['S1M1', 'S1M2', 'S1M3', 'S1M4', 'made-up', { url: 'https://attacker.example/tracking.png' }] }) } }] }));
      }
      return fetchReal(input, init);
    });
    const response = await post(base, { message: 'Explain Dory media', pathname: '/media' });
    expect(response.status).toBe(200);
    const result = await response.json() as { media: Array<{ type: string; url: string; sourceId: string; alt: string }> };
    expect(result.media).toHaveLength(4);
    expect(result.media.map(media => media.type)).toEqual(['image', 'image', 'video', 'audio']);
    expect(result.media[0]).toMatchObject({ sourceId: 'S1', alt: 'Architecture' });
    expect(JSON.stringify(result)).not.toContain('attacker');
  });

  it('excludes hidden files, symlinks, traversal, executable media, and code examples from the media inventory', async () => {
    mkdirSync(join(docsDir, 'assets'));
    writeFileSync(join(docsDir, '.secret.png'), 'private');
    writeFileSync(join(docsDir, 'assets', 'unsafe.html'), '<script>alert(1)</script>');
    symlinkSync(join(docsDir, '.secret.png'), join(docsDir, 'assets', 'symlink.png'));
    writeFileSync(join(docsDir, 'unsafe.mdx'), '# Dory unsafe media\nDory media inventory must only contain safe documentation assets.\n![secret](/.secret.png)\n![linked](./assets/symlink.png)\n![traversal](/%2e%2e/.secret.png)\n![html](./assets/unsafe.html)\n![data](data:image/png;base64,AAAA)\n![unsafe](javascript:alert)\n![credentials](https://user:pass@example.com/image.png)\n```mdx\n<Image src="https://example.com/example.png" />\n```\n');
    const fetchReal = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://provider.example')) {
        const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
        expect(body.messages[1].content).not.toContain('Available media');
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: 'Only use safe Dory media.', answerable: true, citations: ['S1'], media: ['S1M1'] }) } }] }));
      }
      return fetchReal(input, init);
    });
    const response = await post(base, { message: 'Dory unsafe media', pathname: '/unsafe' });
    expect(response.status).toBe(200);
    expect((await response.json() as { media: unknown[] }).media).toEqual([]);
  });

  it('supports source SVGs and HTTPS CDN images while restricting media to cited sections', async () => {
    writeFileSync(join(docsDir, 'architecture.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    writeFileSync(join(docsDir, 'architecture.mdx'), '# Dory architecture\nThe Dory architecture builds documentation from MDX.\n![Diagram](/architecture.svg)\n![Screenshot](https://cdn.example/images/render?id=demo)\n![Internal](https://127.0.0.1/private.png)\n\n## Other Dory architecture\nThis other Dory architecture section has a separate screenshot.\n![Other](https://cdn.example/other.png)\n');
    const fetchReal = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).startsWith('https://provider.example')) {
        const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
        const prompt = body.messages[1].content;
        expect(prompt).toContain('"url":"/architecture.svg"');
        expect(prompt).toContain('"url":"https://cdn.example/images/render?id=demo"');
        expect(prompt).not.toContain('"url":"https://127.0.0.1/private.png"');
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: 'Dory builds MDX documentation.', answerable: true, citations: ['S1'], media: ['S1M1', 'S1M2', 'S2M1'] }) } }] }));
      }
      return fetchReal(input, init);
    });
    const response = await post(base, { message: 'Explain Dory architecture', pathname: '/architecture' });
    expect(response.status).toBe(200);
    const result = await response.json() as { media: Array<{ sourceId: string; url: string }> };
    expect(result.media.map(media => media.url)).toEqual(['/architecture.svg', 'https://cdn.example/images/render?id=demo']);
    expect(result.media.every(media => media.sourceId === 'S1')).toBe(true);
  });
});

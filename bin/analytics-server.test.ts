import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { createAnalytics } from './analytics-server';

function request(path: string, method = 'GET', headers: Record<string, string> = {}): IncomingMessage {
  return Object.assign(Readable.from([]), {
    url: path,
    method,
    headers: { host: 'docs.local', ...headers },
    socket: { remoteAddress: '203.0.113.10' },
  }) as unknown as IncomingMessage;
}

describe('PostHog server analytics', () => {
  let root: string;
  const send = vi.fn(async (_url: string, _options: RequestInit) => new Response('', { status: 200 }));

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'dory-analytics-test-'));
    writeFileSync(join(root, 'dory.json'), JSON.stringify({
      analytics: { posthog: { token: 'phc_test', apiHost: 'https://eu.i.posthog.com' } },
    }));
    vi.stubGlobal('fetch', send);
    send.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(root, { recursive: true, force: true });
  });

  function events() {
    return send.mock.calls.map((call) => {
      const options = call[1] as RequestInit;
      return {
        url: call[0],
        body: JSON.parse(String(options.body)) as {
          token: string;
          event: string;
          properties: Record<string, unknown>;
        },
      };
    });
  }

  it('sends human requests and declared AI requests as separate PostHog events', () => {
    const analytics = createAnalytics({ projectRoot: root });
    analytics.recordRequest(request('/guide', 'GET', { 'user-agent': 'Mozilla/5.0' }), 200);
    analytics.recordRequest(request('/llms.txt', 'GET', { 'user-agent': 'GPTBot/1.0' }), 200);
    analytics.recordRequest(request('/assets/site.js', 'GET', { 'user-agent': 'Mozilla/5.0' }), 200);
    analytics.recordRequest(request('/guide', 'GET', { 'user-agent': 'OtherBot/1.0' }), 200);
    analytics.recordRequest(request('/guide', 'POST', { 'user-agent': 'Mozilla/5.0' }), 200);

    expect(events()).toHaveLength(2);
    expect(events().map(({ body }) => body.event)).toEqual(['docs_page_request', 'docs_ai_request']);
    expect(events().map(({ url }) => url)).toEqual([
      'https://eu.i.posthog.com/i/v0/e/',
      'https://eu.i.posthog.com/i/v0/e/',
    ]);
    expect(events()[0].body.properties).toMatchObject({
      path: '/guide',
      referrer: 'Direct',
      $process_person_profile: false,
    });
    expect(events()[1].body.properties).toMatchObject({
      path: '/llms.txt',
      agent: 'GPTBot',
      $process_person_profile: false,
    });
    expect(events()[0].body.token).toBe('phc_test');
    expect(events()[0].body.properties.distinct_id).toBeTruthy();
  });

  it('strips base paths and referrer details without storing local records', () => {
    const analytics = createAnalytics({ projectRoot: root, basePath: '/docs' });
    analytics.recordRequest(request('/docs/guide?key=secret', 'GET', {
      'user-agent': 'Mozilla/5.0 private details',
      referer: 'https://example.com/private?token=secret',
      'x-forwarded-for': '198.51.100.2',
    }), 304);

    expect(events()[0].body.properties).toMatchObject({
      path: '/guide',
      referrer: 'example.com',
      $process_person_profile: false,
    });
    expect(JSON.stringify(events())).not.toMatch(/198\.51\.100\.2|203\.0\.113\.10|Mozilla|private\?token|key=secret/);
    expect(existsSync(join(root, '.dory'))).toBe(false);
  });

  it('does nothing when PostHog is not configured', () => {
    writeFileSync(join(root, 'dory.json'), '{}');
    const analytics = createAnalytics({ projectRoot: root });
    analytics.recordRequest(request('/guide', 'GET', { 'user-agent': 'Mozilla/5.0' }), 200);
    expect(send).not.toHaveBeenCalled();
  });

  it('reads docs/dory.json when a root config is absent', () => {
    rmSync(join(root, 'dory.json'));
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'docs', 'dory.json'), JSON.stringify({
      analytics: { posthog: { token: 'phc_docs' } },
    }));

    createAnalytics({ projectRoot: root }).recordRequest(request('/guide'), 200);
    expect(events()[0].url).toBe('https://us.i.posthog.com/i/v0/e/');
    expect(events()[0].body.token).toBe('phc_docs');
  });

  it('preserves a custom PostHog proxy path', () => {
    writeFileSync(join(root, 'dory.json'), JSON.stringify({
      analytics: { posthog: { token: 'phc_proxy', apiHost: 'https://docs.example.com/posthog' } },
    }));

    createAnalytics({ projectRoot: root }).recordRequest(request('/guide'), 200);
    expect(events()[0].url).toBe('https://docs.example.com/posthog/i/v0/e/');
  });

  it('rejects insecure remote PostHog hosts', () => {
    writeFileSync(join(root, 'dory.json'), JSON.stringify({
      analytics: { posthog: { token: 'phc_test', apiHost: 'http://docs.example.com/posthog' } },
    }));

    createAnalytics({ projectRoot: root }).recordRequest(request('/guide'), 200);
    expect(send).not.toHaveBeenCalled();
  });
});
